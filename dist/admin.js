// Atlas 2.5.0 — password-protected shared record editor.
(()=>{
const section=document.createElement('section');section.id='admin';section.className='admin-section';section.innerHTML=`<div class="admin-content"><p>Manage project records and their map locations.</p><button id="admin-open" type="button">Edit atlas</button><form id="admin-login" hidden><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">Unlock editor</button></form><p id="admin-message" role="status" aria-live="polite"></p><div id="admin-editor" hidden><div class="admin-lookup-row"><form id="project-number-form" class="admin-number-lookup"><label for="admin-project-number">Atlas project number</label><div><input id="admin-project-number" type="number" min="1" step="1" inputmode="numeric" placeholder="e.g. 12" required aria-describedby="project-number-help"><button type="submit">Open project</button></div><p id="project-number-help">Enter the number shown beside a project in this Atlas.</p><p id="project-number-status" role="status" aria-live="polite"></p></form><div class="admin-name-lookup"><label for="admin-project-search">Search projects</label><input id="admin-project-search" type="search" placeholder="Project name, country or keyword…" aria-controls="admin-record" autocomplete="off"><p id="admin-search-status" role="status" aria-live="polite"></p><div id="admin-search-results" class="admin-search-results" hidden></div></div></div><div class="admin-toolbar"><label>Project<select id="admin-record"><option value="">New project</option></select></label><button type="button" id="admin-new">New entry</button><button type="button" id="admin-logout">Lock editor</button></div><form id="record-form" aria-describedby="required-fields-note"><p id="required-fields-note">Fields marked with an asterisk (*) are required.</p><label class="admin-project-reference" for="edit-record-reference">Project · Version<input id="edit-record-reference" type="text" readonly aria-readonly="true" value="New project · Not saved"></label><div id="admin-fields" class="admin-fields"></div><fieldset><legend>Country or countries *</legend><input type="search" id="country-filter" placeholder="Search to add a country…" aria-label="Search countries" autocomplete="off" aria-controls="country-results"><div id="country-results" hidden></div><div id="selected-countries" aria-label="Selected countries"></div><div id="admin-countries" hidden></div></fieldset><label class="check-label"><input type="checkbox" name="related"> Related initiative (AI not documented)</label><div class="admin-actions"><button type="submit">Save entry</button><button type="button" id="admin-delete" hidden>Delete entry</button></div></form><section id="record-history" class="record-history"><h2>Version history</h2><p id="history-status" role="status">Choose a project to review its versions.</p><div id="history-controls" hidden><label for="version-slider">Review saved version</label><div class="version-scroll"><div class="version-timeline"><input id="version-slider" type="range" min="0" max="0" step="1" value="0" aria-describedby="version-description"><div id="version-nodes" role="group" aria-label="Saved versions"></div></div></div><p id="version-description"></p><div id="version-diff"></div><button id="restore-version" type="button">Restore this version</button></div></section></div></div>`;
document.querySelector('#admin-page').append(section);
const $=selector=>section.querySelector(selector),form=$('#record-form'),message=$('#admin-message');
let catalog=null,current=null,busy=false,numberedIds=[];
const fields=[['name','Project name',true],['status','Evidence status',true],['kind','Category',true],['geo','Location description',true],['metric','Headline outcome',true],['metricLabel','Headline outcome explanation',true],['short','Short description',true],['outcome','Reported outcomes',true],['partners','Sponsors and partners',true],['phone','Contact phone'],['tel','Telephone link number'],['email','Contact email'],['contact','Contact notes'],['source','Primary evidence URL',true],['sourceLabel','Primary evidence link label'],['source2','Additional evidence URL'],['source2Label','Additional evidence link label'],['contactSource','Contact source URL'],['date','Evidence date / review note',true],['editNotes','Edit notes']];
const long=new Set(['short','outcome','partners','contact','editNotes']);
for(const [name,title,required] of fields){const label=document.createElement('label');label.textContent=title+(required?' *':'');let input;if(name==='kind'){input=document.createElement('select');for(const [value,text] of [['','Implementation / published study'],['deployed','Implementation'],['related','Related initiative'],['pilot','Pilot / preliminary study'],['historical','Historical / related initiative']]){const option=document.createElement('option');option.value=value;option.textContent=text;input.append(option);}}else{input=document.createElement(long.has(name)?'textarea':'input');if(input.tagName==='TEXTAREA')input.rows=4;else input.type=['source','source2','contactSource'].includes(name)?'url':name==='email'?'email':'text';input.maxLength=12000;}input.name=name;input.required=!!required;label.append(input);$('#admin-fields').append(label);}
async function api(path,options={}){const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});const data=await response.json();if(!response.ok)throw new Error(data.error||'Request failed');return data;}
function tell(text){message.textContent=text;}
async function refresh(){catalog=await api('/api/catalog');numberedIds=(window.atlasCatalog?.programs||catalog.programs).map(p=>p.id);const select=$('#admin-record');select.replaceChildren(new Option('New project',''));for(const p of catalog.programs)select.add(new Option('Project '+String(numberedIds.indexOf(p.id)+1).padStart(2,'0')+' · '+p.name,p.id));const countries=$('#admin-countries');countries.replaceChildren();for(const country of catalog.countries){const label=document.createElement('label');label.className='check-label';const input=document.createElement('input');input.type='checkbox';input.name='countries';input.value=country.name;label.append(input,document.createTextNode(country.name));countries.append(label);}}
function fitOutcomes(){const input=form.elements.outcome;input.style.height='auto';input.style.height=Math.max(100,input.scrollHeight+2)+'px';}
form.elements.outcome.addEventListener('input',fitOutcomes);
let outcomeWidth=0;
new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width!==outcomeWidth){outcomeWidth=width;if(!$('#admin-editor').hidden)requestAnimationFrame(fitOutcomes);}}).observe(form.elements.outcome.parentElement);
// v3.2.1: one consistent project/version reference throughout version review.
function projectVersion(record,revision){return 'Project '+String(numberedIds.indexOf(record.id)+1).padStart(2,'0')+' · '+(revision>0?'v'+revision:'Original import');}
function load(record){versionDraft=null;form.querySelectorAll('.field-version-diff').forEach(el=>el.remove());form.querySelectorAll('.version-changed').forEach(el=>el.classList.remove('version-changed'));for(const control of form.elements)control.disabled=false;const number=record?numberedIds.indexOf(record.id)+1:0;$('#admin-project-number').value=number||'';$('#project-number-status').textContent=record?'Editing Project '+String(number).padStart(2,'0')+' · '+record.name:'';current=record;form.reset();$('#edit-record-reference').value=record?projectVersion(record,record.revision):'New project · Not saved';$('#country-filter').value='';$('#admin-countries').querySelectorAll('label').forEach(l=>l.hidden=false);for(const [name]of fields)form.elements[name].value=record?.[name]?? (name==='kind'?'':'');form.elements.related.checked=!!record?.related;form.querySelectorAll('[name=countries]').forEach(c=>c.checked=!!record?.countries.includes(c.value));$('#admin-delete').hidden=!record;$('#admin-record').value=record?.id||'';renderCountryPicker();requestAnimationFrame(fitOutcomes);loadRecordHistory(record);}
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
// v3.2.4: compact country search with removable selections; no visible checkbox grid.
function renderCountryPicker(){
 const search=$('#country-filter'),results=$('#country-results'),selected=$('#selected-countries');results.replaceChildren();selected.replaceChildren();
 const inputs=[...form.querySelectorAll('[name=countries]')],query=canonical(search.value);
 for(const input of inputs.filter(input=>input.checked)){
  const chip=document.createElement('button');chip.type='button';chip.className='country-chip';chip.textContent=input.value+(search.disabled?'':' ×');chip.disabled=search.disabled;chip.setAttribute('aria-label','Remove '+input.value);
  chip.onclick=()=>{input.checked=false;renderCountryPicker();search.focus();};selected.append(chip);
 }
 results.hidden=!query||search.disabled;
 if(results.hidden)return;
 const matches=inputs.filter(input=>!input.checked&&canonical(input.value).includes(query));
 for(const input of matches){const button=document.createElement('button');button.type='button';button.textContent=input.value;button.onclick=()=>{input.checked=true;search.value='';renderCountryPicker();search.focus();};results.append(button);}
 if(!matches.length)results.textContent='No matching countries to add.';
}
$('#country-filter').oninput=renderCountryPicker;
$('#country-filter').onkeydown=event=>{const buttons=$('#country-results').querySelectorAll('button');if(event.key==='Escape'){event.preventDefault();event.target.value='';renderCountryPicker();}else if(event.key==='ArrowDown'&&buttons.length){event.preventDefault();buttons[0].focus();}else if(event.key==='Enter'){event.preventDefault();const exact=[...buttons].find(button=>canonical(button.textContent)===canonical(event.target.value));if(exact)exact.click();else if(buttons.length===1)buttons[0].click();}};

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
form.after($('#record-history'));
// v3.2.0: explicit version review, filtering, and reversible restore controls.
$('#history-controls').insertAdjacentHTML('afterbegin',`<div class="version-navigation"><button type="button" id="version-prev">← Previous</button><label>Saved version<select id="version-picker"></select></label><button type="button" id="version-next">Next →</button><button type="button" id="version-current">Return to current version</button></div><p id="version-badges" aria-live="polite"></p><label class="check-label"><input type="checkbox" id="version-changes-only"> Show changed fields only</label><p id="version-filter-status" role="status"></p>`);
// v3.2.2: keep the selected version's context together above the timeline.
const versionContext=document.createElement('div');versionContext.className='version-context';
versionContext.append($('#version-badges'),$('#version-description'));
const sliderLabel=$('label[for="version-slider"]');sliderLabel.before(versionContext);sliderLabel.classList.add('version-slider-label');
const versionActions=document.createElement('div');versionActions.className='version-review-actions';
versionActions.append($('#version-changes-only').closest('label'),$('#restore-version'));
$('.version-scroll').after(versionActions);
versionActions.after($('#version-filter-status'),$('#version-diff'));
const formHeading=document.createElement('div');formHeading.className='record-form-heading';
formHeading.append($('#edit-record-reference').closest('label'),$('#required-fields-note'));form.prepend(formHeading);
const reviewFields=()=>[...fields.map(([key])=>form.elements[key].closest('label')),form.querySelector('fieldset'),form.elements.related.closest('label')];
function filterVersionFields(){const only=$('#version-changes-only').checked;for(const field of reviewFields())field.hidden=only&&!field.classList.contains('version-changed');$('#version-filter-status').textContent=only?(reviewFields().filter(field=>!field.hidden).length+' changed fields shown compared with the current saved version.'):'Showing all fields.';requestAnimationFrame(fitOutcomes);}
function selectVersion(index){if(busy||!historyEntries.length)return;slider.value=String(Math.max(0,Math.min(historyEntries.length-1,index)));renderVersion();}
$('#version-prev').onclick=()=>selectVersion(Number(slider.value)-1);
$('#version-next').onclick=()=>selectVersion(Number(slider.value)+1);
$('#version-picker').onchange=event=>selectVersion(Number(event.target.value));
$('#version-current').onclick=()=>{ $('#version-changes-only').checked=false;selectVersion(historyEntries.length-1);};
$('#version-changes-only').onchange=filterVersionFields;
const historyStatus=$('#history-status'),historyControls=$('#history-controls'),slider=$('#version-slider'),restoreButton=$('#restore-version');
async function loadRecordHistory(record){
 const token=++historyToken;historyEntries=[];historyControls.hidden=true;$('#version-changes-only').checked=false;filterVersionFields();
 if(!record){historyStatus.textContent='Save this project before reviewing its version history.';return;}
 historyStatus.textContent='Loading versions…';
 try{const data=await api('/api/records/'+record.id+'/history');if(token!==historyToken)return;
 historyRevision=data.currentRevision;historyEntries=data.entries.filter(entry=>entry.revision>=1);
 if(!historyEntries.length){historyStatus.textContent='No saved versions yet. The first edit will create v1.';return;}
 slider.max=String(historyEntries.length-1);slider.value=slider.max;slider.disabled=historyEntries.length===1;historyControls.hidden=false;
 buildVersionNodes();
 historyStatus.textContent='Browse saved versions; yellow highlights compare with the current record.';renderVersion();
 }catch(error){if(token===historyToken)historyStatus.textContent=error.message;}
}
// v3.1.1: preload version nodes once; scrubbing updates the form without a request.
function buildVersionNodes(){
 const nodes=$('#version-nodes');nodes.replaceChildren();$('#version-picker').replaceChildren();
 $('.version-timeline').style.minWidth=Math.max(0,(historyEntries.length-1)*168+48)+'px';
 historyEntries.forEach((entry,index)=>{
  const option=document.createElement('option');option.value=String(index);option.textContent='v'+entry.revision+(entry.revision===historyRevision?' · Current':'')+' · '+new Date(entry.at).toLocaleDateString();$('#version-picker').append(option);
  const button=document.createElement('button');button.type='button';button.className='version-node';button.textContent='v'+entry.revision;
  const summary=document.createElement('span');summary.className='version-node-summary';for(const part of (entry.summary||'No summary available.').split(/(“[^”]+”)/g)){if(part.startsWith('“')&&part.endsWith('”')){const name=document.createElement('strong');name.textContent=part.slice(1,-1);summary.append(name);}else summary.append(document.createTextNode(part));}button.append(summary);
  button.style.left=(historyEntries.length===1?50:index/(historyEntries.length-1)*100)+'%';
  button.title='Version '+entry.revision+' · '+new Date(entry.at).toLocaleString()+' · '+(entry.summary||'');
  button.setAttribute('aria-label','Preview version '+entry.revision+(entry.revision===historyRevision?' (current)':''));
  button.onclick=()=>{slider.value=String(index);renderVersion();};nodes.append(button);
 });
}
function renderVersion(){
 const entry=historyEntries[Number(slider.value)];if(!entry||!current)return;
 $('#version-nodes').querySelectorAll('button').forEach((button,index)=>button.setAttribute('aria-pressed',String(index===Number(slider.value))));
 const snapshot=entry.after;slider.setAttribute('aria-valuetext','Version '+entry.revision);
 $('#version-description').textContent='v'+entry.revision+' · '+new Date(entry.at).toLocaleString()+' · '+entry.action;
 
 const container=$('#version-diff');container.replaceChildren();
 const historical=entry.revision!==historyRevision;
 $('#version-picker').value=slider.value;$('#version-prev').disabled=Number(slider.value)===0||busy;$('#version-next').disabled=Number(slider.value)===historyEntries.length-1||busy;$('#version-current').disabled=!historical||busy;
 $('#version-badges').textContent=projectVersion(current,entry.revision)+(historical?' · Preview (current: v'+historyRevision+')':' · Current');
 $('#version-changes-only').disabled=false;
 if(historical&&!versionDraft)versionDraft={values:Object.fromEntries(fields.map(([key])=>[key,form.elements[key].value])),countries:[...form.querySelectorAll('[name=countries]:checked')].map(el=>el.value),related:form.elements.related.checked};
 const display=historical?(snapshot||{}):(versionDraft?{...versionDraft.values,countries:versionDraft.countries,related:versionDraft.related}:{...Object.fromEntries(fields.map(([key])=>[key,form.elements[key].value])),countries:[...form.querySelectorAll('[name=countries]:checked')].map(el=>el.value),related:form.elements.related.checked});
 for(const [key]of fields)form.elements[key].value=display[key]??'';
 form.elements.related.checked=!!display.related;form.querySelectorAll('[name=countries]').forEach(el=>el.checked=!!display.countries?.includes(el.value));
 for(const control of form.elements)control.disabled=historical;renderCountryPicker();
 $('#edit-record-reference').value=projectVersion(current,entry.revision)+(historical?' · Preview':' · Current');
 form.querySelectorAll('.field-version-diff').forEach(el=>el.remove());form.querySelectorAll('.version-changed').forEach(el=>el.classList.remove('version-changed'));
 const format=value=>Array.isArray(value)?value.join(', '):typeof value==='boolean'?(value?'Yes':'No'):String(value??'');
 let changes=0;const changedNames=[];
 function diffLine(title,text,other){
  const line=document.createElement('p'),heading=document.createElement('strong');heading.textContent=title+': ';line.append(heading);
  let start=0;while(start<text.length&&start<other.length&&text[start]===other[start])start++;
  let end=text.length,otherEnd=other.length;while(end>start&&otherEnd>start&&text[end-1]===other[otherEnd-1]){end--;otherEnd--;}
  line.append(document.createTextNode(text.slice(0,start)));const mark=document.createElement('mark');mark.textContent=text.slice(start,end)||'∅';line.append(mark,document.createTextNode(text.slice(end)));return line;
 }
 for(const key of [...fields.map(([key])=>key),'countries','related']){
  const reviewed=format(snapshot?.[key]),saved=format(current[key]);if(reviewed===saved)continue;changes++;changedNames.push(fields.find(([name])=>name===key)?.[1]|| (key==='countries'?'Countries':'Related initiative'));
  const target=key==='countries'?form.querySelector('fieldset'):form.elements[key].closest('label');target.classList.add('version-changed');
  const diff=document.createElement('div');diff.className='field-version-diff';diff.append(diffLine('Current v'+historyRevision,saved,reviewed),diffLine('Preview v'+entry.revision,reviewed,saved));target.append(diff);
 }
 const notice=document.createElement('p');notice.textContent=!snapshot?'This version is a deleted state. Restore to remove the current record.':historical?(changes+' changed fields highlighted below. Historical preview is read-only.'):'Current version. You can edit the fields below.';container.append(notice);
 
 restoreButton.dataset.summary=changedNames.join(', ');
 filterVersionFields();
 if(!historical)versionDraft=null;
 requestAnimationFrame(fitOutcomes);
 restoreButton.disabled=entry.revision===historyRevision||(!changes&&!!snapshot)||busy;
 restoreButton.textContent=snapshot?'Restore v'+entry.revision+' as a new version':'Restore deleted state as a new version';
}
slider.addEventListener('input',renderVersion);
// v3.1.2: capture the pointer so dragging keeps scrubbing beyond the thumb.
let scrubPointer=null;
function scrubAt(clientX){
 const bounds=slider.getBoundingClientRect(),inset=9;
 const fraction=Math.max(0,Math.min(1,(clientX-bounds.left-inset)/Math.max(1,bounds.width-inset*2)));
 const next=String(Math.round(fraction*(historyEntries.length-1)));
 if(slider.value!==next){slider.value=next;renderVersion();}
}
slider.addEventListener('pointerdown',event=>{
 if(slider.disabled||busy||event.button!==0)return;
 event.preventDefault();scrubPointer=event.pointerId;slider.setPointerCapture(scrubPointer);
 slider.focus({preventScroll:true});scrubAt(event.clientX);
});
slider.addEventListener('pointermove',event=>{if(event.pointerId===scrubPointer)scrubAt(event.clientX);});
slider.addEventListener('pointerup',event=>{if(event.pointerId===scrubPointer){scrubAt(event.clientX);slider.releasePointerCapture(scrubPointer);scrubPointer=null;}});
slider.addEventListener('lostpointercapture',()=>{scrubPointer=null;});
restoreButton.onclick=async()=>{
 const entry=historyEntries[Number(slider.value)];if(!current||!entry||busy||restoreButton.disabled)return;
 const target=current,id=target.id;
 if(!confirm('Restore '+target.name+' to '+(entry.after?'v'+entry.revision:'the deleted state')+'?\n\nFields affected: '+restoreButton.dataset.summary+'.\n\nUnsaved form edits will be replaced. This creates a new version and preserves all existing history.'))return;
 busy=true;restoreButton.disabled=true;
 try{await api('/api/rollback/'+entry.id,{method:'POST',body:JSON.stringify({side:'after',revision:historyRevision})});await refresh();load(catalog.programs.find(project=>project.id===id)||null);tell('Version restored. A new version was recorded.');}
 catch(error){historyStatus.textContent=error.message;}
 finally{busy=false;renderVersion();}
};
$('#admin-open').click();
})();
