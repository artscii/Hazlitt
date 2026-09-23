// Public-page engagement only; installed after analytics authorization succeeds.
window.installAtlasInteractions=function(send){
 const query=()=>document.querySelector('#project-search')?.value.trim()||'';
 const project=el=>el.closest('article.program')?.id||'';
 document.addEventListener('click',event=>{
  const el=event.target.closest('a,button');if(!el)return;
  const project_id=project(el);
  if(el.matches('#clear-search'))send('search-cleared',{});
  else if(el.matches('.marker')){const ids=[...document.querySelectorAll('#selected-projects article.program')].filter(r=>!r.hidden).map(r=>r.id);send('map-marker-selected',{location:el.dataset.name||'',query:query(),project_ids:ids.join(',')});}
  else if(el.matches('.continent-controls button'))send('continent-selected',{continent:el.dataset.continent||el.textContent.trim()});
  else if(el.matches('.back-to-map'))send('back-to-map',{project_id});
  else if(el.matches('.references-jump'))send('references-opened',{project_id});
  else if(el.matches('.language-toggle'))queueMicrotask(()=>send('language-switched',{project_id,language:el.getAttribute('aria-expanded')==='true'?'original':'English'}));
  else if(el.matches('a[href^="tel:"],a[href^="mailto:"]'))send('contact-clicked',{project_id,type:el.protocol==='tel:'?'phone':'email'});
  else if(el.matches('a[target="_blank"]')&&el.closest('article.program,.references'))send('evidence-link-clicked',{project_id,label:el.textContent.trim(),destination:el.href});
 });
 document.addEventListener('toggle',event=>{const el=event.target;if(el.matches?.('.references details')&&el.open)send('reference-expanded',{group:el.querySelector('summary')?.textContent.trim()||''});},true);
 const seen=new Set(),timers=new Map(),observed=new WeakSet();
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries){const card=entry.target;clearTimeout(timers.get(card));timers.delete(card);
   if(entry.isIntersecting&&entry.intersectionRatio>=.5&&!document.hidden&&!seen.has(card.id))timers.set(card,setTimeout(()=>{
    if(card.hidden||document.hidden)return;seen.add(card.id);const rows=[...document.querySelectorAll('article.program')].filter(r=>!r.hidden);
    send('project-read',{project_id:card.id,query:query(),position:rows.indexOf(card)+1,result_count:rows.length});
   },1000));
  }
 },{threshold:[0,.5]}):null;
 const scan=()=>{for(const card of document.querySelectorAll('article.program'))if(!observed.has(card)){observed.add(card);observer?.observe(card);}};
 scan();window.addEventListener('atlas-ready',scan);
 document.addEventListener('visibilitychange',()=>{for(const timer of timers.values())clearTimeout(timer);timers.clear();if(!document.hidden)for(const card of document.querySelectorAll('article.program')){observer?.unobserve(card);observer?.observe(card);}});
 const ends=new Set();document.addEventListener('scroll',event=>{const panel=event.target;if(!panel.matches?.('.evidence-scroll')||panel.scrollHeight<=panel.clientHeight+3||panel.scrollTop+panel.clientHeight<panel.scrollHeight-3)return;const key=panel.id+'|'+query();if(ends.has(key))return;ends.add(key);send('project-list-end',{query:query(),result_count:[...panel.querySelectorAll('article.program')].filter(r=>!r.hidden).length});},true);
 window.addEventListener('atlas-analytics',event=>{const {name,data}=event.detail||{};if(['share-copied','share-copy-failed','search-fallback','catalogue-failed'].includes(name))send(name,data||{});});
};
