"use client";
import {contextNavigation,getDefaultContext} from "../modules/contextNavigation";

export default function ContextNavigation({moduleLabel,level2,setLevel2,level3,setLevel3}){
  const items=contextNavigation[moduleLabel] ?? [];
  if(!items.length) return null;
  const active=items.find(x=>x.label===level2) ?? items[0];
  const children=active.children ?? [];

  const chooseLevel2=(item)=>{
    setLevel2(item.label);
    setLevel3(item.children?.[0] ?? null);
  };

  return <div className="contextNav">
    <div className="contextRow level2" role="navigation" aria-label={moduleLabel+" podmoduli"}>
      {items.map(item=><button key={item.label} className={active.label===item.label?"active":""} onClick={()=>chooseLevel2(item)}>{item.label}</button>)}
    </div>
    {children.length>1&&<div className="contextRow level3" role="navigation" aria-label={active.label+" možnosti"}>
      {children.map(child=><button key={child} className={level3===child?"active":""} onClick={()=>setLevel3(child)}>{child}</button>)}
    </div>}
  </div>;
}

export {getDefaultContext};
