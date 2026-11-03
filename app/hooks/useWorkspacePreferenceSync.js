"use client";

import {useEffect,useRef,useState} from "react";
import {readContextRoute,sanitizeFavoriteRoutes} from "../modules/contextRoute.mjs";
import {
  workspaceApiConfigured,fetchWorkspacePreferences,saveWorkspacePreferences
} from "../lib/workspacePreferenceGateway";

const appearanceStorageKey=company=>`finai:appearance:demo-user:company-${company}`;

export function useLocalWorkspaceAppearance(company){
  const [light,setLight]=useState(false);
  const [compact,setCompact]=useState(false);
  const [appearanceReady,setAppearanceReady]=useState(false);

  useEffect(()=>{
    setAppearanceReady(false);
    try{
      const stored=JSON.parse(window.localStorage.getItem(appearanceStorageKey(company))??"null");
      setLight(stored?.theme==="light");
      setCompact(stored?.density==="compact");
    }catch{
      setLight(false);
      setCompact(false);
    }
    setAppearanceReady(true);
  },[company]);

  useEffect(()=>{
    if(!appearanceReady)return;
    try{
      window.localStorage.setItem(appearanceStorageKey(company),JSON.stringify({
        theme:light?"light":"dark",
        density:compact?"compact":"comfortable"
      }));
    }catch{}
  },[company,appearanceReady,light,compact]);

  return {light,setLight,compact,setCompact,appearanceReady};
}

export default function useWorkspacePreferenceSync({
  company,activeRoute,favorites,hydrateServerPreferences,
  light,setLight,compact,setCompact,appearanceReady,hasExternalLink
}){
  const [syncStatus,setSyncStatus]=useState(workspaceApiConfigured()?"connecting":"local");
  const [syncMessage,setSyncMessage]=useState("");
  const session=useRef({company:null,version:0,lastHash:null});
  const companyRef=useRef(company);
  const initialCompany=useRef(company);

  const payload={
    last_route:{module:activeRoute.module,view:activeRoute.view,subview:activeRoute.subview},
    favorites:sanitizeFavoriteRoutes(favorites).map(x=>({
      module:x.module,view:x.view,subview:x.subview
    })),
    appearance:{theme:light?"light":"dark",density:compact?"compact":"comfortable"}
  };
  const payloadHash=JSON.stringify(payload);

  useEffect(()=>{
    if(!workspaceApiConfigured()){
      setSyncStatus("local");
      return;
    }
    const controller=new AbortController();
    const switching=initialCompany.current!==company;
    companyRef.current=company;
    setSyncStatus("connecting");
    setSyncMessage("");
    (async()=>{
      try{
        const result=await fetchWorkspacePreferences(company,controller.signal);
        if(controller.signal.aborted||companyRef.current!==company)return;
        const canRestoreRoute=switching||!hasExternalLink;
        hydrateServerPreferences(result,{restoreRoute:canRestoreRoute});
        if(result.version>0){
          setLight(result.appearance.theme==="light");
          setCompact(result.appearance.density==="compact");
        }
        session.current={
          company,version:result.version,
          // A newly linked account should upload existing local settings.
          lastHash:result.version>0?JSON.stringify({
            last_route:result.last_route?{
              module:result.last_route.module,view:result.last_route.view,subview:result.last_route.subview
            }:null,
            favorites:result.favorites.map(x=>({module:x.module,view:x.view,subview:x.subview})),
            appearance:result.appearance
          }):null
        };
        setSyncStatus("synced");
      }catch(error){
        if(controller.signal.aborted||companyRef.current!==company)return;
        setSyncStatus(error?.status===401||error?.status===403?"blocked":"offline");
        setSyncMessage(error?.status===401||error?.status===403
          ?"Sinhronizacija zahteva prijavo in dovoljenje za podjetje."
          :"Sinhronizacija trenutno ni dosegljiva. Nastavitve ostajajo v brskalniku.");
      }
    })();
    initialCompany.current=company;
    return ()=>controller.abort();
  // Deliberately reload only on company change; other state is persisted separately.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[company]);

  useEffect(()=>{
    if(!workspaceApiConfigured()||syncStatus!=="synced"||!appearanceReady)return;
    if(session.current.company!==company||session.current.lastHash===payloadHash)return;
    const timer=setTimeout(async()=>{
      if(session.current.company!==company)return;
      const controller=new AbortController();
      setSyncStatus("saving");
      try{
        const result=await saveWorkspacePreferences(company,{
          ...payload,expected_version:session.current.version
        },controller.signal);
        if(companyRef.current!==company)return;
        session.current={company,version:result.version,lastHash:payloadHash};
        setSyncStatus("synced");
        setSyncMessage("");
      }catch(error){
        if(companyRef.current!==company)return;
        setSyncStatus(error?.status===409?"conflict":
          error?.status===401||error?.status===403?"blocked":"offline");
        setSyncMessage(error?.status===409
          ?"Nastavitve so bile spremenjene v drugi seji. Lokalna izbira je ohranjena."
          :"Shranjevanje na strežnik ni uspelo; lokalna izbira ostaja shranjena.");
      }
    },650);
    return ()=>clearTimeout(timer);
  // payloadHash is stable when settings are unchanged.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[company,syncStatus,appearanceReady,payloadHash]);

  return {syncStatus,syncMessage};
}
