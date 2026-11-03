"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {
  buildContextPath,defaultContextRoute,normalizeContextRoute,
  readContextRoute,routeIdentity,sanitizeFavoriteRoutes,MAX_FAVORITES
} from "../modules/contextRoute.mjs";

const localKey=(company,kind)=>`finai:context:demo-user:company-${company}:${kind}`;

function loadFavorites(company){
  try{return sanitizeFavoriteRoutes(JSON.parse(window.localStorage.getItem(localKey(company,"favorites"))??"[]"));}
  catch{return [];}
}
function loadLastRoute(company){
  try{
    const raw=JSON.parse(window.localStorage.getItem(localKey(company,"last"))??"null");
    return raw && typeof raw.module==="string"?normalizeContextRoute(raw):null;
  }catch{return null;}
}
function saveLastRoute(company,route){
  try{window.localStorage.setItem(localKey(company,"last"),JSON.stringify({
    module:route.module,view:route.view,subview:route.subview
  }));}catch{}
}
function saveFavorites(company,routes){
  try{window.localStorage.setItem(localKey(company,"favorites"),JSON.stringify(routes));}catch{}
}

export default function useContextNavigation(company){
  const initial=defaultContextRoute();
  const [section,setSection]=useState(initial.moduleLabel);
  const [contextLevel2,setContextLevel2]=useState(initial.view);
  const [contextLevel3,setContextLevel3]=useState(initial.subview);
  const [favorites,setFavorites]=useState([]);
  const [navNotice,setNavNotice]=useState("");
  const previousCompany=useRef(company);
  const initialExternalLink=useRef(
    typeof window!=="undefined"&&new URLSearchParams(window.location.search).has("module")
  );

  const activeRoute=useMemo(()=>normalizeContextRoute({
    moduleLabel:section,view:contextLevel2,subview:contextLevel3
  })??defaultContextRoute(),[section,contextLevel2,contextLevel3]);

  const applySelection=useCallback(route=>{
    setSection(route.moduleLabel);
    setContextLevel2(route.view);
    setContextLevel3(route.subview);
    setNavNotice("");
  },[]);

  const navigateTo=useCallback((request,options={})=>{
    const route=normalizeContextRoute(request);
    if(!route) return;
    applySelection(route);
    if(typeof window!=="undefined"){
      const path=buildContextPath(window.location.href,route);
      const current=window.location.pathname+window.location.search+window.location.hash;
      if(current!==path){
        // Preserve Next.js history metadata to avoid breaking App Router back navigation.
        window.history[options.replace?"replaceState":"pushState"](window.history.state,"",path);
      }
      saveLastRoute(options.companyId??company,route);
    }
  },[applySelection,company]);

  useEffect(()=>{
    const explicit=readContextRoute(window.location.search);
    const restored=explicit??loadLastRoute(company)??defaultContextRoute();
    applySelection(restored);
    setFavorites(loadFavorites(company));
    if(!explicit){
      const path=buildContextPath(window.location.href,restored);
      if(path!==window.location.pathname+window.location.search+window.location.hash){
        window.history.replaceState(window.history.state,"",path);
      }
    }
    saveLastRoute(company,restored);
    // First mount only: company-specific changes are handled by the company effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    const handlePopState=()=>{
      const route=readContextRoute(window.location.search)??defaultContextRoute();
      applySelection(route);
      saveLastRoute(company,route);
    };
    window.addEventListener("popstate",handlePopState);
    return ()=>window.removeEventListener("popstate",handlePopState);
  },[applySelection,company]);

  useEffect(()=>{
    if(previousCompany.current===company)return;
    previousCompany.current=company;
    initialExternalLink.current=false;
    setFavorites(loadFavorites(company));
    const saved=loadLastRoute(company);
    if(saved) navigateTo(saved,{companyId:company});
    else saveLastRoute(company,activeRoute);
  },[company,navigateTo,activeRoute]);

  const hydrateServerPreferences=useCallback((server,{restoreRoute=false}={})=>{
    const normalizedFavorites=sanitizeFavoriteRoutes(server?.favorites??[]);
    setFavorites(normalizedFavorites);
    saveFavorites(company,normalizedFavorites);
    const route=server?.last_route?normalizeContextRoute(server.last_route):null;
    if(restoreRoute&&route)navigateTo(route,{companyId:company,replace:true});
  },[company,navigateTo]);

  const toggleFavorite=useCallback(()=>{
    const route={module:activeRoute.module,view:activeRoute.view,subview:activeRoute.subview};
    const key=routeIdentity(route);
    setFavorites(previous=>{
      const already=previous.some(item=>routeIdentity(item)===key);
      const next=already
        ?previous.filter(item=>routeIdentity(item)!==key)
        :sanitizeFavoriteRoutes([route,...previous].slice(0,MAX_FAVORITES));
      saveFavorites(company,next);
      return next;
    });
    setNavNotice("");
  },[activeRoute,company]);

  const copyCurrentLink=useCallback(async()=>{
    if(typeof window==="undefined")return;
    const link=window.location.origin+buildContextPath(window.location.href,activeRoute);
    try{
      await navigator.clipboard.writeText(link);
      setNavNotice("Povezava do podpogleda je kopirana.");
    }catch{
      setNavNotice("Kopiranje ni uspelo. Povezava je prikazana v naslovni vrstici.");
    }
  },[activeRoute]);

  const isFavorite=favorites.some(item=>routeIdentity(item)===routeIdentity(activeRoute));

  return {
    section,contextLevel2,contextLevel3,activeRoute,
    favorites,isFavorite,navNotice,hasExternalLink:initialExternalLink.current,
    navigateTo,toggleFavorite,copyCurrentLink,hydrateServerPreferences
  };
}
