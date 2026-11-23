// NEXT25: a visibly synthetic invoice sample for read-only journal review.
// No posting, network, persistence, private identifiers or real accounting data.
import {preflightSyntheticJournal} from "./syntheticLedgerPreflight.mjs";

export const DEMO_INVOICE_JOURNAL_LINES = Object.freeze([
  Object.freeze({accountId:"SYN-ACC-4100",label:"Storitve (demo)",debitCents:55000,creditCents:0}),
  Object.freeze({accountId:"SYN-ACC-2601",label:"Vstopni DDV (demo)",debitCents:12100,creditCents:0}),
  Object.freeze({accountId:"SYN-ACC-2200",label:"Dobavitelji (demo)",debitCents:0,creditCents:67100})
]);

export function reviewDemoInvoiceJournal(companyId) {
  // The source data never comes from a real invoice or server.
  // preflightSyntheticJournal validates tenant, cents and balanced lines
  // and removes the display labels from the returned immutable projection.
  return preflightSyntheticJournal(companyId,{
    companyId,currency:"EUR",reference:"SYN-INV-12",
    lines:DEMO_INVOICE_JOURNAL_LINES
  });
}
