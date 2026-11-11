import test from "node:test";
import assert from "node:assert/strict";
import {
 listDemoTasks,taskSessionKey,normalizeCompletedTasks,
 toggleCompletedDemoTask,demoTaskRoute,dueDescription
} from "../app/tasks/demoTaskCenter.mjs";

test("company-scoped queue never returns foreign business tasks",()=>{
 const a=listDemoTasks(1),b=listDemoTasks(2),c=listDemoTasks(3);
 assert.equal(a.length,4);assert.equal(b.length,2);assert.equal(c.length,1);
 assert.ok(a.every(x=>x.companyId===1));
 assert.ok(b.every(x=>x.companyId===2));
 assert.notEqual(taskSessionKey(1),taskSessionKey(2));
 assert.throws(()=>listDemoTasks(4));
});
test("urgency, today, week, overdue, done and search filters are deterministic",()=>{
 assert.equal(listDemoTasks(1,{scope:"overdue"}).length,1);
 assert.equal(listDemoTasks(1,{scope:"today"}).length,1);
 assert.equal(listDemoTasks(1,{scope:"week"}).length,3);
 assert.equal(listDemoTasks(1,{query:"dobavnico"}).length,1);
 assert.equal(listDemoTasks(1,{scope:"done"}).length,0);
 assert.equal(listDemoTasks(1)[0].dueDays,-2);
 assert.throws(()=>listDemoTasks(1,{scope:"future"}));
 assert.equal(dueDescription(0),"Danes (demo)");
});
test("marking tasks complete is reversible and cannot affect another company",()=>{
 const next=toggleCompletedDemoTask(1,[],"A-IN-01");
 assert.deepEqual(next,["A-IN-01"]);
 assert.equal(listDemoTasks(1,{completed:next}).length,3);
 assert.equal(listDemoTasks(1,{completed:next,scope:"done"}).length,1);
 assert.equal(listDemoTasks(2,{completed:next,scope:"done"}).length,0);
 assert.deepEqual(toggleCompletedDemoTask(1,next,"A-IN-01"),[]);
 assert.throws(()=>toggleCompletedDemoTask(2,[],"A-IN-01"));
});
test("session values and links are strictly constrained to known synthetic tasks",()=>{
 assert.deepEqual(normalizeCompletedTasks(1,["A-IN-01","B-DOC-01","A-IN-01"]),["A-IN-01"]);
 const task=listDemoTasks(1,{scope:"all"})[0];
 const url=demoTaskRoute(task);
 assert.ok(url.startsWith("/?module="));
 assert.equal(new URL(url,"https://finai.invalid").searchParams.get("module"),task.module);
 assert.throws(()=>demoTaskRoute({...task,view:"<script>alert(1)</script>"}));
 assert.deepEqual(normalizeCompletedTasks(1,{}),[]);
});
