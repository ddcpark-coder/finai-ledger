import test from "node:test";
import assert from "node:assert/strict";
import {createDemoProject,addDemoProjectTask,logDemoProjectTime,demoProjectFinance}
  from "../app/projects/demoProjects.mjs";

test("synthetic projects are independently created, validated and scoped to company",()=>{
  const created=createDemoProject([],2,{name:"Projekt Demo",partner:"Sintetični kupec",revenue:1000});
  assert.equal(created.project.id,"SYN-PROJ-2-001");
  assert.equal(created.project.companyId,2);
  assert.equal(created.project.margin,1000);
  assert.equal(created.project.marginPct,100);
  assert.equal(created.project.cost,0);
  assert.throws(()=>createDemoProject(created.rows,1,{name:"Nov projekt",partner:"Kupec",revenue:100}),/drugega podjetja/);
  assert.throws(()=>createDemoProject([],2,{name:"X",partner:"Kupec",revenue:100}),/Naziv projekta/);
  assert.throws(()=>createDemoProject([],2,{name:"Veljavno",partner:"Kupec",revenue:-1}),/Prihodkovna/);
});

test("tasks cannot be created in a different company",()=>{
  const created=createDemoProject([],2,{name:"Projekt Demo",partner:"Sintetični kupec",revenue:1200});
  const result=addDemoProjectTask([],created.rows,2,created.project.id,"Priprava dokumentov");
  assert.equal(result.task.companyId,2);
  assert.equal(result.task.projectId,created.project.id);
  assert.equal(result.task.status,"Planirano");
  assert.throws(()=>addDemoProjectTask([],created.rows,1,created.project.id,"Tuja naloga"),/drugega podjetja/);
  assert.throws(()=>addDemoProjectTask([],created.rows,2,"SYN-PROJ-3-001","Tuja naloga"),/ne pripada/);
});

test("time input updates only selected project cost and profit, refuses invalid values",()=>{
  const created=createDemoProject([],1,{name:"Projekt Demo",partner:"Sintetični kupec",revenue:1000});
  const recorded=logDemoProjectTime(created.rows,1,created.project.id,2.5);
  assert.equal(recorded.rows[0].cost,100);
  assert.equal(recorded.rows[0].margin,900);
  assert.equal(recorded.rows[0].marginPct,90);
  assert.equal(recorded.event.hours,2.5);
  assert.equal(created.rows[0].cost,0);
  assert.throws(()=>logDemoProjectTime(created.rows,1,created.project.id,0),/Ure/);
  assert.throws(()=>logDemoProjectTime(created.rows,1,created.project.id,26),/Ure/);
  assert.throws(()=>logDemoProjectTime(created.rows,1,created.project.id,2.555),/Ure/);
  assert.throws(()=>logDemoProjectTime(created.rows,2,created.project.id,2),/drugega podjetja/);
  assert.equal(demoProjectFinance({revenue:0,cost:10}).marginPct,0);
});
