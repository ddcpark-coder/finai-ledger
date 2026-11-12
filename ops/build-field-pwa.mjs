// Build-time offline app-shell bundling for FinAI synthetic field route.
// The service worker never caches API, documents, IndexedDB values, or arbitrary pages.
import {readFile,writeFile,readdir,stat} from "node:fs/promises";
import {join,relative,resolve,sep} from "node:path";
import {createHash} from "node:crypto";
import {deflateSync} from "node:zlib";

// Generate two simple first-party PWA icon PNGs without remote assets or
// new runtime dependencies; preserve transparent-free opaque image pixels.
function crc32(data){
 let crc=0xffffffff;
 for(const byte of data){crc^=byte;for(let k=0;k<8;k++)
   crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}
 return (crc^0xffffffff)>>>0;
}
function chunk(type,data){
 const tag=Buffer.from(type);
 const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
 const sum=Buffer.alloc(4);sum.writeUInt32BE(crc32(Buffer.concat([tag,data])));
 return Buffer.concat([len,tag,data,sum]);
}
function icon(size){
 const rowBytes=size*4+1,raw=Buffer.alloc(rowBytes*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const center=size/2,dx=x-center,dy=y-center;
  const border=32/192*size,rad=20/192*size;
  const inPaper=x>border&&x<size-border&&y>border&&y<size-border;
  const round=(Math.max(border+rad-x,0)**2+Math.max(border+rad-y,0)**2<=rad**2)&&
      (Math.max(x-(size-border-rad),0)**2+Math.max(border+rad-y,0)**2<=rad**2)&&
      (Math.max(border+rad-x,0)**2+Math.max(y-(size-border-rad),0)**2<=rad**2)&&
      (Math.max(x-(size-border-rad),0)**2+Math.max(y-(size-border-rad),0)**2<=rad**2);
  const page=inPaper&&round;
  const line1=page&&y>size*.38&&y<size*.43&&x>size*.32&&x<size*.67;
  const line2=page&&y>size*.53&&y<size*.58&&x>size*.32&&x<size*.57;
  const mark=(dx-size*.19)**2+(dy-size*.20)**2<(size*.13)**2;
  const check=mark&&((x-y>size*.02&&x-y<size*.07)||(x+y>size*1.31&&x+y<size*1.36));
  const color=check?[7,32,45]:mark?[117,226,203]:(line1||line2)?[240,250,247]:page?[24,67,87]:[9,32,52];
  const offset=y*rowBytes+1+x*4;
  raw[offset]=color[0];raw[offset+1]=color[1];raw[offset+2]=color[2];raw[offset+3]=255;
 }
 const header=Buffer.alloc(13);
 header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);
 header[8]=8;header[9]=6; // RGBA
 return Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk("IHDR",header),chunk("IDAT",deflateSync(raw)),chunk("IEND",Buffer.alloc(0))
 ]);
}


const root=resolve(process.cwd()),out=join(root,"out");
const manifest=await readFile(join(out,"manifest.webmanifest"),"utf8");
const parsed=JSON.parse(manifest);
if(parsed.start_url!=="/field/")throw Error("Offline PWA must start only in the synthetic field route.");
const fieldHtml=await readFile(join(out,"field","index.html"),"utf8");
if(!fieldHtml.includes("Dobavnica na terenu"))throw Error("Missing synthetic field shell.");
for(const size of [192,512]){
 await writeFile(join(out,"finai-pwa-"+size+".png"),icon(size));
}
const assets=["/field/","/manifest.webmanifest","/finai-icon.svg",
 "/finai-pwa-192.png","/finai-pwa-512.png"];
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
