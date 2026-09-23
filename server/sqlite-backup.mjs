import {DatabaseSync} from 'node:sqlite';
// Dedicated read transaction preserves a consistent snapshot without collecting SQL in memory.
export function streamSqliteBackup(filename,seed,migrations){
 const db=new DatabaseSync(filename,{readOnly:true});db.exec('BEGIN');
 let closed=false;const close=()=>{if(!closed){closed=true;db.exec('ROLLBACK');db.close();}};
 const ident=s=>'"'+s.replaceAll('"','""')+'"',literal=s=>"'"+String(s).replaceAll("'","''")+"'";
 function* lines(){try{
  const schema=db.prepare('SELECT type,name,sql FROM sqlite_schema WHERE sql IS NOT NULL ORDER BY type,name').all();
  const excluded=n=>n.startsWith('sqlite_')||n.startsWith('_cf_')||['d1_migrations','__drizzle_migrations'].includes(n);
  yield '-- Hazlitt complete SQLite backup; includes credentials and private history. Keep private.\nPRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n';
  for(const t of schema.filter(s=>s.type==='table'&&!excluded(s.name))){
   yield t.sql+';\n';const columns=db.prepare('PRAGMA table_xinfo('+ident(t.name)+')').all().filter(c=>!c.hidden).map(c=>c.name);
   const values=columns.map(c=>{const q=ident(c);return `CASE WHEN typeof(${q})='text' AND instr(${q},char(0))>0 THEN 'CAST(X'''||hex(${q})||''' AS TEXT)' ELSE quote(${q}) END`;});
   const prefix='INSERT INTO '+ident(t.name)+' ('+columns.map(ident).join(',')+') VALUES (';
   for(const row of db.prepare('SELECT '+literal(prefix)+" || "+values.join(" || ',' || ")+" || ');' AS line FROM "+ident(t.name)).iterate())yield row.line+'\n';
  }
  if(schema.some(s=>s.name==='sqlite_sequence'))for(const row of db.prepare('SELECT name,seq FROM sqlite_sequence').iterate())yield `DELETE FROM sqlite_sequence WHERE name=${literal(row.name)}; INSERT INTO sqlite_sequence(name,seq) VALUES (${literal(row.name)},${row.seq});\n`;
  for(const p of seed)yield 'INSERT OR IGNORE INTO records(id,payload,name_key,deleted,revision) VALUES ('+[literal(p.id),literal(JSON.stringify(p)),'NULL',0,0].join(',')+');\n';
  yield 'CREATE TABLE IF NOT EXISTS _migrations(name TEXT PRIMARY KEY);\n';for(const name of migrations)yield 'INSERT OR IGNORE INTO _migrations VALUES ('+literal(name)+');\n';
  for(const item of schema.filter(s=>s.type!=='table'&&!excluded(s.name)))yield item.sql+';\n';
  yield 'COMMIT;\nPRAGMA foreign_keys=ON;\nPRAGMA integrity_check;\n';
 }finally{close();}}
 const iterator=lines(),encoder=new TextEncoder();
 return new Response(new ReadableStream({pull(controller){try{let chunk='';while(chunk.length<32768){const item=iterator.next();if(item.done){if(chunk)controller.enqueue(encoder.encode(chunk));controller.close();return;}chunk+=item.value;}controller.enqueue(encoder.encode(chunk));}catch(e){controller.error(e);iterator.return();close();}},cancel(){iterator.return();close();}}),{headers:{'Content-Type':'application/sql; charset=utf-8','Content-Disposition':'attachment; filename="Hazlitt-DB-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sql"','Cache-Control':'no-store'}});
}
