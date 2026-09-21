// v4.7.0: years filter publicationYear, never an incidental review date or URL.
globalThis.AtlasSearch=(()=>{
 const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function parse(query){
  const years=[];
  const rest=normalize(query).replace(/\b(?:year\s*:\s*)?((?:19|20)\d{2})(?:\s*[-–—]\s*((?:19|20)\d{2}))?\b/g,(_,first,last)=>{years.push([Number(first),Number(last||first)]);return ' ';});
  return {years,terms:rest.trim().split(/\s+/).filter(Boolean)};
 }
 function matches(project,query,extra=''){
  const {years,terms}=parse(query),year=Number(project.publicationYear);
  if(years.some(([min,max])=>!year||year<min||year>max))return false;
  const text=normalize(extra+' '+Object.values(project).flat().filter(value=>typeof value==='string').join(' '));
  return terms.every(term=>text.includes(term));
 }
 return {parse,matches};
})();
