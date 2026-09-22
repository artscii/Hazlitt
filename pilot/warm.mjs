// Run inside the QMD container; never print the authentication token.
const response=await fetch('http://127.0.0.1:8080/api/search-pilot/compare',{
 method:'POST',headers:{Authorization:'Bearer '+process.env.QMD_SERVICE_TOKEN,'Content-Type':'application/json'},
 body:JSON.stringify({query:'screening country:Kenya',scope:{},deep:false}),signal:AbortSignal.timeout(900000)
});
const data=await response.json();if(!response.ok){console.error(data.error);process.exit(1);}
console.log(JSON.stringify({engine:data.engine,query:data.query,results:data.b.length,indexedAt:data.indexedAt,totalMs:data.totalMs}));
