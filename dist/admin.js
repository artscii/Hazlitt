// Atlas 2.5.0 — password-protected shared record editor.
(()=>{
const section=document.createElement('section');section.id='admin';section.className='admin-section';section.innerHTML=`<div class="admin-content"><p>Manage project records and their map locations.</p><button id="admin-open" type="button">Edit atlas</button><form id="admin-login" hidden><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">Unlock editor</button></form><p id="admin-message" role="status" aria-live="polite"></p><div id="admin-editor" hidden><div class="admin-lookup-row"><form id="project-number-form" class="admin-number-lookup"><label for="admin-project-number">Atlas project number</label><div><input id="admin-project-number" type="number" min="1" step="1" inputmode="numeric" placeholder="e.g. 12" required aria-describedby="project-number-help"><button type="submit">Open project</button></div><p id="project-number-help">Enter the number shown beside a project in this Atlas.</p><p id="project-number-status" role="status" aria-live="polite"></p></form><div class="admin-name-lookup"><label for="admin-project-search">Search projects</label><input id="admin-project-search" type="search" placeholder="Project name, country or keyword…" aria-controls="admin-record" autocomplete="off"><p id="admin-search-status" role="status" aria-live="polite"></p><div id="admin-search-results" class="admin-search-results" hidden></div></div></div><div class="admin-toolbar"><label>Project<select id="admin-record"><option value="">New project</option></select></label><button type="button" id="admin-new">New entry</button><button type="button" id="admin-logout">Lock editor</button></div><form id="record-form" aria-describedby="required-fields-note"><p id="required-fields-note">Fields marked with an asterisk (*) are required.</p><label class="admin-project-reference" for="edit-project-number">Atlas project number<input id="edit-project-number" type="text" readonly aria-readonly="true" value="Assigned after saving"></label><label class="admin-project-reference" for="edit-record-version">Record version<input id="edit-record-version" type="text" readonly aria-readonly="true" value="Not saved yet"></label><div id="admin-fields" class="admin-fields"></div><fieldset><legend>Country or countries *</legend><p>Choose all countries where this project operates. Map markers are created automatically.</p><input type="search" id="country-filter" placeholder="Find a country" aria-label="Filter countries"><div id="admin-countries" class="admin-countries"></div></fieldset><label class="check-label"><input type="checkbox" name="related"> Related initiative (AI not documented)</label><div class="admin-actions"><button type="submit">Save entry</button><button type="button" id="admin-delete" hidden>Delete entry</button></div></form><section id="record-history" class="record-history"><h2>Version history</h2><p id="history-status" role="status">Choose a project to review its versions.</p><div id="history-controls" hidden><label for="version-slider">Review saved version</label><input id="version-slider" type="range" min="0" max="0" step="1" value="0"><p id="version-description"></p><div id="version-diff"></div><button id="restore-version" type="button">Restore this version</button></div></section></div></div>`;
document.querySelector('#admin-page').append(section);
const $=selector=>section.querySelector(selector),form=$('#record-form'),message=$('#admin-message');
let catalog=null,current=null,busy=false,numberedIds=[];
const fields=[['name','Project name',true],['status','Evidence status',true],['kind','Category',true],['geo','Location description',true],['metric','Headline outcome',true],['metricLabel','Headline outcome explanation',true],['short','Short description',true],['outcome','Reported outcomes',true],['partners','Sponsors and partners',true],['phone','Contact phone'],['tel','Telephone link number'],['email','Contact email'],['contact','Contact notes'],['source','Primary evidence URL',true],['sourceLabel','Primary evidence link label'],['source2','Additional evidence URL'],['source2Label','Additional evidence link label'],['contactSource','Contact source URL'],['date','Evidence date / review note',true]];
const long=new Set(['short','outcome','partners','contact']);
for(const [name,title,required] of fields){const label=document.createElement('label');label.textContent=title+(required?' *':'');let input;if(name==='kind'){input=document.createElement('select');for(const [value,text] of [['','Implementation / published study'],['deployed','Implementation'],['related','Related initiative'],['pilot','Pilot / preliminary study'],['historical','Historical / related initiative']]){const option=document.createElement('option');option.value=value;option.textContent=text;input.append(option);}}else{input=document.createElement(long.has(name)?'textarea':'input');if(input.tagName==='TEXTAREA')input.rows=4;else input.type=['source','source2','contactSource'].includes(name)?'url':name==='email'?'email':'text';input.maxLength=12000;}input.name=name;input.required=!!required;label.append(input);$('#admin-fields').append(label);}
async function api(path,options={}){const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});const data=await response.json();if(!response.ok)throw new Error(data.error||'Request failed');return data;}
function tell(text){message.textContent=text;}
async function refresh(){catalog=await api('/api/catalog');numberedIds=(window.atlasCatalog?.programs||catalog.programs).map(p=>p.id);const select=$('#admin-record');select.replaceChildren(new Option('New project',''));for(const p of catalog.programs)select.add(new Option('Project '+String(numberedIds.indexOf(p.id)+1).padStart(2,'0')+' · '+p.name,p.id));const countries=$('#admin-countries');countries.replaceChildren();for(const country of catalog.countries){const label=document.createElement('label');label.className='check-label';const input=document.createElement('input');input.type='checkbox';input.name='countries';input.value=country.name;label.append(input,document.createTextNode(country.name));countries.append(label);}}
function fitOutcomes(){const input=form.elements.outcome;input.style.height='auto';input.style.height=Math.max(100,input.scrollHeight+2)+'px';}
form.elements.outcome.addEventListener('input',fitOutcomes);
let outcomeWidth=0;
new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width!==outcomeWidth){outcomeWidth=width;if(!$('#admin-editor').hidden)requestAnimationFrame(fitOutcomes);}}).observe(form.elements.outcome.parentElement);
function load(record){versionDraft=null;form.querySelectorAll('.field-version-diff').forEach(el=>el.remove());form.querySelectorAll('.version-changed').forEach(el=>el.classList.remove('version-changed'));for(const control of form.elements)control.disabled=false;const number=record?numberedIds.indexOf(record.id)+1:0;$('#admin-project-number').value=number||'';$('#project-number-status').textContent=record?'Editing Project '+String(number).padStart(2,'0')+' · '+record.name:'';current=record;form.reset();$('#edit-project-number').value=record?'Project '+String(number).padStart(2,'0'):'Assigned after saving';$('#edit-record-version').value=record?(record.revision>0?'v'+record.revision:'Original imported record (not yet edited)'):'Not saved yet';$('#country-filter').value='';$('#admin-countries').querySelectorAll('label').forEach(l=>l.hidden=false);for(const [name]of fields)form.elements[name].value=record?.[name]?? (name==='kind'?'':'');form.elements.related.checked=!!record?.related;form.querySelectorAll('[name=countries]').forEach(c=>c.checked=!!record?.countries.includes(c.value));$('#admin-delete').hidden=!record;$('#admin-record').value=record?.id||'';requestAnimationFrame(fitOutcomes);loadRecordHistory(record);}
function canonical(value){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
async function unlock(){await refresh();$('#admin-editor').hidden=false;$('#admin-login').hidden=true;$('#admin-open').hidden=true;load(null);tell('Editor unlocked. Changes are saved for all visitors.');}
$('#admin-open').onclick=async()=>{try{const state=await api('/api/session');if(state.authenticated)await unlock();else{$('#admin-login').hidden=false;$('#admin-login input').focus();}}catch(e){tell(e.message);}};
$('#admin-login').onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;try{await api('/api/login',{method:'POST',body:JSON.stringify({password:event.target.elements.password.value})});event.target.reset();await unlock();}catch(e){tell(e.message);}finally{busy=false;}};
// v2.5.0: resolve the displayed catalog number to a stable record ID before editing.
$('#project-number-form').onsubmit=event=>{event.preventDefault();if(busy||!catalog)return;const number=Number($('#admin-project-number').value);const id=Number.isInteger(number)&&number>0?numberedIds[number-1]:null;const record=catalog.programs.find(p=>p.id===id);if(!record){$('#project-number-status').textContent='No project found with that number. Check the number in the Atlas and try again.';return;}load(record);form.elements.name.focus();};
// v2.7.0: editor-only live search; choosing a result opens its record without saving.
// v2.7.7: search populates the project menu directly, without a second results list.
function searchAdminProjects(){
 if(!catalog)return;
 const query=canonical($('#admin-project-search').value),select=$('#admin-record');
 $('#admin-search-results').replaceChildren();$('#admin-search-results').hidden=true;
 const terms=query.split(' ').filter(Boolean),matches=catalog.programs.filter(project=>{const number=numberedIds.indexOf(project.id)+1;const text=canonical('Project '+number+' '+String(number).padStart(2,'0')+' '+Object.values(project).flat().filter(value=>typeof value==='string').join(' '));return terms.every(term=>text.includes(term));}).sort((a,b)=>numberedIds.indexOf(a.id)-numberedIds.indexOf(b.id));
 select.replaceChildren(new Option(query?(matches.length?'Choose a matching project':'No matching projects'):'Choose a project',''));
 for(const project of matches)select.add(new Option('Project '+String(numberedIds.indexOf(project.id)+1).padStart(2,'0')+' · '+project.name,project.id));
 select.disabled=!matches.length;
 select.value=matches.some(p=>p.id===current?.id)?current.id:'';
 $('#admin-search-status').textContent=query?matches.length+' matching projects in the Project menu.':'';
 // v2.7.8: load the first match without moving focus out of the search field.
 if(query&&matches.length&&!busy&&current?.id!==matches[0].id)load(matches[0]);
}
for(const event of ['input','search'])$('#admin-project-search').addEventListener(event,searchAdminProjects);
$('#admin-project-search').addEventListener('keydown',event=>{if(event.key==='Escape'){$('#admin-project-search').value='';searchAdminProjects();}if(event.key==='Enter'){event.preventDefault();const select=$('#admin-record');if(select.options.length===2&&select.options[1].value){load(catalog.programs.find(p=>p.id===select.options[1].value));form.elements.name.focus();}else select.focus();}});
$('#admin-record').onchange=()=>{const record=catalog.programs.find(p=>p.id===$('#admin-record').value);if(record)load(record);};
$('#admin-new').onclick=()=>{$('#admin-project-search').value='';searchAdminProjects();load(null);form.elements.name.focus();};
$('#country-filter').oninput=()=>{const value=canonical($('#country-filter').value);$('#admin-countries').querySelectorAll('label').forEach(label=>label.hidden=!canonical(label.textContent).includes(value));};
$('#admin-logout').onclick=async()=>{try{await api('/api/logout',{method:'POST'});$('#admin-editor').hidden=true;$('#admin-open').hidden=false;form.reset();tell('Editor locked.');}catch(e){tell(e.message);}};
form.onsubmit=async event=>{event.preventDefault();if(busy)return;const record=Object.fromEntries(fields.map(([name])=>[name,form.elements[name].value.trim()]));record.related=form.elements.related.checked;record.countries=[...form.querySelectorAll('[name=countries]:checked')].map(c=>c.value);record.revision=current?.revision??0;if(!record.countries.length){tell('Choose at least one country.');return;}
 const duplicate=catalog.programs.find(p=>p.id!==current?.id&&canonical(p.name)===canonical(record.name));if(duplicate){tell('A project with this name already exists. Choose it from the Project list to edit.');return;}
 const sourceKey=value=>{try{const u=new URL(value);return u.origin+u.pathname.replace(/\/$/,'');}catch{return value;}};
 const possible=catalog.programs.filter(p=>p.id!==current?.id&&p.countries.some(c=>record.countries.includes(c))&&[p.source,p.source2].filter(Boolean).some(url=>[record.source,record.source2].filter(Boolean).some(candidate=>sourceKey(url)===sourceKey(candidate))));
 if(possible.length&&!confirm('Possible duplicate: '+possible.map(p=>p.name).join(', ')+'. These records share an evidence link and country. Save as a distinct project?'))return;
 busy=true;form.querySelector('button[type=submit]').disabled=true;tell('Saving…');try{await api(current?'/api/records/'+current.id:'/api/records',{method:current?'PUT':'POST',body:JSON.stringify(record)});tell('Saved. Refreshing the atlas…');location.reload();}catch(e){tell(e.message+' Your draft is still here.');}finally{busy=false;form.querySelector('button[type=submit]').disabled=false;}};
$('#admin-delete').onclick=async()=>{if(!current||busy||!confirm('Are you sure?'))return;busy=true;try{await api('/api/records/'+current.id,{method:'DELETE',body:JSON.stringify({revision:current.revision})});location.reload();}catch(e){tell(e.message);}finally{busy=false;}};
// v3.1.0: record-specific, read-only version review; restores create a new audit version.
let historyToken=0,historyEntries=[],historyRevision=0,versionDraft=null;
form.before($('#record-history'));
const historyStatus=$('#history-status'),historyControls=$('#history-controls'),slider=$('#version-slider'),restoreButton=$('#restore-version');
async function loadRecordHistory(record){
 const token=++historyToken;historyEntries=[];historyControls.hidden=true;
 if(!record){historyStatus.textContent='Save this project before reviewing its version history.';return;}
 historyStatus.textContent='Loading versions…';
 try{const data=await api('/api/records/'+record.id+'/history');if(token!==historyToken)return;
 historyRevision=data.currentRevision;historyEntries=data.entries.filter(entry=>entry.revision>=1);
 if(!historyEntries.length){historyStatus.textContent='No saved versions yet. The first edit will create v1.';return;}
 slider.max=String(historyEntries.length-1);slider.value=slider.max;slider.disabled=historyEntries.length===1;historyControls.hidden=false;
 historyStatus.textContent='Slide to preview saved versions in the form. Yellow marks show changes from the current saved record. Restore a version to make it current.';renderVersion();
 }catch(error){if(token===historyToken)historyStatus.textContent=error.message;}
}
function renderVersion(){
 const entry=historyEntries[Number(slider.value)];if(!entry||!current)return;
 const snapshot=entry.after;slider.setAttribute('aria-valuetext','Version '+entry.revision);
 $('#version-description').textContent='v'+entry.revision+' · '+new Date(entry.at).toLocaleString()+' · '+entry.action+' · compared with current v'+historyRevision;
 const container=$('#version-diff');container.replaceChildren();
 const historical=entry.revision!==historyRevision;
 if(historical&&!versionDraft)versionDraft={values:Object.fromEntries(fields.map(([key])=>[key,form.elements[key].value])),countries:[...form.querySelectorAll('[name=countries]:checked')].map(el=>el.value),related:form.elements.related.checked};
 const display=historical?(snapshot||{}):(versionDraft?{...versionDraft.values,countries:versionDraft.countries,related:versionDraft.related}:current);
 for(const [key]of fields)form.elements[key].value=display[key]??'';
 form.elements.related.checked=!!display.related;form.querySelectorAll('[name=countries]').forEach(el=>el.checked=!!display.countries?.includes(el.value));
 for(const control of form.elements)control.disabled=historical;
 $('#edit-record-version').value=historical?'Preview v'+entry.revision+' · current v'+historyRevision:'v'+historyRevision;
 form.querySelectorAll('.field-version-diff').forEach(el=>el.remove());form.querySelectorAll('.version-changed').forEach(el=>el.classList.remove('version-changed'));
 const format=value=>Array.isArray(value)?value.join(', '):typeof value==='boolean'?(value?'Yes':'No'):String(value??'');
 let changes=0;
 function diffLine(title,text,other){
  const line=document.createElement('p'),heading=document.createElement('strong');heading.textContent=title+': ';line.append(heading);
  let start=0;while(start<text.length&&start<other.length&&text[start]===other[start])start++;
  let end=text.length,otherEnd=other.length;while(end>start&&otherEnd>start&&text[end-1]===other[otherEnd-1]){end--;otherEnd--;}
  line.append(document.createTextNode(text.slice(0,start)));const mark=document.createElement('mark');mark.textContent=text.slice(start,end)||'∅';line.append(mark,document.createTextNode(text.slice(end)));return line;
 }
 for(const key of [...fields.map(([key])=>key),'countries','related']){
  const reviewed=format(snapshot?.[key]),saved=format(current[key]);if(reviewed===saved)continue;changes++;
  const target=key==='countries'?form.querySelector('fieldset'):form.elements[key].closest('label');target.classList.add('version-changed');
  const diff=document.createElement('div');diff.className='field-version-diff';diff.append(diffLine('Current v'+historyRevision,saved,reviewed),diffLine('Preview v'+entry.revision,reviewed,saved));target.append(diff);
 }
 const notice=document.createElement('p');notice.textContent=!snapshot?'This version is a deleted state. Restore to remove the current record.':historical?(changes+' changed fields highlighted below. Historical preview is read-only.'):'Current version. You can edit the fields below.';container.append(notice);
 if(!historical)versionDraft=null;
 requestAnimationFrame(fitOutcomes);
 restoreButton.disabled=entry.revision===historyRevision||(!changes&&!!snapshot)||busy;
 restoreButton.textContent=snapshot?'Restore v'+entry.revision:'Restore deleted state';
}
slider.addEventListener('input',renderVersion);
restoreButton.onclick=async()=>{
 const entry=historyEntries[Number(slider.value)];if(!current||!entry||busy||restoreButton.disabled)return;
 const target=current,id=target.id;
 if(!confirm('Restore '+target.name+' to '+(entry.after?'v'+entry.revision:'the deleted state')+'? Unsaved form edits will be replaced. This creates a new version and preserves existing history.'))return;
 busy=true;restoreButton.disabled=true;
 try{await api('/api/rollback/'+entry.id,{method:'POST',body:JSON.stringify({side:'after',revision:historyRevision})});await refresh();load(catalog.programs.find(project=>project.id===id)||null);tell('Version restored. A new version was recorded.');}
 catch(error){historyStatus.textContent=error.message;}
 finally{busy=false;renderVersion();}
};
$('#admin-open').click();
})();
