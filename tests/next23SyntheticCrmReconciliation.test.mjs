import test from "node:test";
import assert from "node:assert/strict";
import {
 demoCrmPipeline,advanceDemoOpportunity
} from "../app/next11/demoBusinessModel.mjs";
import {
 planSyntheticCrmReconciliation,applySyntheticCrmAdvance
} from "../app/next11/syntheticCrmReconciliation.mjs";
import {
 readDemoCompany,changeDemoCompany,resetDemoCompanyDomain
} from "../app/next11/sharedDemoCompany.mjs";

function fixture(companyId=1){return demoCrmPipeline(companyId)}
function forward(list,companyId=1){
 const first=list[0];
 return advanceDemoOpportunity(list,companyId,first.id,"Odkrivanje",first.version);
}
function plan(local,remote,options){
 return planSyntheticCrmReconciliation(1,local,remote,options);
}
test("manual initial CRM read is an exact no-op and retains immutable company data",()=>{
 const local=fixture(),before=structuredClone(local);
 const result=plan(local,structuredClone(local));
 assert.equal(result.changed,false);
 assert.equal(result.deals,local);
 assert.deepEqual(local,before);
});

test("manual refresh fast-forwards only verified server version and recomputes CRM probability",()=>{
 const current=fixture();
 const remote=forward(fixture());
 const outcome=plan(current,remote);
 assert.equal(outcome.changed,true);
 assert.equal(outcome.deals[0].stage,"Odkrivanje");
 assert.equal(outcome.deals[0].version,2);
 assert.equal(outcome.deals[0].probability,30);
 assert.equal(current[0].stage,"Kvalifikacija");
 const replay=plan(outcome.deals,remote,{accepted:remote});
 assert.equal(replay.changed,false);
 const remoteAgain=advanceDemoOpportunity(
  remote,1,remote[0].id,"Ponudba",2
 );
 const future=plan(outcome.deals,remoteAgain,{accepted:remote});
 assert.equal(future.deals[0].stage,"Ponudba");
 assert.equal(future.deals[0].version,3);
});

test("server rollback, same-version stage divergence and impossible jumps fail closed",()=>{
 const current=fixture(),remote=forward(fixture());
 assert.throws(()=>plan(remote,current,{accepted:remote}),/starejšo/);
 assert.throws(()=>plan(current,[
  {...current[0],stage:"Odkrivanje"},...current.slice(1)
 ]),/neskladna/);
 assert.throws(()=>plan(current,[
  {...current[0],stage:"Ponudba",version:2},...current.slice(1)
 ]),/neskladna/);
 assert.throws(()=>plan(current,[
  {...current[0],stage:"Odkrivanje",version:3},...current.slice(1)
 ]),/neskladna/);
});

test("unacknowledged local edit cannot be lost by a later server read",()=>{
 const base=fixture(),local=forward(fixture());
 const remote=advanceDemoOpportunity(
  forward(fixture()),1,base[0].id,"Ponudba",2
 );
 assert.throws(()=>plan(local,remote,{accepted:base}),/Konflikt/);
 assert.throws(()=>plan(local,base),/Konflikt/);
 // No-op is allowed if local and remote already agree (e.g., remounted tab).
 assert.equal(plan(local,local).changed,false);
});

test("wrong tenant, mismatched immutable deal fields, duplicates and missing rows reject full merge",()=>{
 const local=fixture();
 for(const invalid of [
  fixture(2),local.slice(0,2),[...local,local[0]],
  [{...local[0],companyId:2},...local.slice(1)],
  [{...local[0],valueCents:1},...local.slice(1)],
  [{...local[0],unitId:"PE-02"},...local.slice(1)],
  [{...local[0],id:"REAL-1"},...local.slice(1)],
  [{...local[0],version:0},...local.slice(1)],
 ]){
  assert.throws(()=>plan(local,invalid));
 }
 assert.throws(()=>plan(local,local,{accepted:fixture(2)}));
});

test("optimistic local commit checks fresh version after asynchronous server acknowledgement",()=>{
 const current=fixture(),submitted=current[0];
 const ack={...submitted,stage:"Odkrivanje",version:2};
 const next=applySyntheticCrmAdvance(1,current,submitted,ack,"Odkrivanje");
 assert.equal(next[0].stage,"Odkrivanje");
 assert.equal(next[0].probability,30);
 assert.equal(next[0].version,2);
 assert.equal(current[0].version,1);
 for(const invalid of [
  {...ack,companyId:2},
  {...ack,version:1},
  {...ack,version:3},
  {...ack,stage:"Ponudba"},
  {...ack,valueCents:1}
 ])assert.throws(()=>applySyntheticCrmAdvance(
  1,current,submitted,invalid,"Odkrivanje"
 ));
 assert.throws(()=>applySyntheticCrmAdvance(1,next,submitted,ack,"Odkrivanje"),
  /med odgovorom/);
 assert.throws(()=>applySyntheticCrmAdvance(2,current,submitted,ack,"Odkrivanje"));
});

test("two concurrent local CRM changes and unrelated operations never allow a stale server overwrite",()=>{
 resetDemoCompanyDomain(1,"crm");
 resetDemoCompanyDomain(1,"operations");
 const submitted=readDemoCompany(1).deals[0];
 const ack={...submitted,stage:"Odkrivanje",version:2};
 const previousOperations=readDemoCompany(1).operations;
 changeDemoCompany(1,"crm",snapshot=>({
  deals:advanceDemoOpportunity(snapshot.deals,1,submitted.id,"Odkrivanje",1),
  activities:snapshot.activities
 }));
 const stale=readDemoCompany(1);
 assert.throws(()=>changeDemoCompany(1,"crm",snapshot=>({
  deals:applySyntheticCrmAdvance(1,snapshot.deals,submitted,ack,"Odkrivanje"),
  activities:snapshot.activities
 })),/med odgovorom/);
 assert.equal(readDemoCompany(1),stale);
 assert.equal(readDemoCompany(1).operations,previousOperations);
 // The second company's unchanged fixtures and state remain isolated.
 assert.equal(readDemoCompany(2).companyId,2);
 resetDemoCompanyDomain(1,"crm");
});
