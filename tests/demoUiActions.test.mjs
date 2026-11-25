import test from "node:test";
import assert from "node:assert/strict";
import {findDemoModules,filterDemoRows,demoRowsToCsv} from "../app/lib/demoUiActions.mjs";

test("full module command search works for every module",()=>{
  const nav=[["CRM","◉"],["Izdani računi","▧"],["Nabava","◈"],["Projekti","▱"]];
  assert.deepEqual(findDemoModules(nav,"PROJEKTI"),[["Projekti","▱"]]);
  assert.equal(findDemoModules(nav,"").length,4);
  assert.equal(findDemoModules(nav,"ni modul").length,0);
});

test("dashboard filtering combines free text and status",()=>{
  const rows=[["A","ACME",12,"Danes","Novo"],["B","Gamma",5,"Danes","Zaključeno"],["C","ACME",9,"Včeraj","Novo"]];
  assert.deepEqual(filterDemoRows(rows,"acme","Novo"),[rows[0],rows[2]]);
  assert.deepEqual(filterDemoRows(rows,"","Zaključeno"),[rows[1]]);
});

test("CSV exports semicolons, escapes quotes, prevents formula execution and includes BOM",()=>{
  const csv=demoRowsToCsv(["Postavka","Vrednost"],[["=1+2",'Alpha;"Beta"'],["@SUM(1)","12,50"]]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\'=1+2";"Alpha;""Beta"""'));
  assert.ok(csv.includes('"\'@SUM(1)";"12,50"'));
  assert.ok(csv.endsWith("\r\n"));
});
