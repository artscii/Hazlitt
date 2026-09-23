// QMD 2.8.3 diagnostic adapter. Internal hooks are guarded; no search text is logged.
export async function startProfile(){
 const metrics={modelLoadMs:0,contextSetupMs:0,embeddingMs:0};
 const restore=[];
 try{
  const {getDefaultLlamaCpp}=await import(new URL('./llm.js',import.meta.resolve('@tobilu/qmd')).href);
  const llm=getDefaultLlamaCpp();
  metrics.modelResidentAtStart=!!llm.embedModel;
  metrics.contextResidentAtStart=!!llm.embedContexts?.length;
  function wrap(name,measure){
   const original=llm[name];if(typeof original!=='function')throw Error('Unsupported QMD profiling hook: '+name);
   llm[name]=async function(...args){const before={...metrics},t=performance.now();try{return await original.apply(this,args);}finally{measure(performance.now()-t,before);}};
   restore.push(()=>{llm[name]=original;});
  }
  wrap('ensureEmbedModel',(ms)=>{metrics.modelLoadMs+=ms;});
  wrap('ensureEmbedContexts',(ms,b)=>{metrics.contextSetupMs+=Math.max(0,ms-(metrics.modelLoadMs-b.modelLoadMs));});
  wrap('embed',(ms,b)=>{metrics.embeddingMs+=Math.max(0,ms-(metrics.modelLoadMs-b.modelLoadMs)-(metrics.contextSetupMs-b.contextSetupMs));});
  metrics.available=true;
 }catch{restore.splice(0).reverse().forEach(f=>f());metrics.available=false;}
 return {metrics,finish(){restore.reverse().forEach(f=>f());for(const k of Object.keys(metrics))if(k.endsWith('Ms'))metrics[k]=+metrics[k].toFixed(2);return metrics;}};
}
