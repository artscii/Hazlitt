// v4.8.0: index once, cache queries, preserve exact matches and hard year/country constraints.
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
 // Retrieval equivalences, not assertions that modalities or study designs are interchangeable.
 const concepts=[
  ['phone','phones','smartphone','smartphones','mobile phone'],
  ['slide scans','slide scan','slides','cytology','pap smear','pap smears','whole slide'],
  ['patient examinations','patient exams','real patients','real patient','in vivo','clinical examination'],
  ['precancer','precancerous','pre cancer','pre-cancer','cervical intraepithelial neoplasia','cin2','cin3'],
  ['missed cases','false negatives','false negative','sensitivity'],
  ['false positives','false positive','specificity'],
  ['machine learning','deep learning','artificial intelligence','ai'],
  ['self sampling','self-sampling','self collection','self-collection'],
  ['resource limited','low resource','underserved','low-resource','resource-limited'],
  ['human papillomavirus','hpv'],['automated visual evaluation','ave'],
  ['visual inspection','via','acetic acid'],['randomized','randomised'],
 ];
 const stop=new Set('a an the in of for to from with using use uses used on at by and or which what find show me projects project studies study that have has were was is are can screen screening cervical cancer results'.split(' '));
 const bounded=(text,term)=>new RegExp('(?:^|[^\\p{L}\\p{N}])'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=$|[^\\p{L}\\p{N}])','u').test(text);
 function groupsFor(query){
  let text=parse(query).terms.join(' ').replace(/[?!,;]/g,' ');const groups=[];
  for(const aliases of concepts){const found=[...aliases].sort((a,b)=>b.length-a.length).find(alias=>bounded(text,alias));if(found){groups.push({term:found,aliases});text=text.replace(found,' ');}}
  for(const term of text.split(/\s+/).filter(t=>t&&!stop.has(t)))groups.push({term,aliases:[term]});
  return groups.slice(0,16);
 }
 function createIndex(projects){
  const docs=projects.map((p,i)=>({p,text:normalize('Project '+(i+1)+' '+String(i+1).padStart(2,'0'))+' '+textOf(p)}));
  const countries=[...new Set(projects.flatMap(p=>p.countries||[]))].map(c=>[c,normalize(c)]);
  const cache=new Map();
  function search(query,expansions=[]){
   const key=normalize(query).trim()+'|'+JSON.stringify(expansions);if(cache.has(key))return cache.get(key);
   const parsed=parse(query),groups=groupsFor(query),countryNames=countries.filter(([,c])=>bounded(normalize(query),c)).map(([c])=>c);
   // AI may add synonyms to an existing concept only; it cannot drop concepts or change years/countries.
   const accepted=[];
   for(const group of groups){const addition=expansions.find(e=>normalize(e?.term)===group.term);if(!Array.isArray(addition?.synonyms))continue;
    const synonyms=addition.synonyms.filter(s=>typeof s==='string').map(normalize).filter(s=>s.length>=3&&s.length<=60&&!/\d|[<>]/.test(s)&&!stop.has(s)&&docs.some(d=>bounded(d.text,s))).slice(0,4);
    group.aliases=[...new Set([...group.aliases,...synonyms])];accepted.push(...synonyms);
   }
   const exact=new Set(),semantic=new Set();
   for(const d of docs){if(!inYears(d.p,parsed.years))continue;
    if(parsed.terms.every(t=>d.text.includes(t))){exact.add(d.p.id);continue;}
    if(countryNames.length&&!countryNames.every(c=>d.p.countries?.includes(c)))continue;
    if(groups.length&&groups.every(g=>g.aliases.some(a=>bounded(d.text,a))))semantic.add(d.p.id);
   }
   // Keep the established ascending Project number order, including semantic additions.
   const ids=new Set(docs.filter(d=>exact.has(d.p.id)||semantic.has(d.p.id)).map(d=>d.p.id));
   const result={ids,exact,semantic,terms:[...new Set([...parsed.terms,...groups.flatMap(g=>g.aliases)])],expansions:[...new Set(accepted)]};
   cache.set(key,result);if(cache.size>80)cache.delete(cache.keys().next().value);return result;
  }
  return {search,groupsFor};
 }
 return {parse,matches,normalize,createIndex,groupsFor};
})();
