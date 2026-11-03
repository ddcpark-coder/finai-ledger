import test from "node:test";
import assert from "node:assert/strict";
import {defaultContextRoute,normalizeContextRoute,readContextRoute,buildContextPath,routeIdentity,sanitizeFavoriteRoutes,MAX_FAVORITES} from "../app/modules/contextRoute.mjs";

test("default route points to dashboard",()=>{
  assert.deepEqual(defaultContextRoute(),{
    module:"dashboard",moduleLabel:"Nadzorna plošča",view:"Pregled",subview:"Moj pregled"
  });
});

test("unicode deep link resolves the correct three levels",()=>{
  const result=readContextRoute("?module=vat&view=DDV+evidence&subview=Izhodni+DDV");
  assert.equal(result.moduleLabel,"DDV in poročila");
  assert.equal(result.view,"DDV evidence");
  assert.equal(result.subview,"Izhodni DDV");
});

test("invalid module does not resolve to an unrelated route",()=>{
  assert.equal(readContextRoute("?module=not-registered&view=Whatever"),null);
  assert.equal(normalizeContextRoute({module:"unknown"}),null);
});

test("invalid subview resets to its parent default",()=>{
  const result=readContextRoute("?module=inventory&view=Premiki&subview=NotReal");
  assert.equal(result.module,"inventory");
  assert.equal(result.view,"Premiki");
  assert.equal(result.subview,"Prevzemi");
});

test("link path retains hash and unrelated query fields",()=>{
  const route=normalizeContextRoute({module:"projects",view:"Finance",subview:"Marža"});
  const path=buildContextPath("https://example.test/?origin=help#report",route);
  const parsed=new URL(path,"https://example.test");
  assert.equal(parsed.searchParams.get("origin"),"help");
  assert.equal(parsed.searchParams.get("module"),"projects");
  assert.equal(parsed.searchParams.get("view"),"Finance");
  assert.equal(parsed.searchParams.get("subview"),"Marža");
  assert.equal(parsed.hash,"#report");
});

test("favorites stay deduplicated and reject invalid entries",()=>{
  const base={module:"vat",view:"DDV-O",subview:"Izračun"};
  const input=[base,base,{module:"invalid",view:"DDV-O",subview:"Izračun"},{module:"banking",view:"Usklajevanje",subview:"Neusklajeno"}];
  const result=sanitizeFavoriteRoutes(input);
  assert.equal(result.length,2);
  assert.equal(routeIdentity(result[0]),routeIdentity(base));
});

test("favorites are capped to eight views",()=>{
  const input=[
    ["dashboard","Pregled","Moj pregled"],["dashboard","Pregled","KPI"],
    ["vat","DDV-O","Izračun"],["vat","DDV evidence","Izhodni DDV"],
    ["inventory","Premiki","Prenosi"],["inventory","Stanje","Na poti"],
    ["projects","Finance","Marža"],["projects","Naloge","Moje"],
    ["quotes","Pregled","Vse"]
  ].map(([module,view,subview])=>({module,view,subview}));
  assert.equal(sanitizeFavoriteRoutes(input).length,MAX_FAVORITES);
});
