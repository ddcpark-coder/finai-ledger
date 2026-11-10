import test from "node:test";
import assert from "node:assert/strict";
import {validateLocalPreviewFile,MAX_LOCAL_PREVIEW_BYTES} from "../app/incoming/localFilePreview.mjs";

test("only small synthetic local JPG/PNG/PDF samples may be previewed",()=>{
 for(const [name,type] of [["sample.jpg","image/jpeg"],["sample.png","image/png"],["sample.pdf","application/pdf"]]){
  const result=validateLocalPreviewFile({name,type,size:128});
  assert.equal(result.name,name);
  assert.equal(result.image,type!=="application/pdf");
 }
});
test("rejects wrong MIME, type mismatch, empty/large and path-like names",()=>{
 const valid={name:"demo.jpg",type:"image/jpeg",size:1024};
 for(const change of [
  {name:"bad.exe"},{name:"../bad.jpg"},{name:"bad.png"},
  {type:"text/html"},{size:0},{size:MAX_LOCAL_PREVIEW_BYTES+1},
  {name:"folder/bad.jpg"},{name:""},
 ]){
  assert.throws(()=>validateLocalPreviewFile({...valid,...change}));
 }
});
test("helper returns metadata only and never reads or serializes file bytes",()=>{
 let touched=false;
 const file={name:"demo.pdf",type:"application/pdf",size:42,
   get content(){touched=true;throw new Error("not allowed");}};
 assert.deepEqual(validateLocalPreviewFile(file),{name:"demo.pdf",type:"application/pdf",size:42,image:false});
 assert.equal(touched,false);
});
