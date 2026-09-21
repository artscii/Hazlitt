// v4.0.0: preview → reconcile → confirm. File actions never auto-save project drafts.
window.AtlasTransfers={mount({before,api,getCatalog,hasDraft,reloadRecords,isBusy,setBusy}){
 const section=document.createElement('section');section.className='atlas-transfers';section.id='file-transfers';
 section.innerHTML=`<h2>Import &amp; export</h2><p>Work with an Excel spreadsheet of the Atlas. Preview and reconcile changes before importing.</p><div class="transfer-grid"><div class="transfer-card"><h3>Export all projects</h3><p>Download every current project and field, including Edit notes, in project-number order.</p><button type="button" id="export-workbook">Download Excel Export File</button><p class="transfer-help">The workbook includes an import guide and can be used as a template.</p></div><div class="transfer-card"><h3>Import projects</h3><label for="import-workbook">Excel workbook (.xlsx)</label><input type="file" id="import-workbook" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-describedby="import-file-help"><p id="import-file-help" class="transfer-help">Up to 500 rows and 5 MB. Match by Project ID or name; updates require your approval.</p><label for="import-comment">Batch comment <span class="transfer-help">(optional)</span></label><textarea id="import-comment" rows="3" maxlength="500" placeholder="For example: New studies from the September literature review" aria-describedby="import-comment-help"></textarea><p id="import-comment-help" class="transfer-help">Saved in Global version history and added to Edit notes for each new record. Existing notes are preserved. Leave blank to use a comment based on the filename.</p><div class="import-actions"><button type="button" id="test-workbook" disabled>Test import · download report</button><button type="button" id="preview-workbook" disabled>Preview import</button></div><p class="transfer-help">Test import checks for problems and downloads a diff report without changing projects. To save changes afterward, use Preview import and confirm. Completed imports can be rolled back from Global version history unless affected projects were edited later.</p></div></div><p id="transfer-status" role="status" aria-live="polite"></p><div id="import-preview" hidden><h3>Review import</h3><p id="import-summary"></p><p id="import-batch-comment" class="batch-comment"></p><p class="transfer-help">New projects are selected to add. Changed matches default to Skip. Open a comparison before choosing Update. Unchanged duplicates are always skipped.</p><div class="import-rows" id="import-rows"></div><div class="import-actions"><p id="import-selection" aria-live="polite"></p><button type="button" id="download-diff">Download diff preview</button><button type="button" id="apply-import" disabled>Import selected changes</button><button type="button" id="cancel-import">Cancel preview</button></div></div><section id="global-version-history" class="global-history"><h3>Global version history</h3><p class="transfer-help">Completed imports, exports and undo actions across the Atlas. Project history also records changes to individual records.</p><div id="global-history-list"></div><button type="button" id="global-history-more" hidden>Show earlier operations</button></section><dialog class="transfer-confirm" aria-labelledby="transfer-confirm-title"><form method="dialog"><h3 id="transfer-confirm-title">Confirm changes</h3><p id="transfer-confirm-text"></p><div class="transfer-confirm-actions"><button value="cancel">Cancel</button><button value="confirm" id="transfer-confirm-yes">Confirm</button></div></form></dialog>`;
 before.before(section);const $=selector=>section.querySelector(selector),status=$('#transfer-status'),file=$('#import-workbook'),preview=$('#import-preview'),apply=$('#apply-import'),dialog=$('dialog');
 const labels={projectNumber:'Project #',id:'Project ID',revision:'Version',countries:'Country or countries',related:'Related initiative'};
 for(const label of document.querySelectorAll('#record-form label')){const control=label.querySelector('[name]');if(control)labels[control.name]=label.firstChild?.textContent?.replace(/\s*\*$/,'').trim()||control.name;}
 let plan=null,working=false,fileGeneration=0,historyCursor=null,historyLoading=false;
 function message(text){status.textContent=text;}
 function setWorking(value){working=value;setBusy(value);section.setAttribute('aria-busy',String(value));$('#export-workbook').disabled=value;$('#preview-workbook').disabled=value||!file.files.length;$('#test-workbook').disabled=value||!file.files.length;file.disabled=value;$('#import-comment').disabled=value;$('#cancel-import').disabled=value;section.querySelectorAll('[data-import-key]').forEach(control=>control.disabled=value);updateSelection();}
 function runWorkbook(data){return new Promise((resolve,reject)=>{const worker=new Worker('/spreadsheet-worker.js'),timeout=setTimeout(()=>{worker.terminate();reject(new Error('The workbook took too long to process. Try a smaller file.'));},30000);const finish=()=>{clearTimeout(timeout);worker.terminate();};worker.onerror=()=>{finish();reject(new Error('Excel tools could not load. Refresh and try again.'));};worker.onmessage=event=>{finish();event.data.ok?resolve(event.data):reject(new Error(event.data.error));};worker.postMessage(data,data.buffer?[data.buffer]:[]);});}
 function download(buffer,filename){const url=URL.createObjectURL(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 function confirmAction(title,text,buttonText){return new Promise(resolve=>{dialog.returnValue='cancel';$('#transfer-confirm-title').textContent=title;$('#transfer-confirm-text').textContent=text;$('#transfer-confirm-yes').textContent=buttonText;dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true});dialog.showModal();dialog.querySelector('[value=cancel]').focus();});}
 $('#export-workbook').onclick=async()=>{
  if(working||isBusy())return;setWorking(true);message('Preparing the Excel workbook…');
  try{const filename='Hazlitt-Creek-Atlas-'+new Date().toISOString().slice(0,10)+'.xlsx',snapshot=await api('/api/exports',{method:'POST',body:JSON.stringify({filename})});
   const result=await runWorkbook({action:'export',programs:snapshot.programs,countries:getCatalog().countries});
   // Log completed generation before offering the file; browser download success is not observable.
   await api('/api/exports/'+snapshot.id+'/complete',{method:'POST',body:'{}'});download(result.buffer,filename);message('Excel download ready: '+snapshot.programs.length+' projects. Export recorded in Global version history.');await refreshHistory();
  }catch(error){message(error.message);}finally{setWorking(false);}
 };
 file.onchange=()=>{fileGeneration++;plan=null;preview.hidden=true;message('');$('#preview-workbook').disabled=!file.files.length;$('#test-workbook').disabled=!file.files.length;};
 $('#import-comment').oninput=()=>{if(plan){fileGeneration++;plan=null;preview.hidden=true;message('Batch comment changed. Preview again to review the updated notes.');}};
 $('#preview-workbook').onclick=()=>previewWorkbook(false);
 $('#test-workbook').onclick=()=>previewWorkbook(true);
 async function previewWorkbook(testOnly){
  if(working||isBusy()||!file.files.length)return;const chosen=file.files[0],generation=fileGeneration;
  if(!/\.xlsx$/i.test(chosen.name)){message('Choose an .xlsx workbook. Save older Excel files as .xlsx first.');return;}
  if(chosen.size>5*1024*1024){message('Choose a workbook no larger than 5 MB.');return;}
  setWorking(true);plan=null;preview.hidden=true;message('Reading the spreadsheet and checking for matches…');
  try{let result;try{result=await runWorkbook({action:'import',buffer:await chosen.arrayBuffer(),countries:getCatalog().countries});}catch(error){if(!testOnly)throw error;result={rows:[{row:0,name:'Workbook validation',error:error.message}]};}
   const data=await api('/api/imports/preview',{method:'POST',body:JSON.stringify({filename:chosen.name,rows:result.rows,testOnly,comment:$('#import-comment').value})});if(generation!==fileGeneration)return;plan=data;renderPreview();
   if(testOnly){await downloadDiff();return;}
   message(data.invalid?'Correct the highlighted rows in Excel, then choose the file and preview again. Nothing has been imported.':'Preview ready. Nothing has been imported yet.');
  }catch(error){message(error.message);}finally{setWorking(false);}
 };
 const format=value=>Array.isArray(value)?value.join('; '):typeof value==='boolean'?(value?'Yes':'No'):String(value??'')||'Not set';
 function renderPreview(){
  preview.hidden=false;preview.querySelector('h3').textContent=plan.testOnly?'Test import · no project changes':'Review import';$('#import-summary').textContent=`${plan.total} rows: ${plan.added} new, ${plan.updates} changed matches, ${plan.skipped} duplicates, ${plan.invalid} need correction.`;
  $('#import-batch-comment').textContent='Batch comment: '+plan.comment;
  const list=$('#import-rows');list.replaceChildren();
  for(const row of plan.rows){
   const card=document.createElement('article');card.className='import-row import-row-'+row.status;
   const title=document.createElement('h4');title.textContent=row.row===0?row.name:'Row '+row.row+' · '+row.name;card.append(title);
   const description=document.createElement('p');description.textContent=row.message+(row.projectNumber?' Matched Project '+row.projectNumber+' by '+row.matchMethod+'.':'');card.append(description);
   if(row.stale){const warning=document.createElement('p');warning.className='import-stale';warning.textContent='The spreadsheet version differs from current v'+row.currentRevision+'. Review the current values carefully before updating.';card.append(warning);}
   if(row.changes?.length){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Compare '+row.changes.length+' changed '+(row.changes.length===1?'field':'fields');details.append(summary);
    for(const change of row.changes){const group=document.createElement('div');group.className='import-field-diff';const heading=document.createElement('h5');heading.textContent=labels[change.field]||change.field;group.append(heading);for(const [caption,value] of [['Current',change.before],['Spreadsheet',change.after]]){const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=caption;const text=document.createElement('span');text.textContent=format(value);p.append(strong,text);group.append(p);}details.append(group);}card.append(details);
   }
   if(['new','update'].includes(row.status)){const label=document.createElement('label');label.className='check-label';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.dataset.importKey=row.key;checkbox.dataset.action=row.status;checkbox.checked=row.status==='new';checkbox.onchange=updateSelection;label.append(checkbox,document.createTextNode(row.status==='new'?'Add this project':'Update this existing project'));card.append(label);}
   list.append(card);
  }
  updateSelection();
 }
 function selection(){return [...section.querySelectorAll('[data-import-key]:checked')];}
 function updateSelection(){const selected=selection(),added=selected.filter(control=>control.dataset.action==='new').length,updated=selected.length-added;$('#import-selection').textContent=plan?`${added} to add · ${updated} to update · ${plan.total-selected.length} to skip`:'';$('#download-diff').disabled=working||!plan?.id;apply.disabled=working||!plan?.id||!selected.length||!!plan.invalid||!!plan.testOnly;}
 async function downloadDiff(){
  const selectedRows=selection().map(control=>Number(control.dataset.importKey));
  const filename=(plan.testOnly?'Hazlitt-Test-Import-':'Hazlitt-Bulk-Import-Diff-')+new Date().toISOString().slice(0,10)+'.xlsx';
  const snapshot=await api('/api/exports',{method:'POST',body:JSON.stringify({kind:'diff',previewId:plan.id,selectedRows,filename})});
  const result=await runWorkbook({action:'diff',preview:snapshot.preview});
  await api('/api/exports/'+snapshot.id+'/complete',{method:'POST',body:'{}'});download(result.buffer,filename);
  message(plan.testOnly?`Test report ready: ${plan.invalid} blocking issues, ${plan.skipped} duplicates, ${plan.updates} updates to review. No projects changed. ${plan.invalid?'Correct the issues in Excel, then test again.':'Use Preview import when ready to review and apply changes.'}`:'Diff preview download ready. Review the row decisions and highlighted field differences in Excel. No projects have changed.');await refreshHistory();
 }
 $('#download-diff').onclick=async()=>{
  if(working||isBusy()||!plan?.id)return;setWorking(true);message('Preparing the bulk import comparison…');
  try{await downloadDiff();}catch(error){message(error.message);}finally{setWorking(false);}
 };
 $('#cancel-import').onclick=()=>{plan=null;preview.hidden=true;message('Import preview cancelled. No records changed.');};
 apply.onclick=async()=>{
  if(working||isBusy()||!plan?.id||plan.testOnly)return;const keys=selection().map(control=>Number(control.dataset.importKey));
  if(!await confirmAction('Apply this import?',$('#import-selection').textContent+'. Batch comment: '+plan.comment+'. Changes will be visible to all visitors and can be undone from Global version history.'+(hasDraft()?' Your unsaved project draft will be discarded.':''),'Apply import'))return;
  setWorking(true);message('Applying the selected changes…');
  try{const result=await api('/api/imports/'+plan.id+'/commit',{method:'POST',body:JSON.stringify({selectedRows:keys})});plan=null;preview.hidden=true;await reloadRecords();message(`Import complete: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped.`);await refreshHistory();}
  catch(error){message(error.message+' If your connection was interrupted, check Global version history before retrying.');}finally{setWorking(false);}
 };
 async function refreshHistory(append=false){
  if(historyLoading)return;historyLoading=true;
  try{const data=await api('/api/global-history'+(append&&historyCursor?'?before='+historyCursor:'')),list=$('#global-history-list');if(!append)list.replaceChildren();
   if(!data.entries.length&&!append){const empty=document.createElement('p');empty.textContent='No completed file operations yet.';list.append(empty);}
   for(const entry of data.entries){
    const item=document.createElement('article');item.className='global-history-entry';const heading=document.createElement('h4');heading.textContent='Global v'+entry.version+' · '+({import:'Import',export:'Export',undo_import:'Undo import'}[entry.action]||entry.action);const meta=document.createElement('p');meta.className='transfer-help';meta.textContent=new Date(entry.at).toLocaleString()+' · '+entry.details.filename;const summary=document.createElement('p');summary.textContent=entry.summary;item.append(heading,meta,summary);
    if(entry.details.comment){const comment=document.createElement('p');comment.className='batch-comment';const label=document.createElement('strong');label.textContent='Batch comment: ';comment.append(label,document.createTextNode(entry.details.comment));item.append(comment);}
    const info=document.createElement('details'),infoTitle=document.createElement('summary');infoTitle.textContent='Operation details';const ip=document.createElement('p');ip.textContent='IP: '+entry.ip;info.append(infoTitle,ip);item.append(info);
    if(entry.action==='import'){
     if(entry.operation_status==='undone'){const note=document.createElement('p');note.className='transfer-help';note.textContent='This import has been undone.';item.append(note);}
     else{const undo=document.createElement('button');undo.type='button';undo.textContent='Undo import';undo.disabled=!entry.can_undo;item.append(undo);if(!entry.can_undo){const note=document.createElement('p');note.className='transfer-help';note.textContent='Undo unavailable: an affected project changed after this import.';item.append(note);}
      undo.onclick=async()=>{if(working||isBusy())return;if(!await confirmAction('Undo this import?',`Remove ${entry.details.added} added projects and restore ${entry.details.updated} updated projects to their pre-import values? This creates a new global history entry. Later project edits are protected.`+(hasDraft()?' Your unsaved project draft will be discarded.':''),'Undo import'))return;
       setWorking(true);undo.disabled=true;message('Undoing the import…');try{const result=await api('/api/imports/'+entry.operation_id+'/undo',{method:'POST',body:'{}'});await reloadRecords();message(result.alreadyUndone?'This import was already undone.':`Import undone: ${result.removed} additions removed and ${result.restored} projects restored.`);}catch(error){message(error.message);}finally{await refreshHistory();setWorking(false);}
      };
     }
    }
    list.append(item);
   }
   if(data.entries.length)historyCursor=data.entries.at(-1).version;$('#global-history-more').hidden=!data.hasMore;
  }catch(error){message('Global history could not be loaded: '+error.message);}finally{historyLoading=false;}
 }
 $('#global-history-more').onclick=()=>refreshHistory(true);
 return {refreshHistory};
}};
