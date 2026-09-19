import fs from 'node:fs';
const assets={};for(const name of ['index.html','app.js','admin.js','style.css','map.svg'])assets['/'+name]={body:fs.readFileSync('dist/'+name,'utf8'),type:({'html':'text/html; charset=utf-8','js':'application/javascript; charset=utf-8','css':'text/css; charset=utf-8','svg':'image/svg+xml'})[name.split('.').pop()]};
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
fs.writeFileSync('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\nconst SEED='+fs.readFileSync('data/seed.json')+';\nconst COUNTRIES='+fs.readFileSync('data/countries.json')+';\n'+fs.readFileSync('server/worker.js','utf8'));
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
fs.cpSync('drizzle','dist/.openai/drizzle',{recursive:true});console.log('Worker built with embedded assets and migrations.');
