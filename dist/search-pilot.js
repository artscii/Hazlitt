// v4.13.0: primary semantic search with bounded, explicit keyword fallback.
(()=>{
 const input=document.querySelector('#project-search');if(!input)return;
 const status=document.createElement('p');status.className='pilot-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');input.closest('.project-search').append(status);
 let generation=0,timer,controller,cooldown=0;
 function cancel(){generation++;clearTimeout(timer);controller?.abort();status.textContent='';}
 window.addEventListener('atlas-search-cancel',cancel);
 window.atlasPrimarySearch=(raw,fallback)=>{
  cancel();const token=generation,query=raw.trim();
  if(!query){fallback();return;}
  if(Date.now()<cooldown){fallback();status.textContent='Keyword search · semantic search temporarily unavailable.';return;}
  status.textContent='Searching…';
  timer=setTimeout(async()=>{
   controller=new AbortController();const deadline=setTimeout(()=>controller.abort(),8000);
   try{
    const response=await fetch('/api/search-pilot/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,scope:{},deep:false}),signal:controller.signal});
    if(!response.ok)throw new Error('Search unavailable');
    const data=await response.json();if(!Array.isArray(data.b)||data.b.some(x=>typeof x.id!=='string'))throw new Error('Invalid results');
    if(token!==generation||input.value.trim()!==query)return;
    window.dispatchEvent(new CustomEvent('atlas-pilot-results',{detail:{query,ids:data.b.map(x=>x.id),primary:true}}));
    status.textContent='Semantic search';
   }catch(error){if(token!==generation||input.value.trim()!==query)return;cooldown=Date.now()+30000;fallback();status.textContent='Keyword search · semantic search temporarily unavailable.';}
   finally{clearTimeout(deadline);}
  },300);
 };
})();
