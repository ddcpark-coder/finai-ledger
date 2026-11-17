"use client";
import {useCallback,useSyncExternalStore} from "react";
import {
 initialDemoCompany,readDemoCompany,subscribeDemoCompany
} from "./sharedDemoCompany.mjs";

// The server snapshot remains the unmodified synthetic fixture. Once
// hydrated, all FinAI demo modules in the same browser tab share revisions.
export function useSharedDemoCompany(companyId){
 const getSnapshot=useCallback(()=>readDemoCompany(companyId),[companyId]);
 const getServerSnapshot=useCallback(()=>initialDemoCompany(companyId),[companyId]);
 return useSyncExternalStore(subscribeDemoCompany,getSnapshot,getServerSnapshot);
}
