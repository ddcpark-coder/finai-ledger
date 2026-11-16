import test from "node:test";
import assert from "node:assert/strict";
import {
 syntheticCommerceReviewAvailable,createSyntheticCommerceReviewClient,
 validateReviewRow,validateReviewPage,validateReviewDecision
} from "../app/next11/syntheticCommerceReviewClient.mjs";

const origin="http://127.0.0.1:3000",base=origin+"/api";
const row={id:7,external_order_id:"SYN-7001-SHOPIFY",
 provider:"shopify",warehouse_id:1,total_cents:25000,line_count:1,
 status:"review",demo_only:true,posting:false};
const page={items:[row],next_cursor:null,demo_only:true,real_sync_enabled:false};
const ack={id:7,status:"reviewed",replayed:false,demo_only:true,posting:false,
 inventory_reserved:false,invoice_created:false};

test("backend review stays disabled outside same-origin loopback",()=>{
 assert.equal(syntheticCommerceReviewAvailable(base,origin),true);
 for(const [url,from]of [
  ["https://finai.example.test/api","https://finai.example.test"],
  ["http://192.168.0.20:3000/api","http://192.168.0.20:3000"],
  ["https://127.0.0.1:3000/api","http://127.0.0.1:3000"],
  ["http://127.0.0.1:8080/api","http://127.0.0.1:3000"],
  ["http://127.0.0.1:3000/private-api","http://127.0.0.1:3000"]
 ])assert.equal(syntheticCommerceReviewAvailable(url,from),false);
 assert.throws(()=>createSyntheticCommerceReviewClient({
  base:"https://example.com/api",origin}),/lokalnem/);
});

test("review list is same-origin manual GET with credentials, no client POST",async()=>{
 const calls=[];
 const client=createSyntheticCommerceReviewClient({base,origin,
  fetcher:async(url,opt)=>{calls.push({url,opt});return {ok:true,json:async()=>({data:page})}}});
 const actual=await client.list(1);
 assert.deepEqual(actual,page);
 assert.equal(calls.length,1);
 assert.equal(calls[0].opt.method,"GET");
 assert.equal(calls[0].opt.credentials,"include");
 assert.match(calls[0].url,/companies\/1\/demo\/commerce-review\?after_id=0&limit=20/);
 assert.throws(()=>client.list(0),/Neveljavno/);
 await assert.rejects(client.list(1,{limit:51}),/stran/);
});

test("review decision requires real CSRF cookie and strict synthetic ACK",async()=>{
 const calls=[];
 const fetcher=async(url,opt)=>{
  calls.push({url,opt});
  if(url.endsWith("/sanctum/csrf-cookie"))return {ok:true,status:204};
  return {ok:true,json:async()=>({data:ack})};
 };
 const client=createSyntheticCommerceReviewClient({base,origin,fetcher,
  cookie:()=>"XSRF-TOKEN=testing%2Fopaque; finai=session"});
 assert.deepEqual(await client.decide(1,7,"reviewed"),ack);
 assert.equal(calls.length,2);
 assert.equal(calls[0].opt.method,"GET");
 assert.equal(calls[1].opt.method,"POST");
 assert.equal(calls[1].opt.headers["X-XSRF-TOKEN"],"testing/opaque");
 assert.equal(calls[1].opt.credentials,"include");
 assert.deepEqual(JSON.parse(calls[1].opt.body),{decision:"reviewed"});
 await assert.rejects(createSyntheticCommerceReviewClient({
  base,origin,fetcher,cookie:()=>""}).decide(1,7,"reviewed"),/CSRF/);
 await assert.rejects(client.decide(1,7,"posted"),/Nedovoljena/);
});

test("review response rejects PII, posting, unknown statuses and wrong ID",()=>{
 assert.deepEqual(validateReviewRow(row),row);
 assert.deepEqual(validateReviewPage(page),page);
 assert.deepEqual(validateReviewDecision(ack,7,"reviewed"),ack);
 for(const bad of [
  {...row,customer:{email:"fake@example.test"}},
  {...row,posting:true},
  {...row,demo_only:false},
  {...row,external_order_id:"REAL-001"},
  {...row,status:"posted"},
  {...row,total_cents:25.75},
 ]){
  assert.throws(()=>validateReviewRow(bad));
 }
 assert.throws(()=>validateReviewPage({...page,items:[row,row]}));
 assert.throws(()=>validateReviewPage({...page,real_sync_enabled:true}));
 assert.throws(()=>validateReviewDecision({...ack,invoice_created:true},7,"reviewed"));
 assert.throws(()=>validateReviewDecision({...ack,id:8},7,"reviewed"));
});

test("server authorization failures never accept synthetic writes",async()=>{
 for(const status of [401,403,404,409,422]){
  const client=createSyntheticCommerceReviewClient({base,origin,
   cookie:()=>"XSRF-TOKEN=abc",
   fetcher:async(url)=>url.endsWith("csrf-cookie")?
    {ok:true,status:204}:{ok:false,status}});
  await assert.rejects(client.decide(1,7,"hold"),e=>e.status===status);
 }
});
