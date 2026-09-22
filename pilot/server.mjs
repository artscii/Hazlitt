// Dedicated read-only model service. No Atlas database or administrator credentials.
import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {pilotRoute} from './service.mjs';
const secret=process.env.QMD_SERVICE_TOKEN;
if(!secret||secret.length<32)throw Error('QMD_SERVICE_TOKEN must contain at least 32 characters');
const catalogURL=new URL(process.env.ATLAS_CATALOG_URL);
if(catalogURL.protocol!=='https:')throw Error('Catalogue must use HTTPS');
let catalog,expires=0;
async function getCatalog(){
 if(catalog&&Date.now()<expires)return catalog;
 const response=await fetch(catalogURL,{signal:AbortSignal.timeout(10000),redirect:'error'});
 if(!response.ok)throw Error('Catalogue unavailable');
 const data=await response.json();if(!Array.isArray(data.programs))throw Error('Invalid catalogue');
 catalog={programs:data.programs};expires=Date.now()+60000;return catalog;
}
let tokens=12,last=Date.now();
const server=http.createServer(async(req,res)=>{
 const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(req.url==='/health'&&req.method==='GET')return reply(200,{ok:true});
 const actual=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+secret);
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return reply(401,{error:'Unauthorized'});
 if(req.url!=='/api/search-pilot/compare'||req.method!=='POST')return reply(404,{error:'Not found'});
 tokens=Math.min(12,tokens+(Date.now()-last)/5000);last=Date.now();if(tokens<1)return reply(429,{error:'Search busy'});tokens--;
 try{
  let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>4096)return reply(413,{error:'Request too large'});chunks.push(chunk);}
  const request=new Request('http://qmd/api/search-pilot/compare',{method:'POST',headers:{Origin:'http://qmd','Content-Type':'application/json'},body:Buffer.concat(chunks)});
  const response=await pilotRoute(request,getCatalog);res.writeHead(response.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(await response.text());
 }catch{reply(503,{error:'Semantic search unavailable'});}
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT||8080),'0.0.0.0');
