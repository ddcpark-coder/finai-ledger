import test from "node:test";
import assert from "node:assert/strict";
import {getModuleGuidance} from "../app/lib/moduleGuidance.mjs";
import {modules} from "../app/modules/moduleRegistry.js";

test("every registered module has beginner-friendly Slovenian guidance",()=>{
 for(const module of modules){
  const guide=getModuleGuidance(module.key);
  assert.ok(guide.title.length>6,module.key);
  assert.ok(guide.intro.length>12,module.key);
  assert.ok(guide.next.length>12,module.key);
  assert.match(guide.caution,/sintetičnimi podatki/);
 }
});
test("unknown module is safe and never describes live FURS or bank integrations",()=>{
 const guide=getModuleGuidance("__future__");
 assert.match(guide.caution,/ne izvaja resničnega knjiženja/);
 assert.match(getModuleGuidance("edavki").next,/ni aktivno/);
 assert.match(getModuleGuidance("banking").next,/Preveri sklic/);
});
