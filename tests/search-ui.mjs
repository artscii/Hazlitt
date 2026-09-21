import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const catalog=process.env.ATLAS_TEST_CATALOG?JSON.parse(fs.readFileSync(process.env.ATLAS_TEST_CATALOG)):{programs:JSON.parse(fs.readFileSync('data/seed.json')),countries:JSON.parse(fs.readFileSync('data/countries.json'))};
const dom=new JSDOM(fs.readFileSync('dist/index.html','utf8'),{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;const errors=[],mapScrolls=[];
w.HTMLElement.prototype.scrollTo=function(options){mapScrolls.push(options);this.scrollLeft=options.left;};
w.addEventListener('error',e=>errors.push(e.message));
w.fetch=async()=>({ok:true,json:async()=>catalog});w.matchMedia=()=>({matches:false,addEventListener(){}});
w.ResizeObserver=class{observe(){} disconnect(){}};d.fonts={ready:Promise.resolve()};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.performance.measure=()=>{};
for(const file of ['search.js','app.js'])w.eval(fs.readFileSync('dist/'+file,'utf8'));
await new Promise(resolve=>w.addEventListener('atlas-ready',resolve,{once:true}));
const input=d.querySelector('#project-search'),cards=new Map([...d.querySelectorAll('article.program')].map(c=>[c.id,c]));
const settle=()=>new Promise(resolve=>setTimeout(resolve,45));
async function search(query){input.value=query;input.dispatchEvent(new w.Event('input',{bubbles:true}));await settle();}
assert.equal(input.value,'Africa');assert.equal(d.querySelector('#detail h2').textContent,'Africa');assert(d.querySelector('.continent-summary'));
assert(d.querySelector('#selected-projects-section .references-jump'));
assert(!d.querySelector('.search-tips').open);
assert.equal(input.placeholder,`All ${catalog.programs.length} projects`);
await search('“Africa”');assert.equal(d.querySelector('#detail h2').textContent,'Africa');
await search('cytology');assert(d.querySelectorAll('article.program:not([hidden])').length>0);
const cytologyMatches=[...d.querySelectorAll('article.program:not([hidden])')];
if(cytologyMatches.length>5){
 assert.equal(d.querySelector('#detail h2').textContent,'Results by continent');
 assert.equal(d.querySelectorAll('#detail .detail-block').length,0);
 const africaIds=catalog.programs.filter(p=>cytologyMatches.some(c=>c.id===p.id)&&p.countries.some(c=>['Kenya','Tanzania','Cameroon','Uganda','Rwanda','Zambia','Zimbabwe','Malawi','Senegal','Ethiopia'].includes(c))).map(p=>p.id);
 if(africaIds.length)assert.equal(d.querySelector('[data-continent="Africa"] span').textContent,`${africaIds.length} ${africaIds.length===1?'project':'projects'}`);
}
await search('bombo');assert(d.querySelector('#detail .detail-block'));assert(!d.querySelector('.continent-summary'));
assert.strictEqual(d.querySelector('.selection-context').nextElementSibling,d.querySelector('.tooltip-dock'),'Project previews follow continent filters');
const regionButton=name=>d.querySelector(`[data-map-continent="${name}"]`);
assert.equal(mapScrolls.length,0,'Initial load and searches do not pan the map');
const scroller=d.querySelector('.map-scroll');
Object.defineProperties(scroller,{scrollWidth:{value:1200},clientWidth:{value:390}});
regionButton('Africa').click();
assert.equal(mapScrolls.length,1);assert.equal(mapScrolls[0].behavior,'smooth');assert(mapScrolls[0].left>0&&mapScrolls[0].left<=810);
assert.equal(input.value,'Africa');assert.equal(d.querySelector('#detail h2').textContent,'Africa');assert.equal(d.querySelectorAll('#detail .detail-block').length,0);
assert.deepEqual([...d.querySelectorAll('article.program:not([hidden])')].map(c=>c.id),catalog.programs.filter(p=>w.AtlasSearch.continentsOf(p).includes('Africa')).map(p=>p.id));
const africanMarkers=[...d.querySelectorAll('.marker:not(.continent-hidden)')];assert(africanMarkers.length>0);assert(d.querySelector('.marker.continent-hidden'));
const canada=d.querySelector('#country-base path[aria-label="Canada"]');
if(canada){canada.dispatchEvent(new w.Event('pointerenter'));assert.equal(regionButton('Africa').getAttribute('aria-pressed'),'true');assert.equal(input.value,'Africa');assert(africanMarkers.every(m=>!m.classList.contains('continent-hidden')));}
if(canada){canada.dispatchEvent(new w.Event('click'));assert.equal(input.value,'North America');assert([...d.querySelectorAll('article.program:not([hidden])')].every(c=>w.AtlasSearch.continentsOf(catalog.programs.find(p=>p.id===c.id)).includes('North America')));}
assert.equal(regionButton('All'),null,'No All continents button');
await search('');assert.equal(input.value,'');
await search('nothing-matches-xyz');assert.equal(d.querySelectorAll('article.program:not([hidden])').length,0);assert(d.querySelector('#search-status').classList.contains('search-empty'));
await search('');assert.equal(d.querySelectorAll('article.program:not([hidden])').length,catalog.programs.length);assert(!d.querySelector('#search-status').classList.contains('search-empty'));
for(const [id,card]of cards)assert.strictEqual(d.getElementById(id),card,'Card identity retained');
const markers=[...d.querySelectorAll('.marker')],positions=markers.map(m=>[m.style.left,m.style.top]);
const selectionObserver=new w.MutationObserver(()=>{});
selectionObserver.observe(d.querySelector('#detail'),{childList:true});
selectionObserver.observe(d.querySelector('#search-status'),{childList:true});
for(const marker of [...markers,...markers]){
 marker.click();
 const updates=selectionObserver.takeRecords();
 assert.equal(updates.filter(r=>r.target.id==='search-status').length,1,'One project-list filtering pass per selection');
 assert(updates.filter(r=>r.target.id==='detail').length<=1,'No intermediate location-panel renders');
 assert.equal(d.querySelectorAll('.marker.selected').length,1,marker.dataset.name+' must be sole selected marker');
 assert(d.querySelector('.selection-context button').textContent.startsWith('Back to '));
 assert(marker.classList.contains('selected'));assert(d.querySelector('#markers').classList.contains('has-selection'));
 assert(markers.every(m=>!m.hidden));
 assert(!marker.classList.contains('continent-hidden'),'Selected marker stays visible');
 const selectedContinent=d.querySelector('[data-map-continent][aria-pressed="true"]').dataset.mapContinent;
 assert.notEqual(selectedContinent,'All','Marker selects its continent');
 assert(markers.some(m=>m.classList.contains('continent-hidden')),'Other continents are suppressed');
 assert.equal(mapScrolls.length,1,'Marker selection does not pan the map');
}
assert.deepEqual(markers.map(m=>[m.style.left,m.style.top]),positions);
await search('');assert.equal(d.querySelectorAll('.marker.selected').length,0);
// Typing a new query before the scheduled frame must cancel the earlier selection.
input.value='Kenya';input.dispatchEvent(new w.Event('input'));input.value='China';input.dispatchEvent(new w.Event('input'));await settle();
assert([...d.querySelectorAll('article.program:not([hidden])')].every(c=>catalog.programs.find(p=>p.id===c.id).countries.includes('China')));
assert.equal(d.querySelector('#semantic-toggle'),null,'AI search has been removed');
// Card turns swap faces once and ignore repeated clicks during the turn.
const flipButton=d.querySelector('#bombo .project-expand'),flipCard=flipButton.closest('.program');
const turns=[];w.HTMLElement.prototype.animate=function(frames,options){turns.push({frames,options});return {finished:Promise.resolve(),cancel(){}};};
flipButton.click();flipButton.click();await settle();
assert.equal(turns.length,2);assert(flipCard.classList.contains('project-expanded'));assert.equal(flipButton.textContent,'Back to summary');
flipButton.click();await settle();assert(!flipCard.classList.contains('project-expanded'));assert.equal(turns.length,4);
w.matchMedia=()=>({matches:true,addEventListener(){}});flipButton.click();assert(flipCard.classList.contains('project-expanded'));assert.equal(turns.length,4,'Reduced motion skips animation');
assert.equal(errors.length,0,errors.join('\n'));
console.log(`DOM integration passed: ${catalog.programs.length} cards reused; ${markers.length} markers selected twice without position changes; clear, rapid input, full-text search.`);
dom.window.close();
