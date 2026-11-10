// Demo-only per-user/per-company/per-module display preferences.
// This is a UI preference: never use it to decide security or accounting permissions.
export const DETAIL_WIDTH_MIN=260;
export const DETAIL_WIDTH_MAX=700;
export const DEFAULT_VIEW=Object.freeze({level:"standard",arrangement:"split",detailWidth:370});
const levels=new Set(["simple","standard","expert"]);
const arrangements=new Set(["split","stacked","list","detail"]);
export function normalizeView(value){
  const input=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const detailWidth=Number(input.detailWidth);
  return {
    level:levels.has(input.level)?input.level:DEFAULT_VIEW.level,
    arrangement:arrangements.has(input.arrangement)?input.arrangement:DEFAULT_VIEW.arrangement,
    detailWidth:Number.isInteger(detailWidth)?Math.max(DETAIL_WIDTH_MIN,Math.min(DETAIL_WIDTH_MAX,detailWidth)):DEFAULT_VIEW.detailWidth
  };
}
export function viewStorageKey(companyId,moduleKey){
  if(!Number.isSafeInteger(companyId)||companyId<1)throw new Error("Neveljavno podjetje.");
  if(typeof moduleKey!=="string"||!/^[a-z_]{2,48}$/.test(moduleKey))throw new Error("Neveljaven modul.");
  return "finai:adaptive:demo-user:company-"+companyId+":module-"+moduleKey;
}
export function updateViewField(state,key,value){
  if(!["level","arrangement","detailWidth"].includes(key))throw new Error("Neveljavna nastavitev prikaza.");
  return normalizeView({...normalizeView(state),[key]:value});
}
