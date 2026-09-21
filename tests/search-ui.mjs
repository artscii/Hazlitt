import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const catalog=process.env.ATLAS_TEST_CATALOG?JSON.parse(fs.readFileSync(process.env.ATLAS_TEST_CATALOG)):{programs:JSON.parse(fs.readFileSync('data/seed.json')),countries:JSON.parse(fs.readFileSync('data/countries.json'))};
const dom=new JSDOM(fs.readFileSync('dist/index.html','utf8'),{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;const errors=[];
w.addEventListener('error',e=>errors.push(e.message));
w.fetch=async()=>({ok:true,json:async()=>catalog});w.matchMedia=()=>({matches:false,addEventListener(){}});
w.ResizeObserver=class{observe(){} disconnect(){}};d.fonts={ready:Promise.resolve()};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.performance.measure=()=>{};
for(const file of ['search.js','semantic-search.js','app.js'])w.eval(fs.readFileSync('dist/'+file,'utf8'));
await new Promise(resolve=>w.addEventListener('atlas-ready',resolve,{once:true}));
const input=d.querySelector('#project-search'),cards=new Map([...d.querySelectorAll('article.program')].map(c=>[c.id,c]));
const settle=()=>new Promise(resolve=>setTimeout(resolve,45));
async function search(query){input.value=query;input.dispatchEvent(new w.Event('input',{bubbles:true}));await settle();}
await search('missed cases');assert(d.querySelector('#search-status').textContent.includes('concept matches'));
await search('nothing-matches-xyz');assert.equal(d.querySelectorAll('article.program:not([hidden])').length,0);
await search('');assert.equal(d.querySelectorAll('article.program:not([hidden])').length,catalog.programs.length);
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
assert(d.querySelector('#semantic-toggle').disabled,'Unsupported browsers retain indexed search');
assert.equal(errors.length,0,errors.join('\n'));
console.log(`DOM integration passed: ${catalog.programs.length} cards reused; ${markers.length} markers selected twice without position changes; clear, rapid input, semantic fallback.`);
dom.window.close();
