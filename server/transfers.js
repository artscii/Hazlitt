// v4.0.0: reviewed spreadsheet reconciliation, atomic imports and global history.
const TRANSFER_MAX_ROWS = 500;
const transferIp = (request) =>
  request.headers.get("CF-Connecting-IP") || "Unavailable";
const transferRow = async (env, id) =>
  database(env)
    .prepare("SELECT * FROM file_operations WHERE id=?")
    .bind(id)
    .first();
function transferFilename(value) {
  return String(value || "Atlas.xlsx")
    .replace(/[\u0000-\u001f]/g, "")
    .slice(0, 200);
}
// v4.8.1: one reviewed batch comment follows new records into notes and import/undo history.
function importComment(value, filename) {
  if (value !== undefined && (typeof value !== "string" || value.length > 500))
    throw new Error("Batch comment must be text of 500 characters or fewer.");
  return value?.trim() || "New records imported from " + filename + ".";
}
async function previewImport(env, input) {
  const filename = transferFilename(input.filename),
    comment = importComment(input.comment, filename);
  if (
    !Array.isArray(input.rows) ||
    !input.rows.length ||
    input.rows.length > TRANSFER_MAX_ROWS
  )
    throw new Error("Choose a spreadsheet containing 1–500 project rows.");
  const existing = await records(env),
    stored = (await database(env).prepare("SELECT id FROM records").all())
      .results;
  const ids = new Map(existing.map((p) => [p.id, p])),
    knownIds = new Set(stored.map((p) => p.id)),
    names = new Map(existing.map((p) => [nameKey(p.name), p]));
  const seenTargets = new Set(),
    seenValues = new Map(),
    seenInputIds = new Map(),
    seenInputNames = new Map(),
    rows = [],
    candidates = [];
  let added = 0,
    updates = 0,
    skipped = 0,
    invalid = 0;
  for (let index = 0; index < input.rows.length; index++) {
    const source = input.rows[index],
      row = {
        key: index,
        row: Number.isInteger(source?.row) ? source.row : index + 2,
        name: String(source?.name || "Unnamed project").slice(0, 200),
      };
    try {
      if (!source || typeof source !== "object" || Array.isArray(source))
        throw new Error("Invalid project row.");
      if (source.error) throw new Error(String(source.error).slice(0, 300));
      const key = typeof source.name === "string" ? nameKey(source.name) : "",
        id = String(source.id || "").trim();
      if (id && knownIds.has(id) && !ids.has(id))
        throw new Error(
          "This Project ID was deleted. Restore it through project history instead of importing it.",
        );
      const byId = ids.get(id),
        byName = names.get(key);
      if (byId && byName && byId.id !== byName.id)
        throw new Error(
          "Project ID and project name match different records. Correct this row before importing.",
        );
      if (source.related !== undefined && typeof source.related !== "boolean")
        throw new Error("Related initiative must be Yes or No.");
      const match = byId || byName,
        record = validate({ ...match, ...source });
      if (!nameKey(record.name))
        throw new Error("Enter a recognizable project name.");
      const target =
        match?.id ||
        (id && seenInputIds.get(id)) ||
        seenInputNames.get(key) ||
        nameKey(record.name);
      if (seenTargets.has(target)) {
        if (seenValues.get(target) !== JSON.stringify(record))
          throw new Error(
            "Conflicting rows in this file refer to the same project. Keep one intended row and preview again.",
          );
        row.status = "duplicate";
        row.message = "Repeated within this spreadsheet; skipped.";
        skipped++;
      } else {
        seenTargets.add(target);
        seenValues.set(target, JSON.stringify(record));
        if (id) seenInputIds.set(id, target);
        seenInputNames.set(key, target);
        record.id = match?.id || "project-" + crypto.randomUUID();
        const comparable = (key, value) =>
          key === "countries"
            ? [...(value || [])].sort()
            : key === "related"
              ? !!value
              : (value ?? "");
        const changes = match
          ? [...fields, "countries", "related"]
              .filter(
                (key) =>
                  JSON.stringify(comparable(key, match[key])) !==
                  JSON.stringify(comparable(key, record[key])),
              )
              .map((key) => ({
                field: key,
                before: match[key] ?? "",
                after: record[key] ?? "",
              }))
          : [];
        if (match && !changes.length) {
          row.status = "duplicate";
          row.message = "Matches the saved project; no changes.";
          skipped++;
        } else {
          if (!match) {
            record.editNotes = [
              record.editNotes,
              "Batch import — " + filename + ": " + comment,
            ]
              .filter(Boolean)
              .join("\n\n");
            if (record.editNotes.length > 12000)
              throw new Error(
                "Edit notes plus the batch comment exceed 12,000 characters. Shorten the notes before importing.",
              );
          }
          candidates.push({
            key: index,
            record,
            before: match || null,
            baseRevision: match?.revision ?? 0,
            importRevision: (match?.revision ?? 0) + 1,
            nameKey: nameKey(record.name),
            beforeNameKey: match ? nameKey(match.name) : null,
            auditId: crypto.randomUUID(),
            undoAuditId: crypto.randomUUID(),
          });
          row.status = match ? "update" : "new";
          row.message = match
            ? "Review changes and choose Update to include this row."
            : "Ready to add.";
          row.changes = changes;
          row.values = record;
          if (match) {
            updates++;
            row.projectNumber =
              existing.findIndex((p) => p.id === match.id) + 1;
            row.currentRevision = match.revision;
            row.matchMethod = byId ? "Project ID" : "Project name";
            row.stale =
              source.revision !== undefined &&
              source.revision !== "" &&
              Number(source.revision) !== match.revision;
          } else added++;
        }
      }
    } catch (error) {
      row.status = "invalid";
      row.message = error.message;
      invalid++;
    }
    rows.push(row);
  }
  const summary = {
    comment,
    total: rows.length,
    added,
    updates,
    skipped,
    invalid,
    testOnly: input.testOnly === true,
  };
  const payload = JSON.stringify({ records: candidates, rows, ...summary });
  if (new TextEncoder().encode(payload).length > 1500000)
    throw new Error(
      "This preview contains too much text for one batch. Split the spreadsheet into smaller imports.",
    );
  const id = crypto.randomUUID();
  await database(env)
    .prepare(
      "INSERT INTO file_operations (id,kind,filename,at,status,payload,ip) VALUES (?,'import',?,?,'preview',?,?)",
    )
    .bind(
      id,
      transferFilename(input.filename),
      Date.now(),
      payload,
      transferIp(input.request),
    )
    .run();
  return { id, rows, ...summary };
}
async function applyImport(env, request, id) {
  const operation = await transferRow(env, id);
  if (!operation || operation.kind !== "import")
    return json(
      { error: "Import preview not found. Preview the file again." },
      404,
    );
  let payload = JSON.parse(operation.payload);
  if (operation.status === "applied")
    return json({
      ok: true,
      id,
      added: payload.added,
      updated: payload.updated,
      skipped: payload.skipped,
    });
  if (operation.status !== "preview" || Date.now() - operation.at > 1800000)
    return json(
      {
        error:
          "This preview has expired or was already undone. Preview the file again.",
      },
      409,
    );
  if (payload.testOnly)
    return json(
      {
        error:
          "Test imports cannot be applied. Run Preview import to review and confirm a real import.",
      },
      409,
    );
  if (payload.invalid)
    return json({ error: "Correct invalid rows and preview again." }, 400);
  const input = await body(request),
    selected = new Set(
      Array.isArray(input.selectedRows) ? input.selectedRows : [],
    );
  if (
    !Array.isArray(input.selectedRows) ||
    !selected.size ||
    input.selectedRows.some(
      (key) =>
        !Number.isInteger(key) ||
        !payload.records.some((item) => item.key === key),
    )
  )
    return json({ error: "Choose the rows to import from the preview." }, 400);
  const chosen = payload.records.filter((item) => selected.has(item.key)),
    current = await records(env);
  for (const item of chosen) {
    const live = current.find((p) => p.id === item.record.id),
      duplicate = current.find(
        (p) => nameKey(p.name) === item.nameKey && p.id !== item.record.id,
      );
    if (
      duplicate ||
      (item.before && (!live || live.revision !== item.baseRevision))
    )
      return json(
        {
          error:
            "A project changed since this preview. Preview the file again before applying changes.",
        },
        409,
      );
  }
  payload = {
    ...payload,
    records: chosen,
    added: chosen.filter((item) => !item.before).length,
    updated: chosen.filter((item) => item.before).length,
    skipped: payload.total - chosen.length,
  };
  const serialized = JSON.stringify(payload);
  const db = database(env),
    at = Date.now();
  try {
    const result = await db.batch([
      db
        .prepare(
          "UPDATE file_operations SET status='applying',payload=? WHERE id=? AND status='preview' AND NOT EXISTS(SELECT 1 FROM json_each(?,'$.records') j LEFT JOIN records r ON r.id=json_extract(j.value,'$.record.id') WHERE (r.id IS NOT NULL AND (r.deleted<>0 OR r.revision<>json_extract(j.value,'$.baseRevision'))) OR (r.id IS NULL AND json_extract(j.value,'$.baseRevision')>0))",
        )
        .bind(serialized, id, serialized),
      db
        .prepare(
          "INSERT INTO records (id,payload,name_key,deleted,revision) SELECT json_extract(j.value,'$.record.id'),json_extract(j.value,'$.record'),json_extract(j.value,'$.nameKey'),0,json_extract(j.value,'$.importRevision') FROM file_operations f,json_each(f.payload,'$.records') j WHERE f.id=? AND f.status='applying' ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,name_key=excluded.name_key,deleted=0,revision=excluded.revision",
        )
        .bind(id),
      db
        .prepare(
          "INSERT INTO audit_log (id,at,action,record_id,name,ip,before,after,revision) SELECT json_extract(j.value,'$.auditId'),?,CASE WHEN json_extract(j.value,'$.before') IS NULL THEN 'import' ELSE 'import_update' END,json_extract(j.value,'$.record.id'),json_extract(j.value,'$.record.name'),?,json_extract(j.value,'$.before'),json_extract(j.value,'$.record'),json_extract(j.value,'$.importRevision') FROM file_operations f,json_each(f.payload,'$.records') j WHERE f.id=? AND f.status='applying'",
        )
        .bind(at, transferIp(request), id),
      db
        .prepare(
          "INSERT INTO global_history (at,action,operation_id,summary,details,ip) SELECT ?,'import',id,?, ?,? FROM file_operations WHERE id=? AND status='applying'",
        )
        .bind(
          at,
          `Imported ${payload.added} new projects; updated ${payload.updated}; skipped ${payload.skipped} rows.`,
          JSON.stringify({
            filename: operation.filename,
            comment:
              payload.comment || "Imported from " + operation.filename + ".",
            added: payload.added,
            updated: payload.updated,
            skipped: payload.skipped,
          }),
          transferIp(request),
          id,
        ),
      db
        .prepare(
          "UPDATE file_operations SET status='applied',completed=? WHERE id=? AND status='applying'",
        )
        .bind(at, id),
    ]);
    if (!result[0].meta.changes) {
      const fresh = await transferRow(env, id);
      if (fresh.status !== "applied")
        return json(
          { error: "Import state changed. Refresh and preview again." },
          409,
        );
    }
  } catch (error) {
    const fresh = await transferRow(env, id);
    if (fresh?.status === "applied")
      return json({
        ok: true,
        id,
        ...JSON.parse(fresh.payload),
        records: undefined,
      });
    return json(
      {
        error:
          "Nothing was imported. A record conflict or storage error occurred. Preview the file again.",
      },
      409,
    );
  }
  return json({
    ok: true,
    id,
    added: payload.added,
    updated: payload.updated,
    skipped: payload.skipped,
  });
}
async function undoImport(env, request, id) {
  const operation = await transferRow(env, id);
  if (!operation || operation.kind !== "import")
    return json({ error: "Import not found." }, 404);
  if (operation.status === "undone")
    return json({ ok: true, alreadyUndone: true });
  if (operation.status !== "applied")
    return json({ error: "Only a completed import can be undone." }, 409);
  const payload = JSON.parse(operation.payload),
    db = database(env),
    at = Date.now();
  // The gate and every write run in a single transaction. Any later project edit blocks undo.
  let results;
  try {
    results = await db.batch([
      db
        .prepare(
          "UPDATE file_operations SET status='undoing' WHERE id=? AND status='applied' AND NOT EXISTS (SELECT 1 FROM json_each(file_operations.payload,'$.records') j LEFT JOIN records r ON r.id=json_extract(j.value,'$.record.id') WHERE r.id IS NULL OR r.deleted<>0 OR r.revision<>json_extract(j.value,'$.importRevision'))",
        )
        .bind(id),
      db
        .prepare(
          "UPDATE records SET payload=COALESCE(json_extract(j.value,'$.before'),records.payload),deleted=CASE WHEN json_extract(j.value,'$.before') IS NULL THEN 1 ELSE 0 END,name_key=CASE WHEN json_extract(j.value,'$.before') IS NULL THEN NULL ELSE json_extract(j.value,'$.beforeNameKey') END,revision=records.revision+1 FROM file_operations f,json_each(f.payload,'$.records') j WHERE f.id=? AND f.status='undoing' AND records.id=json_extract(j.value,'$.record.id')",
        )
        .bind(id),
      db
        .prepare(
          "INSERT INTO audit_log (id,at,action,record_id,name,ip,before,after,revision) SELECT json_extract(j.value,'$.undoAuditId'),?,'import_undo',json_extract(j.value,'$.record.id'),json_extract(j.value,'$.record.name'),?,json_extract(j.value,'$.record'),json_extract(j.value,'$.before'),json_extract(j.value,'$.importRevision')+1 FROM file_operations f,json_each(f.payload,'$.records') j WHERE f.id=? AND f.status='undoing'",
        )
        .bind(at, transferIp(request), id),
      db
        .prepare(
          "INSERT INTO global_history (at,action,operation_id,summary,details,ip) SELECT ?,'undo_import',id,?,?,? FROM file_operations WHERE id=? AND status='undoing'",
        )
        .bind(
          at,
          `Undid import: removed ${payload.added} added projects and restored ${payload.updated} updated projects.`,
          JSON.stringify({
            filename: operation.filename,
            comment:
              payload.comment || "Imported from " + operation.filename + ".",
            removed: payload.added,
            restored: payload.updated,
          }),
          transferIp(request),
          id,
        ),
      db
        .prepare(
          "UPDATE file_operations SET status='undone',undone=? WHERE id=? AND status='undoing'",
        )
        .bind(at, id),
    ]);
  } catch {
    return json(
      {
        error:
          "Undo could not complete because restored project names conflict with current records. No records were changed.",
      },
      409,
    );
  }
  if (!results[0].meta.changes) {
    const fresh = await transferRow(env, id);
    if (fresh.status === "undone")
      return json({ ok: true, alreadyUndone: true });
    return json(
      {
        error:
          "This import cannot be undone because one or more imported projects were edited, deleted or restored afterward. No records were changed.",
      },
      409,
    );
  }
  return json({ ok: true, removed: payload.added, restored: payload.updated });
}
async function transferRoute(request, env, path, url) {
  if (path === "/api/imports/preview" && request.method === "POST") {
    const input = await body(request, 8 * 1024 * 1024);
    return json(await previewImport(env, { ...input, request }));
  }
  const commit = path.match(/^\/api\/imports\/([a-f0-9-]+)\/commit$/);
  if (commit && request.method === "POST")
    return applyImport(env, request, commit[1]);
  const undo = path.match(/^\/api\/imports\/([a-f0-9-]+)\/undo$/);
  if (undo && request.method === "POST")
    return undoImport(env, request, undo[1]);
  if (path === "/api/exports" && request.method === "POST") {
    const input = await body(request),
      programs = await records(env),
      id = crypto.randomUUID(),
      filename = transferFilename(input.filename);
    let details = { count: programs.length },
      preview;
    if (input.kind === "diff") {
      const source = await transferRow(env, input.previewId);
      if (
        !source ||
        source.kind !== "import" ||
        source.status !== "preview" ||
        Date.now() - source.at > 1800000
      )
        return json(
          {
            error:
              "Preview the spreadsheet again before exporting its comparison.",
          },
          409,
        );
      const data = JSON.parse(source.payload),
        selected = new Set(
          Array.isArray(input.selectedRows) ? input.selectedRows : [],
        );
      if (
        [...selected].some(
          (key) => !data.records.some((item) => item.key === key),
        )
      )
        return json({ error: "Invalid preview selection." }, 400);
      preview = {
        ...data,
        filename: source.filename,
        at: Date.now(),
        selectedRows: [...selected],
      };
      delete preview.records;
      details = {
        kind: "diff",
        testOnly: !!data.testOnly,
        count: data.total,
        added: data.records.filter(
          (item) => selected.has(item.key) && !item.before,
        ).length,
        updated: data.records.filter(
          (item) => selected.has(item.key) && item.before,
        ).length,
        skipped: data.total - selected.size,
        invalid: data.invalid,
      };
    }
    await database(env)
      .prepare(
        "INSERT INTO file_operations (id,kind,filename,at,status,payload,ip) VALUES (?,'export',?,?,'export_ready',?,?)",
      )
      .bind(
        id,
        filename,
        Date.now(),
        JSON.stringify(details),
        transferIp(request),
      )
      .run();
    return json({
      id,
      programs: preview ? undefined : programs,
      preview,
      filename,
    });
  }
  const complete = path.match(/^\/api\/exports\/([a-f0-9-]+)\/complete$/);
  if (complete && request.method === "POST") {
    const op = await transferRow(env, complete[1]);
    if (!op || op.kind !== "export")
      return json({ error: "Export not found." }, 404);
    if (op.status === "exported") return json({ ok: true });
    const details = JSON.parse(op.payload),
      count = details.count,
      at = Date.now(),
      summary =
        details.kind === "diff"
          ? `${details.testOnly ? "Test import report" : "Exported bulk import diff preview"}: ${count} rows; ${details.added} selected additions, ${details.updated} selected updates, ${details.skipped} skips, ${details.invalid} invalid. No project records changed.`
          : `Exported ${count} projects to Excel. No project records changed.`;
    await database(env).batch([
      database(env)
        .prepare(
          "INSERT INTO global_history (at,action,operation_id,summary,details,ip) SELECT ?,'export',id,?,?,? FROM file_operations WHERE id=? AND status='export_ready'",
        )
        .bind(
          at,
          summary,
          JSON.stringify({ filename: op.filename, ...details }),
          transferIp(request),
          op.id,
        ),
      database(env)
        .prepare(
          "UPDATE file_operations SET status='exported',completed=? WHERE id=? AND status='export_ready'",
        )
        .bind(at, op.id),
    ]);
    return json({ ok: true });
  }
  if (path === "/api/global-history" && request.method === "GET") {
    const before =
      Number(url.searchParams.get("before")) || Number.MAX_SAFE_INTEGER;
    const entries = (
      await database(env)
        .prepare(
          "SELECT g.*,f.status AS operation_status,CASE WHEN f.kind='import' AND f.status='applied' AND NOT EXISTS(SELECT 1 FROM json_each(f.payload,'$.records') j LEFT JOIN records r ON r.id=json_extract(j.value,'$.record.id') WHERE r.id IS NULL OR r.deleted<>0 OR r.revision<>json_extract(j.value,'$.importRevision')) THEN 1 ELSE 0 END AS can_undo FROM global_history g JOIN file_operations f ON f.id=g.operation_id WHERE g.version<? ORDER BY g.version DESC LIMIT 21",
        )
        .bind(before)
        .all()
    ).results;
    return json({
      entries: entries
        .slice(0, 20)
        .map((row) => ({
          ...row,
          details: JSON.parse(row.details),
          can_undo: !!row.can_undo,
        })),
      hasMore: entries.length > 20,
    });
  }
  return null;
}
