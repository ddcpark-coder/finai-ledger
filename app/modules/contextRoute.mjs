import {modules} from "./moduleRegistry.js";
import {contextNavigation} from "./contextNavigation.js";

export const MAX_FAVORITES=8;
const byKey=new Map(modules.map(module=>[module.key,module]));
const byLabel=new Map(modules.map(module=>[module.label,module]));
const defaultModule=byKey.get("dashboard");

export function normalizeContextRoute(input={}){
  const module=byKey.get(input.module) ?? byLabel.get(input.moduleLabel);
  if(!module) return null;
  const views=contextNavigation[module.label] ?? [];
  const view=views.find(item=>item.label===input.view) ?? views[0];
  if(!view) return null;
  const children=view.children ?? [];
  const subview=children.includes(input.subview)?input.subview:children[0]??null;
  return {module:module.key,moduleLabel:module.label,view:view.label,subview};
}

export function defaultContextRoute(){
  return normalizeContextRoute({module:defaultModule.key});
}

export function readContextRoute(search){
  const params=new URLSearchParams(search);
  if(!params.has("module")) return null;
  return normalizeContextRoute({
    module:params.get("module"),view:params.get("view"),subview:params.get("subview")
  });
}

export function buildContextPath(locationLike,route){
  const normalized=normalizeContextRoute(route);
  if(!normalized) throw new Error("Neveljaven navigacijski pogled");
  const url=new URL(locationLike,"https://finai.invalid");
  url.searchParams.set("module",normalized.module);
  url.searchParams.set("view",normalized.view);
  if(normalized.subview) url.searchParams.set("subview",normalized.subview);
  else url.searchParams.delete("subview");
  return url.pathname+url.search+url.hash;
}

export function routeIdentity(route){
  const normalized=normalizeContextRoute(route);
  return normalized?[normalized.module,normalized.view,normalized.subview??""].join("\u001f"):null;
}

export function sanitizeFavoriteRoutes(input){
  if(!Array.isArray(input)) return [];
  const keys=new Set();
  const valid=[];
  for(const item of input.slice(0,50)){
    if(!item || typeof item!=="object" || typeof item.module!=="string") continue;
    const exactModule=byKey.get(item.module);
    const exactView=(contextNavigation[exactModule?.label]??[]).find(view=>view.label===item.view);
    if(!exactView || !(exactView.children??[]).includes(item.subview)) continue;
    const normalized=normalizeContextRoute(item);
    const key=routeIdentity(normalized);
    if(keys.has(key)) continue;
    keys.add(key);
    valid.push({module:normalized.module,view:normalized.view,subview:normalized.subview});
    if(valid.length===MAX_FAVORITES)break;
  }
  return valid;
}
