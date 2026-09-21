// Atlas v2.3.3 — Muted catalog record numbers remain consistent across filtered and reordered lists.
// On release: update the footer and source version comments, then add a CHANGELOG.md entry.
(async()=>{
const response=await fetch('/api/catalog',{cache:'no-store'});
if(!response.ok)throw new Error('Project records could not be loaded. Please refresh to retry.');
const catalog=await response.json();window.atlasCatalog=catalog;
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const programs=catalog.programs.map(p=>Object.fromEntries(Object.entries(p).map(([key,value])=>[key,typeof value==='string'?escapeHTML(value):value])));
// v4.4.0: mobile view changes preserve the existing search, marker and project state.
const mobileViews=document.createElement('nav');mobileViews.className='mobile-view-switch';mobileViews.setAttribute('aria-label','Atlas view');mobileViews.innerHTML='<button type="button" data-view="map" aria-pressed="true">Map</button><button type="button" data-view="list" aria-pressed="false">Project list</button>';
document.querySelector('#map-overview').before(mobileViews);
document.body.dataset.mobileView='map';
function setMobileView(view,scroll=false){document.body.dataset.mobileView=view;mobileViews.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));if(scroll&&matchMedia('(max-width:740px)').matches)mobileViews.scrollIntoView({block:'start',behavior:'instant'});requestAnimationFrame(()=>window.dispatchEvent(new Event('atlas-view-change')));}
mobileViews.onclick=event=>{const button=event.target.closest('[data-view]');if(button)setMobileView(button.dataset.view,true);};
function expandProject(card){if(!card)return;card.classList.add('project-expanded');const button=card.querySelector('.project-expand');if(button){button.setAttribute('aria-expanded','true');button.textContent='Collapse details';}updateEvidencePanels();}
document.addEventListener('click',event=>{const button=event.target.closest('.project-expand');if(!button)return;const card=button.closest('.program'),expanded=card.classList.toggle('project-expanded');button.setAttribute('aria-expanded',String(expanded));button.textContent=expanded?'Collapse details':'Expand details';updateEvidencePanels();});
let sharedProjectId=null;
const projectURL=id=>{const url=new URL(location.href);url.search='';url.searchParams.set('project',id);url.hash=id;return url.href;};
// v2.3.0: derive source coverage from the live catalog; never imply a fresh database search.
const sourceGroups=new Map();
for(const project of catalog.programs)for(const field of ['source','source2']){
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
const renderProgram=p=>`<article class="program" id="${p.id}"><a class="edit-project" href="/admin?project=${encodeURIComponent(p.id)}" aria-label="Edit project: ${p.name}" title="Edit project"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z"/></svg></a><div><a class="back-to-map" href="#map-overview"><svg class="map-return-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z"/><path d="M9 3v16M15 5v16"/></svg>Back to map</a><span class="record-number" aria-label="Project number ${recordNumbers.get(p.id)}">Project ${String(recordNumbers.get(p.id)).padStart(2,'0')}</span>${badge(p)}<h3>${p.name}</h3><p class="geo">${p.geo}</p><p class="geo">${p.date}</p><a class="share-project" href="${escapeHTML(projectURL(p.id))}" aria-label="Share project: ${p.name}">Share project link</a><span class="share-feedback" role="status"></span><p class="mobile-project-summary">${p.short}</p><button type="button" class="project-expand" aria-expanded="false" aria-controls="${p.id}-outcomes ${p.id}-contacts">Expand details</button></div><div class="program-extra" id="${p.id}-outcomes"><p class="label">REPORTED OUTCOMES</p><p>${p.outcome}</p>${links(p)}</div><div class="program-extra" id="${p.id}-contacts"><p class="label">SPONSORS & PARTNERS</p><p>${p.partners}</p>${p.tel?`<a class="phone" href="tel:${p.tel}">${p.phone}</a>`:p.email?`<a class="phone" href="mailto:${p.email}">${p.email}</a>`:''}<p class="contact-note">${p.contact}</p>${p.contactSource?`<a href="${p.contactSource}" target="_blank" rel="noopener">Contact source ↗</a>`:''}</div></article>`;
document.querySelector('#programs').innerHTML=programs.map(renderProgram).join('');

// v1.3.11: filter visible profiles without rebuilding cards or moving keyboard focus.
function normalizeSearch(value){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
// v2.7.4: plain text search; words are literal, without Boolean operators.
let markerProjectIds=null;
function searchGroups(query){const terms=normalizeSearch(query).trim().split(/\s+/).filter(Boolean);return terms.length?[terms]:[];}
function matchingProjectIds(query){
 const groups=searchGroups(query);
 return new Set(programs.filter(p=>{const raw=catalog.programs.find(r=>r.id===p.id);const text=normalizeSearch(Object.values(raw).flat().filter(v=>typeof v==='string').join(' '));return (!sharedProjectId||p.id===sharedProjectId)&&(markerProjectIds?markerProjectIds.has(p.id):(!groups.length||groups.some(group=>group.every(term=>text.includes(term)))));}).map(p=>p.id));
}
// v1.3.11: mark matches in text nodes only, preserving links and profile markup.
function highlightProfileMatches(query){
 const cards=document.querySelectorAll('article.program');
 const terms=[...new Set(searchGroups(query).flat())].sort((a,b)=>b.length-a.length);
 cards.forEach(card=>{
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
   const height=rows.slice(0,3).reduce((sum,row)=>sum+row.getBoundingClientRect().height,0);
   panel.style.setProperty('--three-project-height',Math.ceil(height+2)+'px');
   panel.tabIndex=rows.length>3?0:-1;
  }
 });
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
 document.querySelectorAll('article.program').forEach(card=>{card.hidden=!matches.has(card.id)});
 document.querySelectorAll('.directory').forEach(section=>{section.hidden=![...section.querySelectorAll('article.program')].some(card=>!card.hidden)});
 numberSelectedRows();
 highlightProfileMatches(query);
 document.querySelector('#clear-search').hidden=!input.value;document.querySelector('#view-search-results').hidden=!matches.size;
 document.querySelector('#search-status').textContent=matches.size?`${matches.size} of ${programs.length} projects shown`:'No matching projects. Try another term or clear your search.';
}
function updateCountryOutlines(place){
 const direct=places.find(p=>p.name===place.name);
 const locations=direct?[direct]:places.filter(p=>p.ids.some(id=>place.ids.includes(id)));
 const names=locations.flatMap(p=>p.countries||[]);
 document.querySelectorAll('#country-outlines path').forEach(path=>path.classList.toggle('active',names.includes(path.dataset.country)));
}
function numberSelectedRows(){
 const rows=[...document.querySelectorAll('#selected-projects article.program')].filter(row=>!row.hidden);
 document.querySelectorAll('.result-number').forEach(b=>b.remove());
 rows.forEach((row,i)=>{const badge=document.createElement('span');badge.className='result-number';badge.textContent=`${i+1} of ${rows.length}`;badge.setAttribute('aria-label',`Selected project ${i+1} of ${rows.length}`);row.prepend(badge);row.classList.add('selected-profile');});
}
function prioritizeProfiles(place){
 place=searchPlace(place);if(!place.ids.length)return;
 const selected=new Set(place.ids);
 const section=document.querySelector('#selected-projects-section');section.hidden=false;
 document.querySelector('#selected-projects-title').textContent=place.name;
 document.querySelector('#selected-projects').innerHTML=place.ids.map(id=>renderProgram(programs.find(p=>p.id===id)).replace('class="program"','class="program selected-profile"')).join('');
 document.querySelector('#programs').innerHTML=programs.filter(p=>!selected.has(p.id)).map(renderProgram).join('');

 filterProfiles();
 numberSelectedRows();
}
const map=document.querySelector('#map'),tip=document.querySelector('#tooltip');
let activeLocationName=null,activeLocationKey=null;
function showDetail(place){place=searchPlace(place);if(!place.ids.length)return;updateCountryOutlines(place);const key=place.name+'|'+place.ids.join(',');if(activeLocationKey===key)return;activeLocationKey=key;activeLocationName=place.name;document.querySelectorAll('.marker').forEach(b=>{const chosen=b.dataset.name===place.name;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));});document.querySelector('#detail').classList.toggle('multiple-projects',place.ids.length>1);document.querySelector('#detail').innerHTML=`<p class="eyebrow">${place.ids.length>1?"SELECTED LOCATIONS":"SELECTED LOCATION"}</p><h2>${place.name}</h2>`+place.ids.map(id=>{const p=programs.find(p=>p.id===id);return `<div class="detail-block">${badge(p)}<h3>${p.name}</h3><p class="metric">${p.metric}</p><p class="metric-label">${p.metricLabel}</p>${p.metric.includes("AUC")?aucExplanation:""}<p>${p.short}</p><p class="contact-note">${p.date}${place.ids.includes('ave')&&id==='ave'?' · Five-country aggregate':''}</p><a href="#${p.id}">Outcomes, sponsors & contact ↓</a></div>`}).join('');document.querySelector('#detail').scrollTop=0;}
let pinnedTipButton=null;
let tipButton=null, tipTimer=null, overTip=false, overMarker=false, touchTipButton=null, touchInteraction=false;
function cancelTipClose(){clearTimeout(tipTimer);tipTimer=null;}
const tipDock=document.createElement('div');tipDock.className='tooltip-dock';tipDock.hidden=true;map.parentElement.after(tipDock);
function closeTip(force=false){if(pinnedTipButton&&!force)return;pinnedTipButton=null;tipDock.hidden=true;touchTipButton=null;cancelTipClose();tip.hidden=true;tipButton?.removeAttribute('aria-describedby');tipButton=null;overTip=false;overMarker=false;}
function scheduleTipClose(){cancelTipClose();tipTimer=setTimeout(()=>{if(!touchTipButton&&!overTip&&!overMarker&&document.activeElement!==tipButton&&!tip.contains(document.activeElement))closeTip();},650);}
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
  const chosen=programs.find(p=>p.id===id);
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
function showTip(place,button){if(pinnedTipButton&&pinnedTipButton!==button)return;place=searchPlace(place);if(!place.ids.length)return;showDetail(place);cancelTipClose();if(tipButton!==button){tipButton?.removeAttribute('aria-describedby');overTip=false;}tipButton=button;tip.classList.toggle('multi-project',place.ids.length>1);tip.innerHTML=`<strong>${place.name}</strong><div class="tooltip-entries">`+place.ids.map(id=>{let p=programs.find(p=>p.id===id);return `<div class="tooltip-entry"><span class="tooltip-entry-title">${p.name}</span><small>${p.short}</small><a class="tooltip-profile" data-profile="${p.id}" href="#${p.id}" aria-label="View project profile: ${p.name}">View project profile →</a></div>`}).join('')+'</div>';tipDock.hidden=true;map.append(tip);tip.classList.remove('docked');tip.style.maxHeight='';tip.hidden=false;
 tipDock.hidden=false;tipDock.append(tip);tip.classList.add('docked');tip.style.left='';tip.style.top='';tip.style.maxHeight=Math.max(80,(window.visualViewport?.height||window.innerHeight)-56)+'px';
 button.setAttribute('aria-describedby','tooltip');
 // v3.1.1: revealing a marker preview must not move the map or page.
 }

for(const place of places){const b=document.createElement('button');b.className='marker '+(place.left?'left ':'')+programs.find(p=>p.id===place.ids[0]).kind;b.style.left=projectX(place.lon)+'%';b.style.top=projectY(place.lat)+'%';b.dataset.name=place.name;b.setAttribute('aria-label',`${place.name}: ${place.ids.map(id=>programs.find(p=>p.id===id).name).join(', ')}. Show outcomes`);b.innerHTML=`${place.ids.length>1?place.ids.length:'•'}<span class="marker-label">${place.name}</span>`;b.addEventListener('pointerdown',e=>{touchInteraction=e.pointerType==='touch'||e.pointerType==='pen'});b.addEventListener('mouseenter',()=>{if(touchInteraction||window.matchMedia('(hover: none)').matches)return;overMarker=true;showTip(place,b)});b.addEventListener('focus',()=>{if(touchInteraction)return;overMarker=b.matches(':hover');showTip(place,b)});b.addEventListener('mouseleave',()=>{if(tipButton===b){overMarker=false;scheduleTipClose()}});b.addEventListener('blur',()=>{if(tipButton===b)scheduleTipClose()});b.addEventListener('click',()=>{clearSharedProject();markerProjectIds=new Set(place.ids);document.querySelector('#project-search').value=place.countries.join(', ');syncSearchMap({preserveMapPosition:true});closeTip(true);showTip(place,b);pinnedTipButton=b;touchTipButton=b;showDetail(place);prioritizeProfiles(place)});document.querySelector('#markers').append(b)}
document.addEventListener('pointerdown',e=>{if(!tip.hidden&&!tip.contains(e.target)&&!tipButton?.contains(e.target))closeTip();});
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
function jumpToResults(event){setMobileView('list');const card=[...document.querySelectorAll('article.program')].find(card=>!card.hidden);if(!card)return;event.preventDefault();card.setAttribute('tabindex','-1');card.focus({preventScroll:true});card.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
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
for(const event of ['input','search','change'])document.querySelector('#project-search').addEventListener(event,filterProfiles);
window.addEventListener('pageshow',filterProfiles);
document.querySelector('#clear-search').addEventListener('click',()=>{const input=document.querySelector('#project-search');input.value='';filterProfiles();input.focus();});
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
function syncSearchMap({preserveMapPosition=false}={}){
 closeTip(true);
 // v4.1.0: an empty search restores one complete numeric list, including related initiatives.
 if(!document.querySelector('#project-search').value.trim()&&!sharedProjectId){document.querySelector('#selected-projects').replaceChildren();document.querySelector('#programs').innerHTML=programs.map(renderProgram).join('');}
 filterProfiles();
 const query=document.querySelector('#project-search').value.trim();
 const matches=matchingProjectIds(query);
 document.querySelectorAll('.marker').forEach(marker=>{
  const place=places.find(p=>p.name===marker.dataset.name),ids=place.ids.filter(id=>matches.has(id));
  marker.hidden=false;marker.classList.toggle('search-muted',!ids.length);
  const visibleIds=ids.length?ids:place.ids;
  marker.firstChild.textContent=visibleIds.length>1?String(visibleIds.length):'•';
  marker.setAttribute('aria-label',`${place.name}: ${visibleIds.map(id=>programs.find(p=>p.id===id).name).join(', ')}. Show outcomes`);
 });
 document.querySelectorAll('article.program').forEach(card=>{card.classList.remove('search-first');card.classList.toggle('selected-profile',!query&&!!card.closest('#selected-projects'));});
 const first=[...document.querySelectorAll('article.program')].find(card=>!card.hidden);
 if((query||sharedProjectId)&&first){
  first.classList.remove('search-first');
  const locations=places.filter(p=>p.ids.some(id=>matches.has(id)));
  const orderedIds=orderProjectIds([...matches]);
  prioritizeProfiles({name:sharedProjectId?programs.find(p=>p.id===sharedProjectId).name:'Search results',ids:orderedIds});
  showDetail({name:locations.map(p=>p.name).join(' · '),ids:orderedIds});
  document.getElementById(orderedIds[0])?.classList.add('search-first');
  document.querySelectorAll('.marker').forEach(marker=>{const selected=locations.some(p=>p.name===marker.dataset.name);marker.classList.toggle('selected',selected);marker.setAttribute('aria-pressed',String(selected));});
  const place=locations[0];if(place&&!preserveMapPosition){mapScroller.scrollLeft=Math.max(0,projectX(place.lon)/100*mapScroller.scrollWidth-mapScroller.clientWidth/2);updateMapScrollCue();}
 }else if(!query){
 activeLocationKey=null;activeLocationName=null;updateCountryOutlines({name:'',ids:[]});
 const detail=document.querySelector('#detail');detail.classList.remove('multiple-projects');detail.innerHTML=`<p class="eyebrow">PROJECT GEOGRAPHY</p><h2>All project locations</h2><p class="metric">${programs.length}</p><p class="metric-label">projects across ${covered.size} countries</p><p>${programs.filter(p=>!p.related).length} AI programs and studies · ${programs.filter(p=>p.related).length} related initiatives.</p><p>Choose a country marker to see its projects and reported outcomes.</p>`;detail.scrollTop=0;
 document.querySelectorAll('.marker').forEach(marker=>{marker.classList.remove('selected');marker.setAttribute('aria-pressed','false');});}
 else{
  activeLocationKey=null;activeLocationName=null;updateCountryOutlines({name:'',ids:[]});
  document.querySelectorAll('.marker').forEach(marker=>{marker.classList.remove('selected');marker.setAttribute('aria-pressed','false');});
  const detail=document.querySelector('#detail');detail.classList.remove('multiple-projects');detail.innerHTML='<p class="eyebrow">PROJECT GEOGRAPHY</p><h2>No matching locations</h2><p>Try another search or clear the field to restore all projects.</p>';
 }
}
for(const event of ['input','search','change'])document.querySelector('#project-search').addEventListener(event,syncSearchMap);
document.querySelector('#clear-search').addEventListener('click',syncSearchMap);
window.addEventListener('pageshow',()=>{if(document.querySelector('#project-search').value.trim())syncSearchMap();});

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
  const place=places.find(p=>p.name===marker.dataset.name);
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
 const location=places.find(p=>p.name===marker.dataset.name);const targets=(location?.countries||[]).map(name=>catalog.countries.find(c=>c.name===name)).filter(Boolean).map(c=>[c.lon,c.lat]);
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
 const location=places.find(p=>p.name===marker.dataset.name);if(!location)return;
 void outlines.getBoundingClientRect();
 paths.filter(path=>location.countries.includes(path.dataset.country)).forEach(path=>path.classList.add('country-chosen'));
}
for(const marker of document.querySelectorAll('.marker'))for(const event of ['mouseenter','focus','click'])marker.addEventListener(event,()=>pulseCountries(marker));
outlines.addEventListener('animationend',event=>event.target.classList.remove('country-chosen'));
// v2.2.0: hover/focus highlight survives the introductory pulse.
function refreshHoverCountries(){
 const names=new Set([...document.querySelectorAll('.marker')].filter(marker=>marker.matches(':hover,:focus-visible')).flatMap(marker=>places.find(p=>p.name===marker.dataset.name)?.countries||[]));
 outlines.querySelectorAll('path').forEach(path=>path.classList.toggle('country-hovered',names.has(path.dataset.country)));
}
for(const marker of document.querySelectorAll('.marker'))for(const event of ['mouseenter','mouseleave','focus','blur'])marker.addEventListener(event,refreshHoverCountries);

// v2.1.0: stable IDs survive edits; shared selection is applied after async catalog loading.
const sharedNotice=document.createElement('div');sharedNotice.className='shared-project-notice';sharedNotice.hidden=true;
const sharedMessage=document.createElement('span');
const showAll=document.createElement('button');showAll.type='button';showAll.textContent='Show all projects';
sharedNotice.append(sharedMessage,showAll);document.querySelector('.project-search').append(sharedNotice);
function clearSharedProject(){
 markerProjectIds=null;
 sharedProjectId=null;sharedNotice.hidden=true;
 const url=new URL(location.href);url.searchParams.delete('project');url.hash='';history.replaceState(null,'',url);
}
document.querySelector('#clear-search').addEventListener('click',clearSharedProject,{capture:true});
showAll.addEventListener('click',()=>{clearSharedProject();document.querySelector('#project-search').value='';syncSearchMap();});
for(const event of ['input','search','change'])document.querySelector('#project-search').addEventListener(event,clearSharedProject,{capture:true});
function openSharedProject(){
 const id=new URL(location.href).searchParams.get('project');
 sharedProjectId=null;sharedNotice.hidden=!id;
 if(!id){syncSearchMap();return;}
 document.querySelector('#project-search').value='';
 const project=catalog.programs.find(p=>p.id===id);
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
if(new URL(location.href).searchParams.has('project'))openSharedProject();else syncSearchMap();
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
