import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ExcelJS from 'exceljs';
import worker from '../dist/server/index.js';
import '../dist/spreadsheet-format.js';
const sqlite=new DatabaseSync(':memory:');for(const file of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));
function statement(sql,args=[]){return {bind(...next){return statement(sql,next);},async all(){return {results:sqlite.prepare(sql).all(...args)};},async first(){return sqlite.prepare(sql).get(...args)||null;},async run(){const result=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}};}};}
const env={DB:{prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}},ADMIN_PASSWORD_HASH:fs.readFileSync('.env','utf8').trim().split('=')[1]};
let cookie='';
async function call(path,method='GET',body,origin='https://atlas.test'){
 const response=await worker.fetch(new Request('https://atlas.test'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'CF-Connecting-IP':'203.0.113.9'},body:body===undefined?undefined:JSON.stringify(body)}),env);
 if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,data:await response.json()};
}
const preview=rows=>call('/api/imports/preview','POST',{filename:'Test.xlsx',rows});
const commit=(id,selectedRows)=>call('/api/imports/'+id+'/commit','POST',{selectedRows});
const undo=id=>call('/api/imports/'+id+'/undo','POST',{});
const projects=async()=>(await call('/api/catalog')).data.programs;
assert.equal((await preview([])).status,401);assert.equal((await call('/api/global-history')).status,401);
assert.equal((await call('/api/exports','POST',{})).status,401);
assert.equal((await call('/api/login','POST',{password:'Bombo'})).status,200);
const catalog=(await call('/api/catalog')).data,base=catalog.programs[0];
const workbook=AtlasWorkbook.makeWorkbook(ExcelJS,catalog.programs,catalog.countries),bytes=await workbook.xlsx.writeBuffer();
AtlasWorkbook.checkZip(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const reopened=new ExcelJS.Workbook();await reopened.xlsx.load(bytes);
const rows=AtlasWorkbook.readWorkbook(reopened,catalog.countries);
assert.equal(rows.length,catalog.programs.length);assert.equal(rows[0].id,base.id);assert.equal(rows[0].outcome,base.outcome);assert.deepEqual(rows[0].countries,base.countries);
assert.equal(reopened.getWorksheet('Projects').views[0].state,'frozen');assert.ok(reopened.getWorksheet('Projects').autoFilter);
let result=await preview(rows);assert.equal(result.data.skipped,rows.length);assert.ok(result.data.id);
reopened.getWorksheet('Projects').getCell('X2').value={formula:'1+1',result:2};assert.match(AtlasWorkbook.readWorkbook(reopened,catalog.countries)[0].error,/Formula/);
const newRow=(name,extra={})=>({...base,id:'',revision:'',name,editNotes:'Imported notes',...extra});
result=await preview([newRow('New one'),newRow('New one')]);assert.equal(result.data.added,1);assert.equal(result.data.skipped,1);
result=await preview([newRow('Conflicting'),newRow('Conflicting',{outcome:'Other outcome'})]);assert.equal(result.data.invalid,1);assert.ok(result.data.id);
result=await preview([newRow('Shared external ID',{id:'external-1'}),newRow('Different title',{id:'external-1'})]);assert.equal(result.data.invalid,1);
result=await preview([{...base,name:catalog.programs[1].name}]);assert.equal(result.data.invalid,1);
result=await preview([newRow('Valid'),newRow('Invalid',{source:'javascript:bad'})]);assert.equal(result.data.invalid,1);assert.ok(result.data.id);
assert.equal((await call('/api/imports/preview','POST',{rows:[newRow('No origin')]},'https://other.test')).status,403);
// Explicit row choices: an unselected update never overwrites a current record.
result=await preview([newRow('New mixed'),{...base,editNotes:'New notes'}]);let id=result.data.id;
assert.equal(result.data.updates,1);assert.ok(result.data.rows[1].changes.some(c=>c.field==='editNotes'));
assert.equal((await commit(id,[0])).data.updated,0);assert.equal((await projects()).find(p=>p.id===base.id).editNotes,base.editNotes);
assert.equal((await commit(id,[0])).status,200);assert.equal((await projects()).filter(p=>p.name==='New mixed').length,1);
assert.equal((await undo(id)).status,200);assert.ok(!(await projects()).some(p=>p.name==='New mixed'));assert.equal((await undo(id)).status,200);
// Mixed creation/update undo restores notes and advances revisions rather than erasing history.
result=await preview([newRow('Add and undo'),{...base,editNotes:'Updated from spreadsheet'}]);id=result.data.id;
let applied=await commit(id,[0,1]);assert.equal(applied.status,200);assert.equal(applied.data.updated,1);
assert.equal((await projects()).find(p=>p.id===base.id).editNotes,'Updated from spreadsheet');
assert.equal((await undo(id)).status,200);
let current=(await projects()).find(p=>p.id===base.id);assert.equal(current.editNotes,base.editNotes);assert.equal(current.revision,2);
let history=(await call('/api/records/'+base.id+'/history')).data.entries;assert.equal(history.at(-1).action,'import_undo');assert.equal(history.at(-1).before.editNotes,'Updated from spreadsheet');
// A post-preview edit blocks the entire import, including otherwise valid additions.
result=await preview([{...current,editNotes:'Stale preview'},newRow('Must not be added')]);id=result.data.id;
assert.equal((await call('/api/records/'+current.id,'PUT',{...current,editNotes:'Concurrent edit'})).status,200);
assert.equal((await commit(id,[0,1])).status,409);assert.ok(!(await projects()).some(p=>p.name==='Must not be added'));
// A duplicate created after preview also blocks the whole operation.
result=await preview([newRow('Racing duplicate'),newRow('Another must not be added')]);id=result.data.id;
assert.equal((await call('/api/records','POST',newRow('Racing duplicate'))).status,201);
assert.equal((await commit(id,[0,1])).status,409);assert.ok(!(await projects()).some(p=>p.name==='Another must not be added'));
// Edited imported projects protect the entire batch from undo.
result=await preview([newRow('Protected one'),newRow('Protected two')]);id=result.data.id;assert.equal((await commit(id,[0,1])).status,200);
current=(await projects()).find(p=>p.name==='Protected one');await call('/api/records/'+current.id,'PUT',{...current,editNotes:'A later edit'});
assert.equal((await undo(id)).status,409);assert.ok((await projects()).some(p=>p.name==='Protected two'));
// If a renamed record's old name is reused, undo fails atomically.
current=(await projects()).find(p=>p.id===base.id);result=await preview([{...current,name:'Renamed original'},newRow('Name conflict companion')]);id=result.data.id;assert.equal((await commit(id,[0,1])).status,200);
await call('/api/records','POST',newRow(base.name));assert.equal((await undo(id)).status,409);assert.ok((await projects()).some(p=>p.name==='Name conflict companion'));
// Large preview bodies are accepted separately from normal record request limits.
result=await preview(Array.from({length:20},(_,i)=>newRow('Large row '+i,{outcome:'x'.repeat(4000)})));assert.equal(result.status,200);assert.equal(result.data.added,20);
// Completed exports are global operations, not project revisions; completion is idempotent.
const exportPlan=(await call('/api/exports','POST',{filename:'All.xlsx'})).data;
assert.ok(exportPlan.programs.length);assert.equal((await call('/api/exports/'+exportPlan.id+'/complete','POST',{})).status,200);assert.equal((await call('/api/exports/'+exportPlan.id+'/complete','POST',{})).status,200);
const global=(await call('/api/global-history')).data.entries;
assert.equal(global.filter(e=>e.operation_id===exportPlan.id).length,1);assert.equal(global[0].action,'export');assert.equal(global[0].ip,'203.0.113.9');
assert.ok(global.some(e=>e.action==='undo_import'));assert.ok(global.some(e=>e.action==='import'&&!e.can_undo));
// Diff exports reflect explicit choices, remain read-only, and include invalid rows.
current=(await projects()).find(p=>p.id===base.id);
result=await preview([{...current,outcome:'A proposed outcome'},newRow('Preview-only addition'),{name:'Incomplete'}]);
assert.equal(result.data.invalid,1);assert.equal((await commit(result.data.id,[0,1])).status,400);
const beforeDiff=JSON.stringify(await projects());
const diffPlan=(await call('/api/exports','POST',{kind:'diff',previewId:result.data.id,selectedRows:[0,1],filename:'Diff.xlsx'})).data;
assert.equal(diffPlan.preview.rows.length,3);assert.equal(diffPlan.programs,undefined);
const diffBook=AtlasWorkbook.makeDiffWorkbook(ExcelJS,diffPlan.preview),diffBytes=await diffBook.xlsx.writeBuffer(),diffRead=new ExcelJS.Workbook();await diffRead.xlsx.load(diffBytes);
assert.equal(diffRead.worksheets.length,3);
assert.equal(diffRead.getWorksheet('Row decisions').getCell('D2').value,'Update');
assert.equal(diffRead.getWorksheet('Row decisions').getCell('D3').value,'Add');
assert.equal(diffRead.getWorksheet('Row decisions').getCell('D4').value,'Correct in source file');
assert.equal(diffRead.getWorksheet('Field differences').getCell('F2').value,current.outcome);
assert.equal(diffRead.getWorksheet('Field differences').getCell('G2').value,'A proposed outcome');
assert.equal(diffRead.getWorksheet('Field differences').getCell('G2').fill.fgColor.argb,'FFFFF1BD');
await call('/api/exports/'+diffPlan.id+'/complete','POST',{});
assert.match((await call('/api/global-history')).data.entries[0].summary,/bulk import diff preview/);
assert.equal(JSON.stringify(await projects()),beforeDiff);
// Test runs can generate reports but cannot commit, even via a direct API request.
const testBefore=JSON.stringify(await projects()),auditBefore=sqlite.prepare('SELECT count(*) n FROM audit_log').get().n;
const testRun=(await call('/api/imports/preview','POST',{testOnly:true,filename:'Dry-run.xlsx',rows:[newRow('Dry-run only'),{...current,outcome:'Dry-run outcome'}]})).data;
assert.equal(testRun.testOnly,true);assert.equal((await commit(testRun.id,[0,1])).status,409);
const testExport=(await call('/api/exports','POST',{kind:'diff',previewId:testRun.id,selectedRows:[0,1],filename:'Test report.xlsx'})).data;
assert.equal(testExport.preview.testOnly,true);
const testBook=AtlasWorkbook.makeDiffWorkbook(ExcelJS,testExport.preview);
assert.match(testBook.getWorksheet('Review summary').getCell('B2').value,/Test import/);
await call('/api/exports/'+testExport.id+'/complete','POST',{});
assert.match((await call('/api/global-history')).data.entries[0].summary,/Test import report/);
assert.equal(JSON.stringify(await projects()),testBefore);assert.equal(sqlite.prepare('SELECT count(*) n FROM audit_log').get().n,auditBefore);
const badTest=(await call('/api/imports/preview','POST',{testOnly:true,rows:[{row:0,name:'Workbook validation',error:'Missing required column: Reported outcomes'}]})).data;
assert.equal(badTest.invalid,1);assert.equal((await commit(badTest.id,[0])).status,409);
assert.equal((await call('/api/exports','POST',{kind:'diff',previewId:badTest.id,selectedRows:[]})).status,200);
assert.equal((await call('/api/logout','POST',{})).status,200);assert.equal((await undo(id)).status,401);
console.log('PASS: Excel round trip, required headers/formulas, duplicate reconciliation, explicit update selection, atomic import/undo, stale conflicts, protected later edits, Edit notes restoration, global history, idempotence and authorization.');

const metadataBook=AtlasWorkbook.makeWorkbook(ExcelJS,[{...base,publicationYear:'2025',evidenceBasis:'Slide scans',sampleDetails:'500 slides; 400 patients'}],catalog.countries);
const metadataCopy=new ExcelJS.Workbook();await metadataCopy.xlsx.load(await metadataBook.xlsx.writeBuffer());
const metadataRows=AtlasWorkbook.readWorkbook(metadataCopy,catalog.countries);
assert.equal(metadataRows[0].publicationYear,'2025');assert.equal(metadataRows[0].evidenceBasis,'Slide scans');assert.equal(metadataRows[0].sampleDetails,'500 slides; 400 patients');
