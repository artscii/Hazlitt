import fs from 'node:fs';
// v3.0.0: derive secondary pages from the Atlas shell so headers/footers stay identical.
const source=fs.readFileSync('dist/index.html','utf8');
const head=source.match(/<head>[\s\S]*?<\/head>/)[0].replace(/<script[\s\S]*?<\/script>/g,'').replace('href="style.css"','href="/style.css"');
const header=source.match(/<header>[\s\S]*?<\/header>/)[0].replace('href="#"','href="/"');
const footer=source.match(/<footer>[\s\S]*?<\/footer>/)[0];
for(const [name,title] of [['admin','Admin']]){
 const flipBootstrap=`<script>try{if(sessionStorage.getItem('atlas-editor-flip')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('editor-flip-pending');setTimeout(()=>document.documentElement.classList.remove('editor-flip-pending'),3000);}}catch{}</script><style>.editor-flip-pending body{visibility:hidden}</style>`;
 const pageHead=head.replace('<head>','<head>'+flipBootstrap).replace('<title>Hazlitt Creek Evidence Atlas</title>',`<title>${title} · Hazlitt Creek Evidence Atlas</title>`).replace('</head>',`<script defer src="/theme.js"></script><script defer src="/external-links.js"></script><script defer src="/analytics-admin.js"></script><script defer src="/transfers.js"></script><script defer src="/${name}.js"></script></head>`);
 fs.writeFileSync(`dist/${name}.html`,`<!doctype html><html lang="en">${pageHead}<body>${header}<main class="management-page"><nav class="page-navigation" aria-label="Management navigation"><a href="/">Back to Atlas</a><a href="/admin" ${name==='admin'?'aria-current="page"':''}>Admin</a></nav><h1>${title}</h1><div id="${name}-page" class="${name==='log'?'admin-section edit-log':''}"></div></main>${footer}</body></html>`);
}
fs.copyFileSync('node_modules/exceljs/dist/exceljs.min.js','dist/exceljs.min.js');
fs.copyFileSync('node_modules/exceljs/LICENSE','dist/exceljs-LICENSE.txt');
const assets={};for(const name of ['index.html','admin.html','app.js','external-links.js','analytics-admin.js','analytics-client.js','theme.js','admin.js','style.css','map.svg','transfers.js','spreadsheet-worker.js','spreadsheet-format.js','exceljs.min.js','exceljs-LICENSE.txt'])assets['/'+name]={body:fs.readFileSync('dist/'+name,'utf8'),type:({'html':'text/html; charset=utf-8','js':'application/javascript; charset=utf-8','css':'text/css; charset=utf-8','svg':'image/svg+xml','txt':'text/plain; charset=utf-8'})[name.split('.').pop()]};
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
fs.writeFileSync('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\nconst SEED='+fs.readFileSync('data/seed.json')+';\nconst COUNTRIES='+fs.readFileSync('data/countries.json')+';\n'+fs.readFileSync('server/transfers.js','utf8')+'\n'+fs.readFileSync('server/analytics.js','utf8')+'\n'+fs.readFileSync('server/worker.js','utf8'));
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
fs.cpSync('drizzle','dist/.openai/drizzle',{recursive:true});console.log('Worker built with embedded assets and migrations.');
