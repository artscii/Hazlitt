// v4.8.3: country-derived continent filters shared by public and Admin searches.
// v4.8.1: fast cached full-text search, without AI or inferred concept matches.
globalThis.AtlasSearch=(()=>{
 const continentCountries={
 Africa:'Algeria|Angola|Benin|Bir Tawil|Botswana|Burkina Faso|Burundi|Cabo Verde|Cameroon|Central African Republic|Chad|Comoros|Democratic Republic of the Congo|Djibouti|Egypt|Equatorial Guinea|Eritrea|Eswatini|Ethiopia|Gabon|Gambia|Ghana|Guinea|Guinea-Bissau|Ivory Coast|Kenya|Lesotho|Liberia|Libya|Madagascar|Malawi|Mali|Mauritania|Mauritius|Morocco|Mozambique|Namibia|Niger|Nigeria|Republic of the Congo|Rwanda|Saint Helena|São Tomé and Principe|Senegal|Seychelles|Sierra Leone|Somalia|Somaliland|South Africa|South Sudan|Sudan|Tanzania|Togo|Tunisia|Uganda|Western Sahara|Zambia|Zimbabwe',
 Asia:'Afghanistan|Akrotiri Sovereign Base Area|Armenia|Azerbaijan|Bahrain|Bangladesh|Baykonur Cosmodrome|Bhutan|British Indian Ocean Territory|Brunei|Cambodia|China|Cyprus|Cyprus No Mans Area|Dhekelia Sovereign Base Area|East Timor|Georgia|Hong Kong S.A.R.|India|Indonesia|Iran|Iraq|Israel|Japan|Jordan|Kazakhstan|Kuwait|Kyrgyzstan|Laos|Lebanon|Macao S.A.R|Malaysia|Maldives|Mongolia|Myanmar|Nepal|North Korea|Northern Cyprus|Oman|Pakistan|Palestine|Philippines|Qatar|Saudi Arabia|Scarborough Reef|Siachen Glacier|Singapore|South Korea|Spratly Islands|Sri Lanka|Syria|Taiwan|Tajikistan|Thailand|Turkey|Turkmenistan|United Arab Emirates|Uzbekistan|Vietnam|Yemen',
 Europe:'Aland|Albania|Andorra|Austria|Belarus|Belgium|Bosnia and Herzegovina|Bulgaria|Croatia|Czechia|Denmark|Estonia|Faroe Islands|Finland|France|Germany|Gibraltar|Greece|Guernsey|Hungary|Iceland|Ireland|Isle of Man|Italy|Jersey|Kosovo|Latvia|Liechtenstein|Lithuania|Luxembourg|Malta|Moldova|Monaco|Montenegro|Netherlands|North Macedonia|Norway|Poland|Portugal|Republic of Serbia|Romania|Russia|San Marino|Slovakia|Slovenia|Spain|Sweden|Switzerland|Ukraine|United Kingdom|Vatican',
 'North America':'Anguilla|Antigua and Barbuda|Aruba|Bajo Nuevo Bank (Petrel Is.)|Barbados|Belize|Bermuda|British Virgin Islands|Canada|Cayman Islands|Clipperton Island|Costa Rica|Cuba|Curaçao|Dominica|Dominican Republic|El Salvador|Greenland|Grenada|Guatemala|Haiti|Honduras|Jamaica|Mexico|Montserrat|Nicaragua|Panama|Puerto Rico|Saint Barthelemy|Saint Kitts and Nevis|Saint Lucia|Saint Martin|Saint Pierre and Miquelon|Saint Vincent and the Grenadines|Serranilla Bank|Sint Maarten|The Bahamas|Trinidad and Tobago|Turks and Caicos Islands|US Naval Base Guantanamo Bay|United States Virgin Islands|United States of America',
 'South America':'Argentina|Bolivia|Brazil|Brazilian Island|Chile|Colombia|Ecuador|Falkland Islands|Guyana|Paraguay|Peru|Southern Patagonian Ice Field|Suriname|Uruguay|Venezuela',
 Oceania:'American Samoa|Ashmore and Cartier Islands|Australia|Cook Islands|Coral Sea Islands|Federated States of Micronesia|Fiji|French Polynesia|Guam|Indian Ocean Territories|Kiribati|Marshall Islands|Nauru|New Caledonia|New Zealand|Niue|Norfolk Island|Northern Mariana Islands|Palau|Papua New Guinea|Pitcairn Islands|Samoa|Solomon Islands|Tonga|Tuvalu|United States Minor Outlying Islands|Vanuatu|Wallis and Futuna',
 Antarctica:'Antarctica|French Southern and Antarctic Lands|Heard Island and McDonald Islands|South Georgia and the Islands'
};
const continentByCountry=new Map(Object.entries(continentCountries).flatMap(([continent,names])=>names.split('|').map(name=>[name,continent])));
 const continentsOf=project=>[...new Set((project.countries||[]).map(country=>continentByCountry.get(country)).filter(Boolean))];
 const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const flatten=value=>Array.isArray(value)?value.map(flatten).join(' '):value&&typeof value==='object'?Object.values(value).map(flatten).join(' '):typeof value==='string'?value:'';
 const textCache=new WeakMap();
 function textOf(project){if(!textCache.has(project))textCache.set(project,normalize(flatten(project)));return textCache.get(project);}
 const unquote=value=>normalize(value).replace(/["“”]/g,'').trim();
 const countryNames=new Map([...continentByCountry.keys()].map(name=>[normalize(name),name]));
 function parse(query){
  const years=[];
  const rest=unquote(query).replace(/\b(?:year\s*:\s*)?((?:19|20)\d{2})(?:\s*[-–—]\s*((?:19|20)\d{2}))?\b/g,(_,first,last)=>{years.push([Number(first),Number(last||first)]);return ' ';});
  const continents=[];
  const words=rest.replace(/\b(north america|south america|africa|asia|europe|oceania|antarctica)\b/g,name=>{continents.push(name);return ' ';});
  const country=countryNames.get(words.trim());
  return {years,continents,countries:country?[country]:[],terms:words.trim().split(/\s+/).filter(Boolean)};
 }
 const inCountries=(p,names)=>names.every(name=>(p.countries||[]).includes(name));
 const inContinents=(p,names)=>names.every(name=>continentsOf(p).some(continent=>normalize(continent)===name));
 const inYears=(p,years)=>years.every(([min,max])=>Number(p.publicationYear)>=min&&Number(p.publicationYear)<=max);
 function matches(project,query,extra=''){const {years,terms,continents,countries}=parse(query);const text=normalize(extra)+' '+textOf(project);return inCountries(project,countries)&&inContinents(project,continents)&&inYears(project,years)&&terms.every(term=>text.includes(term));}

 // Public evidence only: administrative notes and implementation details never become hits.
 const publicFields=['name','short','outcome','status','geo','countries','publicationYear','evidenceBasis','sampleDetails','metric','metricLabel','partners','followUp','originalTitle','originalSummary','originalOutcome'];
 const defaultThesaurus=[
  {term:'colposcopy',equivalents:['videocolposcopy','video colposcopy'],related:[],enabled:true},
  {term:'screening',equivalents:[],related:['cytology','colposcopy','hpv testing'],enabled:true},
  {term:'pap smear',equivalents:['pap test','papanicolaou test'],related:['cervical cytology'],enabled:true},
  {term:'hpv',equivalents:['human papillomavirus'],related:[],enabled:true},
  {term:'via',equivalents:['visual inspection with acetic acid'],related:[],enabled:true},
  {term:'ai',equivalents:['artificial intelligence'],related:['machine learning','deep learning'],enabled:true},
  {term:'self sampling',equivalents:['self collection'],related:['self screening'],enabled:true}
 ];
 const tokens=value=>normalize(value).replace(/<[^>]*>/g,' ').match(/[\p{L}\p{N}]+/gu)||[];
 const stop=new Set('a an the is are was were of for to in on at and or with by from what which where how can do does using use that this studies study projects project'.split(' '));
 const publicText=p=>publicFields.map(k=>Array.isArray(p[k])?p[k].join(' '):String(p[k]??'')).join(' ');
 const phrase=value=>' '+tokens(value).join(' ')+' ';
 function createIndex(projects,thesaurus=defaultThesaurus){
  const docs=projects.map((p,i)=>{const text=phrase(publicText(p)),words=tokens(publicText(p)),tf=new Map();for(const w of words)tf.set(w,(tf.get(w)||0)+1);return {p,i,text,title:phrase(p.name),words,tf};});
  const df=new Map();for(const d of docs)for(const w of d.tf.keys())df.set(w,(df.get(w)||0)+1);
  const avg=docs.reduce((n,d)=>n+d.words.length,0)/Math.max(1,docs.length)||1,cache=new Map();
  const entries=thesaurus.filter(e=>e.enabled!==false).map(e=>({...e,terms:[e.term,...e.equivalents].map(t=>tokens(t).join(' ')),related:(e.related||[]).map(t=>tokens(t).join(' '))}));
  function search(query){
   const key=normalize(query).trim();if(cache.has(key))return cache.get(key);
   const numbered=key.match(/^project\s*#?\s*(\d+)$/);if(numbered){const p=docs[Number(numbered[1])-1]?.p;const results=p?[{id:p.id,score:100,kind:'bm25',matchedTerms:[]}]:[];return {ids:new Set(results.map(r=>r.id)),results,candidates:[],terms:[],ranked:true};}
   // Country: and basis: clauses are constraints, never semantic hints.
   let raw=key;const scopedCountries=[],basis=[];
   raw=raw.replace(/\b(country|basis):(?:"([^"]+)"|([^\s]+))/g,(_,kind,a,b)=>{(kind==='country'?scopedCountries:basis).push(a||b);return ' ';});
   const parsed=parse(raw),{years,continents}=parsed;
   let remaining=tokens(parsed.terms.join(' ')).join(' ');
   const countries=[...parsed.countries];
   for(const [name,canonical]of [...countryNames].sort((a,b)=>b[0].length-a[0].length))if((' '+remaining+' ').includes(' '+name+' ')){countries.push(canonical);remaining=(' '+remaining+' ').replace(' '+name+' ',' ').trim();}
   countries.push(...scopedCountries.map(c=>countryNames.get(c)||c));
   const groups=[];
   for(const e of entries.sort((a,b)=>Math.max(...b.terms.map(t=>t.length))-Math.max(...a.terms.map(t=>t.length)))){
    const found=e.terms.find(t=>(' '+remaining+' ').includes(' '+t+' '));if(!found)continue;
    groups.push({original:found,equivalents:e.terms.filter(t=>t!==found),related:e.related});remaining=(' '+remaining+' ').replace(' '+found+' ',' ').trim();
   }
   for(const word of tokens(remaining).filter(w=>!stop.has(w)))groups.push({original:word,equivalents:[],related:[]});
   const terms=groups.map(g=>g.original),hasText=groups.length>0;
   const results=[],candidates=[];
   for(const d of docs){
    if(!inCountries(d.p,countries)||!inContinents(d.p,continents)||!inYears(d.p,years)||!basis.every(b=>normalize(d.p.evidenceBasis).includes(b)))continue;
    if(!hasText){if(!key||countries.length||continents.length||years.length||basis.length)results.push({id:d.p.id,score:0,kind:'filter',matchedTerms:[]});continue;}
    const matched=groups.map(g=>d.text.includes(' '+g.original+' ')?{term:g.original,tier:0}:g.equivalents.find(t=>d.text.includes(' '+t+' '))?{term:g.equivalents.find(t=>d.text.includes(' '+t+' ')),tier:1}:g.related.find(t=>d.text.includes(' '+t+' '))?{term:g.related.find(t=>d.text.includes(' '+t+' ')),tier:2}:null);
    if(matched.some(m=>!m))continue; // Every substantive concept must have evidence; unrelated words cannot force nearest neighbours.
    const tier=Math.max(...matched.map(m=>m.tier));let score=0;
    for(const m of matched)for(const w of tokens(m.term)){const tf=d.tf.get(w)||0,idf=Math.log(1+(docs.length-(df.get(w)||0)+.5)/((df.get(w)||0)+.5));score+=idf*tf*2.2/(tf+1.2*(.25+.75*d.words.length/avg))*(d.title.includes(' '+w+' ')?3:1);}
    if(d.title===phrase(raw))score+=100;
    const result={id:d.p.id,score,tier,kind:tier===2?'related':tier===1?'thesaurus':'bm25',matchedTerms:matched.map(m=>m.term)};
    (tier===2?candidates:results).push(result);
   }
   results.sort((a,b)=>(a.tier||0)-(b.tier||0)||b.score-a.score);candidates.sort((a,b)=>b.score-a.score);
   const result={ids:new Set(results.map(r=>r.id)),results,candidates,terms,ranked:hasText};cache.set(key,result);if(cache.size>80)cache.delete(cache.keys().next().value);return result;
  }
  return {search};
 }
 return {parse,matches,normalize,unquote,createIndex,continentByCountry,continentsOf,publicFields,publicText,defaultThesaurus};
})();
