// Coalesce identical inference jobs; abandoned queued work never runs.
export function createWorkQueue({limit=3,waitMs=2000}={}){
 const jobs=new Map();let active=false;
 async function drain(){if(active)return;const job=[...jobs.values()].find(j=>!j.started);if(!job)return;job.started=true;active=true;
  try{if(!job.listeners.size||Date.now()-job.at>waitMs)throw Error('Search queue expired');const result=await job.run();for(const l of job.listeners)l.resolve(result);}catch(e){for(const l of job.listeners)l.reject(e);}finally{for(const l of job.listeners)l.cleanup();jobs.delete(job.key);active=false;void drain();}}
 return {run(key,run,signal){if(signal?.aborted)return Promise.reject(Error('Search cancelled'));let job=jobs.get(key);if(!job){if(jobs.size>=limit+1)return Promise.reject(Error('Search busy'));job={key,run,at:Date.now(),listeners:new Set(),started:false};jobs.set(key,job);}
  return new Promise((resolve,reject)=>{const l={resolve,reject,cleanup:()=>signal?.removeEventListener('abort',abort)};const abort=()=>{job.listeners.delete(l);l.cleanup();reject(Error('Search cancelled'));if(!job.started&&!job.listeners.size)jobs.delete(key);};job.listeners.add(l);signal?.addEventListener('abort',abort,{once:true});queueMicrotask(drain);});},get busy(){return active||jobs.size>0;},get size(){return jobs.size;}};
}
