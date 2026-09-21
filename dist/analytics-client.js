// Anonymous visit state is tab-local and expires after 30 minutes of inactivity.
(()=>{
 let state=null;try{state=JSON.parse(sessionStorage.getItem('atlas-visit')||'null');}catch{}
 let queue=Promise.resolve();
 async function send(project,renew=false){
  if(navigator.doNotTrack==='1'||navigator.globalPrivacyControl||location.pathname.startsWith('/admin'))return;
  const now=Date.now();if(renew||!state||now-state.last>1800000)state={id:crypto.randomUUID(),last:now};state.last=now;
  try{sessionStorage.setItem('atlas-visit',JSON.stringify(state));}catch{}
  const response=await fetch('/api/analytics/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visit:state.id,project}),keepalive:true});
  if(response.status===409&&!renew)await send(project,true);
 }
 const track=project=>{queue=queue.then(()=>send(project)).catch(()=>{});};
 window.addEventListener('atlas-project-view',event=>{if(typeof event.detail==='string')track(event.detail);});
 track('');for(const name of ['pointerdown','keydown'])document.addEventListener(name,()=>{if(state&&Date.now()-state.last>1800000)track('');else if(state){state.last=Date.now();try{sessionStorage.setItem('atlas-visit',JSON.stringify(state));}catch{}}},{passive:true});
})();
