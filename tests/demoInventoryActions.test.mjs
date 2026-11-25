import test from "node:test";
import assert from "node:assert/strict";
import {reserveDemoStock,transferDemoStock,adjustDemoStock,refreshDemoStock}
  from "../app/inventory/demoInventoryActions.mjs";

const seed=()=>[{companyId:2,sku:"SYN-100",name:"Sintetični material",wh:"Glavno",
  loc:"A-1",on:10,res:3,avail:7,incoming:0,min:5,status:"OK"}];

test("reservation updates available stock without changing physical stock",()=>{
  const rows=seed(),updated=reserveDemoStock(rows,2,rows[0],4);
  assert.equal(updated[0].on,10);
  assert.equal(updated[0].res,7);
  assert.equal(updated[0].avail,3);
  assert.equal(updated[0].status,"Nizka zaloga");
  assert.equal(rows[0].res,3);
  assert.throws(()=>reserveDemoStock(updated,2,updated[0],4),/presega/);
  assert.throws(()=>reserveDemoStock(rows,1,rows[0],1),/drugih podjetij/);
});

test("transfer preserves total stock, leaves reserved amount and prohibits same warehouse",()=>{
  const rows=seed(),next=transferDemoStock(rows,2,rows[0],"Material",6);
  assert.equal(next.length,2);
  assert.equal(next[0].on,4);
  assert.equal(next[0].res,3);
  assert.equal(next[0].avail,1);
  assert.equal(next[1].on,6);
  assert.equal(next[1].res,0);
  assert.equal(next.reduce((sum,x)=>sum+x.on,0),10);
  const back=transferDemoStock(next,2,next[1],"Glavno",2);
  assert.equal(back.reduce((sum,x)=>sum+x.on,0),10);
  assert.throws(()=>transferDemoStock(rows,2,rows[0],"Glavno",1),/ciljno/);
  assert.throws(()=>transferDemoStock(rows,2,rows[0],"Material",8),/presega/);
});

test("adjustment refuses negative availability and invalid quantities",()=>{
  const rows=seed();
  const next=adjustDemoStock(rows,2,rows[0],-7);
  assert.equal(next[0].on,3);
  assert.equal(next[0].avail,0);
  assert.equal(next[0].status,"Kritično");
  assert.throws(()=>adjustDemoStock(rows,2,rows[0],-8),/negativno/);
  assert.throws(()=>adjustDemoStock(rows,2,rows[0],0),/dovoljen/);
  assert.throws(()=>reserveDemoStock(rows,2,rows[0],0.0001),/tri decimalke/);
  assert.equal(refreshDemoStock(rows[0]).avail,7);
});
