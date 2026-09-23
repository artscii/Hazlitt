// Local-only QMD comparison pilot. Main application and hosted Worker need no QMD dependency.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import '../dist/search.js';
import {parseParameters} from './parameters.mjs';
import {startProfile} from './profiling.mjs';
import {catalogSearch} from './retrieval.mjs';
const root=path.resolve(process.env.QMD_DATA_DIR||'pilot/.data');
process.env.XDG_CACHE_HOME ||= path.join(root,'cache');
const publicFields=['name','short','outcome','status','geo','countries','publicationYear','evidenceBasis','sampleDetails','metric','metricLabel','partners','followUp','followUpDate','originalLanguage','originalTitle','originalSummary','originalOutcome','source','source2','originalSource'];
export function projectDocument(p){return '# '+p.name+'\n\n'+publicFields.filter(k=>p[k]!==undefined).map(k=>'## '+k+'\n'+(Array.isArray(p[k])?p[k].join(', '):String(p[k]).replace(/<[^>]*>/g,' '))).join('\n\n');}
export function eligible(p,query,scope={}){const parsed=AtlasSearch.parse(query);return (!scope.country||p.countries?.some(c=>c.toLowerCase()===scope.country.toLowerCase()))&&(!scope.basis||p.evidenceBasis?.toLowerCase()===scope.basis.toLowerCase())&&(!scope.year||Number(p.publicationYear)===Number(scope.year))&&(!scope.continent||AtlasSearch.continentsOf(p).some(c=>c.toLowerCase()===scope.continent.toLowerCase()))&&parsed.countries.every(c=>p.countries?.includes(c))&&parsed.continents.every(c=>AtlasSearch.continentsOf(p).some(x=>x.toLowerCase()===c))&&parsed.years.every(([a,b])=>Number(p.publicationYear)>=a&&Number(p.publicationYear)<=b);}
let store,version='',running=false,lastError='',indexedAt=null;
const cache=new Map();
async function sync(programs){
 const docs=programs.map(p=>({id:p.id,text:projectDocument(p),revision:p.revision||0}));
 const digest=createHash('sha256').update(JSON.stringify(docs)).digest('hex');
 if(digest===version)return {changed:false};
 const dir=path.join(root,'documents');await fs.mkdir(dir,{recursive:true});
 const files=new Set();for(const d of docs){const name=createHash('sha256').update(d.id).digest('hex')+'.md';files.add(name);const file=path.join(dir,name);let old;try{old=await fs.readFile(file,'utf8');}catch{}if(old!==d.text)await fs.writeFile(file,d.text);}
 for(const name of await fs.readdir(dir))if(name.endsWith('.md')&&!files.has(name))await fs.unlink(path.join(dir,name));
 if(!store){const {createStore}=await import('@tobilu/qmd');store=await createStore({dbPath:path.join(root,'index.sqlite'),config:{collections:{atlas:{path:dir,pattern:'**/*.md'}}}});}
 await store.update();await store.embed({collection:'atlas'});version=digest;indexedAt=new Date().toISOString();cache.clear();return {changed:true};
}
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function pilotRoute(request,getCatalog){
 const url=new URL(request.url);
 if(url.pathname==='/api/search-pilot/status')return reply({enabled:true,engine:'QMD 2.8.3',indexedAt,running,error:lastError});
 if(url.pathname!=='/api/search-pilot/compare')return reply({error:'Not found'},404);
 if(request.method!=='POST')return reply({error:'Use POST'},405);
 if(request.headers.get('Origin')!==url.origin)return reply({error:'Invalid origin'},403);
 if(running)return reply({error:'Another comparison is running. Try again shortly.'},429);
 let input;try{input=await request.json();}catch{return reply({error:'Invalid request'},400);}
 let query=typeof input.query==='string'?input.query.trim():'';if(!query||query.length>500)return reply({error:'Enter a query of 1–500 characters.'},400);
 let scope=input.scope||{};const deep=input.deep===true;const enteredQuery=query;
 if(Object.values(scope).some(v=>typeof v!=='string'||v.length>150))return reply({error:'Invalid filters'},400);
 try{({query,scope}=parseParameters(query,scope));}catch(error){return reply({error:error.message},400);}
 running=true;lastError='';const started=performance.now();let profiling;const timings={};
 try{
  const {programs}=await getCatalog();timings.catalogMs=performance.now()-started;const indexStart=performance.now();const indexing=await sync(programs),indexMs=performance.now()-indexStart;
  const key=JSON.stringify([version,enteredQuery,scope,deep]);if(cache.has(key)){console.log('QMD_PROFILE '+JSON.stringify({cached:true,catalogMs:Math.round(timings.catalogMs),indexMs:Math.round(indexMs),totalMs:Math.round(performance.now()-started)}));return reply({...cache.get(key),timings:{cached:true,catalogMs:Math.round(timings.catalogMs),indexMs:Math.round(indexMs)},cached:true,indexMs:Math.round(indexMs),indexChanged:false,totalMs:Math.round(performance.now()-started)});}
  const allowed=new Set(programs.filter(p=>eligible(p,query,scope)).map(p=>p.id));
  const aStart=performance.now();const a=programs.filter((p,i)=>allowed.has(p.id)&&AtlasSearch.matches(p,query,'Project '+(i+1)+' '+String(i+1).padStart(2,'0'))).map(p=>({id:p.id}));const aMs=performance.now()-aStart;
  profiling=await startProfile(store.internal?.llm);const bStart=performance.now();const results=query?(deep?await store.search({query,collection:'atlas',limit:programs.length,candidateLimit:programs.length,rerank:true}):await catalogSearch(store,query,programs.length,timings)):[];
  const idsByFilename=new Map(programs.map(p=>[createHash('sha256').update(p.id).digest('hex')+'.md',p.id]));const seen=new Set();
  const b=query?results.flatMap(r=>{const id=idsByFilename.get(path.basename(r.file));if(!id||!allowed.has(id)||seen.has(id))return [];seen.add(id);return [{id,score:r.score,passage:(r.bestChunk||r.body||'').slice(0,600)}];}).slice(0,10):programs.filter(p=>allowed.has(p.id)).map(p=>({id:p.id}));
  const model=profiling.finish();profiling=null;Object.assign(timings,model);timings.indexMs=indexMs;timings.queryMs=performance.now()-bStart;timings.vectorLookupAndOverheadMs=Math.max(0,(timings.vectorTotalMs||0)-model.modelLoadMs-model.contextSetupMs-model.embeddingMs);
  for(const k of Object.keys(timings))if(k.endsWith('Ms'))timings[k]=+timings[k].toFixed(2);
  console.log('QMD_PROFILE '+JSON.stringify({deep,...timings}));
  const result={timings,query:enteredQuery,semanticQuery:query,scope,deep,a,b,aMs:+aMs.toFixed(2),bMs:Math.round(performance.now()-bStart),indexMs:Math.round(indexMs),indexChanged:indexing.changed,indexedAt,revision:version,engine:'QMD 2.8.3',cached:false,totalMs:Math.round(performance.now()-started)};
  cache.set(key,result);if(cache.size>50)cache.delete(cache.keys().next().value);return reply(result);
 }catch(error){lastError=error.message;console.error('QMD pilot:',error.message);return reply({error:'QMD could not complete this comparison. '+error.message},503);}finally{profiling?.finish();running=false;}
}

// Authenticated readiness probe: warm the actual store, coalescing all browser polls.
let probeAt=0,probeReady=false,probing=false;
export function readiness(getCatalog){
 if(!probing&&!running&&Date.now()-probeAt>60000){
  probing=true;running=true;probeReady=false;
  (async()=>{let profile;const t=performance.now();try{
   const {programs}=await getCatalog();await sync(programs);
   profile=await startProfile(store.internal?.llm);
   await store.internal.llm.embed('cervical screening readiness');
   probeReady=true;
   console.log('QMD_PROFILE '+JSON.stringify({phase:'readiness',...profile.finish(),totalMs:Math.round(performance.now()-t)}));profile=null;
  }catch(error){console.error('QMD readiness:',error.message);probeReady=false;}
  finally{profile?.finish();probeAt=Date.now();probing=false;running=false;}})();
 }
 return {ready:probeReady&&!running&&!!store?.internal?.llm?.embedContexts?.length,indexedAt,warming:probing};
}
