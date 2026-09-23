CREATE TABLE search_thesaurus (revision INTEGER PRIMARY KEY, at INTEGER NOT NULL, payload TEXT NOT NULL);
CREATE INDEX audit_record_revision ON audit_log(record_id,revision);
CREATE INDEX audit_at ON audit_log(at DESC);
