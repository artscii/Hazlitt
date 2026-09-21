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
 function createIndex(projects){
  const docs=projects.map((p,i)=>({p,text:normalize('Project '+(i+1)+' '+String(i+1).padStart(2,'0'))+' '+textOf(p)})),cache=new Map();
  function search(query){
   const key=normalize(query).trim();if(cache.has(key))return cache.get(key);
   const {years,terms,continents,countries}=parse(query);
   const ids=new Set(docs.filter(d=>inCountries(d.p,countries)&&inContinents(d.p,continents)&&inYears(d.p,years)&&terms.every(term=>d.text.includes(term))).map(d=>d.p.id));
   const result={ids,terms};cache.set(key,result);if(cache.size>80)cache.delete(cache.keys().next().value);return result;
  }
  return {search};
 }
 return {parse,matches,normalize,unquote,createIndex,continentByCountry,continentsOf};
})();
