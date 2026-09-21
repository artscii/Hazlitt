// v4.8.1: fast cached full-text search, without AI or inferred concept matches.
globalThis.AtlasSearch=(()=>{
 const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const flatten=value=>Array.isArray(value)?value.map(flatten).join(' '):value&&typeof value==='object'?Object.values(value).map(flatten).join(' '):typeof value==='string'?value:'';
 const textCache=new WeakMap();
 function textOf(project){if(!textCache.has(project))textCache.set(project,normalize(flatten(project)));return textCache.get(project);}
 function parse(query){
  const years=[];
  const rest=normalize(query).replace(/\b(?:year\s*:\s*)?((?:19|20)\d{2})(?:\s*[-–—]\s*((?:19|20)\d{2}))?\b/g,(_,first,last)=>{years.push([Number(first),Number(last||first)]);return ' ';});
  return {years,terms:rest.trim().split(/\s+/).filter(Boolean)};
 }
 const inYears=(p,years)=>years.every(([min,max])=>Number(p.publicationYear)>=min&&Number(p.publicationYear)<=max);
 function matches(project,query,extra=''){const {years,terms}=parse(query);const text=normalize(extra)+' '+textOf(project);return inYears(project,years)&&terms.every(term=>text.includes(term));}
 function createIndex(projects){
  const docs=projects.map((p,i)=>({p,text:normalize('Project '+(i+1)+' '+String(i+1).padStart(2,'0'))+' '+textOf(p)})),cache=new Map();
  function search(query){
   const key=normalize(query).trim();if(cache.has(key))return cache.get(key);
   const {years,terms}=parse(query);
   const ids=new Set(docs.filter(d=>inYears(d.p,years)&&terms.every(term=>d.text.includes(term))).map(d=>d.p.id));
   const result={ids,terms};cache.set(key,result);if(cache.size>80)cache.delete(cache.keys().next().value);return result;
  }
  return {search};
 }
 return {parse,matches,normalize,createIndex};
})();
