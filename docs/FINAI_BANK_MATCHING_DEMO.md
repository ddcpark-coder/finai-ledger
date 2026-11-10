# FINAI BANK-DEMO-01 — Synthetic bank reconciliation

The **Banka** module now demonstrates a deterministic, explainable matching workflow only. There is no bank API access, real statement import, SEPA submission, journal creation or permanent storage.

## Behaviour

- Synthetic bank transactions and open items are segregated by selected demo company.
- A suggestion is displayed only if the reference, currency, direction and remaining amount are compatible.
- The user must explicitly approve every suggestion (even an apparently complete match).
- Partial payments are supported as demonstrations of remaining balance; over-allocations, double confirmations and cross-company references are rejected.
- Reset affects only the current demo company. An ephemeral session history records confirmation/reset for that company only.
- Missing real import, SEPA payment, split allocation and journal actions are explicitly disabled and labeled 'v pripravi'.

## Minimal QA

`node --test tests/bankMatching.test.mjs`
One targeted Playwright flow for company switch, manual confirmation, partial match and reset on desktop/mobile.
The existing static build and integrity checks continue.

## Production gate

Do not connect real banking or financial data until per-company authorization, verified transaction imports, durable auditable ledger, recovery, confidentiality and applicable legal/PSD2 due diligence have passed. The shared `laskot48` Hiper M account stays read-only for FinAI.
