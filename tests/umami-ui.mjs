import {JSDOM} from 'jsdom';import fs from 'node:fs';import assert from 'node:assert/strict';
const source=fs.readFileSync('dist/analytics-client.js','utf8');
async function check({enabled=true,path='/',dnt=false,gpc=false}={}){
 const dom=new JSDOM('<head></head><body><input id="project-search"></body>',{url:'https://atlas.test'+path,runScripts:'outside-only'}),w=dom.window;let requests=0;const events=[];
 Object.defineProperty(w.navigator,'doNotTrack',{value:dnt?'1':'0'});Object.defineProperty(w.navigator,'globalPrivacyControl',{value:gpc});
 w.fetch=async()=>{requests++;return {ok:true,json:async()=>({enabled,websiteId:'12345678-1234-1234-1234-123456789012'})};};
 w.eval(source);await new Promise(r=>setTimeout(r,0));
 const script=w.document.querySelector('script');
 if(!enabled||dnt||gpc||path.startsWith('/admin')){assert.equal(script,null);if(dnt||gpc||path.startsWith('/admin'))assert.equal(requests,0);}else{
  assert.equal(script.getAttribute('src'),'/metrics/script.js');assert.equal(script.dataset.autoTrack,'false');
  w.dispatchEvent(new w.CustomEvent('atlas-project-view',{detail:'bombo'}));
  w.umami={track:async(...args)=>events.push(args)};script.onload();
  w.dispatchEvent(new w.CustomEvent('atlas-project-view',{detail:'bombo'}));
  assert.equal(w.document.querySelector('script[src="/metrics/recorder.js"]').dataset.hostUrl,'https://atlas.test/metrics');
  const field=w.document.querySelector('input');field.dispatchEvent(new w.Event('input',{bubbles:true}));
  const detail={query:'email@example.com cervical screening',result_count:0,engine:'qmd'};
  w.dispatchEvent(new w.CustomEvent('atlas-search-complete',{detail}));await new Promise(r=>setTimeout(r,950));
  assert.equal(events[2][0],'project-search');assert.equal(events[2][1].query,detail.query);assert.equal(events[2][1].result_count,0);
  w.dispatchEvent(new w.CustomEvent('atlas-search-complete',{detail}));await new Promise(r=>setTimeout(r,950));assert.equal(events.length,3);
  assert.equal(events.length,3);assert.equal(events[1][0],'project-view');assert.equal(events[1][1].project_id,'bombo');
  assert.equal(w.atlasUmamiBeforeSend('event',{url:'/?secret=yes',referrer:'secret'}).url,'/');
 }
 dom.window.close();
}
await check();await check({enabled:false});await check({dnt:true});await check({gpc:true});await check({path:'/admin'});
const dom=new JSDOM('<div id="config"></div>',{runScripts:'outside-only'});dom.window.eval(fs.readFileSync('dist/analytics-admin.js','utf8'));
const widget=dom.window.AtlasAnalytics.mount({before:dom.window.document.querySelector('#config'),api:async()=>({dashboardUrl:'https://atlas.test:8443/'})});await widget.refresh();assert.equal(dom.window.document.querySelector('a').href,'https://atlas.test:8443/');assert(!dom.window.document.querySelector('#analytics-reset'));dom.window.close();
console.log('PASS Umami loading, opt-out/admin exclusion, event deduplication, URL minimization and dashboard link');
