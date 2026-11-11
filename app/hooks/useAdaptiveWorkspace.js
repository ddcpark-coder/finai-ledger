"use client";
import {useEffect,useRef,useState} from "react";
import {DEFAULT_VIEW,normalizeView,viewStorageKey} from "../lib/workspacePersonalization.mjs";
import {
 adaptiveApiConfigured,fetchAdaptiveView,saveAdaptiveView
} from "../lib/adaptiveViewGateway";

export default function useAdaptiveWorkspace(companyId,moduleKey,viewKey){
 const [view,setView]=useState(DEFAULT_VIEW);
 const [loadedKey,setLoadedKey]=useState(null);
 const [syncStatus,setSyncStatus]=useState(adaptiveApiConfigured()?"connecting":"local");
 const [syncMessage,setSyncMessage]=useState("");
 const key=viewStorageKey(companyId,moduleKey,viewKey);
 const keyRef=useRef(key);
 const remote=useRef({key:null,version:0,lastHash:null});
 const activeSaves=useRef(new Set());
 keyRef.current=key;

 useEffect(()=>{
   let mounted=true;
   const controller=new AbortController();
   let saved=DEFAULT_VIEW;
   try{
     const value=window.localStorage.getItem(key);
     if(value)saved=normalizeView(JSON.parse(value));
   }catch{}
   setLoadedKey(null);
   setView(saved);
   setSyncMessage("");

   if(!adaptiveApiConfigured()){
     setSyncStatus("local");setLoadedKey(key);
     return ()=>{mounted=false};
   }

   setSyncStatus("connecting");
   (async()=>{
     try{
       const result=await fetchAdaptiveView(companyId,moduleKey,viewKey,controller.signal);
       if(!mounted||keyRef.current!==key)return;
       const existing=result.version>0&&result.settings
         ?normalizeView(result.settings):null;
       if(existing)setView(existing);
       const next=existing??saved;
       remote.current={
         key,version:result.version,
         // Import previous browser settings for a first-time server profile.
         lastHash:existing?JSON.stringify(existing):
           JSON.stringify(saved)===JSON.stringify(DEFAULT_VIEW)?JSON.stringify(saved):null
       };
       setSyncStatus("synced");
       setLoadedKey(key);
     }catch(error){
       if(!mounted||controller.signal.aborted||keyRef.current!==key)return;
       setSyncStatus(error?.status===401||error?.status===403?"blocked":"offline");
       setSyncMessage(error?.status===401||error?.status===403
         ?"Za sinhronizacijo je potrebna prijava in dostop do podjetja."
         :"Strežnik ni dosegljiv. Nastavitve ostanejo v tem brskalniku.");
       setLoadedKey(key);
     }
   })();
   return ()=>{mounted=false;controller.abort()};
 },[key,companyId,moduleKey,viewKey]);

 useEffect(()=>{
   if(loadedKey!==key)return;
   try{
     window.localStorage.setItem(key,JSON.stringify(normalizeView(view)));
   }catch{}
 },[key,loadedKey,view]);

 useEffect(()=>{
   if(!adaptiveApiConfigured()||loadedKey!==key||syncStatus!=="synced")return;
   if(remote.current.key!==key)return;
   const payload=normalizeView(view);
   const hash=JSON.stringify(payload);
   if(remote.current.lastHash===hash||activeSaves.current.has(key))return;
   const timer=setTimeout(async()=>{
     if(keyRef.current!==key||activeSaves.current.has(key))return;
     activeSaves.current.add(key);
     setSyncStatus("saving");
     try{
       const result=await saveAdaptiveView(
         companyId,moduleKey,viewKey,payload,remote.current.version
       );
       if(keyRef.current!==key)return;
       remote.current={key,version:result.version,lastHash:hash};
       setSyncMessage("");
       setSyncStatus("synced");
     }catch(error){
       if(keyRef.current!==key)return;
       setSyncStatus(error?.status===409?"conflict":
         error?.status===401||error?.status===403?"blocked":"offline");
       setSyncMessage(error?.status===409
         ?"Nastavitve je spremenila druga seja. Lokalna izbira je ohranjena; osveži pogled za uskladitev."
         :"Shranjevanje ni uspelo; nastavitev je ohranjena v tem brskalniku.");
     }finally{
       activeSaves.current.delete(key);
     }
   },650);
   return ()=>clearTimeout(timer);
 },[key,loadedKey,view,syncStatus,companyId,moduleKey,viewKey]);

 return {
   view,setView,ready:loadedKey===key&&syncStatus!=="connecting",
   syncStatus,syncMessage
 };
}
