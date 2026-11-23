import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 createSyntheticJournalPreviewClient,syntheticJournalPreviewAvailable
} from "../app/next11/syntheticJournalPreviewClient.mjs";

const origin="http://127.0.0.1:3000",base=origin+"/api";
const draft=()=>({
 companyId:1,reference:"SYN-INV-12",currency:"EUR",
 lines:[
  {accountId:"SYN-ACC-4100",debitCents:55000,creditCents:0},
  {accountId:"SYN-ACC-2601",debitCents:12100,creditCents:0},
  {accountId:"SYN-ACC-2200",debitCents:0,creditCents:67100},
 ],
 totalDebitCents:67100,totalCreditCents:67100,
 postingAllowed:false,mode:"synthetic-preview-only"
});
const reply=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>({data})});

test("demo preview accepts only a matching local loopback origin",()=>{
 assert.equal(syntheticJournalPreviewAvailable(base,origin),true);
 for(const [api,page] of [
  ["https://app.e-integrator.si/api","https://app.e-integrator.si"],
  [base,"https://app.e-integrator.si"],
  ["http://127.0.0.1:3010/api",origin],
  [origin+"/malicious",origin],
  ["",origin],
 ])assert.equal(syntheticJournalPreviewAvailable(api,page),false);
});

test("read-only GET revalidates tenant, cents and exact totals; never sends a body",async()=>{
 const requests=[];
 const client=createSyntheticJournalPreviewClient({
  base,origin,fetcher:async(url,init)=>{requests.push({url,init});return reply(200,draft())}
 });
 const result=await client.read(1,27);
 assert.equal(result.totalDebitCents,67100);
 assert.equal(result.totalCreditCents,67100);
 assert.equal(result.postingAllowed,false);
 assert.deepEqual(requests.map(x=>x.init.method),["GET"]);
 assert.deepEqual(requests.map(x=>x.url),[base+"/companies/1/demo/journal-previews/27"]);
 assert.equal(requests[0].init.credentials,"include");
 assert.equal(requests[0].init.cache,"no-store");
 assert.equal(Object.hasOwn(requests[0].init,"body"),false);
 await assert.rejects(client.read(0,27),/Neveljavna/);
 await assert.rejects(client.read(1,0),/Neveljavna/);
});

test("hostile, stale or foreign preview responses fail closed",async()=>{
 for(const invalid of [
  {...draft(),companyId:2},
  {...draft(),postingAllowed:true},
  {...draft(),reference:"REAL-INV-12"},
  {...draft(),totalDebitCents:67101},
  {...draft(),lines:[...draft().lines.slice(0,2),
   {accountId:"SYN-ACC-2200",debitCents:0,creditCents:67099}]},
  {...draft(),lines:[...draft().lines.slice(0,2),
   {accountId:"SYN-ACC-2200",debitCents:0,creditCents:67100,iban:"private"}],
   mode:"synthetic-server-posting"},
 ]) {
  const client=createSyntheticJournalPreviewClient({
   base,origin,fetcher:async()=>reply(200,invalid)
  });
  await assert.rejects(client.read(1,27));
 }
 for(const status of [401,403,404,409,500]) {
  const client=createSyntheticJournalPreviewClient({
   base,origin,fetcher:async()=>reply(status,null)
  });
  await assert.rejects(client.read(1,27));
 }
});

test("panel is conditional, clears old state and has no posting action",()=>{
 const panel=readFileSync(new URL("../app/next11/SyntheticJournalServerPanel.jsx",import.meta.url),"utf8");
 const shell=readFileSync(new URL("../app/page.jsx",import.meta.url),"utf8");
 assert.match(shell,/SyntheticJournalServerPanel key={company} companyId={company}/);
 assert.match(panel,/if\(!enabled\)return null/);
 assert.match(panel,/request\.current\+\+/);
 assert.match(panel,/\.read\(companyId,id\)/);
 assert.doesNotMatch(panel,/\bPOST\b|\bsetPosted\b/);
});
