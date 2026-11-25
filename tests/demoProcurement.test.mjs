import test from "node:test";
import assert from "node:assert/strict";
import {createDemoPurchaseOrder,receiveDemoPurchaseOrder,demoPurchaseMatch}
  from "../app/procurement/demoProcurement.mjs";

test("synthetic purchase order creation is validated and company scoped",()=>{
  const result=createDemoPurchaseOrder([],3,{supplier:"Demo Material",gross:129.456});
  assert.equal(result.order.companyId,3);
  assert.equal(result.order.id,"SYN-PO-3-001");
  assert.equal(result.order.gross,129.46);
  assert.equal(result.order.status,"Naročeno");
  assert.throws(()=>createDemoPurchaseOrder(result.rows,2,{supplier:"Tuji",gross:10}),/drugih podjetij/);
  assert.throws(()=>createDemoPurchaseOrder([],1,{supplier:"A",gross:10}),/dobavitelja/);
  assert.throws(()=>createDemoPurchaseOrder([],1,{supplier:"Primer",gross:-12}),/znesek/);
});

test("synthetic receipt is monotonic and cannot cross company",()=>{
  const first=createDemoPurchaseOrder([],1,{supplier:"Demo Dobavitelj",gross:123});
  const received=receiveDemoPurchaseOrder(first.rows,1,first.order.id);
  assert.equal(received[0].status,"Prejeto");
  assert.equal(received[0].match,"Čaka račun");
  assert.equal(received[0].receiptCount,1);
  assert.equal(first.rows[0].status,"Naročeno");
  assert.throws(()=>receiveDemoPurchaseOrder(received,1,first.order.id),/ni več mogoč/);
  assert.throws(()=>receiveDemoPurchaseOrder(received,2,first.order.id),/drugih podjetij/);
  assert.match(demoPurchaseMatch(received[0]),/račun dobavitelja/);
  assert.match(demoPurchaseMatch(first.order),/Čaka prevzem/);
});
