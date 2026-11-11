import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import createManifest from "../app/manifest.js";

const manifest=createManifest();
const worker=readFileSync("public/sw-finai-demo.js","utf8");
test("PWA manifest names synthetic demo only and includes icons",()=>{
 assert.equal(manifest.display,"standalone");
 assert.equal(manifest.scope,"/");
 assert.match(manifest.name,/demonstracija/);
 assert.ok(manifest.icons.some(x=>x.sizes==="192x192"));
 assert.ok(manifest.icons.some(x=>x.sizes==="512x512"));
});
test("service worker caches static shell only; never stores API, auth, file uploads",()=>{
 assert.match(worker,/req\.method!=="GET"/);
 assert.match(worker,/STATIC_PREFIX="\/_next\/static\/"/);
 for(const deny of ["api","sanctum","auth","storage","uploads","documents"]){
  assert.ok(worker.includes(deny),deny+" must be excluded from interception");
 }
 assert.match(worker,/url\.origin!==self\.location\.origin/);
 assert.match(worker,/restrictedPath\(url\.pathname\)/);
 assert.ok(!worker.includes("POST"));
});
