// Umami only: no parallel legacy collector and no tracking on Admin pages.
(async()=>{
 if(location.pathname.startsWith('/admin')||navigator.doNotTrack==='1'||navigator.globalPrivacyControl)return;
 let ready=false;const pending=new Set(),seen=new Set();
 const track=id=>{if(!id||seen.has(id))return;if(!ready){if(pending.size<100)pending.add(id);return;}seen.add(id);try{Promise.resolve(window.umami.track('project-view',{project_id:id})).catch(()=>{});}catch{}};
 window.addEventListener('atlas-project-view',event=>{if(typeof event.detail==='string')track(event.detail);});
 try{
  const response=await fetch('/api/analytics/config',{cache:'no-store'});if(!response.ok)return;
  const config=await response.json();if(!config.enabled)return;
  const script=document.createElement('script');script.src='/metrics/script.js';script.defer=true;
  script.dataset.websiteId=config.websiteId;script.dataset.hostUrl=location.origin+'/metrics';
  window.atlasUmamiBeforeSend=(type,payload)=>({...payload,url:location.pathname,referrer:''});script.dataset.beforeSend='atlasUmamiBeforeSend';
  script.dataset.autoTrack='false';script.dataset.doNotTrack='true';
  // Send only the path, never search terms, project URL parameters or referrer queries.
  script.onload=()=>{if(!window.umami)return;ready=true;Promise.resolve(window.umami.track(props=>({...props,url:location.pathname,referrer:''}))).catch(()=>{});for(const id of pending)track(id);pending.clear();};
  document.head.append(script);
 }catch{/* Analytics must never block the Atlas. */}
})();
