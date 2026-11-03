"use client";
import {contextNavigation} from "../modules/contextNavigation";

const contextTones=["#14b8c9","#8c7bf4","#d59b42","#2bb493","#539fdf","#cf75a4"];

export default function ContextNavigation({moduleLabel,level2,level3,onLevel2,onLevel3}){
  const items=contextNavigation[moduleLabel] ?? [];
  if(!items.length) return null;
  const index=Math.max(0,items.findIndex(item=>item.label===level2));
  const active=items[index];
  const children=active.children ?? [];
  const tone=contextTones[index % contextTones.length];

  const chooseLevel2=item=>onLevel2(item.label);

  return <div className="contextNav" style={{"--context-accent":tone}}>
    <style>{`
      .contextNav .contextRow{gap:8px;scrollbar-width:none}
      .contextNav .contextRow.level2 button{min-height:39px;padding:8px 15px;font-size:11px;font-weight:700;border:1px solid var(--line);border-radius:11px;background:var(--panel);color:var(--muted);transition:background .15s,border-color .15s}
      .contextNav .contextRow.level2 button:hover{color:var(--text);border-color:var(--context-accent);background:color-mix(in srgb,var(--context-accent) 8%,var(--panel))}
      .contextNav .contextRow.level2 button.active{color:var(--text);border-color:var(--context-accent);background:color-mix(in srgb,var(--context-accent) 24%,var(--panel));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--context-accent) 32%,transparent)}
      .contextNav .contextRow.level3{padding:2px 0 1px 8px;border-left:3px solid var(--context-accent)}
      .contextNav .contextRow.level3::before{content:none}
      .contextNav .contextRow.level3 button{min-height:34px;padding:7px 12px;font-size:10px;border:1px solid color-mix(in srgb,var(--context-accent) 49%,var(--line));border-radius:9px;color:var(--text);background:color-mix(in srgb,var(--context-accent) 10%,var(--panel))}
      .contextNav .contextRow.level3 button:hover{border-color:var(--context-accent);background:color-mix(in srgb,var(--context-accent) 19%,var(--panel))}
      .contextNav .contextRow.level3 button.active{font-weight:800;border-color:var(--context-accent);background:color-mix(in srgb,var(--context-accent) 32%,var(--panel));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--context-accent) 22%,transparent)}
      .contextNav button:focus-visible{outline:2px solid var(--context-accent);outline-offset:2px}
      @media(max-width:760px){.contextNav .contextRow.level2 button{min-height:40px;padding:8px 12px;font-size:10px}.contextNav .contextRow.level3 button{min-height:36px;font-size:10px}}
    `}</style>
    <div className="contextRow level2" role="navigation" aria-label={moduleLabel+" podmoduli"}>
      {items.map(item=><button type="button" key={item.label} className={active.label===item.label?"active":""} aria-pressed={active.label===item.label} onClick={()=>chooseLevel2(item)}>{item.label}</button>)}
    </div>
    {children.length>0&&<div className="contextRow level3" role="navigation" aria-label={active.label+" možnosti"}>
      {children.map(child=><button type="button" key={child} className={level3===child?"active":""} aria-pressed={level3===child} onClick={()=>onLevel3(child)}>{child}</button>)}
    </div>}
  </div>;
}
