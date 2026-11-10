import test from "node:test";
import assert from "node:assert/strict";
import {DEFAULT_VIEW,normalizeView,viewStorageKey,updateViewField} from "../app/lib/workspacePersonalization.mjs";

test("malformed settings fall back to safe defaults",()=>{
 assert.deepEqual(normalizeView(null),DEFAULT_VIEW);
 assert.deepEqual(normalizeView({level:"root",arrangement:"danger",detailWidth:"NaN"}),DEFAULT_VIEW);
 assert.deepEqual(normalizeView({level:"simple",arrangement:"stacked",detailWidth:99999}),
   {level:"simple",arrangement:"stacked",detailWidth:700,textScale:100});
});
test("all three complexity levels and four window layouts are supported",()=>{
 for(const level of ["simple","standard","expert"])for(const arrangement of ["split","stacked","list","detail"]){
  const view=normalizeView({level,arrangement,detailWidth:420});
  assert.deepEqual(view,{level,arrangement,detailWidth:420,textScale:100});
 }
});
test("company and module preference namespaces cannot leak between workspaces",()=>{
 const keys=new Set([
  viewStorageKey(1,"incoming_invoices"),viewStorageKey(2,"incoming_invoices"),
  viewStorageKey(1,"banking"),viewStorageKey(2,"banking"),
  viewStorageKey(1,"banking","Usklajevanje::Predlogi")
 ]);
 assert.equal(keys.size,5);
 for(const bad of [0,-1,1.3,NaN])assert.throws(()=>viewStorageKey(bad,"banking"));
 for(const bad of ["banking/../../x","",null])assert.throws(()=>viewStorageKey(1,bad));
 assert.notEqual(viewStorageKey(1,"banking","Pregled::Vsi"),viewStorageKey(1,"banking","Usklajevanje::Predlogi"));
 assert.throws(()=>viewStorageKey(1,"banking","Wrong"+String.fromCharCode(10)+"View"));
 assert.throws(()=>viewStorageKey(1,"banking",null));
});
test("updates preserve independent user preferences and block unknown fields",()=>{
 const v=updateViewField(DEFAULT_VIEW,"detailWidth",460);
 const w=updateViewField(v,"level","expert");
 assert.equal(w.detailWidth,460);assert.equal(w.level,"expert");
 assert.deepEqual(DEFAULT_VIEW,{level:"standard",arrangement:"split",detailWidth:370,textScale:100});
 assert.throws(()=>updateViewField(v,"permissions",true));
 assert.equal(updateViewField(v,"textScale",130).textScale,130);
 assert.equal(updateViewField(v,"textScale",200).textScale,100);
});
