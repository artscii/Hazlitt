import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const document={documentElement:{dataset:{}}},window={};
vm.runInNewContext(fs.readFileSync('dist/theme.js','utf8'),{window,document,AtlasBootstrap:{config:Promise.resolve(null)},fetch:()=>Promise.resolve({ok:false})});
const {palettes,apply}=window.AtlasTheme;assert.equal(palettes.length,5);assert.equal(apply('invalid').id,'coastal');
const luminance=hex=>{const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const css=fs.readFileSync('dist/style.css','utf8');
for(const p of palettes){assert.equal(apply(p.id).id,p.id);assert.equal(document.documentElement.dataset.palette,p.id);assert.ok(css.includes(':root[data-palette="'+p.id+'"]'));for(const fg of ['text','muted','accent'])for(const bg of ['page','soft','highlight'])assert.ok(contrast(p[fg],p[bg])>=4.5,`${p.id} ${fg}/${bg}`);assert.ok(contrast(p.accent,'#ffffff')>=4.5);assert.ok(contrast(p.edge,p.page)>=3);}
console.log('PASS: all five palettes, fallback, theme selectors, core text contrast and control contrast.');
