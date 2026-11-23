// NEXT26: local-only read-only adapter to the Laravel real-schema synthetic draft.
// Never posts, syncs, caches, stores credentials or accepts production origins.
import {preflightSyntheticJournal} from "./syntheticLedgerPreflight.mjs";
import {syntheticLedgerAvailable} from "../business/syntheticLedgerClient.mjs";

export const SYNTHETIC_JOURNAL_PREVIEW_BASE =
 (process.env.NEXT_PUBLIC_FINAI_SYNTHETIC_JOURNAL_PREVIEW_BASE ?? "").trim();

export function syntheticJournalPreviewAvailable(
 base = SYNTHETIC_JOURNAL_PREVIEW_BASE,
 origin = typeof location === "undefined" ? "" : location.origin
) {
 return syntheticLedgerAvailable(base,origin);
}

export function createSyntheticJournalPreviewClient({
 base=SYNTHETIC_JOURNAL_PREVIEW_BASE,
 origin=typeof location === "undefined" ? "" : location.origin,
 fetcher=globalThis.fetch
}={}) {
 if(!syntheticJournalPreviewAvailable(base,origin)) {
   throw new Error("Sintetični predpregled strežnika je dovoljen samo lokalno.");
 }
 return {
  async read(companyId,journalId) {
   if(!syntheticJournalPreviewAvailable(base,origin) ||
      !Number.isSafeInteger(companyId) || companyId<1 ||
      !Number.isSafeInteger(journalId) || journalId<1) {
     throw new Error("Neveljavna izbira sintetične temeljnice.");
   }
   const path=base.replace(/\/$/,"")+"/companies/"+companyId+
    "/demo/journal-previews/"+journalId;
   const response=await fetcher(path,{
     method:"GET",credentials:"include",redirect:"error",cache:"no-store",
     headers:{"Accept":"application/json","X-Requested-With":"XMLHttpRequest"}
   });
   if(!response.ok) {
     if(response.status===401||response.status===403)
       throw new Error("Dostop do sintetične temeljnice ni dovoljen.");
     if(response.status===404)
       throw new Error("Lokalni predpregled ni omogočen.");
     throw new Error("Sintetične temeljnice ni mogoče preveriti.");
   }
   const payload=(await response.json())?.data;
   if(!payload || payload.mode!=="synthetic-preview-only" ||
      payload.postingAllowed!==false || payload.companyId!==companyId ||
      !Number.isSafeInteger(payload.totalDebitCents) ||
      !Number.isSafeInteger(payload.totalCreditCents)) {
     throw new Error("Lokalni strežnik je vrnil neveljaven predpregled.");
   }
   // Recheck all lines, source tenant and reference using NEXT24 validation.
   const result=preflightSyntheticJournal(companyId,payload);
   if(result.totalDebitCents!==payload.totalDebitCents ||
      result.totalCreditCents!==payload.totalCreditCents) {
     throw new Error("Vsote lokalne temeljnice se ne ujemajo.");
   }
   return result;
  }
 };
}
