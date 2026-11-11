/* FinAI synthetic demo PWA shell cache — NOT offline accounting storage.
 * Never cache API, auth, user content, uploads, signed PDFs, or business records.
 * Enabled only by NEXT_PUBLIC_FINAI_DEMO_PWA_ENABLED=true in a protected build.
 */
const CACHE="finai-demo-shell-v1";
const PREFIX="finai-demo-shell-";
const STATIC_PREFIX="/_next/static/";
const STATIC_FILES=new Set(["/","/manifest.webmanifest","/finai-192.png","/finai-512.png"]);
const restrictedPath=path=>/^(?:\/api(?:\/|$)|\/sanctum(?:\/|$)|\/auth(?:\/|$)|\/login(?:\/|$)|\/admin(?:\/|$)|\/uploads(?:\/|$)|\/storage(?:\/|$)|\/files(?:\/|$)|\/documents(?:\/|$))/.test(path);

self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const response=await fetch("/",{cache:"reload"});
  if(!response.ok)throw new Error("FinAI shell cannot be cached.");
  await cache.put("/",response.clone());
  const html=await response.text();
  const paths=new Set([...STATIC_FILES]);
  for(const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)){
   const candidate=match[1].split("?")[0];
   if(candidate.startsWith(STATIC_PREFIX)&&!candidate.includes(".."))paths.add(candidate);
  }
  await Promise.all([...paths].map(async path=>{
   if(path==="/")return;
   try{
    const item=await fetch(path,{cache:"reload"});
    if(item.ok&&item.type==="basic")await cache.put(path,item);
   }catch{}
  }));
  await self.skipWaiting();
 })());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith(PREFIX)&&name!==CACHE)
    .map(name=>caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||restrictedPath(url.pathname))return;
 if(req.mode==="navigate"){
  event.respondWith(fetch(req).catch(async()=>{
   const shell=await caches.match("/");
   return shell??Response.error();
  }));
  return;
 }
 const staticAsset=url.pathname.startsWith(STATIC_PREFIX)||STATIC_FILES.has(url.pathname);
 if(!staticAsset)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const found=await cache.match(req,{ignoreSearch:true});
  if(found)return found;
  const response=await fetch(req);
  if(response.ok&&response.type==="basic")await cache.put(req,response.clone());
  return response;
 })());
});
