import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
const listeners={},events=[],window={addEventListener:(n,f)=>listeners[n]=f};
const document={hidden:false,addEventListener:(n,f)=>listeners[n]=f,querySelector:()=>({value:'Kenya'}),querySelectorAll:()=>[]};
vm.runInNewContext(fs.readFileSync('dist/analytics-interactions.js','utf8'),{window,document,Set,Map,WeakSet,queueMicrotask,clearTimeout,setTimeout});
window.installAtlasInteractions((...args)=>events.push(args));
function click(selector,extra={}){const el={dataset:{name:'Kenya'},textContent:'Africa',closest:s=>s==='article.program'?{id:'kinondo'}:null,matches:s=>s===selector,...extra};listeners.click({target:{closest:()=>el}});}
click('.marker');click('.continent-controls button');click('.back-to-map');click('#clear-search');
assert.deepEqual(events.map(e=>e[0]),['map-marker-selected','continent-selected','back-to-map','search-cleared']);
listeners['atlas-analytics']({detail:{name:'share-copied',data:{project_id:'kinondo'}}});assert.equal(events[4][0],'share-copied');
listeners['atlas-analytics']({detail:{name:'password',data:{}}});assert.equal(events.length,5);
const panel={id:'selected',matches:()=>true,scrollHeight:600,clientHeight:300,scrollTop:300,querySelectorAll:()=>[{hidden:false}]};listeners.scroll({target:panel});listeners.scroll({target:panel});assert.equal(events.filter(e=>e[0]==='project-list-end').length,1);
console.log('PASS interaction names, project association, allowlisted outcomes and list-end deduplication');
