// Atlas v2.3.3 — Muted catalog record numbers remain consistent across filtered and reordered lists.
// On release: update the footer and source version comments, then add a CHANGELOG.md entry.
(async()=>{
const response=await fetch('/api/catalog',{cache:'no-store'});
if(!response.ok)throw new Error('Project records could not be loaded. Please refresh to retry.');
const catalog=await response.json();window.atlasCatalog=catalog;
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// v4.8.9: placeholder uses the current catalog count, never a hard-coded total.
document.querySelector('#project-search').placeholder=`All ${catalog.programs.length} projects`;
const searchIndex=AtlasSearch.createIndex(catalog.programs);
let chosenMarkerName=null;
const programs=catalog.programs.map(p=>Object.fromEntries(Object.entries(p).map(([key,value])=>[key,typeof value==='string'?escapeHTML(value):value])));
// v4.8.18: constant-time lookups shared by marker and search rendering.
const programsById=new Map(programs.map(p=>[p.id,p]));
// v4.4.0: mobile view changes preserve the existing search, marker and project state.
const mobileViews=document.createElement('nav');mobileViews.className='mobile-view-switch';mobileViews.setAttribute('aria-label','Atlas view');mobileViews.innerHTML='<button type="button" data-view="map" aria-pressed="true">Map</button><button type="button" data-view="list" aria-pressed="false">Project list</button>';
document.querySelector('#map-overview').before(mobileViews);
document.body.dataset.mobileView='map';
function setMobileView(view,scroll=false){document.body.dataset.mobileView=view;mobileViews.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));if(scroll&&matchMedia('(max-width:740px)').matches)mobileViews.scrollIntoView({block:'start',behavior:'instant'});requestAnimationFrame(()=>window.dispatchEvent(new Event('atlas-view-change')));}
mobileViews.onclick=event=>{const button=event.target.closest('[data-view]');if(button)setMobileView(button.dataset.view,true);};
// v4.9.1: swap readable faces at the edge of a short card turn.
const flippingCards=new WeakSet();
function setProjectFace(card,expanded){
 card.classList.toggle('project-expanded',expanded);
 const content=card.querySelector('.project-card-content');if(content)content.scrollTop=0;
 const button=card.querySelector('.project-expand');
 button?.setAttribute('aria-expanded',String(expanded));
 if(button)button.textContent=expanded?'Back to summary':'View evidence & contacts';
 if(expanded)window.dispatchEvent(new CustomEvent('atlas-project-view',{detail:card.id}));
 updateEvidencePanels();
}
function expandProject(card){if(card)setProjectFace(card,true);}
async function flipProject(card){
 if(flippingCards.has(card))return;
 const expanded=!card.classList.contains('project-expanded');
 // v4.9.2: keep the same outer dimensions and centered anchor for both faces.
 const viewport=window.visualViewport?.height||window.innerHeight;
 card.style.height=Math.min(620,Math.max(260,viewport*.62))+'px';
 card.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||!card.animate){setProjectFace(card,expanded);return;}
 flippingCards.add(card);card.classList.add('card-turning');
 const direction=expanded?1:-1;
 let animation;
 try{
  animation=card.animate([{transform:'perspective(1400px) rotateY(0deg)'},{transform:`perspective(1400px) rotateY(${direction*90}deg)`}],{duration:160,easing:'ease-in',fill:'forwards'});
  await animation.finished;
  setProjectFace(card,expanded);animation.cancel();
  animation=card.animate([{transform:`perspective(1400px) rotateY(${-direction*90}deg)`},{transform:'perspective(1400px) rotateY(0deg)'}],{duration:180,easing:'ease-out',fill:'forwards'});
  await animation.finished;
 }catch{setProjectFace(card,expanded);}
 finally{animation?.cancel();card.classList.remove('card-turning');flippingCards.delete(card);updateEvidencePanels();}
}
document.addEventListener('click',event=>{const button=event.target.closest('.project-expand');if(button)flipProject(button.closest('.program'));});
let sharedProjectId=null;
const projectURL=id=>{const url=new URL(location.href);url.search='';url.searchParams.set('project',id);url.hash=id;return url.href;};
// v2.3.0: derive source coverage from the live catalog; never imply a fresh database search.
const sourceGroups=new Map();
for(const project of catalog.programs)for(const field of ['source','source2','originalSource']){
 if(!project[field])continue;
 let url;try{url=new URL(project[field]);}catch{continue;}
 if(!['https:','http:'].includes(url.protocol))continue;
 const host=url.hostname.replace(/^www\./,'');
 const nihSource=host==='pubmed.ncbi.nlm.nih.gov'||(host==='ncbi.nlm.nih.gov'&&url.pathname.startsWith('/pubmed'))?'NIH / NLM · PubMed':host==='pmc.ncbi.nlm.nih.gov'||(host==='ncbi.nlm.nih.gov'&&url.pathname.startsWith('/pmc'))?'NIH / NLM · PubMed Central (PMC)':host==='clinicaltrials.gov'?'NIH / NLM · ClinicalTrials.gov':host==='reporter.nih.gov'?'NIH · RePORTER':host==='cancer.gov'||host.endsWith('.cancer.gov')?'NIH / NCI · National Cancer Institute':host==='nih.gov'||host.endsWith('.nih.gov')?'NIH · '+host:null;
 const group=nihSource||(host.endsWith('cnki.net')?'CNKI journals':host==='cordis.europa.eu'?'European Commission CORDIS':host);
 if(!sourceGroups.has(group))sourceGroups.set(group,new Map());
 const entries=sourceGroups.get(group),key=url.href;
 if(!entries.has(key))entries.set(key,{url:url.href,label:project[field+'Label']||project.name,projects:new Set(),dates:new Set()});
 const entry=entries.get(key);entry.projects.add(project.name);if(project.date)entry.dates.add(project.date);
}
const sourceCount=[...sourceGroups.values()].reduce((count,entries)=>count+entries.size,0);
document.querySelector('#source-directory').innerHTML=`<p>${sourceCount} distinct evidence links across ${sourceGroups.size} sources, cited by ${catalog.programs.length} project records covering ${new Set(catalog.programs.flatMap(p=>p.countries)).size} countries.</p>`;
const nihGroups=[...sourceGroups].filter(([name])=>name.startsWith('NIH'));
if(nihGroups.length)document.querySelector('#source-directory').innerHTML+=`<p><strong>NIH sources included:</strong> ${nihGroups.map(([name,entries])=>`${escapeHTML(name)} (${entries.size})`).join(' · ')}. PubMed indexes research citations; PubMed Central hosts full-text articles. Inclusion does not imply NIH funding or endorsement.</p>`;
document.querySelector('#source-directory').innerHTML+=`<p>Updated automatically from the current project records. These are cited sources, not a claim that every database has been searched exhaustively. Study and review dates are shown with each reference.</p>`+[...sourceGroups].sort(([a],[b])=>a.localeCompare(b)).map(([group,entries])=>`<details class="source-group"><summary>${escapeHTML(group)} <span>${entries.size} ${entries.size===1?'reference':'references'}</span></summary><ul>${[...entries.values()].map(entry=>`<li><a href="${escapeHTML(entry.url)}" target="_blank" rel="noopener">${escapeHTML(entry.label)}</a><p>${escapeHTML([...entry.projects].join(' · '))}</p><p>${escapeHTML([...entry.dates].join(' · '))}</p></li>`).join('')}</ul></details>`).join('');
const legacyPlaces=[{"name": "Guanacaste, Costa Rica", "lon": -85.4, "lat": 10.4, "ids": ["guanacaste"]}, {"name": "Dschang, Cameroon", "lon": 10.05, "lat": 5.45, "ids": ["smartcervix"], "left": true}, {"name": "Uganda", "lon": 32.3, "lat": 2.7, "ids": ["prescriptec", "aspire"]}, {"name": "Bangladesh", "lon": 90.3, "lat": 23.7, "ids": ["prescriptec"]}, {"name": "Senegal", "lon": -14.5, "lat": 14.5, "ids": ["ave"], "left": true}, {"name": "Rwanda / Kigali", "lon": 29.9, "lat": -1.9, "ids": ["ave", "cervi", "dawa"], "left": true}, {"name": "Zambia", "lon": 27, "lat": -13.4, "ids": ["ave", "dawa"], "left": true}, {"name": "Malawi", "lon": 35, "lat": -13.5, "ids": ["ave"]}, {"name": "Zimbabwe", "lon": 29.5, "lat": -20, "ids": ["ave", "ngyn", "dawa"], "left": true}, {"name": "Kinondo, Kenya / Tanga, Tanzania", "lon": 39.3, "lat": -4.7, "ids": ["kinondo", "bombo"]}, {"name": "India", "lon": 79, "lat": 22, "ids": ["ngyn"]}, {"name": "Thailand", "lon": 101, "lat": 15, "ids": ["ngyn"]}, {"name": "Hubei, China", "lon": 112.3, "lat": 31, "ids": ["landing"]}];
const covered=new Set(programs.flatMap(p=>p.countries));
const places=[];
for(const country of catalog.countries.filter(c=>covered.has(c.name))){
 const existing=legacyPlaces.find(p=>p.name.includes(country.name));
 if(country.name==='Tanzania'&&covered.has('Kenya'))continue;
 const names=country.name==='Kenya'&&covered.has('Tanzania')?['Kenya','Tanzania']:[country.name];
 places.push({name:names.length>1?'Kinondo, Kenya / Tanga, Tanzania':existing?.name||country.name,lon:existing?.lon??country.lon,lat:existing?.lat??country.lat,countries:names,ids:programs.filter(p=>p.countries.some(c=>names.includes(c))).map(p=>p.id)});
}
const placesByName=new Map(places.map(place=>[place.name,place]));
const wide=catalog.countries.some(c=>covered.has(c.name)&&(c.lon< -105||c.lon>135||c.lat< -41||c.lat>52));
const bounds=wide?{west:-180,north:85,width:360,height:170}:{west:-110,north:57,width:250,height:103};
const projectX=lon=>(lon-bounds.west)/bounds.width*100,projectY=lat=>(bounds.north-lat)/bounds.height*100;
const svgNS='http://www.w3.org/2000/svg';
const base=document.createElementNS(svgNS,'svg');base.id='country-base';base.setAttribute('viewBox',`${bounds.west} ${-bounds.north} ${bounds.width} ${bounds.height}`);base.setAttribute('preserveAspectRatio','none');base.setAttribute('role','img');base.setAttribute('aria-label','Project geography map');
const outlines=document.querySelector('#country-outlines');outlines.replaceChildren();outlines.setAttribute('viewBox',base.getAttribute('viewBox'));outlines.setAttribute('preserveAspectRatio','none');
for(const country of catalog.countries){for(const d of country.paths){const path=document.createElementNS(svgNS,'path');path.setAttribute('d',d);path.setAttribute('fill',covered.has(country.name)?'var(--atlas-border)':'#d5dfe5');path.setAttribute('stroke','#f8fbfd');path.setAttribute('stroke-width','.12');if(covered.has(country.name)){const title=document.createElementNS(svgNS,'title');title.textContent=country.name;path.append(title);path.setAttribute('aria-label',country.name);}base.append(path);const outline=path.cloneNode();outline.dataset.country=country.name;outline.removeAttribute('fill');outline.removeAttribute('stroke');outline.removeAttribute('stroke-width');outlines.append(outline);}}
document.querySelector('#map>img').replaceWith(base);
document.querySelectorAll('.continent').forEach(el=>el.remove());
const summary=document.querySelector('.summary');summary.innerHTML=`<div><strong>${programs.filter(p=>!p.related).length}</strong><span>AI programs & studies<br>+ ${programs.filter(p=>p.related).length} related initiatives</span></div><div><strong>${covered.size}</strong><span>countries represented</span></div><p>Evidence dates appear in each record</p>`;
const aucExplanation=`<div class="metric-help"><h4>AUC, in plain language</h4><p>AUC means “area under the curve.” It summarizes how well a test separates people with the condition from those without it, across different cutoffs for calling a result positive.</p><p><strong>0.5</strong> is chance-level separation; <strong>1.0</strong> is perfect separation in the tested data.</p><p>Here, <strong>0.91</strong> means that, for a randomly chosen pair—one woman with precancer and one without—the model would rank the woman with precancer higher about 91% of the time.</p><p>It does <strong>not</strong> mean 91% of patients are correctly diagnosed. It does not tell us how many cases a clinic will miss or how many false alarms it will produce at its chosen cutoff.</p></div>`;
const badge=p=>`<span class="badge ${p.kind}">${p.status}</span>`;
const links=p=>`<a href="${p.source}" target="_blank" rel="noopener">${p.sourceLabel||"Read the evidence"} ↗</a>${p.source2?` · <a href="${p.source2}" target="_blank" rel="noopener">${p.source2Label||"Related report"} ↗</a>`:''}`;
const recordNumbers=new Map(programs.map((p,index)=>[p.id,index+1]));
// v3.9.2: order every selected/search subset numerically, independent of previous selections.
const orderProjectIds=ids=>[...ids].sort((a,b)=>recordNumbers.get(a)-recordNumbers.get(b));
// v4.6.0: English is canonical; retain original titles and clearly labelled source-language paraphrases.
const languageName=code=>{try{return new Intl.DisplayNames(['en'],{type:'language'}).of(code);}catch{return code;}};
function languagePanel(p){
 if(!p.originalLanguage||p.originalLanguage==='en'||!p.originalTitle||!p.originalSource)return '';
 return `<div class="record-language"><button type="button" class="language-toggle" aria-expanded="false" aria-controls="${p.id}-original">Original language · ${escapeHTML(languageName(p.originalLanguage))}</button><div id="${p.id}-original" class="original-evidence" hidden><p class="language-caption">Original published title</p><p lang="${p.originalLanguage}" dir="auto"><strong>${p.originalTitle}</strong></p>${p.originalSummary||p.originalOutcome?`<p class="language-caption">Atlas editorial summary in the source language — not a quotation</p><div lang="${p.originalLanguage}" dir="auto"><p>${p.originalSummary||''}</p><p>${p.originalOutcome||''}</p></div>`:''}<a href="${p.originalSource}" target="_blank" rel="noopener">Read the original source ↗</a><p class="language-caption">English is the default Atlas summary. Other record fields remain in English.</p></div></div>`;
}
document.addEventListener('click',event=>{const button=event.target.closest('.language-toggle');if(!button)return;const card=button.closest('.program'),panel=document.getElementById(button.getAttribute('aria-controls')),open=panel.hidden;panel.hidden=!open;card.querySelector('.english-evidence').hidden=open;button.setAttribute('aria-expanded',String(open));const p=programs.find(p=>p.id===card.id);button.textContent=open?'Show English':'Original language · '+languageName(p.originalLanguage);updateEvidencePanels();});
const renderProgram=p=>`<article class="program" id="${p.id}"><a class="edit-project" href="/admin?project=${encodeURIComponent(p.id)}" aria-label="Edit project: ${p.name}" title="Edit project"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z"/></svg></a><div><a class="back-to-map" href="#map-overview"><svg class="map-return-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z"/><path d="M9 3v16M15 5v16"/></svg>Back to map</a><span class="record-number" aria-label="Project number ${recordNumbers.get(p.id)}">Project ${String(recordNumbers.get(p.id)).padStart(2,'0')}</span>${badge(p)}<h3>${p.name}</h3><p class="geo">${p.geo}</p><p class="geo">${p.publicationYear?`Publication year: ${p.publicationYear} · `:''}${p.evidenceBasis||'Evidence basis not yet classified'}${p.sampleDetails?` · ${p.sampleDetails}`:''}<br>${p.date}</p><a class="share-project" href="${escapeHTML(projectURL(p.id))}" aria-label="Share project: ${p.name}"><svg class="share-paperclip" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m8 13 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7L12 3a6 6 0 0 1 8 8l-8 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>Share project link</a><span class="share-feedback" role="status"></span><p class="mobile-project-summary">${p.short}</p><button type="button" class="project-expand" aria-expanded="false" aria-controls="${p.id}-outcomes ${p.id}-contacts">View evidence & contacts</button></div><div class="program-extra" id="${p.id}-outcomes"><p class="label">REPORTED OUTCOMES</p><div class="english-evidence" lang="en"><p>${p.outcome}</p></div>${languagePanel(p)}${p.followUp?`<aside class="project-follow-up"><p class="label">FOLLOW-UP · ${p.followUpDate||'Date not recorded'}</p><p>${p.followUp}</p></aside>`:''}${links(p)}</div><div class="program-extra" id="${p.id}-contacts"><p class="label">SPONSORS & PARTNERS</p><p>${p.partners}</p>${p.tel?`<a class="phone" href="tel:${p.tel}">${p.phone}</a>`:p.email?`<a class="phone" href="mailto:${p.email}">${p.email}</a>`:''}<p class="contact-note">${p.contact}</p>${p.contactSource?`<a href="${p.contactSource}" target="_blank" rel="noopener">Contact source ↗</a>`:''}</div></article>`;
document.querySelector('#programs').innerHTML=programs.map(renderProgram).join('');
// v4.9.2: persistent action footer outside the scrollable front/reverse content.
for(const card of document.querySelectorAll('article.program')){
 const content=document.createElement('div');content.className='project-card-content';content.tabIndex=0;content.setAttribute('role','region');content.setAttribute('aria-label','Project details — scroll to read more');
 const action=card.querySelector('.project-expand');
 for(const child of [...card.children])if(child.tagName==='DIV')content.append(child);
 const footer=document.createElement('div');footer.className='project-card-actions';footer.append(action);
 card.append(content,footer);
}
const projectCards=new Map([...document.querySelectorAll('article.program')].map(card=>[card.id,card]));

// v1.3.11: filter visible profiles without rebuilding cards or moving keyboard focus.
function normalizeSearch(value){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
// v2.7.4: plain text search; words are literal, without Boolean operators.
let markerProjectIds=null;
function searchGroups(query){const terms=normalizeSearch(query).trim().split(/\s+/).filter(Boolean);return terms.length?[terms]:[];}
function searchResult(query){return searchIndex.search(query);}
function matchingProjectIds(query){
 if(sharedProjectId)return new Set([sharedProjectId]);
 if(markerProjectIds)return markerProjectIds;
 return searchResult(query).ids;
}
const highlightedCards=new WeakMap();
// v1.3.11: mark matches in text nodes only, preserving links and profile markup.
function highlightProfileMatches(query){
 const cards=document.querySelectorAll('article.program');
 const terms=searchResult(query).terms.filter(t=>t.length>1).sort((a,b)=>b.length-a.length);
 const signature=terms.join('|');
 cards.forEach(card=>{
  if(card.hidden||highlightedCards.get(card)===signature)return;
  highlightedCards.set(card,signature);
  card.querySelectorAll('mark.search-match').forEach(mark=>mark.replaceWith(document.createTextNode(mark.textContent)));
  card.normalize();
  if(card.hidden||!terms.length)return;
  const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{
   const raw=node.nodeValue,folded=normalizeSearch(raw),ranges=[];
   for(const term of terms){let at=0;while((at=folded.indexOf(term,at))!==-1){ranges.push([at,at+term.length]);at+=term.length;}}
   if(!ranges.length)return;
   ranges.sort((a,b)=>a[0]-b[0]);const merged=[];
   for(const range of ranges){const last=merged[merged.length-1];if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else merged.push(range);}
   const fragment=document.createDocumentFragment();let offset=0;
   for(const [start,end] of merged){fragment.append(document.createTextNode(raw.slice(offset,start)));const mark=document.createElement('mark');mark.className='search-match';mark.textContent=raw.slice(start,end);fragment.append(mark);offset=end;}
   fragment.append(document.createTextNode(raw.slice(offset)));node.replaceWith(fragment);
  });
 });
}
// v4.2.0: size each scroll panel to its first three visible projects; stripe visible rows.
let evidenceLayoutFrame=0;
function updateEvidencePanels(){
 cancelAnimationFrame(evidenceLayoutFrame);
 evidenceLayoutFrame=requestAnimationFrame(()=>{
  for(const panel of document.querySelectorAll('.evidence-scroll')){
   const rows=[...panel.querySelectorAll('article.program')].filter(row=>!row.hidden);
   rows.forEach((row,index)=>row.classList.toggle('evidence-alternate',index%2===1));
   const height=rows.slice(0,3).reduce((sum,row)=>sum+row.getBoundingClientRect().height+12,0);
   panel.style.setProperty('--three-project-height',Math.ceil(height+2)+'px');
   panel.tabIndex=panel.scrollHeight>panel.clientHeight+2?0:-1;updateScrollHint(panel);
  }
 });
}
// v4.9.0: scroll affordance reflects actual remaining content.
function updateScrollHint(panel){
 const more=panel.scrollHeight>panel.clientHeight+2&&panel.scrollTop+panel.clientHeight<panel.scrollHeight-3;
 panel.parentElement.classList.toggle('has-more-projects',more);
 const hint=panel.nextElementSibling;if(hint?.classList.contains('more-projects-hint'))hint.hidden=!more;
}
for(const panel of document.querySelectorAll('.evidence-scroll')){
 const hint=document.createElement('p');hint.className='more-projects-hint';hint.textContent='More projects below ↓';hint.hidden=true;panel.after(hint);
 panel.addEventListener('scroll',()=>updateScrollHint(panel),{passive:true});
}
window.addEventListener('resize',updateEvidencePanels);
document.fonts.ready.then(updateEvidencePanels);
const evidenceObserver=new MutationObserver(updateEvidencePanels);
for(const panel of document.querySelectorAll('.evidence-scroll'))evidenceObserver.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
updateEvidencePanels();
function filterProfiles(){
 const input=document.querySelector('#project-search');
 const query=input.value.trim();
 const matches=matchingProjectIds(query);
 document.querySelectorAll('article.program').forEach(card=>{const hidden=!matches.has(card.id);if(card.hidden!==hidden)card.hidden=hidden;});
 document.querySelectorAll('.directory').forEach(section=>{section.hidden=![...section.querySelectorAll('article.program')].some(card=>!card.hidden)});
 numberSelectedRows();
 highlightProfileMatches(query);
 document.querySelector('#clear-search').hidden=!input.value;document.querySelector('#view-search-results').hidden=!matches.size;
 document.querySelector('#search-status').classList.toggle('search-empty',!matches.size);
 document.querySelector('#search-status').textContent=matches.size?`${matches.size} of ${programs.length} projects shown`:'No matching projects. Try another term or clear your search.';
}
function updateCountryOutlines(place){
 const direct=placesByName.get(place.name);
 const locations=direct?[direct]:places.filter(p=>p.ids.some(id=>place.ids.includes(id)));
 const geography=AtlasSearch.parse(document.querySelector('#project-search').value);
 const names=locations.flatMap(p=>p.countries||[]).filter(name=>chosenMarkerName||(!geography.countries.length||geography.countries.includes(name))&&(!geography.continents.length||geography.continents.includes((AtlasSearch.continentByCountry.get(name)||'').toLowerCase())));
 document.querySelectorAll('#country-outlines path').forEach(path=>path.classList.toggle('active',names.includes(path.dataset.country)));
}
function numberSelectedRows(){
 const rows=[...document.querySelectorAll('#selected-projects article.program')].filter(row=>!row.hidden);
 document.querySelectorAll('.result-number').forEach(b=>b.remove());
 rows.forEach((row,i)=>{const badge=document.createElement('span');badge.className='result-number';badge.textContent=`${i+1} of ${rows.length}`;badge.setAttribute('aria-label',`Selected project ${i+1} of ${rows.length}`);row.prepend(badge);row.classList.add('selected-profile');});
}
// v4.8.0: move existing cards instead of rebuilding the full catalog on each keystroke.
function arrangeProfiles(ids){
 const selected=new Set(ids),top=document.querySelector('#selected-projects'),rest=document.querySelector('#programs');
 function placeRows(container,ordered){ordered.forEach((id,index)=>{const card=projectCards.get(id);if(container.children[index]!==card)container.insertBefore(card,container.children[index]||null);});}
 placeRows(top,ids);placeRows(rest,programs.filter(p=>!selected.has(p.id)).map(p=>p.id));
 for(const [id,card]of projectCards)card.classList.toggle('selected-profile',selected.has(id));
}
function prioritizeProfiles(place,{filter=true}={}){
 place=searchPlace(place);if(!place.ids.length)return;
 document.querySelector('#selected-projects-section').hidden=false;
 document.querySelector('#selected-projects-title').textContent=place.name;
 const subtitle=document.querySelector('#selected-projects-section .section-heading span');if(subtitle)subtitle.textContent=place.name==='Search results'?'Matching indexed evidence':'From your map selection';
 arrangeProfiles(place.ids);
 if(filter)filterProfiles();
}
function setMarkerSelection(names){
 const selected=new Set(chosenMarkerName?[chosenMarkerName]:names);
 const container=document.querySelector('#markers');container.classList.toggle('has-selection',!!selected.size);
 container.querySelectorAll('.marker').forEach(b=>{const chosen=selected.has(b.dataset.name);b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));});
}
const map=document.querySelector('#map'),tip=document.querySelector('#tooltip');
let activeLocationName=null,activeLocationKey=null;
// v4.8.2: compact broad search subsets by continent, counting each project once per group.
// Geographic grouping convention: Russia in Europe; Turkey/Caucasus/Cyprus in Asia.
const continentByCountry=AtlasSearch.continentByCountry;
function showContinentSummary(ids,scope=null){
 const selected=new Set(ids),groups=new Map(),countries=new Set();
 for(const project of catalog.programs){
  if(!selected.has(project.id))continue;
  for(const country of project.countries){
   if(scope&&continentByCountry.get(country)!==scope)continue;
   countries.add(country);const continent=continentByCountry.get(country)||'Other / unclassified';
   if(!groups.has(continent))groups.set(continent,{ids:new Set(),countries:new Set()});
   groups.get(continent).ids.add(project.id);groups.get(continent).countries.add(country);
  }
 }
 activeLocationKey=null;activeLocationName=null;
 updateCountryOutlines({name:'',ids});
 const detail=document.querySelector('#detail');detail.classList.remove('multiple-projects');
 detail.innerHTML=`<p class="eyebrow">SELECTED LOCATIONS</p><h2>${scope?escapeHTML(scope):'Results by continent'}</h2><p class="continent-total">${selected.size} ${selected.size===1?'project':'projects'} · ${countries.size} ${countries.size===1?'country':'countries'} · ${groups.size} ${groups.size===1?'continent':'continents'}</p><div class="continent-summary">`+[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([name,group])=>`<section class="continent-summary-row" data-continent="${escapeHTML(name)}">${scope?'':`<div><h3>${escapeHTML(name)}</h3><span>${group.ids.size} ${group.ids.size===1?'project':'projects'}</span></div>`}<p>${scope?'':`${group.countries.size} countries · `}${[...group.countries].sort().map(escapeHTML).join(', ')}</p></section>`).join('')+'</div><p class="contact-note">Projects spanning continents appear in each relevant group. Explore individual projects in the results list below.</p>';
 detail.scrollTop=0;
}
// v4.9.3: overview only; detailed evidence belongs in project cards, not a scrolling sidebar.
function showDetail(place){
 place=searchPlace(place);if(!place.ids.length)return;
 updateCountryOutlines(place);setMarkerSelection([place.name]);
 const key=place.name+'|'+place.ids.join(',');if(activeLocationKey===key)return;
 activeLocationKey=key;activeLocationName=place.name;
 const records=place.ids.map(id=>programsById.get(id)),detail=document.querySelector('#detail');
 detail.classList.remove('multiple-projects');
 let summary;
 if(records.length===1){const p=records[0];summary=`<div class="detail-block">${badge(p)}<h3>${p.name}</h3><p>${p.short}</p><p class="contact-note">${p.publicationYear?`Published ${p.publicationYear} · `:''}${p.evidenceBasis||'Evidence basis not yet classified'}</p><a href="#${p.id}">View project evidence ↓</a></div>`;}
 else{
  const related=records.filter(p=>p.related).length,years=records.map(p=>Number(p.publicationYear)).filter(Number.isFinite).filter(y=>y>1900);
  const kinds=new Map();for(const p of records){const kind=p.evidenceBasis||'Evidence basis not yet classified';kinds.set(kind,(kinds.get(kind)||0)+1);}
  summary=`<div class="detail-block"><p class="sidebar-count">${records.length} projects</p><p>${records.length-related} AI programs or studies${related?` · ${related} related ${related===1?'initiative':'initiatives'}`:''}${years.length?`<br>Publication years: ${Math.min(...years)}${Math.max(...years)!==Math.min(...years)?`–${Math.max(...years)}`:''}`:''}</p><ul class="sidebar-evidence-types">${[...kinds].map(([kind,count])=>`<li>${kind} <strong>${count}</strong></li>`).join('')}</ul><p class="contact-note">Evidence and outcomes vary by project. Review the individual cards for findings, limitations and contacts.</p><a class="sidebar-results" href="#selected-projects-section">View ${records.length} project summaries ↓</a></div>`;
 }
 detail.innerHTML=`<p class="eyebrow">SELECTED LOCATION SUMMARY</p><h2>${place.name}</h2>`+summary;
}
document.addEventListener('click',event=>{const link=event.target.closest('.sidebar-results');if(!link)return;event.preventDefault();setMobileView('list');const panel=document.querySelector('#selected-projects-section');panel.tabIndex=-1;panel.focus({preventScroll:true});panel.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
let pinnedTipButton=null;
let tipButton=null, tipTimer=null, overTip=false, overMarker=false, touchTipButton=null, touchInteraction=false;
function cancelTipClose(){clearTimeout(tipTimer);tipTimer=null;}
const tipDock=document.createElement('div');tipDock.className='tooltip-dock';tipDock.hidden=true;map.parentElement.after(tipDock);
function closeTip(force=false){if(pinnedTipButton&&!force)return;pinnedTipButton=null;tipDock.hidden=true;touchTipButton=null;cancelTipClose();tip.hidden=true;tipButton?.removeAttribute('aria-describedby');tipButton=null;overTip=false;overMarker=false;}
function scheduleTipClose(){cancelTipClose();tipTimer=setTimeout(()=>{if(!touchTipButton&&!overTip&&!overMarker&&document.activeElement!==tipButton&&!tip.contains(document.activeElement))closeTip();},650);}
tip.addEventListener('click',event=>{if(event.target.closest('.tooltip-close')){const origin=tipButton;closeTip(true);origin?.focus({preventScroll:true});closeTip(true);}});
tip.addEventListener('mouseenter',()=>{overTip=true;cancelTipClose();});
tip.addEventListener('mouseleave',()=>{overTip=false;scheduleTipClose();});
tip.addEventListener('focusin',cancelTipClose);
tip.addEventListener('focusout',scheduleTipClose);
document.addEventListener('click',e=>{
 const link=e.target.closest('a[href^="#"]');
 if(!link||e.defaultPrevented||e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 const id=link.getAttribute('href').slice(1);
 if(id!=='map-overview'&&!programs.some(p=>p.id===id))return;
 if(link.getAttribute('data-profile')===id){
  const chosen=programsById.get(id);
  prioritizeProfiles({name:chosen.name,ids:[id]});
  const location=places.find(p=>p.name===tipButton?.dataset.name)||places.find(p=>p.name===activeLocationName&&p.ids.includes(id));
  if(location)showDetail({...location,ids:[id]});
 }
 const profile=document.getElementById(id);if(!profile)return;setMobileView(id==='map-overview'?'map':'list');if(id!=='map-overview')expandProject(profile);
 if(profile.hidden&&programs.some(p=>p.id===id)){document.querySelector('#project-search').value='';filterProfiles();}
 e.preventDefault();closeTip();
 // Wait for the docked preview to collapse before measuring the destination.
 requestAnimationFrame(()=>{
  if(location.hash!=='#'+id)location.hash=id;
  profile.setAttribute('tabindex','-1');profile.focus({preventScroll:true});
  profile.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start',inline:'nearest'});
 });
});
function chooseTipPosition(bounds,size,anchor,obstacles){
 const clamp=(n,min,max)=>Math.max(min,Math.min(n,max));
 const maxX=bounds.right-size.width,maxY=bounds.bottom-size.height;
 if(maxX<bounds.left||maxY<bounds.top)return null;
 const xs=[anchor.right+14,anchor.left-size.width-14,(anchor.left+anchor.right-size.width)/2,bounds.left,maxX];
 const ys=[anchor.bottom+14,anchor.top-size.height-14,(anchor.top+anchor.bottom-size.height)/2,bounds.top,maxY];
 for(const o of obstacles){xs.push(o.right+8,o.left-size.width-8);ys.push(o.bottom+8,o.top-size.height-8);}
 let best=null;
 for(const rawX of xs)for(const rawY of ys){
  const x=clamp(rawX,bounds.left,maxX),y=clamp(rawY,bounds.top,maxY);
  const hits=obstacles.filter(o=>x<o.right+6&&x+size.width>o.left-6&&y<o.bottom+6&&y+size.height>o.top-6).length;
  const dx=Math.max(anchor.left-(x+size.width),x-anchor.right,0),dy=Math.max(anchor.top-(y+size.height),y-anchor.bottom,0);
  const distance=Math.hypot(dx,dy),score=hits*100000+distance;
  if(!best||score<best.score)best={x,y,hits,score};
 }
 return best;
}
function showTip(place,button){if(pinnedTipButton&&pinnedTipButton!==button)return;place=searchPlace(place);if(!place.ids.length)return;showDetail(place);cancelTipClose();if(tipButton!==button){tipButton?.removeAttribute('aria-describedby');overTip=false;}tipButton=button;tip.classList.toggle('multi-project',place.ids.length>1);tip.innerHTML=`<button type="button" class="tooltip-close" aria-label="Close project previews">Close</button><strong>${place.name}</strong><div class="tooltip-entries">`+place.ids.map(id=>{let p=programsById.get(id);return `<div class="tooltip-entry"><span class="tooltip-entry-title">${p.name}</span><small>${p.short}</small><a class="tooltip-profile" data-profile="${p.id}" href="#${p.id}" aria-label="View project profile: ${p.name}">View project profile →</a></div>`}).join('')+'</div>';tip.hidden=false;
 tipDock.hidden=false;if(tip.parentElement!==tipDock)tipDock.append(tip);tip.classList.add('docked');tip.style.left='';tip.style.top='';tip.style.maxHeight=Math.max(80,(window.visualViewport?.height||window.innerHeight)-56)+'px';
 button.setAttribute('aria-describedby','tooltip');
 // v3.1.1: revealing a marker preview must not move the map or page.
 }

// v4.8.15: selecting a location locks marker visibility to its geographic continent.
for(const place of places){const b=document.createElement('button');b.className='marker '+(place.left?'left ':'')+programs.find(p=>p.id===place.ids[0]).kind;b.style.left=projectX(place.lon)+'%';b.style.top=projectY(place.lat)+'%';b.dataset.name=place.name;b.setAttribute('aria-label',`${place.name}: ${place.ids.map(id=>programsById.get(id).name).join(', ')}. Show outcomes`);b.innerHTML=`${place.ids.length>1?place.ids.length:'•'}<span class="marker-label">${place.name}</span>`;b.addEventListener('pointerdown',e=>{touchInteraction=e.pointerType==='touch'||e.pointerType==='pen'});b.addEventListener('mouseenter',()=>{if(touchInteraction||window.matchMedia('(hover: none)').matches)return;overMarker=true;showTip(place,b)});b.addEventListener('focus',()=>{if(touchInteraction)return;overMarker=b.matches(':hover');showTip(place,b)});b.addEventListener('mouseleave',()=>{if(tipButton===b){overMarker=false;scheduleTipClose()}});b.addEventListener('blur',()=>{if(tipButton===b)scheduleTipClose()});b.addEventListener('click',()=>{clearSharedProject();revealContinent(continentByCountry.get(place.countries[0])||'All');chosenMarkerName=place.name;markerProjectIds=new Set(place.ids);document.querySelector('#project-search').value=place.countries.join(', ');syncSearchMap({preserveMapPosition:true,selectedPlace:place});showTip(place,b);pinnedTipButton=b;touchTipButton=b});document.querySelector('#markers').append(b)}
document.addEventListener('pointerdown',e=>{if(!tip.hidden&&!tip.contains(e.target)&&!tipButton?.contains(e.target))closeTip();});
// Keep a region visible across ocean gaps so offset markers remain easy to reach.
const continentControls=document.createElement('nav');continentControls.className='continent-controls';continentControls.setAttribute('aria-label','Map continents');
const availableContinents=[...new Set([...covered].map(name=>continentByCountry.get(name)).filter(Boolean))].sort();
// v4.8.16: offer individual continents only to keep map navigation focused.
continentControls.innerHTML=availableContinents.map(name=>`<button type="button" data-map-continent="${name}" aria-pressed="${name==='All'}">${name}</button>`).join('');
// v4.8.10: keep continent filters directly below the visible map.
document.querySelector('.map-shell').after(continentControls);
// v4.8.17: previews update below the persistent continent controls.
continentControls.after(tipDock);
const selectionContext=document.createElement('div');selectionContext.className='selection-context';selectionContext.setAttribute('aria-live','polite');continentControls.after(selectionContext);
function updateSelectionContext(count){
 const place=placesByName.get(chosenMarkerName),region=place?continentByCountry.get(place.countries[0]):visibleContinent;
 const title=place?`${region} → ${place.countries.join(' / ')}`:region==='All'?'Search results':region;
 selectionContext.replaceChildren();
 const label=document.createElement('span');label.textContent=`${title} · ${count} ${count===1?'project':'projects'}`;selectionContext.append(label);
 if(place&&region){const back=document.createElement('button');back.type='button';back.textContent=`Back to ${region}`;back.onclick=()=>selectContinent(region);selectionContext.append(back);}
}
let visibleContinent='All';
function revealContinent(name){
 if(name===visibleContinent)return;visibleContinent=name;
 for(const marker of document.querySelectorAll('.marker')){
  const place=placesByName.get(marker.dataset.name);
  marker.classList.toggle('continent-hidden',name!=='All'&&!place.countries.some(country=>continentByCountry.get(country)===name));
 }
 for(const button of continentControls.children)button.setAttribute('aria-pressed',String(button.dataset.mapContinent===name));
 if(tipButton?.classList.contains('continent-hidden'))closeTip(true);
}
// v4.8.3: continent selection uses the same geographic filter as typed searches.
function selectContinent(name){
 clearSharedProject();closeTip(true);
 document.querySelector('#project-search').value=name==='All'?'':name;
 revealContinent(name);syncSearchMap({preserveMapPosition:true});
 if(name==='All')showContinentSummary(programs.map(p=>p.id));
}
// v4.8.12: explicit continent navigation centers the geography without moving markers.
function centerContinent(name){
 const centers={'Africa':[20,0],'Asia':[90,35],'Europe':[20,52],'North America':[-100,40],'South America':[-60,-15],'Oceania':[145,-25],'Antarctica':[0,-80],'All':[0,0]};
 const [lon,lat]=centers[name]||centers.All;
 const behavior=matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
 const left=Math.max(0,Math.min(mapScroller.scrollWidth-mapScroller.clientWidth,projectX(lon)/100*mapScroller.scrollWidth-mapScroller.clientWidth/2));
 mapScroller.scrollTo({left,behavior});
 const rect=map.getBoundingClientRect(),viewport=window.visualViewport;
 const top=window.scrollY+rect.top+projectY(lat)/100*rect.height-(viewport?.height||window.innerHeight)/2-(viewport?.offsetTop||0);
 window.scrollTo({top:Math.max(0,top),behavior});
}
continentControls.addEventListener('click',event=>{const button=event.target.closest('button');if(button){selectContinent(button.dataset.mapContinent);centerContinent(button.dataset.mapContinent);}});
// The base has every country, including countries without projects.
let countryPathIndex=0;
for(const country of catalog.countries)for(const unused of country.paths){
 const path=base.children[countryPathIndex++];
 path.addEventListener('click',()=>{const continent=continentByCountry.get(country.name);if(continent)selectContinent(continent);});
 // v4.8.14: hover may identify a country, but only a click changes continent filtering.
}
document.addEventListener('keydown',e=>{touchInteraction=false;if(e.key==='Escape')closeTip(true)});
// v1.3.11: open with Bombo selected, while preserving the shared coastal marker.
const defaultId=programs.some(p=>p.id==='bombo')?'bombo':programs[0]?.id;
const defaultPlace=places.find(p=>p.ids.includes(defaultId));
if(defaultPlace){showDetail({...defaultPlace,ids:[defaultId]});prioritizeProfiles({name:programs.find(p=>p.id===defaultId).name,ids:[defaultId]});}else{document.querySelector('#detail').textContent='No projects yet.';}

const mapScroller=document.querySelector('.map-scroll');
const mapShell=document.querySelector('.map-shell');
const swipeHint=document.querySelector('#map-swipe-hint');
function updateMapScrollCue(){
 const overflow=mapScroller.scrollWidth-mapScroller.clientWidth>2;
 const left=mapScroller.scrollLeft>2;
 const right=mapScroller.scrollLeft+mapScroller.clientWidth<mapScroller.scrollWidth-2;
 mapShell.classList.toggle('has-overflow',overflow);
 mapShell.classList.toggle('can-scroll-left',overflow&&left);
 mapShell.classList.toggle('can-scroll-right',overflow&&right);
 document.querySelector('#map-pan-left').disabled=!left;document.querySelector('#map-pan-right').disabled=!right;
 swipeHint.hidden=!overflow;
 swipeHint.innerHTML=left?(right?'← Swipe to explore →':'← Swipe to explore'):'Swipe to explore <span aria-hidden="true">→</span>';
}
// v3.4.0: explicit map panning and direct access to the filtered results.
for(const [id,direction] of [['map-pan-left',-1],['map-pan-right',1]])document.getElementById(id).onclick=()=>mapScroller.scrollBy({left:direction*mapScroller.clientWidth*.7,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
function jumpToResults(event){setMobileView('list');const card=[...document.querySelectorAll('article.program')].find(card=>!card.hidden);if(!card)return;window.dispatchEvent(new CustomEvent('atlas-project-view',{detail:card.id}));event.preventDefault();card.setAttribute('tabindex','-1');card.focus({preventScroll:true});card.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
document.querySelector('#view-search-results').addEventListener('click',jumpToResults);
document.querySelector('#project-search').addEventListener('keydown',event=>{if(event.key==='Enter')jumpToResults(event);});
mapScroller.addEventListener('scroll',()=>{closeTip();updateMapScrollCue()},{passive:true});
window.addEventListener('resize',()=>{closeTip();updateMapScrollCue()});
new ResizeObserver(updateMapScrollCue).observe(mapScroller);
window.addEventListener('atlas-view-change',()=>{updateMapScrollCue();updateEvidencePanels();});
// Keep the selected coastal location visible on narrow screens without scrolling the page.
mapScroller.scrollLeft=Math.max(0,(defaultPlace?projectX(defaultPlace.lon)/100:0)*mapScroller.scrollWidth-mapScroller.clientWidth/2);
updateMapScrollCue();

window.addEventListener('scroll',()=>{if(tip.hidden)return;const r=tip.getBoundingClientRect(),v=window.visualViewport,top=v?.offsetTop||0,bottom=top+(v?.height||window.innerHeight);if(tipDock.hidden||r.top<top||r.bottom>bottom)closeTip();},{passive:true});
window.visualViewport?.addEventListener('resize',()=>closeTip());
window.visualViewport?.addEventListener('scroll',()=>{if(!tip.hidden&&tipDock.hidden)closeTip();});

// Search is limited to project profiles; map geography remains available for exploration.
// v1.3.11: native search clearing and restored browser state also reset all results.
// Search events are coalesced below into a single update per animation frame.
document.querySelector('#clear-search').addEventListener('click',()=>{const input=document.querySelector('#project-search');input.value='';input.focus();});
filterProfiles();

// v1.3.11: normal openings begin at the page top; explicit anchors keep their destination.
if(!location.hash&&!new URL(location.href).searchParams.has('project')){
 if('scrollRestoration' in history)history.scrollRestoration='manual';
 const startAtTop=()=>{if(!location.hash&&!new URL(location.href).searchParams.has('project'))window.scrollTo({top:0,left:0,behavior:'instant'});};
 startAtTop();
 window.addEventListener('pageshow',startAtTop);
}

// v1.3.11: keep search results, map coverage and the first result in sync.
function searchPlace(place){
 const query=document.querySelector('#project-search').value.trim();
 if(!query&&!sharedProjectId)return {...place,ids:orderProjectIds(place.ids)};
 const ids=matchingProjectIds(query);
 return {...place,ids:orderProjectIds(place.ids.filter(id=>ids.has(id)))};
}
function syncSearchMap({preserveMapPosition=true,selectedPlace=null}={}){
 const started=performance.now();closeTip(true);
 const query=document.querySelector('#project-search').value.trim(),matches=matchingProjectIds(query);
 const filtered=!!(query||sharedProjectId),orderedIds=orderProjectIds([...matches]);
 if(filtered&&orderedIds.length){
  prioritizeProfiles({name:selectedPlace?.name||(sharedProjectId?programsById.get(sharedProjectId).name:'Search results'),ids:orderedIds},{filter:false});
 }else arrangeProfiles([]);
 filterProfiles();
 const searchedCountries=AtlasSearch.parse(query).countries;
 const locations=places.filter(p=>p.ids.some(id=>matches.has(id))&&(!searchedCountries.length||p.countries.some(c=>searchedCountries.includes(c))));
 document.querySelectorAll('.marker').forEach(marker=>{
  const place=placesByName.get(marker.dataset.name),ids=place.ids.filter(id=>matches.has(id));
  marker.hidden=false;marker.classList.toggle('search-muted',!ids.length||!locations.includes(place));
  const visibleIds=ids.length?ids:place.ids;
  marker.firstChild.textContent=visibleIds.length>1?String(visibleIds.length):'•';
  marker.setAttribute('aria-label',`${place.name}: ${visibleIds.map(id=>programsById.get(id).name).join(', ')}. Show outcomes`);
 });
 for(const [id,card]of projectCards)card.classList.toggle('search-first',filtered&&id===orderedIds[0]);
 if(selectedPlace){
  // The caller renders the selected location once through showTip.
 }else if(filtered&&orderedIds.length){
  const continent=[...new Set(continentByCountry.values())].find(name=>name.toLowerCase()===AtlasSearch.unquote(query));
  if(continent&&!chosenMarkerName&&!sharedProjectId){showContinentSummary(orderedIds,continent);revealContinent(continent);}
  else if(orderedIds.length>5&&!chosenMarkerName&&!sharedProjectId)showContinentSummary(orderedIds);
  else showDetail({name:locations.map(p=>p.name).join(' · '),ids:orderedIds});
  setMarkerSelection(locations.map(p=>p.name));
  const place=locations[0];if(place&&!preserveMapPosition){mapScroller.scrollLeft=Math.max(0,projectX(place.lon)/100*mapScroller.scrollWidth-mapScroller.clientWidth/2);updateMapScrollCue();}
 }else{
  activeLocationKey=null;activeLocationName=null;updateCountryOutlines({name:'',ids:[]});setMarkerSelection([]);
  const detail=document.querySelector('#detail');detail.classList.remove('multiple-projects');
  detail.innerHTML=!query?`<p class="eyebrow">PROJECT GEOGRAPHY</p><h2>All project locations</h2><p class="metric">${programs.length}</p><p class="metric-label">projects across ${covered.size} countries</p><p>${programs.filter(p=>!p.related).length} AI programs and studies · ${programs.filter(p=>p.related).length} related initiatives.</p><p>Choose a country marker to see its projects and reported outcomes.</p>`:'<p class="eyebrow">PROJECT GEOGRAPHY</p><h2>No matching locations</h2><p>Try another search or clear the field to restore all projects.</p>';
  detail.scrollTop=0;
 }
 updateSelectionContext(matches.size);
 performance.clearMeasures?.('atlas-search-update');
 performance.measure('atlas-search-update',{start:started,end:performance.now()});
}
let searchFrame=0,composing=false;
function scheduleSearch(event){
 if(composing||event?.isComposing)return;
 cancelAnimationFrame(searchFrame);
 searchFrame=requestAnimationFrame(()=>{syncSearchMap();});
}
for(const event of ['input','search','change'])document.querySelector('#project-search').addEventListener(event,scheduleSearch);
document.querySelector('#project-search').addEventListener('compositionstart',()=>{composing=true;});
document.querySelector('#project-search').addEventListener('compositionend',()=>{composing=false;scheduleSearch();});
document.querySelector('#clear-search').addEventListener('click',scheduleSearch);
window.addEventListener('pageshow',()=>{if(document.querySelector('#project-search').value.trim())scheduleSearch();});

// v2.2.0: deterministic water-only placement for every catalog country, including new records.
// Rasterize the same geographic paths used by the map, then test the entire marker + halo.
function placeMarkersOffshore(){
 const width=Math.ceil(map.clientWidth),height=Math.ceil(map.clientHeight);if(!width||!height)return;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d',{willReadFrequently:true});
 context.setTransform(width/bounds.width,0,0,height/bounds.height,-bounds.west*width/bounds.width,bounds.north*height/bounds.height);
 for(const country of catalog.countries)for(const path of country.paths)context.fill(new Path2D(path));
 const pixels=context.getImageData(0,0,width,height).data,stride=width+1;
 const sums=new Uint32Array(stride*(height+1));
 for(let y=0;y<height;y++){let row=0;for(let x=0;x<width;x++){row+=pixels[(y*width+x)*4+3]>0?1:0;sums[(y+1)*stride+x+1]=sums[y*stride+x+1]+row;}}
 const landIn=(x,y,r)=>{const l=Math.floor(x-r),t=Math.floor(y-r),right=Math.ceil(x+r),bottom=Math.ceil(y+r);return sums[bottom*stride+right]-sums[t*stride+right]-sums[bottom*stride+l]+sums[t*stride+l];};
 const occupied=[];
 for(const marker of document.querySelectorAll('.marker')){
  const place=placesByName.get(marker.dataset.name);
  const origin={x:projectX(place.lon)*width/100,y:projectY(place.lat)*height/100};
  const radius=Math.max(22,marker.offsetWidth/2+10);let best=null;
  for(let y=radius;y<height-radius;y+=6)for(let x=radius;x<width-radius;x+=6){
   const distance=(x-origin.x)**2+(y-origin.y)**2;
   if(best&&distance>=best.distance)continue;
   if(occupied.some(p=>Math.hypot(x-p.x,y-p.y)<radius+p.radius+6)||landIn(x,y,radius))continue;
   best={x,y,radius,distance};
  }
  if(best){marker.style.left=best.x/width*100+'%';marker.style.top=best.y/height*100+'%';occupied.push(best);}
 }
}
placeMarkersOffshore();
let placementFrame;new ResizeObserver(()=>{cancelAnimationFrame(placementFrame);placementFrame=requestAnimationFrame(placeMarkersOffshore);}).observe(map);

// v1.3.11: hover connectors use country centers, independent of fixed marker positions.
const countryCenters={
 'Guanacaste, Costa Rica':[[-84.2,9.9]],'Dschang, Cameroon':[[12.3,5.7]],
 'Uganda':[[32.3,1.3]],'Bangladesh':[[90.3,23.7]],'Senegal':[[-14.5,14.4]],
 'Rwanda / Kigali':[[29.9,-1.9]],'Zambia':[[27.8,-13.1]],'Malawi':[[34.3,-13.3]],
 'Zimbabwe':[[29.9,-19]],'Kinondo, Kenya / Tanga, Tanzania':[[37.9,.2],[34.9,-6.3]],
 'India':[[79,22]],'Thailand':[[101,15.5]],'Hubei, China':[[104,35.5]]
};
const hoverLinks=document.createElementNS('http://www.w3.org/2000/svg','svg');
hoverLinks.id='country-hover-links';hoverLinks.setAttribute('viewBox','0 0 1500 620');hoverLinks.setAttribute('aria-hidden','true');map.append(hoverLinks);
function drawCountryLinks(marker){
 hoverLinks.replaceChildren();
 const location=placesByName.get(marker.dataset.name);const targets=(location?.countries||[]).map(name=>catalog.countries.find(c=>c.name===name)).filter(Boolean).map(c=>[c.lon,c.lat]);
 for(const [lon,lat] of targets){
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('x1',parseFloat(marker.style.left)*15);line.setAttribute('y1',parseFloat(marker.style.top)*6.2);
  line.setAttribute('x2',projectX(lon)*15);line.setAttribute('y2',projectY(lat)*6.2);hoverLinks.append(line);
 }
}
for(const marker of document.querySelectorAll('.marker')){
 marker.addEventListener('mouseenter',()=>drawCountryLinks(marker));
 marker.addEventListener('mouseleave',()=>hoverLinks.replaceChildren());
 marker.addEventListener('focus',()=>drawCountryLinks(marker));
 marker.addEventListener('blur',()=>hoverLinks.replaceChildren());
}
document.querySelector('#project-search').addEventListener('input',()=>hoverLinks.replaceChildren());

// v2.0.0: hover or choose a marker to play the quarter-second growth cue.
function pulseCountries(marker){
 const paths=[...document.querySelectorAll('#country-outlines path')];paths.forEach(path=>path.classList.remove('country-chosen'));
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const location=placesByName.get(marker.dataset.name);if(!location)return;
 void outlines.getBoundingClientRect();
 paths.filter(path=>location.countries.includes(path.dataset.country)).forEach(path=>path.classList.add('country-chosen'));
}
for(const marker of document.querySelectorAll('.marker'))for(const event of ['mouseenter','focus','click'])marker.addEventListener(event,()=>pulseCountries(marker));
outlines.addEventListener('animationend',event=>event.target.classList.remove('country-chosen'));
// v2.2.0: hover/focus highlight survives the introductory pulse.
function refreshHoverCountries(){
 const names=new Set([...document.querySelectorAll('.marker')].filter(marker=>marker.matches(':hover,:focus-visible')).flatMap(marker=>placesByName.get(marker.dataset.name)?.countries||[]));
 outlines.querySelectorAll('path').forEach(path=>path.classList.toggle('country-hovered',names.has(path.dataset.country)));
}
for(const marker of document.querySelectorAll('.marker'))for(const event of ['mouseenter','mouseleave','focus','blur'])marker.addEventListener(event,refreshHoverCountries);

// v2.1.0: stable IDs survive edits; shared selection is applied after async catalog loading.
const sharedNotice=document.createElement('div');sharedNotice.className='shared-project-notice';sharedNotice.hidden=true;
const sharedMessage=document.createElement('span');
const showAll=document.createElement('button');showAll.type='button';showAll.textContent='Show all projects';
sharedNotice.append(sharedMessage,showAll);document.querySelector('.project-search').append(sharedNotice);
function clearSharedProject(){
 markerProjectIds=null;chosenMarkerName=null;cancelAnimationFrame(searchFrame);revealContinent('All');
 sharedProjectId=null;sharedNotice.hidden=true;
 const url=new URL(location.href);url.searchParams.delete('project');url.hash='';history.replaceState(null,'',url);
}
document.querySelector('#clear-search').addEventListener('click',clearSharedProject,{capture:true});
showAll.addEventListener('click',()=>{clearSharedProject();document.querySelector('#project-search').value='';syncSearchMap();});
for(const event of ['input','search','change'])document.querySelector('#project-search').addEventListener(event,clearSharedProject,{capture:true});
function openSharedProject(){
 const id=new URL(location.href).searchParams.get('project');
 markerProjectIds=null;chosenMarkerName=null;sharedProjectId=null;sharedNotice.hidden=!id;
 if(!id){syncSearchMap();return;}
 document.querySelector('#project-search').value='';
 const project=catalog.programsById.get(id);
 if(!project){syncSearchMap();sharedMessage.textContent='This shared project is no longer available. Showing all projects.';return;}
 sharedProjectId=id;document.querySelector('#project-search').value=project.name;sharedMessage.textContent='Shared project: '+project.name;
 syncSearchMap();
 requestAnimationFrame(()=>requestAnimationFrame(()=>{setMobileView('list');const card=document.getElementById(id);expandProject(card);card?.setAttribute('tabindex','-1');card?.focus({preventScroll:true});card?.scrollIntoView({block:'start',behavior:'instant'});}));
}
window.addEventListener('popstate',openSharedProject);
document.addEventListener('click',async event=>{
 const link=event.target.closest('a.share-project');
 if(!link||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();
 const feedback=link.nextElementSibling;
 try{await navigator.clipboard.writeText(link.href);feedback.textContent='Link copied';}
 catch{feedback.replaceChildren();const input=document.createElement('input');input.readOnly=true;input.value=link.href;input.setAttribute('aria-label','Project share URL — copy this link');feedback.append(input);input.focus();input.select();}
});
// v4.8.7: start with Africa; explicit shared-project links take precedence.
if(new URL(location.href).searchParams.has('project'))openSharedProject();else selectContinent('Africa');
window.dispatchEvent(new Event('atlas-ready'));
})().catch(error=>{const message=document.createElement('p');message.className='load-error';message.textContent=error.message;document.querySelector('#map-overview').before(message);console.error(error);});

// v3.7.0: password-gated direct editing with a lightweight native page flip.
(()=>{
 const dialog=document.createElement('dialog');dialog.className='edit-access-dialog';dialog.setAttribute('aria-labelledby','edit-access-title');
 dialog.innerHTML=`<form><h2 id="edit-access-title">Edit project</h2><p>Enter the Admin password to open this project in the editor.</p><label for="edit-access-password">Admin password</label><input id="edit-access-password" type="password" autocomplete="current-password" required><p class="edit-access-error" role="alert"></p><div class="edit-access-actions"><button type="button" data-cancel>Cancel</button><button type="submit">Open editor</button></div></form>`;
 document.body.append(dialog);let destination='',pending=false;
 window.addEventListener('pageshow',event=>{if(!event.persisted)return;pending=false;document.body.getAnimations().forEach(animation=>animation.cancel());document.documentElement.classList.remove('screen-flipping');document.body.style.transformOrigin='';});
 const error=dialog.querySelector('.edit-access-error'),password=dialog.querySelector('input'),submit=dialog.querySelector('[type=submit]');
 async function openEditor(url){
  const config=window.atlasCatalog?.config||{editFlipEnabled:true,editFlipDuration:400};
  if(config.editFlipEnabled&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   try{sessionStorage.setItem('atlas-editor-flip',JSON.stringify({duration:config.editFlipDuration}));document.documentElement.classList.add('screen-flipping');document.body.style.transformOrigin='50% '+(scrollY+innerHeight/2)+'px';await document.body.animate([{transform:'perspective(1800px) rotateY(0deg)',filter:'brightness(1)'},{transform:'perspective(1800px) rotateY(-90deg)',filter:'brightness(.72)'}],{duration:config.editFlipDuration/2,easing:'cubic-bezier(.55,0,1,.45)',fill:'forwards'}).finished;}catch{}
  }
  location.assign(url);
 }
 document.addEventListener('click',async event=>{
  // v3.9.1: the home Admin navigation shares the pencil card transition.
  const link=event.target.closest('a.edit-project, a[href="/admin"]');if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();if(pending)return;pending=true;destination=link.href;
  if(!link.classList.contains('edit-project')){await openEditor(destination);return;}
  try{const response=await fetch('/api/session',{cache:'no-store'});if(response.ok&&(await response.json()).authenticated){await openEditor(destination);return;}}catch{}
  pending=false;error.textContent='';password.value='';dialog.showModal();password.focus();
 });
 dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{password.value='';});
 dialog.querySelector('form').onsubmit=async event=>{
  event.preventDefault();if(pending)return;pending=true;submit.disabled=true;error.textContent='';
  try{const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:password.value})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to unlock the editor.');dialog.close();await openEditor(destination);}
  catch(e){error.textContent=e.message;password.focus();password.select();}
  finally{pending=false;submit.disabled=false;}
 };
})();

// v3.8.1: reveal the Atlas front face after returning from the editor.
window.addEventListener('load',()=>{
 let saved;try{saved=JSON.parse(sessionStorage.getItem('atlas-return-flip')||'null');sessionStorage.removeItem('atlas-return-flip');}catch{}
 const root=document.documentElement;root.classList.remove('atlas-flip-pending');
 if(!saved||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const duration=Math.max(300,Math.min(1600,Number(saved.duration)||720));root.classList.add('screen-flipping');document.body.style.transformOrigin='50% '+(scrollY+innerHeight/2)+'px';
 const animation=document.body.animate([{transform:'perspective(1800px) rotateY(-90deg)',filter:'brightness(.72)'},{transform:'perspective(1800px) rotateY(0deg)',filter:'brightness(1)'}],{duration:duration/2,easing:'cubic-bezier(0,.55,.45,1)'});
 animation.finished.catch(()=>{}).finally(()=>{root.classList.remove('screen-flipping');document.body.style.transformOrigin='';});
});
