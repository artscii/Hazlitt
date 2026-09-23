import {streamSqliteBackup} from './sqlite-backup.mjs';
import {once} from 'node:events';
import http from 'node:http';
import {visitorHeaders} from './visitor-country.mjs';
import {requestOrigin} from './request-origin.mjs';
import {loadEnvFile} from 'node:process';
// v4.9.6: local previews use the saved password hash, just like Docker.
try{loadEnvFile(new URL('../.env',import.meta.url));}catch(error){if(error.code!=='ENOENT')throw error;}
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../dist/server/index.js';
const dir=process.env.DATA_DIR||'.local-data';fs.mkdirSync(dir,{recursive:true});
const sqlite=new DatabaseSync(dir+'/atlas.sqlite');sqlite.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)');
for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()){if(!sqlite.prepare('SELECT name FROM _migrations WHERE name=?').get(name)){sqlite.exec('BEGIN');try{sqlite.exec(fs.readFileSync('drizzle/'+name,'utf8'));sqlite.prepare('INSERT INTO _migrations VALUES (?)').run(name);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}}}
function statement(sql,args=[]){return{bind(...next){return statement(sql,next)},_all(){const prepared=sqlite.prepare(sql);if(prepared.columns().length)return{results:prepared.all(...args)};const r=prepared.run(...args);return{results:[],meta:{changes:Number(r.changes)}}},async all(){return this._all()},async first(){return sqlite.prepare(sql).get(...args)||null},async run(){const r=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}}}}};const DB={prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const out=[];for(const s of statements)out.push(s._all());sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
DB.streamBackup=(seed,migrations)=>streamSqliteBackup(dir+'/atlas.sqlite',seed,migrations);
const port=Number(process.env.PORT||8080);
http.createServer(async(req,res)=>{try{const chunks=[];let length=0;for await(const c of req){length+=c.length;if(length>(req.url==='/api/imports/preview'?8*1024*1024:65536)){res.writeHead(413);res.end();return;}chunks.push(c);}const abort=new AbortController();res.on('close',()=>{if(!res.writableEnded)abort.abort();});const request=new Request(requestOrigin(req.headers.host,process.env.PUBLIC_ORIGIN)+req.url,{method:req.method,signal:abort.signal,headers:visitorHeaders(req,process.env.CADDY_PROXY_MODE==='1'),body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});const env={DB,UMAMI_WEBSITE_ID:process.env.UMAMI_WEBSITE_ID,UMAMI_DASHBOARD_URL:process.env.UMAMI_DASHBOARD_URL,ADMIN_PASSWORD_HASH:process.env.ADMIN_PASSWORD_HASH,QMD_SERVICE_URL:process.env.QMD_SERVICE_URL,QMD_SERVICE_TOKEN:process.env.QMD_SERVICE_TOKEN,QMD_PRIVATE_NETWORK:process.env.QMD_PRIVATE_NETWORK};const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body){for await(const chunk of response.body){if(res.destroyed)break;if(!res.write(Buffer.from(chunk)))await once(res,'drain',{signal:abort.signal});}}res.end();}catch(e){console.error(e);res.writeHead(500);res.end('Unavailable');}}).listen(port,'0.0.0.0',()=>console.log('Atlas running on port '+port));
