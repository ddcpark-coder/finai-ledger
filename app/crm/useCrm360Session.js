"use client";
import {useCallback,useSyncExternalStore} from "react";
import {initialCrm360,readCrm360,subscribeCrm360} from "./crm360Session.mjs";

export function useCrm360Session(companyId){
 const getSnapshot=useCallback(()=>readCrm360(companyId),[companyId]);
 const getServerSnapshot=useCallback(()=>initialCrm360(companyId),[companyId]);
 return useSyncExternalStore(subscribeCrm360,getSnapshot,getServerSnapshot);
}
