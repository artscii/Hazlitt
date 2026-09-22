// v3.2.1: summaries use the immutable before/after snapshots, including older versions.
function summarizeVersion(action,before,after){
 if(!after)return 'Deleted project.';
 if(!before)return action==='rollback'?'Restored deleted project.':'Created project.';
 const labels={"name": "Project name", "status": "Evidence status", "kind": "Category", "geo": "Location description", "metric": "Headline outcome", "metricLabel": "Headline outcome explanation", "short": "Short description", "outcome": "Reported outcomes", "partners": "Sponsors and partners", "phone": "Contact phone", "tel": "Telephone link number", "email": "Contact email", "contact": "Contact notes", "source": "Primary evidence URL", "sourceLabel": "Primary evidence link label", "source2": "Additional evidence URL", "source2Label": "Additional evidence link label", "contactSource": "Contact source URL", "date": "Evidence date / review note", "followUp": "Follow-up", "followUpDate": "Follow-up reference date", "editNotes": "Edit notes", "countries": "Country or countries", "related": "Related initiative (AI not documented)"};
 const changed=Object.keys(labels).filter(key=>JSON.stringify(before[key]??'')!==JSON.stringify(after[key]??''));
 if(!changed.length)return 'Saved without field changes.';
 // v3.2.3: match visible form labels and explicitly identify them as fields.
 const shown=changed.slice(0,4).map(key=>'“'+labels[key]+'”');
 const names=shown.length===1?shown[0]:shown.slice(0,-1).join(', ')+' and '+shown[shown.length-1];
 return (action==='rollback'?'Restored version; changed the ':'Updated the ')+names+(shown.length===1?' field':' fields')+(changed.length>4?', plus '+(changed.length-4)+' other fields':'')+'.';
}
// Atlas 2.0.0: shared records and server-verified administrator sessions.
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const hash=async value=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
async function passwordMatches(password,encoded){
 if(typeof password!=='string'||password.length>200||!encoded)return false;
 const [salt,expected]=encoded.split(':');if(!salt||!expected)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const actual=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256));
 let difference=actual.length^expected.length;for(let i=0;i<actual.length;i++)difference|=actual.charCodeAt(i)^(expected.charCodeAt(i)||0);return difference===0;
}
function database(env){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
const nameKey=name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
async function checkDuplicate(env,record,ignoreId){const duplicate=(await records(env)).find(p=>p.id!==ignoreId&&nameKey(p.name)===nameKey(record.name));if(duplicate)throw new Error('A project with this name already exists: '+duplicate.name);}
async function records(env){
 const rows=(await database(env).prepare('SELECT id,payload,deleted,revision FROM records').all()).results;
 const all=new Map(SEED.map(p=>[p.id,{...p,revision:0}]));
 for(const row of rows){if(row.deleted)all.delete(row.id);else all.set(row.id,{...JSON.parse(row.payload),revision:row.revision});}
 return [...all.values()];
}
async function session(request,env){const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)atlas_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return null;const key=await hash(token);const row=await database(env).prepare('SELECT token FROM sessions WHERE token = ? AND expires > ?').bind(key,Date.now()).first();return row?key:null;}
// v4.9.7: bootstrap once from the protected setting, then use the durable hash.
async function adminPasswordHash(env){
 const db=database(env);
 let row=await db.prepare('SELECT password_hash FROM admin_credentials WHERE id = ?').bind('admin').first();
 if(!row&&env.ADMIN_PASSWORD_HASH){
  await db.prepare('INSERT OR IGNORE INTO admin_credentials (id,password_hash,created_at) VALUES (?,?,?)').bind('admin',env.ADMIN_PASSWORD_HASH,Date.now()).run();
  row=await db.prepare('SELECT password_hash FROM admin_credentials WHERE id = ?').bind('admin').first();
 }
 return row?.password_hash;
}
async function body(request,limit=65536){if(Number(request.headers.get('content-length'))>limit)throw new Error('Request too large');const text=await request.text();if(text.length>limit)throw new Error('Request too large');return JSON.parse(text);}
// v4.7.0: explicit publication year and evaluation unit, preserved in record snapshots.
// v4.8.4: optional public follow-up notes and ISO reference date travel with every version.
const fields=['followUp','followUpDate','publicationYear','evidenceBasis','sampleDetails','name','status','kind','geo','metric','metricLabel','short','outcome','partners','phone','tel','email','contact','source','sourceLabel','source2','source2Label','contactSource','date','editNotes','originalLanguage','originalTitle','originalSummary','originalOutcome','originalSource'];
function validate(input){
 const out={};for(const field of fields){const value=input[field]??'';if(typeof value!=='string'||value.length>12000)throw new Error('Invalid '+field);out[field]=value.trim();}
 for(const required of ['name','status','geo','metric','metricLabel','short','outcome','partners','source','date'])if(!out[required])throw new Error('Please complete '+required);
 if(out.followUpDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(out.followUpDate)||!Number.isFinite(Date.parse(out.followUpDate))||new Date(out.followUpDate).toISOString().slice(0,10)!==out.followUpDate))throw new Error('Enter a valid follow-up date (YYYY-MM-DD)');
 if(Boolean(out.followUp)!==Boolean(out.followUpDate))throw new Error('Follow-up notes and their reference date must be provided together');
 if(out.publicationYear&&(!/^(19|20)\d{2}$/.test(out.publicationYear)||Number(out.publicationYear)>new Date().getUTCFullYear()+1))throw new Error('Enter a valid four-digit publication year, or leave it blank if unverified');
 if(!['','Patient examinations','Slide scans','Cell or image datasets','Patient examinations and slide scans','Patient records / risk modelling','Implementation / service report','Protocol / planned study'].includes(out.evidenceBasis))throw new Error('Choose a valid evidence basis');
 if(!['','deployed','pilot','historical','related'].includes(out.kind))throw new Error('Choose an evidence category');
 for(const key of ['source','source2','contactSource','originalSource'])if(out[key]){const url=new URL(out[key]);if(!['http:','https:'].includes(url.protocol))throw new Error('Source links must use https or http');}
 if(out.email&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(out.email))throw new Error('Invalid email');
 if(out.tel&&!/^\+?[0-9 ()-]{3,40}$/.test(out.tel))throw new Error('Invalid telephone link');
 if(!Array.isArray(input.countries)||!input.countries.length||input.countries.length>30||input.countries.some(c=>!COUNTRIES.some(country=>country.name===c)))throw new Error('Choose at least one country');
 if(out.originalLanguage&&!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(out.originalLanguage))throw new Error('Use a language code such as es, ja or sw');
 if((out.originalTitle||out.originalSummary||out.originalOutcome||out.originalSource)&&(!out.originalLanguage||!out.originalSource||!out.originalTitle))throw new Error('Original-language material needs a language code, original title and source URL');
 out.countries=[...new Set(input.countries)];out.related=!!input.related;return out;
}
function auditStatement(env,request,action,record,before,deleted=false){return database(env).prepare('INSERT INTO audit_log (id,at,action,record_id,name,ip,before,after,revision) SELECT ?,?,?,?,?,?,?,?,(SELECT revision FROM records WHERE id=?) WHERE changes() > 0').bind(crypto.randomUUID(),Date.now(),action,record.id,record.name,request.headers.get('CF-Connecting-IP')||'Unavailable',before?JSON.stringify(before):null,action==='delete'||deleted?null:JSON.stringify(record),record.id);}
// v3.8.0: shared presentation settings; writes require the existing Admin session.
const paletteIds=['coastal','ocean','forest','plum','slate'];
const defaultConfig={editFlipEnabled:true,editFlipDuration:400,palette:'coastal'};
async function siteConfig(env){const row=await database(env).prepare('SELECT payload FROM site_settings WHERE key=?').bind('presentation').first();return row?{...defaultConfig,...JSON.parse(row.payload)}:{...defaultConfig};}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 try{
  if(path==='/api/catalog'&&request.method==='GET')return json({programs:await records(env),countries:COUNTRIES,config:await siteConfig(env)});
  if(path==='/api/config'&&request.method==='GET')return json(await siteConfig(env));
  if(path.startsWith('/api/')){
   if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin)return json({error:'Invalid request origin'},403);
   if(path==='/api/login'&&request.method==='POST'){
    // A missing deployment setting is not a bad password and must not consume attempts.
    const savedPasswordHash=await adminPasswordHash(env);
    if(!savedPasswordHash)return json({error:'Admin sign-in is not configured on this server. Please contact the site administrator.'},503);
    const db=database(env),now=Date.now(),key=await hash(request.headers.get('CF-Connecting-IP')||'local');
    await db.prepare('INSERT INTO attempts (key,count,until) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN until < ? THEN 1 ELSE count+1 END, until = CASE WHEN until < ? THEN excluded.until ELSE until END').bind(key,now+900000,now,now).run();
    const attempts=await db.prepare('SELECT count FROM attempts WHERE key = ?').bind(key).first();if(attempts.count>10)return json({error:'Too many attempts. Please try again in 15 minutes.'},429);
    const input=await body(request);if(!await passwordMatches(input.password,savedPasswordHash))return json({error:'Incorrect password'},401);
    const token=hex(crypto.getRandomValues(new Uint8Array(32)));await db.batch([db.prepare('DELETE FROM sessions WHERE expires < ?').bind(now),db.prepare('INSERT INTO sessions (token,expires) VALUES (?,?)').bind(await hash(token),now+28800000),db.prepare('DELETE FROM attempts WHERE key = ?').bind(key)]);
    return json({ok:true},200,{'Set-Cookie':`atlas_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${url.protocol==='https:'?'; Secure':''}`});
   }
   const auth=await session(request,env);
   if(path==='/api/analytics/event'&&request.method==='POST')return collectAnalytics(request,env,auth);
   if(path==='/api/session'&&request.method==='GET')return json({authenticated:!!auth});
   if(!auth)return json({error:'Sign in to edit records'},401);
   if(path==='/api/db-backup'&&request.method==='GET')return await databaseBackup(env);
   const analytics=await analyticsRoute(request,env,path,url);if(analytics)return analytics;
   const transfer=await transferRoute(request,env,path,url);if(transfer)return transfer;
   if(path==='/api/config'&&request.method==='PUT'){
    const input=await body(request);
    if(typeof input.editFlipEnabled!=='boolean'||!Number.isInteger(input.editFlipDuration)||input.editFlipDuration<300||input.editFlipDuration>1600)return json({error:'Choose a duration between 300 and 1600 milliseconds.'},400);
    const palette=input.palette===undefined?(await siteConfig(env)).palette:input.palette;
    if(!paletteIds.includes(palette))return json({error:'Choose one of the five colour palettes.'},400);
    const config={editFlipEnabled:input.editFlipEnabled,editFlipDuration:input.editFlipDuration,palette};
    await database(env).prepare('INSERT INTO site_settings (key,payload) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload').bind('presentation',JSON.stringify(config)).run();return json(config);
   }

   if(path==='/api/audit'&&request.method==='GET'){const result=await database(env).prepare('SELECT id,at,action,record_id,name,ip,revision FROM audit_log ORDER BY at DESC LIMIT 200').all();return json({entries:result.results});}
   const recordHistory=path.match(/^\/api\/records\/([a-zA-Z0-9-]+)\/history$/);
   if(recordHistory&&request.method==='GET'){
    const entries=(await database(env).prepare('SELECT id,at,action,revision,before,after FROM audit_log WHERE record_id=? ORDER BY revision ASC').bind(recordHistory[1]).all()).results;
    const row=await database(env).prepare('SELECT revision FROM records WHERE id=?').bind(recordHistory[1]).first();
    return json({currentRevision:row?.revision??0,entries:entries.map(entry=>{const before=entry.before?JSON.parse(entry.before):null,after=entry.after?JSON.parse(entry.after):null;return {...entry,before,after,summary:summarizeVersion(entry.action,before,after)};})});
   }
   const historyMatch=path.match(/^\/api\/audit\/([a-zA-Z0-9-]+)$/);
   if(historyMatch&&request.method==='GET'){
    const entry=await database(env).prepare('SELECT * FROM audit_log WHERE id = ?').bind(historyMatch[1]).first();if(!entry)return json({error:'Version not found'},404);
    const state=await database(env).prepare('SELECT revision FROM records WHERE id = ?').bind(entry.record_id).first();
    return json({entry:{...entry,before:entry.before?JSON.parse(entry.before):null,after:entry.after?JSON.parse(entry.after):null},currentRevision:state?.revision??0});
   }
   const rollbackMatch=path.match(/^\/api\/rollback\/([a-zA-Z0-9-]+)$/);
   if(rollbackMatch&&request.method==='POST'){
    const input=await body(request);if(!['before','after'].includes(input.side)||!Number.isInteger(input.revision))return json({error:'Choose a version to restore'},400);
    const entry=await database(env).prepare('SELECT * FROM audit_log WHERE id = ?').bind(rollbackMatch[1]).first();if(!entry)return json({error:'Version not found'},404);
    if(input.side==='before'&&entry.revision<=1)return json({error:'Cannot restore a record to a version before v1.'},400);
    const row=await database(env).prepare('SELECT * FROM records WHERE id = ?').bind(entry.record_id).first();
    if(!row||row.revision!==input.revision)return json({error:'Record changed. Review the latest version before restoring.'},409);
    const snapshot=entry[input.side]?JSON.parse(entry[input.side]):null;
    if(snapshot)await checkDuplicate(env,snapshot,entry.record_id);
    const prior=row.deleted?null:JSON.parse(row.payload),restored=snapshot?{...validate(snapshot),id:entry.record_id}:{id:entry.record_id,name:entry.name};
    const write=database(env).prepare('UPDATE records SET payload=?,name_key=?,deleted=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(restored),snapshot?nameKey(restored.name):null,snapshot?0:1,entry.record_id,input.revision);
    const [result]=await database(env).batch([write,auditStatement(env,request,'rollback',restored,prior,!snapshot)]);
    if(!result.meta.changes)return json({error:'Record changed. Review the latest version before restoring.'},409);return json({ok:true});
   }
   if(path==='/api/logout' &&request.method==='POST'){await database(env).prepare('DELETE FROM sessions WHERE token = ?').bind(auth).run();return json({ok:true},200,{'Set-Cookie':'atlas_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});}
   if(path==='/api/records'&&request.method==='POST'){
    const record=validate(await body(request)),id='project-'+crypto.randomUUID();record.id=id;await checkDuplicate(env,record);
    await database(env).batch([database(env).prepare('INSERT INTO records (id,payload,name_key,deleted,revision) VALUES (?,?,?,0,1)').bind(id,JSON.stringify(record),nameKey(record.name)),auditStatement(env,request,'create',record,null)]);return json({id},201);
   }
   const match=path.match(/^\/api\/records\/([a-zA-Z0-9_-]+)$/);
   if(match&&['PUT','DELETE'].includes(request.method)){
    const input=await body(request),id=match[1],revision=input.revision;
    if(!Number.isInteger(revision)||revision<0)return json({error:'Missing record revision'},400);
    const current=(await records(env)).find(p=>p.id===id);if(!current)return json({error:'Record not found'},404);
    if(current.revision!==revision)return json({error:'This record changed. Reload the record before saving.'},409);
    const record=request.method==='PUT'?{...validate(input),id}:current;
    if(request.method==='PUT')await checkDuplicate(env,record,id);
    const write=database(env).prepare('INSERT INTO records (id,payload,name_key,deleted,revision) VALUES (?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,name_key=excluded.name_key, deleted=excluded.deleted, revision=records.revision+1 WHERE records.revision=?').bind(id,JSON.stringify(record),request.method==='DELETE'?null:nameKey(record.name),request.method==='DELETE'?1:0,revision);
    const [result]=await database(env).batch([write,auditStatement(env,request,request.method==='DELETE'?'delete':'update',record,current)]);
    if(!result.meta.changes)return json({error:'This record changed. Reload before saving.'},409);return json({ok:true});
   }
   return json({error:'Not found'},404);
  }
  if(path==='/healthz'){await database(env).prepare('SELECT COUNT(*) AS n FROM records').first();return new Response('ok');}
  if(['/log','/log/','/log.html'].includes(path))return Response.redirect(url.origin+'/admin#record-history',302);
  const asset=ASSETS[path==='/'?'/index.html':path==='/admin'||path==='/admin/'?'/admin.html':path];if(!asset)return new Response('Not found',{status:404});
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
 }catch(error){console.error('Atlas request failed',error.message);return json({error:path.startsWith('/api/')&&['POST','PUT'].includes(request.method)&&!(error.message||'').includes('SQL')?error.message:'The data service is unavailable. Please retry.'},400);}
}};
