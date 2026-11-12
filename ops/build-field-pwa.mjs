// Build-time offline app-shell bundling for FinAI synthetic field route.
// The service worker never caches API, documents, IndexedDB values, or arbitrary pages.
import {readFile,writeFile,readdir,stat} from "node:fs/promises";
import {join,relative,resolve,sep} from "node:path";
import {createHash} from "node:crypto";

const root=resolve(process.cwd()),out=join(root,"out");
const manifest=await readFile(join(out,"manifest.webmanifest"),"utf8");
const parsed=JSON.parse(manifest);
if(parsed.start_url!=="/field/")throw Error("Offline PWA must start only in the synthetic field route.");
const fieldHtml=await readFile(join(out,"field","index.html"),"utf8");
if(!fieldHtml.includes("Dobavnica na terenu"))throw Error("Missing synthetic field shell.");
const assets=["/field/","/manifest.webmanifest","/finai-icon.svg"];
async function walk(path){
 const files=[];
 for(const item of await readdir(path,{withFileTypes:true})){
  const full=join(path,item.name);
  if(item.isDirectory())files.push(...await walk(full));
  else if(item.isFile()){
   const suffix=item.name.split(".").at(-1);
   if(["js","css","woff","woff2"].includes(suffix))files.push(full);
  }
 }
 return files;
}
for(const folder of ["_next/static","fonts"]){
 let files;
 try{files=await walk(join(out,folder))}catch{if(folder==="fonts")throw Error("Missing offline PDF fonts");throw Error("Missing build assets")}
 for(const path of files){
  const name="/"+relative(out,path).split(sep).join("/");
  assets.push(name);
 }
}
const unique=[...new Set(assets)].sort();
let totalBytes=0;
for(const route of unique){
 const path=route==="/field/"?join(out,"field","index.html"):join(out,route.slice(1));
 const data=await readFile(path);
 totalBytes+=data.byteLength;
}
if(totalBytes>28*1024*1024)throw Error("Synthetic offline precache exceeds 28 MiB cap.");
const revision=createHash("sha256").update(JSON.stringify(unique))
 .update(fieldHtml).digest("hex").slice(0,16);
const worker=`/* FinAI field-demo shell. Public static assets ONLY; no business data or API caching. */
const CACHE="finai-field-demo-${revision}";
const ASSETS=${JSON.stringify(unique)};
const ALLOWED=new Set(ASSETS);
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(ASSETS);
  await self.skipWaiting();
 })());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys()){
   if(key.startsWith("finai-field-demo-")&&key!==CACHE)await caches.delete(key);
  }
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET"||request.credentials==="include"&&request.headers.get("authorization"))return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 const key=url.pathname==="/field/"||url.pathname==="/field/index.html"?"/field/":url.pathname;
 if(!ALLOWED.has(key))return; // NEVER intercept /api, auth, private documents or general pages
 if(request.mode==="navigate"&&key!=="/field/")return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const fromCache=await cache.match(key);
  if(fromCache)return fromCache;
  const response=await fetch(request);
  // No runtime caching; static assets are only populated during install.
  return response;
 })());
});
`;
await writeFile(join(out,"sw.js"),worker);
console.log("FINAI_SYNTHETIC_FIELD_PWA_PRECACHE=PASS assets="+unique.length+" bytes="+totalBytes);
