import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const catalog=process.env.ATLAS_TEST_CATALOG?JSON.parse(fs.readFileSync(process.env.ATLAS_TEST_CATALOG)):{programs:JSON.parse(fs.readFileSync('data/seed.json')),countries:JSON.parse(fs.readFileSync('data/countries.json'))};
const dom=new JSDOM(fs.readFileSync('dist/index.html','utf8'),{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;const errors=[];
w.addEventListener('error',e=>errors.push(e.message));
w.fetch=async()=>({ok:true,json:async()=>catalog});w.matchMedia=()=>({matches:false,addEventListener(){}});
w.ResizeObserver=class{observe(){} disconnect(){}};d.fonts={ready:Promise.resolve()};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.performance.measure=()=>{};
for(const file of ['search.js','app.js'])w.eval(fs.readFileSync('dist/'+file,'utf8'));
await new Promise(resolve=>w.addEventListener('atlas-ready',resolve,{once:true}));
const input=d.querySelector('#project-search'),cards=new Map([...d.querySelectorAll('article.program')].map(c=>[c.id,c]));
const settle=()=>new Promise(resolve=>setTimeout(resolve,45));
async function search(query){input.value=query;input.dispatchEvent(new w.Event('input',{bubbles:true}));await settle();}
await search('cytology');assert(d.querySelectorAll('article.program:not([hidden])').length>0);
const cytologyMatches=[...d.querySelectorAll('article.program:not([hidden])')];
if(cytologyMatches.length>5){
 assert.equal(d.querySelector('#detail h2').textContent,'Results by continent');
 assert.equal(d.querySelectorAll('#detail .detail-block').length,0);
 const africaIds=catalog.programs.filter(p=>cytologyMatches.some(c=>c.id===p.id)&&p.countries.some(c=>['Kenya','Tanzania','Cameroon','Uganda','Rwanda','Zambia','Zimbabwe','Malawi','Senegal','Ethiopia'].includes(c))).map(p=>p.id);
 if(africaIds.length)assert.equal(d.querySelector('[data-continent="Africa"] span').textContent,`${africaIds.length} ${africaIds.length===1?'project':'projects'}`);
}
await search('bombo');assert(d.querySelector('#detail .detail-block'));assert(!d.querySelector('.continent-summary'));
const regionButton=name=>d.querySelector(`[data-map-continent="${name}"]`);
regionButton('Africa').click();
assert.equal(input.value,'Africa');
assert.deepEqual([...d.querySelectorAll('article.program:not([hidden])')].map(c=>c.id),catalog.programs.filter(p=>w.AtlasSearch.continentsOf(p).includes('Africa')).map(p=>p.id));
const africanMarkers=[...d.querySelectorAll('.marker:not(.continent-hidden)')];assert(africanMarkers.length>0);assert(d.querySelector('.marker.continent-hidden'));
const canada=d.querySelector('#country-base path[aria-label="Canada"]');
if(canada){canada.dispatchEvent(new w.Event('pointerenter'));assert.equal(regionButton('North America').getAttribute('aria-pressed'),'true');assert(africanMarkers.every(m=>m.classList.contains('continent-hidden')));}
if(canada){canada.dispatchEvent(new w.Event('click'));assert.equal(input.value,'North America');assert([...d.querySelectorAll('article.program:not([hidden])')].every(c=>w.AtlasSearch.continentsOf(catalog.programs.find(p=>p.id===c.id)).includes('North America')));}
regionButton('All').click();assert.equal(input.value,'');assert.equal(d.querySelectorAll('.continent-hidden').length,0);
await search('nothing-matches-xyz');assert.equal(d.querySelectorAll('article.program:not([hidden])').length,0);assert(d.querySelector('#search-status').classList.contains('search-empty'));
await search('');assert.equal(d.querySelectorAll('article.program:not([hidden])').length,catalog.programs.length);assert(!d.querySelector('#search-status').classList.contains('search-empty'));
for(const [id,card]of cards)assert.strictEqual(d.getElementById(id),card,'Card identity retained');
const markers=[...d.querySelectorAll('.marker')],positions=markers.map(m=>[m.style.left,m.style.top]);
for(const marker of [...markers,...markers]){
 marker.click();
 assert.equal(d.querySelectorAll('.marker.selected').length,1,marker.dataset.name+' must be sole selected marker');
 assert(marker.classList.contains('selected'));assert(d.querySelector('#markers').classList.contains('has-selection'));
 assert(markers.every(m=>!m.hidden));
}
assert.deepEqual(markers.map(m=>[m.style.left,m.style.top]),positions);
await search('');assert.equal(d.querySelectorAll('.marker.selected').length,0);
// Typing a new query before the scheduled frame must cancel the earlier selection.
input.value='Kenya';input.dispatchEvent(new w.Event('input'));input.value='China';input.dispatchEvent(new w.Event('input'));await settle();
assert([...d.querySelectorAll('article.program:not([hidden])')].every(c=>catalog.programs.find(p=>p.id===c.id).countries.includes('China')));
assert.equal(d.querySelector('#semantic-toggle'),null,'AI search has been removed');
assert.equal(errors.length,0,errors.join('\n'));
console.log(`DOM integration passed: ${catalog.programs.length} cards reused; ${markers.length} markers selected twice without position changes; clear, rapid input, full-text search.`);
dom.window.close();
