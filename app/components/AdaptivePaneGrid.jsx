"use client";

import {Children,cloneElement,createContext,isValidElement,useContext} from "react";

// React declares the DOM order, including keyboard and assistive-technology flow.
// Do not reorder using CSS 'order' or imperative DOM mutation.
export const AdaptivePaneOrderContext=createContext("list-first");

export function normalizePaneOrder(value){
 return value==="detail-first"?"detail-first":"list-first";
}

export default function AdaptivePaneGrid({className,children}){
 const order=normalizePaneOrder(useContext(AdaptivePaneOrderContext));
 const panes=Children.toArray(children).filter(isValidElement);
 // Fail closed for atypical or nested multi-pane compositions.
 if(panes.length!==2){
  return <div className={className}>{children}</div>;
 }
 const list=cloneElement(panes[0],{"data-finai-pane":"list",key:"finai-list"});
 const detail=cloneElement(panes[1],{"data-finai-pane":"detail",key:"finai-detail"});
 return <div className={className} data-semantic-pane-order={order}>
   {order==="detail-first"?<>{detail}{list}</>:<>{list}{detail}</>}
 </div>;
}
