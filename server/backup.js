// v4.11.0: a portable logical snapshot; table data is read in one SQLite statement.
async function databaseBackup(env){
 const db=database(env),ident=value=>'"'+value.replaceAll('"','""')+'"',literal=value=>"'"+String(value).replaceAll("'","''")+"'";
 const schema=(await db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE sql IS NOT NULL ORDER BY type,name").all()).results;
 const excluded=name=>name.startsWith('sqlite_')||name.startsWith('_cf_')||['d1_migrations','__drizzle_migrations'].includes(name);
 const tables=schema.filter(item=>item.type==='table'&&!excluded(item.name)),queries=[];
 for(const table of tables){
  const columns=(await db.prepare('PRAGMA table_xinfo('+ident(table.name)+')').all()).results.filter(c=>!c.hidden).map(c=>c.name);
  const prefix='INSERT INTO '+ident(table.name)+' ('+columns.map(ident).join(',')+') VALUES (';
  // SQLite quote() preserves types and escaping; NUL-containing text uses its exact UTF-8 bytes.
  const values=columns.map(c=>{const q=ident(c);return `CASE WHEN typeof(${q})='text' AND instr(${q},char(0))>0 THEN 'CAST(X'''||hex(${q})||''' AS TEXT)' ELSE quote(${q}) END`;});
  queries.push('SELECT '+literal(prefix)+" || "+values.join(" || ',' || ")+" || ');' AS line FROM "+ident(table.name));
 }
 if(schema.some(s=>s.name==='sqlite_sequence'))queries.push("SELECT 'DELETE FROM sqlite_sequence WHERE name='||quote(name)||'; INSERT INTO sqlite_sequence(name,seq) VALUES ('||quote(name)||','||quote(seq)||');' AS line FROM sqlite_sequence");
 const rows=queries.length?(await db.prepare(queries.join(' UNION ALL ')).all()).results:[];
 const out=['-- Hazlitt complete application database backup · '+new Date().toISOString(),'-- Contains password hashes, sessions and audit IPs. Keep this file private.','-- Restore into an EMPTY SQLite database: sqlite3 restored.sqlite < backup.sql','-- Platform-owned D1 metadata is excluded. Application tables and history are included.','PRAGMA foreign_keys=OFF;','BEGIN TRANSACTION;'];
 out.push(...tables.map(t=>t.sql+';'),...rows.map(r=>r.line));
 // Unedited seed projects live in the bundle: materialize them for a self-contained catalogue.
 for(const p of SEED)out.push('INSERT OR IGNORE INTO records (id,payload,name_key,deleted,revision) VALUES ('+[literal(p.id),literal(JSON.stringify(p)),'NULL','0','0'].join(',')+');');
 out.push('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY);');
 for(const name of BACKUP_MIGRATIONS)out.push('INSERT OR IGNORE INTO _migrations (name) VALUES ('+literal(name)+');');
 for(const item of schema.filter(s=>s.type!=='table'&&!excluded(s.name)&&tables.some(t=>t.name===s.tbl_name)))out.push(item.sql+';');
 out.push('COMMIT;','PRAGMA foreign_keys=ON;','PRAGMA integrity_check;','');
 return new Response(out.join('\n'),{headers:{'Content-Type':'application/sql; charset=utf-8','Content-Disposition':`attachment; filename="Hazlitt-DB-${new Date().toISOString().replace(/[:.]/g,'-')}.sql"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
