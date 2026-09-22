// Fixed Atlas metadata constraints are enforced separately from QMD relevance.
export function parseParameters(input, initial={}) {
 const scope={...initial};
 const query=input.replace(/\b(country|continent|year|basis):(?:"([^"]+)"|([^\s]+))/gi,(_,key,quoted,value)=>{
  key=key.toLowerCase();const text=(quoted??value).trim();
  if(key==='year'&&!/^\d{4}$/.test(text))throw new Error('Use a four-digit year, for example year:2024.');
  if(!text)throw new Error('Search parameters must have a value.');
  if(scope[key]&&scope[key].toLowerCase()!==text.toLowerCase())throw new Error('Conflicting '+key+' filters. Use one value in the query or filter controls.');
  scope[key]=text;return '';
 }).replace(/\s+/g,' ').trim();
 if(/\b(country|continent|year|basis):/i.test(query))throw new Error('Check your search parameters. Put multi-word values in double quotes.');
 return {query,scope};
}
