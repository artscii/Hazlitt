// Umami only: no parallel legacy collector and no tracking on Admin pages.
(async()=>{
 if(location.pathname.startsWith('/admin')||navigator.doNotTrack==='1'||navigator.globalPrivacyControl)return;
 let searchTimer,lastSearch='',searchOrigin=null,searchStarted=0;
 const send=(name,data)=>{if(ready)try{Promise.resolve(window.umami.track(name,data)).catch(()=>{});}catch{}};
 document.addEventListener('input',event=>{if(event.target.id==='project-search'){clearTimeout(searchTimer);searchOrigin='typed';searchStarted=performance.now();}},true);
 document.addEventListener('click',event=>{if(event.target.closest('.marker,.continent-controls button')){clearTimeout(searchTimer);searchOrigin='map';searchStarted=performance.now();}},true);
 window.addEventListener('atlas-search-complete',event=>{clearTimeout(searchTimer);const detail=event.detail;if(!searchOrigin||!detail?.query)return;const data={...detail,origin:searchOrigin};const duration=Math.round(performance.now()-searchStarted);searchTimer=setTimeout(()=>{const key=JSON.stringify(data);if(!ready||key===lastSearch)return;lastSearch=key;send('project-search',{...data,duration_ms:duration});if(data.result_count===0)send('search-no-matches',{...data,duration_ms:duration});},900);});
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
  script.onload=()=>{if(!window.umami)return;ready=true;window.installAtlasInteractions?.(send);Promise.resolve(window.umami.track(props=>({...props,url:location.pathname,referrer:''}))).catch(()=>{});for(const id of pending)track(id);pending.clear();const recorder=document.createElement('script');recorder.src='/metrics/recorder.js';recorder.defer=true;recorder.dataset.websiteId=config.websiteId;recorder.dataset.hostUrl=location.origin+'/metrics';document.head.append(recorder);};
  document.head.append(script);
 }catch{/* Analytics must never block the Atlas. */}
})();
