import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../dist/server/index.js';
const db=new DatabaseSync(':memory:');
for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+name,'utf8'));
const token='a'.repeat(64),hashed=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
db.prepare('INSERT INTO sessions VALUES (?,?)').run(hashed,Date.now()+60000);
db.prepare('INSERT INTO site_settings VALUES (?,?)').run('test',"Quotes ' · Unicode 日本語\nline\u0000tail");
db.prepare('INSERT INTO records (id,payload,deleted,revision) VALUES (?,?,?,?)').run('removed','{}',1,4);
db.prepare('INSERT INTO global_history(at,action,operation_id,summary,details,ip) VALUES (1,?,?,?,?,?)').run('test','op','summary','{}','127.0.0.1');
db.exec('UPDATE sqlite_sequence SET seq=90 WHERE name=\'global_history\'');
const env={DB:{async batch(statements){db.exec('BEGIN');try{const out=[];for(const statement of statements)out.push(await statement.all());db.exec('COMMIT');return out;}catch(error){db.exec('ROLLBACK');throw error;}},prepare(sql){assert(!sql.includes(' UNION ALL '),'Backup avoids compound query limits');return {args:[],bind(...args){this.args=args;return this},async all(){return {results:db.prepare(sql).all(...this.args)}},async first(){return db.prepare(sql).get(...this.args)}}}}};
const req=cookie=>new Request('https://atlas.test/api/db-backup',{headers:cookie?{Cookie:'atlas_session='+token}:{}});
assert.equal((await worker.fetch(req(false),env)).status,401);
const response=await worker.fetch(req(true),env);assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');const sql=await response.text();
const restored=new DatabaseSync(':memory:');restored.exec(sql);
for(const {name}of db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()){
 const original=db.prepare('SELECT * FROM "'+name+'"').all(),copy=restored.prepare('SELECT * FROM "'+name+'"').all();
 if(name==='records'){for(const row of original)assert.deepEqual(copy.find(x=>x.id===row.id),row);}else assert.deepEqual(copy,original,name);
}
for(const p of JSON.parse(fs.readFileSync('data/seed.json')))assert(restored.prepare('SELECT id FROM records WHERE id=?').get(p.id));
assert.equal(restored.prepare("SELECT seq FROM sqlite_sequence WHERE name='global_history'").get().seq,90);
assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
assert.equal(restored.prepare('SELECT count(*) AS n FROM _migrations').get().n,fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).length);
console.log('PASS: authenticated backup restores all tables, seed records, deleted rows, Unicode/NUL text, sequence and migrations; integrity check ok.');
