// Retrieve the catalogue before filtering; QMD's structured search caps branches at 20.
export async function catalogSearch(store,query,count,timings={}){
 const options={collection:'atlas',limit:count};
 const lexStart=performance.now();const lexical=await store.searchLex(query,options);timings.lexicalMs=performance.now()-lexStart;
 const vectorStart=performance.now();const vector=await store.searchVector(query,options);timings.vectorTotalMs=performance.now()-vectorStart;
 const lists=[lexical,vector];
 const fused=new Map();
 for(const list of lists)list.forEach((row,index)=>{
  const file=row.file||row.filepath;if(!file)return;
  const old=fused.get(file)||{...row,file,score:0};
  old.score+=1/(60+index+1);fused.set(file,old);
 });
 return [...fused.values()].sort((a,b)=>b.score-a.score);
}
