import {DEFAULT_VIEW,normalizeView} from "./workspacePersonalization.mjs";

// Presets change presentation ONLY. Never roles, data visibility/authorization,
// approval privileges, invoice validation or accounting posting.
export const WORKSPACE_PRESETS=Object.freeze({
 beginner:Object.freeze({
  level:"simple",arrangement:"stacked",paneOrder:"list-first",
  detailWidth:420,textScale:130,formDensity:"comfortable"
 }),
 balanced:DEFAULT_VIEW,
 professional:Object.freeze({
  level:"expert",arrangement:"split",paneOrder:"list-first",
  detailWidth:480,textScale:100,formDensity:"compact"
 }),
 field:Object.freeze({
  level:"simple",arrangement:"stacked",paneOrder:"list-first",
  detailWidth:370,textScale:115,formDensity:"comfortable"
 })
});
export const WORKSPACE_PRESET_LABELS=Object.freeze({
 beginner:"Začetnik – vodeno",
 balanced:"Običajno – uravnoteženo",
 professional:"Profesionalec – več podatkov",
 field:"Terensko – večja polja"
});
export function applyWorkspacePreset(id){
 if(typeof id!=="string"||!Object.hasOwn(WORKSPACE_PRESETS,id))
  throw new Error("Neznan uporabniški profil prikaza.");
 return normalizeView(WORKSPACE_PRESETS[id]);
}
export function identifyWorkspacePreset(view){
 const normalized=normalizeView(view);
 return Object.keys(WORKSPACE_PRESETS).find(id=>
  Object.keys(normalized).every(field=>normalized[field]===WORKSPACE_PRESETS[id][field])
 )??"custom";
}
