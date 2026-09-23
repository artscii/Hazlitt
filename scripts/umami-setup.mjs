// Run on the VPS; keep existing settings and never print generated secrets.
import fs from 'node:fs';import {randomBytes} from 'node:crypto';
const file='.env';let content=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
for(const key of ['UMAMI_DB_PASSWORD','UMAMI_APP_SECRET','UMAMI_2FA_KEY']){
 const pattern=new RegExp('^'+key+'=.*$','m');
 const existing=content.match(pattern)?.[0]?.slice(key.length+1).trim();
 if(existing)continue;
 const line=key+'='+randomBytes(32).toString('hex');content=pattern.test(content)?content.replace(pattern,line):content.trimEnd()+'\n'+line+'\n';
}
fs.writeFileSync(file,content,{mode:0o600});fs.chmodSync(file,0o600);
console.log('Umami secrets saved in .env. Set UMAMI_WEBSITE_ID and UMAMI_DASHBOARD_URL after creating the website in Umami.');
