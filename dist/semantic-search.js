// v4.8.0: optional cached local model; immediate indexed results always remain usable.
globalThis.AtlasSemantic=class{
 constructor({onResult}){
  this.onResult=onResult;this.cache=new Map();this.generation=0;this.state='off';
  this.button=document.querySelector('#semantic-toggle');this.status=document.querySelector('#semantic-status');
  this.button.onclick=()=>this.state==='off'||this.state==='error'?this.enable():this.disable();
  if(!navigator.gpu){this.button.disabled=true;this.status.textContent='Fast concept search active. Local AI is not supported by this browser.';}
 }
 say(text){this.status.textContent=text;}
 cancel(){clearTimeout(this.timer);clearTimeout(this.queryTimeout);this.generation++;this.worker?.postMessage({type:'cancel'});}
 disable(){this.cancel();clearTimeout(this.loadTimeout);this.worker?.terminate();this.worker=null;this.state='off';this.button.textContent='Enable deeper AI search';this.button.setAttribute('aria-pressed','false');this.say('Fast concept search active. AI model downloads only when enabled.');this.onResult(null);}
 enable(){
  this.state='loading';this.button.textContent='Cancel AI loading';this.button.setAttribute('aria-pressed','true');this.say('Loading local AI… search remains available.');
  try{this.worker=new Worker('/semantic-worker.js',{type:'module'});}catch{this.fail();return;}
  this.loadTimeout=setTimeout(()=>this.fail(),180000);
  this.worker.onerror=()=>this.fail();
  this.worker.onmessage=({data})=>{
   if(data.type==='progress')this.say('Loading local AI '+Math.round(Math.max(0,Math.min(1,data.progress||0))*100)+'% · search remains available');
   if(data.type==='ready'){clearTimeout(this.loadTimeout);this.state='ready';this.button.textContent='Turn off AI search';this.say('Local AI ready · searches stay on this device');this.schedule(document.querySelector('#project-search').value);}
   if(data.type==='error')this.fail();
   if(data.id!==this.generation)return;
   if(data.type==='query-error'){clearTimeout(this.queryTimeout);this.say('Fast results shown; AI could not refine this search.');}
   if(data.type==='result'){
    clearTimeout(this.queryTimeout);this.cache.set(data.query,data.expansions);if(this.cache.size>40)this.cache.delete(this.cache.keys().next().value);
    this.onResult({query:data.query,expansions:data.expansions});
   }
  };
  this.worker.postMessage({type:'init'});
 }
 fail(){this.cancel();clearTimeout(this.loadTimeout);this.worker?.terminate();this.worker=null;this.state='error';this.button.textContent='Retry AI search';this.button.setAttribute('aria-pressed','false');this.say('Local AI unavailable. Fast concept search is still active.');}
 schedule(query){
  this.cancel();query=query.trim();if(this.state!=='ready')return;
  if(!query){this.say('Local AI ready · searches stay on this device');return;}
  if(this.cache.has(query)){this.onResult({query,expansions:this.cache.get(query)});return;}
  const terms=AtlasSearch.groupsFor(query).map(g=>g.term);if(!terms.length||query.length>350){this.say('Fast results shown.');return;}
  const id=this.generation;
  this.timer=setTimeout(()=>{
   this.say('Fast results shown · refining meanings locally…');
   this.worker.postMessage({type:'query',id,query,terms});
   this.queryTimeout=setTimeout(()=>{this.cancel();this.say('Fast results shown; AI refinement timed out.');},12000);
  },650);
 }
};
