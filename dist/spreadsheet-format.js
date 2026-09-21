// v4.0.0: shared workbook format for the browser worker and round-trip checks.
globalThis.AtlasWorkbook=(()=>{
 const columns=[
  ['projectNumber','Project #',false,12],['id','Project ID',false,42],['revision','Version',false,12],
  ['publicationYear','Publication year',false,18],['evidenceBasis','Evidence basis',false,35],['sampleDetails','Participants / slides / images',false,65],
  ['name','Project name',true,42],['status','Evidence status',true,32],['kind','Category',false,20],
  ['countries','Countries',true,30],['geo','Location description',true,44],['metric','Headline outcome',true,25],
  ['metricLabel','Headline outcome explanation',true,45],['short','Short description',true,60],
  ['outcome','Reported outcomes',true,80],['partners','Sponsors and partners',true,65],
  ['phone','Contact phone',false,24],['tel','Telephone link number',false,24],['email','Contact email',false,35],
  ['contact','Contact notes',false,65],['source','Primary evidence URL',true,60],['sourceLabel','Primary evidence link label',false,35],
  ['source2','Additional evidence URL',false,60],['source2Label','Additional evidence link label',false,35],
  ['contactSource','Contact source URL',false,60],['date','Evidence date / review note',true,40],
  ['originalLanguage', 'Original language code (e.g. es, ja, sw)', false, 60],['originalTitle', 'Original source title', false, 60],['originalSummary', 'Source-language summary (editorial)', false, 60],['originalOutcome', 'Source-language outcomes (editorial)', false, 60],['originalSource', 'Original-language source URL', false, 60],['editNotes','Edit notes',false,65],['related','Related initiative',false,20]
 ];
 const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 function makeWorkbook(ExcelJS,programs,countries=[]){
  const book=new ExcelJS.Workbook();book.creator='Hazlitt Creek Evidence Atlas';book.created=new Date();
  const sheet=book.addWorksheet('Projects',{views:[{state:'frozen',xSplit:3,ySplit:1}]});
  sheet.columns=columns.map(([key,title,required,width])=>({key,header:title+(required?' *':''),width}));
  for(const [index,project] of programs.entries()){
   const values=Object.fromEntries(columns.map(([key])=>[key,key==='projectNumber'?index+1:key==='countries'?(project.countries||[]).join('; '):key==='related'?(project.related?'Yes':'No'):project[key]??'']));
   const row=sheet.addRow(values);row.alignment={vertical:'top',wrapText:true};row.height=Math.min(300,Math.max(44,...columns.map(([key,,,width])=>Math.ceil(String(values[key]).length/width)*15+8)));
   row.eachCell({includeEmpty:true},cell=>{cell.font={name:'Aptos',size:11,color:{argb:'FF17313E'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:index%2?'FFF0F5F8':'FFFFFFFF'}};if(typeof cell.value==='string')cell.numFmt='@';});
  }
  const header=sheet.getRow(1);header.height=34;header.alignment={vertical:'middle',wrapText:true};
  header.eachCell(cell=>{cell.font={name:'Aptos',size:11,bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF175B67'}};});
  sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,sheet.rowCount),column:columns.length}};
  const guide=book.addWorksheet('Import guide');guide.columns=[{width:30},{width:105}];
  const lines=[['Hazlitt Creek Evidence Atlas','Excel import and export'],['Exported at',new Date().toISOString()],['Project rows',programs.length],['Import behavior','Matches Project ID first, then normalized project name. Unchanged duplicates are skipped. Changed records require explicit Update selection after preview.'],['Getting started','Keep the Projects sheet and its header row. Add one new project per row. Leave Project #, Project ID and Version blank for new projects.'],['Required fields','Headers marked * are obligatory. Preview identifies invalid rows before anything is saved.'],['Countries','Use exact names from the list below. Separate multiple countries with a semicolon. Country markers are created automatically.'],['Category','Use deployed, pilot, historical or related. Blank means Implementation / published study.'],['Related initiative','Use Yes or No. Blank means No.'],['Text and formulas','Keep values as text. Formula cells, macros and password-protected workbooks are not supported.'],['Import limits','Up to 500 project rows and a 5 MB .xlsx file per import. Split larger files into separate imports.'],['Export scope','All current project fields, including Edit notes, are included. Configuration and historical snapshots are not included.'],['Undo','Undo removes added projects and restores updated projects. Every operation is logged in global history. Later edits to an affected project block undo to protect those edits.'],['Project numbers','Project # and Version are informational. The Atlas assigns its own project IDs and versions to imported projects.'],['Available country names','']];
  for(const country of countries)lines.push([typeof country==='string'?country:country.name,'']);
  lines.forEach((values,index)=>{const row=guide.addRow(values);row.font={name:'Aptos',size:11,color:{argb:'FF17313E'}};row.alignment={wrapText:true,vertical:'top'};row.height=Math.max(25,Math.ceil(String(values[1]).length/100)*16+10);if(index===0){row.font={name:'Aptos',size:12,bold:true,color:{argb:'FFFFFFFF'}};row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF175B67'}};row.height=32;}else row.getCell(1).font={name:'Aptos',size:11,bold:true,color:{argb:'FF175B67'}};});
  return book;
 }
 function makeDiffWorkbook(ExcelJS,preview){
  const book=new ExcelJS.Workbook();book.creator='Hazlitt Creek Evidence Atlas';book.created=new Date(preview.at);
  const selected=new Set(preview.selectedRows),labels=Object.fromEntries(columns.map(([key,label])=>[key,label]));
  const text=value=>Array.isArray(value)?value.join('; '):typeof value==='boolean'?(value?'Yes':'No'):String(value??'');
  const action=row=>row.status==='invalid'?'Correct in source file':row.status==='duplicate'?'Skip duplicate':selected.has(row.key)?row.status==='new'?'Add':'Update':'Skip';
  function table(name,headers,widths){const sheet=book.addWorksheet(name,{views:[{state:'frozen',ySplit:1}]});sheet.columns=headers.map((header,i)=>({header,width:widths[i]}));return sheet;}
  const summary=table('Review summary',['Bulk import preview','Details'],[32,105]);
  summary.addRows([['Run type',preview.testOnly?'Test import — cannot be committed; no project changes':'Bulk import preview'],['Source file',preview.filename],['Batch comment',preview.comment||'Not provided'],['Preview generated',new Date(preview.at).toISOString()],['Review only','This workbook does not apply changes. Return to Admin, preview again if the source file changes, and confirm the selected bulk import.'],['Rows',preview.total],['Selected additions',preview.rows.filter(r=>r.status==='new'&&selected.has(r.key)).length],['Selected updates',preview.rows.filter(r=>r.status==='update'&&selected.has(r.key)).length],['Skipped rows',preview.total-selected.size],['Invalid rows',preview.invalid],['Import readiness',preview.invalid?'Blocked until invalid rows are corrected.':preview.testOnly?'No blocking validation issues found. Run Preview import for a fresh conflict check and separate confirmation.':'Subject to a fresh conflict check when applied.'],['Legend','Yellow cells show proposed changed values. Current values appear alongside them. Choices reflect the selections at download time.'],['Not an import template','This comparison workbook is for review. Edit the original Projects workbook to revise imported data.']]);
  const rows=table('Row decisions',['Excel row','Project #','Project name','Proposed action','Current version','Review note'],[14,14,50,25,18,95]);
  const diffs=table('Field differences',['Excel row','Project #','Project name','Proposed action','Field','Current value','Proposed value'],[14,14,45,24,32,80,80]);
  for(const row of preview.rows){
   rows.addRow([row.row,row.projectNumber??'',row.name,action(row),row.currentRevision??'',row.message+(row.stale?' Spreadsheet version differs from current version.':'')]);
   const changes=row.status==='new'?columns.filter(([key])=>!['id','revision','projectNumber'].includes(key)&&row.values?.[key]!==undefined).map(([field])=>({field,before:'',after:row.values[field]})):row.changes||[];
   for(const change of changes)diffs.addRow([row.row,row.projectNumber??'',row.name,action(row),labels[change.field]||change.field,text(change.before),text(change.after)]);
  }
  for(const sheet of book.worksheets){
   sheet.eachRow((row,index)=>{row.alignment={vertical:'top',wrapText:true};row.height=index===1?32:Math.min(400,Math.max(32,...row.values.slice(1).map((value,i)=>Math.ceil(String(value??'').length/(sheet.columns[i].width||30))*15+10)));row.eachCell({includeEmpty:true},cell=>{cell.font={name:'Aptos',size:11,bold:index===1,color:{argb:index===1?'FFFFFFFF':'FF17313E'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:index===1?'FF175B67':index%2?'FFF0F5F8':'FFFFFFFF'}};if(typeof cell.value==='string')cell.numFmt='@';});if(sheet===diffs&&index>1)row.getCell(7).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF1BD'}};});
   if(sheet!==summary)sheet.autoFilter={from:{row:1,column:1},to:{row:sheet.rowCount,column:sheet.columnCount}};
  }
  return book;
 }
 function cellValue(cell){
  const value=cell.value;if(value==null)return '';
  if(typeof value==='object'){
   if('formula' in value||'sharedFormula' in value)throw new Error('Formula cells are not supported. Paste their values before importing.');
   if(value instanceof Date)return value.toISOString().slice(0,10);
   if(value.richText)return value.richText.map(part=>part.text).join('');
   if('text' in value)return String(value.text);
   throw new Error('Unsupported cell value. Use plain text.');
  }
  return String(value);
 }
 function readWorkbook(book,countries=[]){
  const sheet=book.getWorksheet('Projects');if(!sheet)throw new Error('No Projects worksheet found. Export the Atlas first and use that workbook as your template.');
  if(sheet.rowCount>501||sheet.columnCount>50)throw new Error('Import supports up to 500 project rows and 50 columns. Remove unused rows or split the workbook.');
  const aliases=new Map(columns.flatMap(([key,title])=>[[normalize(key),key],[normalize(title),key]])),mapping=new Map();
  sheet.getRow(1).eachCell((cell,column)=>{const title=cellValue(cell).trim();if(!title)return;const key=aliases.get(normalize(title));if(!key)throw new Error('Unrecognized column: '+title);if([...mapping.values()].includes(key))throw new Error('Repeated column: '+title);mapping.set(column,key);});
  for(const [key,title,required] of columns)if(required&&![...mapping.values()].includes(key))throw new Error('Missing required column: '+title);
  const mappingHas=key=>[...mapping.values()].includes(key);
  const countryNames=new Map(countries.map(country=>{const name=typeof country==='string'?country:country.name;return [normalize(name),name];})),rows=[];
  sheet.eachRow((row,index)=>{
   if(index===1)return;let record={row:index},hasValue=false;
   try{
    for(const [column,key] of mapping){const text=cellValue(row.getCell(column)).trim();if(text)hasValue=true;record[key]=text;}
    if(!hasValue)return;
    record.countries=String(record.countries||'').split(/[;\n|]/).map(value=>value.trim()).filter(Boolean).map(value=>countryNames.get(normalize(value))||value);
    const related=normalize(record.related);if(!['','yes','no','true','false','1','0'].includes(related))throw new Error('Related initiative must be Yes or No.');if(mappingHas('related'))record.related=['yes','true','1'].includes(related);
    const categories={'implementation published study':'',implementation:'deployed','related initiative':'related','pilot preliminary study':'pilot','historical related initiative':'historical'};
    const kind=normalize(record.kind);if(mappingHas('kind'))record.kind=categories[kind]??String(record.kind||'').trim().toLowerCase();
   }catch(error){record.error=error.message;hasValue=true;}
   if(hasValue)rows.push(record);
  });
  if(!rows.length)throw new Error('The Projects worksheet contains no project rows.');return rows;
 }
 function checkZip(buffer){
  if(buffer.byteLength>5*1024*1024)throw new Error('Choose an .xlsx file no larger than 5 MB.');
  const view=new DataView(buffer);let end=-1;
  for(let i=view.byteLength-22;i>=Math.max(0,view.byteLength-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
  if(end<0)throw new Error('This is not a readable .xlsx workbook.');
  const count=view.getUint16(end+10,true);let offset=view.getUint32(end+16,true),total=0;
  if(count>500||count===65535)throw new Error('This workbook is too complex. Use the Atlas export template.');
  for(let i=0;i<count;i++){
   if(offset+46>view.byteLength||view.getUint32(offset,true)!==0x02014b50)throw new Error('The workbook archive is damaged.');
   const size=view.getUint32(offset+24,true),length=view.getUint16(offset+28,true);total+=size;
   if(size===4294967295||total>30*1024*1024)throw new Error('The expanded workbook is too large. Use a smaller file.');
   const name=new TextDecoder().decode(new Uint8Array(buffer,offset+46,length));if(/vbaProject/i.test(name))throw new Error('Macro-enabled workbooks are not supported. Save as .xlsx first.');
   offset+=46+length+view.getUint16(offset+30,true)+view.getUint16(offset+32,true);
  }
 }
 return {columns,makeWorkbook,makeDiffWorkbook,readWorkbook,checkZip};
})();
