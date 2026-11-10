"use client";
import {useEffect,useState} from "react";
import {DEFAULT_VIEW,normalizeView,viewStorageKey} from "../lib/workspacePersonalization.mjs";

export default function useAdaptiveWorkspace(companyId,moduleKey){
 const [view,setView]=useState(DEFAULT_VIEW);
 const [loadedKey,setLoadedKey]=useState(null);
 const key=viewStorageKey(companyId,moduleKey);
 useEffect(()=>{
   setLoadedKey(null);
   let next=DEFAULT_VIEW;
   try{const raw=window.localStorage.getItem(key);if(raw)next=normalizeView(JSON.parse(raw));}catch{}
   setView(next);
   setLoadedKey(key);
 },[key]);
 useEffect(()=>{
   if(loadedKey!==key)return;
   try{window.localStorage.setItem(key,JSON.stringify(normalizeView(view)));}catch{}
 },[key,loadedKey,view]);
 return {view,setView,ready:loadedKey===key};
}
