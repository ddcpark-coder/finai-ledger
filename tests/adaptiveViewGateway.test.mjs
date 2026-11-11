import test from "node:test";
import assert from "node:assert/strict";

// Test the client without contacting an API or using real user information.
process.env.NEXT_PUBLIC_FINAI_API_BASE_URL="https://api.test.invalid/api";
const {
 adaptiveApiConfigured,fetchAdaptiveView,saveAdaptiveView
}=await import("../app/lib/adaptiveViewGateway.js");

const realFetch=globalThis.fetch;
const realDocument=globalThis.document;

test("GET targets the selected company/module/view using only authenticated cookies",async()=>{
 const calls=[];
 globalThis.fetch=async(url,options)=>{
   calls.push({url,options});
   return {ok:true,json:async()=>({data:{
     version:3,settings:{
       level:"expert",arrangement:"stacked",detailWidth:480,textScale:115
     }
   }})};
 };
 try{
   assert.equal(adaptiveApiConfigured(),true);
   const result=await fetchAdaptiveView(2,"incoming_invoices","Za pregled::OCR");
   assert.equal(result.version,3);
   assert.equal(result.settings.level,"expert");
   assert.equal(calls.length,1);
   assert.equal(calls[0].options.method,"GET");
   assert.equal(calls[0].options.credentials,"include");
   assert.equal(new URL(calls[0].url).searchParams.get("view"),"Za pregled::OCR");
   assert.match(calls[0].url,/companies\/2\/my\/adaptive-views\/incoming_invoices/);
 }finally{globalThis.fetch=realFetch}
});

test("PUT obtains first-party CSRF cookie, applies version check and normalized view",async()=>{
 const calls=[];
 globalThis.document={cookie:"XSRF-TOKEN=abc%3D123"};
 globalThis.fetch=async(url,options)=>{
   calls.push({url,options});
   if(url.endsWith("/sanctum/csrf-cookie"))return {ok:true};
   return {ok:true,json:async()=>({data:{
     version:4,settings:{
       level:"simple",arrangement:"list",detailWidth:700,textScale:130
     }
   }})};
 };
 try{
   const result=await saveAdaptiveView(1,"banking","Pregled::Napoved",{
     level:"simple",arrangement:"list",detailWidth:999,textScale:130
   },3);
   assert.equal(result.version,4);
   assert.equal(calls.length,2);
   assert.equal(calls[0].options.credentials,"include");
   assert.equal(calls[1].options.credentials,"include");
   assert.equal(calls[1].options.headers["X-XSRF-TOKEN"],"abc=123");
   const sent=JSON.parse(calls[1].options.body);
   assert.deepEqual(sent,{
     level:"simple",arrangement:"list",detailWidth:700,textScale:130,
     expected_version:3
   });
   assert.equal(calls[1].options.method,"PUT");
 }finally{globalThis.fetch=realFetch;globalThis.document=realDocument}
});

test("a failed authorization or conflicting version is not mistaken for successful sync",async()=>{
 const calls=[];
 globalThis.fetch=async(url,options)=>{
   calls.push({url,options});
   return {ok:false,status:409};
 };
 try{
   await assert.rejects(
     fetchAdaptiveView(1,"banking","Pregled::Računi"),
     error=>error.status===409
   );
   await assert.rejects(
     fetchAdaptiveView(1,"banking","Pregled::Računi"+String.fromCharCode(10)+"admin"),
     /Neveljaven podpogled/
   );
   assert.equal(calls.length,1);
 }finally{globalThis.fetch=realFetch}
});
