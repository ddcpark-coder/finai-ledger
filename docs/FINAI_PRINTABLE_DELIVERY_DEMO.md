# FinAI NEXT-15 / PRINT-DELIVERY — obnovitev stare funkcije na aktualnem main

Funkcionalnost iz starega odprtega PR #87 je bila **selektivno prenesena** na trenutno glavno vejo, brez avtomatične združitve zastarelega PR-ja in brez poseganja v druge projekte.

## Obseg

- Sintetična, že zaključena dobavnica mora prestati `verifyDemoDelivery` (company ID, vsebina, podpisi SHA-256, nedotaknjen dokazni zapis). Šele nato se pripravi predogled za tisk.
- `makePrintableDelivery` vrne pregled postavk, sintetičnega podjetja, podpisnika, ure in hash vrednosti; ne spreminja dokazila.
- `DeliveryPrintPreview` je odzivna komponenta z gumboma 'Natisni / shrani kot PDF' (sistemski brskalniški dialog) in zapiranjem.
- Funkcija je dostopna v obstoječem dokumentnem delovnem prostoru in na mobilni terenski poti `/field/` po zaključku demonstracijskega prevzema.
- Menjava podjetja, obnova dokazila in novo podpisovanje odstranijo prejšnji predogled. Lokalni obstoječi gumb za izvoz PDF ostane nespremenjen.

## Testiranje

- `node --test tests/printableDelivery.test.mjs` — integriteta in tuja podjetja.
- `npx playwright test tests/e2e/printable-delivery.spec.cjs` — desktop/mobile dokumentni tok in izolacija prikaza.
- Workflow `mobile-delivery-demo-qa.yml` vključuje ciljni test in že obstoječo kontrolno pot PDF/podpisa ter Next.js statično gradnjo.

## Pomembne omejitve

To ni kriptografsko podpisan PDF, certificiran čas, pravno veljaven kvalificirani e-podpis ali produkcijska dobavnica. Izpis uporablja brskalniško sistemsko tiskanje; na mobilnih napravah je razpoložljivost funkcije 'Shrani kot PDF' odvisna od naprave. Ni pošiljanja ali sinhronizacije na strežnik.

GitHub objava **ni** objava na Hiper M. `laskot48` je samo za branje; Laškoteka, STNG in skupne cPanel/SSH nastavitve ostanejo strogo nedotaknjene.
