// QMD semantic search service. Main application and hosted Worker need no QMD dependency.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import '../dist/search.js';
import {parseParameters} from './parameters.mjs';
import {startProfile} from './profiling.mjs';
import {createWorkQueue} from './work-queue.mjs';
const root=path.resolve(process.env.QMD_DATA_DIR||'pilot/.data');
process.env.XDG_CACHE_HOME ||= path.join(root,'cache');
const publicFields=['name','short','outcome','status','geo','countries','publicationYear','evidenceBasis','sampleDetails','metric','metricLabel','partners','followUp','followUpDate','originalLanguage','originalTitle','originalSummary','originalOutcome','source','source2','originalSource'];
export function projectDocument(p){return '# '+p.name+'\n\n'+publicFields.filter(k=>p[k]!==undefined).map(k=>'## '+k+'\n'+(Array.isArray(p[k])?p[k].join(', '):String(p[k]).replace(/<[^>]*>/g,' '))).join('\n\n');}
export function eligible(p,query,scope={}){const parsed=AtlasSearch.parse(query);return (!scope.country||p.countries?.some(c=>c.toLowerCase()===scope.country.toLowerCase()))&&(!scope.basis||p.evidenceBasis?.toLowerCase()===scope.basis.toLowerCase())&&(!scope.year||Number(p.publicationYear)===Number(scope.year))&&(!scope.continent||AtlasSearch.continentsOf(p).some(c=>c.toLowerCase()===scope.continent.toLowerCase()))&&parsed.countries.every(c=>p.countries?.includes(c))&&parsed.continents.every(c=>AtlasSearch.continentsOf(p).some(x=>x.toLowerCase()===c))&&parsed.years.every(([a,b])=>Number(p.publicationYear)>=a&&Number(p.publicationYear)<=b);}
export function createSearchService({openStore,rootDir=root,refreshMs=30000}={}){
 const root=path.resolve(rootDir);
let store,version='',lastError='',indexedAt=null;
let snapshot=null,refreshing=false,refreshAt=0,ready=false;const queue=createWorkQueue();
const cache=new Map();
async function sync(programs){
 const docs=programs.map(p=>({id:p.id,text:projectDocument(p),revision:p.revision||0}));
 const digest=createHash('sha256').update(JSON.stringify(docs)).digest('hex');
 if(digest===version)return {changed:false};
 const dir=path.join(root,'documents');await fs.mkdir(dir,{recursive:true});
 const files=new Set();for(const d of docs){const name=createHash('sha256').update(d.id).digest('hex')+'.md';files.add(name);const file=path.join(dir,name);let old;try{old=await fs.readFile(file,'utf8');}catch{}if(old!==d.text)await fs.writeFile(file,d.text);}
 for(const name of await fs.readdir(dir))if(name.endsWith('.md')&&!files.has(name))await fs.unlink(path.join(dir,name));
 if(!store){const createStore=openStore||(await import('@tobilu/qmd')).createStore;store=await createStore({dbPath:path.join(root,'index.sqlite'),config:{collections:{atlas:{path:dir,pattern:'**/*.md'}}}});}
 // QMD 2.8.3 exposes the per-store runtime; retain its weights and context.
 const llm=store.internal?.llm;if(llm){llm.inactivityTimeoutMs=0;llm.disposeModelsOnInactivity=false;llm.touchActivity();}
 await store.update();await store.embed({collection:'atlas'});version=digest;indexedAt=new Date().toISOString();cache.clear();return {changed:true};
}
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});

async function searchRoute(request,getCatalog){
 if(request.method!=='POST')return reply({error:'Use POST'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
 let input;try{input=await request.json();}catch{return reply({error:'Invalid request'},400);}
 if(typeof input.query!=='string'||!input.query.trim()||input.query.length>500)return reply({error:'Enter a query of 1–500 characters.'},400);
 const started=performance.now();if(!snapshot){readiness(getCatalog);return reply({error:'Search warming up'},503);}
 let parsed;try{parsed=parseParameters(input.query,input.scope||{});}catch(e){return reply({error:e.message},400);}
 const active=snapshot,allowed=new Set(active.programs.filter(p=>eligible(p,parsed.query,parsed.scope)).map(p=>p.id));
 const lexical=active.index.search(parsed.query),base=lexical.results.filter(r=>allowed.has(r.id)),candidates=lexical.candidates.filter(r=>allowed.has(r.id));
 const key=JSON.stringify([active.revision,input.query,parsed.scope]);
 const respond=(results,extra={})=>reply({query:input.query,results,engine:'BM25 + QMD',semanticReady:ready&&!refreshing,revision:active.revision,indexedAt,totalMs:Math.round(performance.now()-started),...extra});
 if(!candidates.length||refreshing||!ready||active.programs.some(p=>AtlasSearch.normalize(p.name)===AtlasSearch.normalize(parsed.query)))return respond(base,{lexicalOnly:true});
 if(cache.has(key))return respond(cache.get(key),{cached:true});
 try{
  const results=await queue.run(key,async()=>{
   // Background indexing cannot start while this queue is active.
   const timings={},profile=await startProfile(store.internal?.llm),t=performance.now();
   try{const vector=await store.searchVector(parsed.query,{collection:'atlas',limit:active.programs.length});
    const byFile=new Map(vector.map(r=>[path.basename(r.file||r.filepath),r.score]));
    // Vector rank is used only for candidates supported by approved related concepts.
    const related=candidates.filter(r=>byFile.has(active.files.get(r.id))).sort((a,b)=>byFile.get(active.files.get(b.id))-byFile.get(active.files.get(a.id)));
    const results=[...base,...related];cache.set(key,results);if(cache.size>80)cache.delete(cache.keys().next().value);return results;
   }finally{Object.assign(timings,profile.finish(),{queryMs:performance.now()-t});console.log('QMD_PROFILE '+JSON.stringify(timings));}
  },request.signal);
  return respond(results);
 }catch(e){lastError=e.message;if(!/cancelled|busy|expired/.test(e.message))ready=false;return respond(base,{lexicalOnly:true,semanticUnavailable:true});}
}

// Refresh off the request path. The previous lexical snapshot remains usable during updates.
function readiness(getCatalog){
 if(!refreshing&&!queue.busy&&Date.now()-refreshAt>refreshMs){
  refreshing=true;
  (async()=>{let profile;const t=performance.now();try{
   const catalog=await getCatalog(),revision=catalog.revision||createHash('sha256').update(JSON.stringify(catalog)).digest('hex');
   if(snapshot?.revision===revision&&ready)return;
   const programs=catalog.programs,index=AtlasSearch.createIndex(programs,catalog.thesaurus?.entries);
   await sync(programs);
   profile=await startProfile(store.internal?.llm);
   if(!ready)await store.internal.llm.embed('cervical screening readiness');
   snapshot={programs,index,revision,files:new Map(programs.map(p=>[p.id,createHash('sha256').update(p.id).digest('hex')+'.md']))};cache.clear();ready=true;
   console.log('QMD_PROFILE '+JSON.stringify({phase:'background-index',...profile.finish(),totalMs:Math.round(performance.now()-t)}));profile=null;
  }catch(e){lastError=e.message;ready=false;console.error('QMD background refresh:',e.message);}
  finally{profile?.finish();refreshAt=Date.now();refreshing=false;}})();
 }
 return {ready:ready&&!refreshing,indexedAt,warming:refreshing,busy:queue.busy,queued:queue.size};
}

return {searchRoute,readiness};
}
const service=createSearchService();
export const searchRoute=service.searchRoute,readiness=service.readiness;
