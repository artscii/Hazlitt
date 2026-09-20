// Parse and generate Excel off the UI thread. The caller enforces a time limit.
importScripts('/exceljs.min.js','/spreadsheet-format.js');
self.onmessage=async({data})=>{
 try{
  if(['export','diff'].includes(data.action)){
   const workbook=data.action==='diff'?AtlasWorkbook.makeDiffWorkbook(ExcelJS,data.preview):AtlasWorkbook.makeWorkbook(ExcelJS,data.programs,data.countries);
   const bytes=await workbook.xlsx.writeBuffer(),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
   self.postMessage({ok:true,buffer},[buffer]);
  }else{
   AtlasWorkbook.checkZip(data.buffer);const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(data.buffer);
   self.postMessage({ok:true,rows:AtlasWorkbook.readWorkbook(workbook,data.countries)});
  }
 }catch(error){self.postMessage({ok:false,error:error.message||'Unable to read this workbook. Use an unprotected .xlsx Atlas export.'});}
};
