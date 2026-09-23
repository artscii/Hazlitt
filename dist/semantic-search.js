// v4.13.0: primary semantic search with bounded, explicit keyword fallback.
(()=>{
 const input=document.querySelector('#project-search');if(!input)return;
 const status=document.querySelector('#qmd-connection')||document.createElement('span');
 if(!status.isConnected){status.className='qmd-cloud';status.setAttribute('role','status');input.closest('.project-search').append(status);}
 const cloud='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 7a5.5 5.5 0 0 1 0 11Z"/><path class="cloud-slash" d="m3 3 18 18"/></svg>';
 function connection(active,label){status.classList.toggle('is-connected',active);status.title=label;status.setAttribute('aria-label',label);status.innerHTML=cloud;}
 connection(false,'QMD connection not yet verified');
 let enabled=false;status.hidden=true;const divider=document.querySelector('.search-cloud-divider');if(divider)divider.hidden=true;
 const configReady=AtlasBootstrap.config.then(config=>{enabled=config.qmdEnabled!==false;status.hidden=!enabled;if(divider)divider.hidden=!enabled;}).catch(()=>{});
 let generation=0,timer,controller,cooldown=0,checking=false;
 async function checkReady(){
  if(!enabled||checking||document.hidden||status.getAttribute('aria-busy')==='true')return;
  checking=true;const epoch=generation;
  try{const response=await fetch('/api/search/status',{cache:'no-store',signal:AbortSignal.timeout(4000)});const data=await response.json();
   if(epoch!==generation)return;
   const ready=response.ok&&data.ready===true;
   connection(ready,ready?'QMD ready — semantic search available':data.warming?'QMD warming up':'QMD unavailable — keyword search available');
   if(ready)cooldown=0;
  }catch{if(epoch===generation)connection(false,'QMD unavailable — keyword search available');}finally{checking=false;}
 }
 configReady.then(checkReady);setInterval(checkReady,15000);window.addEventListener('focus',checkReady);
 function cancel(){generation++;clearTimeout(timer);controller?.abort();status.removeAttribute('aria-busy');}
 window.addEventListener('atlas-search-cancel',cancel);
 window.atlasPrimarySearch=async(raw,fallback)=>{
  cancel();const token=generation,query=raw.trim();
  fallback(); // Lexical results are visible immediately, even when QMD is offline.
  await configReady;if(token!==generation)return;if(!enabled)return;
  const lexical=window.atlasSearchIndex?.search(query);if(!lexical?.candidates.length||window.atlasCatalog?.programs.some(p=>AtlasSearch.normalize(p.name)===AtlasSearch.normalize(query)))return;
  if(!query)return;
  if(Date.now()<cooldown){connection(false,'QMD unavailable — keyword search active');return;}
  status.setAttribute('aria-busy','true');
  timer=setTimeout(async()=>{
   controller=new AbortController();const deadline=setTimeout(()=>controller.abort(),8000);
   try{
    const response=await fetch('/api/search/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,scope:{},deep:false}),signal:controller.signal});
    if(!response.ok)throw new Error('Search unavailable');
    const data=await response.json();if(!Array.isArray(data.results)||data.results.some(x=>typeof x.id!=='string'))throw new Error('Invalid results');
    if(token!==generation||input.value.trim()!==query)return;
    window.dispatchEvent(new CustomEvent('atlas-semantic-results',{detail:{query,ids:data.results.map(x=>x.id),primary:true}}));
    connection(data.semanticReady===true&&!data.semanticUnavailable,data.semanticReady===true&&!data.semanticUnavailable?'QMD ready — semantic search available':'QMD unavailable — lexical results shown');
   }catch(error){if(token!==generation||input.value.trim()!==query)return;window.dispatchEvent(new CustomEvent('atlas-analytics',{detail:{name:'search-fallback',data:{reason:error.name==='AbortError'?'timeout':'unavailable'}}}));cooldown=Date.now()+30000;connection(false,'QMD unavailable — keyword search active');}
   finally{clearTimeout(deadline);if(token===generation)status.removeAttribute('aria-busy');}
  },300);
 };
})();
