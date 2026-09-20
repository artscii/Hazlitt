import fs from 'node:fs';
// v3.0.0: derive secondary pages from the Atlas shell so headers/footers stay identical.
const source=fs.readFileSync('dist/index.html','utf8');
const head=source.match(/<head>[\s\S]*?<\/head>/)[0].replace(/<script[\s\S]*?<\/script>/g,'').replace('href="style.css"','href="/style.css"');
const header=source.match(/<header>[\s\S]*?<\/header>/)[0].replace('href="#"','href="/"');
const footer=source.match(/<footer>[\s\S]*?<\/footer>/)[0];
for(const [name,title] of [['admin','Admin']]){
 const pageHead=head.replace('<title>Hazlitt Creek Evidence Atlas</title>',`<title>${title} · Hazlitt Creek Evidence Atlas</title>`).replace('</head>',`<script defer src="/${name}.js"></script></head>`);
 fs.writeFileSync(`dist/${name}.html`,`<!doctype html><html lang="en">${pageHead}<body>${header}<main class="management-page"><nav class="page-navigation" aria-label="Management navigation"><a href="/">Back to Atlas</a><a href="/admin" ${name==='admin'?'aria-current="page"':''}>Admin</a></nav><h1>${title}</h1><div id="${name}-page" class="${name==='log'?'admin-section edit-log':''}"></div></main>${footer}</body></html>`);
}
const assets={};for(const name of ['index.html','admin.html','app.js','admin.js','style.css','map.svg'])assets['/'+name]={body:fs.readFileSync('dist/'+name,'utf8'),type:({'html':'text/html; charset=utf-8','js':'application/javascript; charset=utf-8','css':'text/css; charset=utf-8','svg':'image/svg+xml'})[name.split('.').pop()]};
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
fs.writeFileSync('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\nconst SEED='+fs.readFileSync('data/seed.json')+';\nconst COUNTRIES='+fs.readFileSync('data/countries.json')+';\n'+fs.readFileSync('server/worker.js','utf8'));
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
fs.cpSync('drizzle','dist/.openai/drizzle',{recursive:true});console.log('Worker built with embedded assets and migrations.');
