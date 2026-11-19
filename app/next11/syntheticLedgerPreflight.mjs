// NEXT24 — strictly synthetic, read-only double-entry journal preflight.
// No persistence, posting, API calls, real accounts or external side effects.
const ACCOUNT_RE = /^SYN-ACC-[0-9]{3,8}$/;
const REF_RE = /^SYN-(?:INV|ORD|CRM)-[0-9]{1,12}$/;
const MAX_LINES = 100;
const MAX_CENTS = 1_000_000_000_000;

export function preflightSyntheticJournal(companyId, journal) {
  if (!Number.isSafeInteger(companyId) || companyId < 1 ||
      !journal || Array.isArray(journal) || typeof journal !== "object" ||
      journal.companyId !== companyId || journal.currency !== "EUR" ||
      typeof journal.reference !== "string" || !REF_RE.test(journal.reference) ||
      !Array.isArray(journal.lines) ||
      journal.lines.length < 2 || journal.lines.length > MAX_LINES) {
    throw new Error("Neveljaven ali tuj sintetični temeljnicni osnutek.");
  }
  let debit = 0, credit = 0;
  const lines = [];
  for (const line of journal.lines) {
    if (!line || Array.isArray(line) || typeof line !== "object" ||
        !ACCOUNT_RE.test(line.accountId) ||
        !Number.isSafeInteger(line.debitCents) ||
        !Number.isSafeInteger(line.creditCents) ||
        line.debitCents < 0 || line.creditCents < 0 ||
        line.debitCents > MAX_CENTS || line.creditCents > MAX_CENTS ||
        (line.debitCents === 0) === (line.creditCents === 0)) {
      throw new Error("Neveljavna debetna ali kreditna postavka osnutka.");
    }
    debit += line.debitCents;
    credit += line.creditCents;
    if (!Number.isSafeInteger(debit) || !Number.isSafeInteger(credit)) {
      throw new Error("Presežena dovoljena vsota sintetične temeljnice.");
    }
    // Only explicitly allowed bookkeeping fields survive; no PII is echoed.
    lines.push(Object.freeze({
      accountId: line.accountId,
      debitCents: line.debitCents,
      creditCents: line.creditCents
    }));
  }
  if (debit !== credit || debit === 0) {
    throw new Error("Sintetična temeljnica ni uravnotežena.");
  }
  return Object.freeze({
    companyId, reference: journal.reference, currency: "EUR",
    totalDebitCents: debit, totalCreditCents: credit,
    postingAllowed: false, mode: "synthetic-preview-only",
    lines: Object.freeze(lines)
  });
}
