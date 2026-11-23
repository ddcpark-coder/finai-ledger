# FinAI NEXT26 — test-only predpregled dejanske sheme glavne knjige

## Kaj je povezano
- Modul **Knjiženje** ohranja čisto NEXT25 JS preverjanje. Ob izrecno konfiguriranem lokalnem API v istem originu dobi tudi panel **Preveri sintetični osnutek v lokalnem Laravelu**.
- Zaledni GET \`/api/companies/{companyId}/demo/journal-previews/{journalId}\` bere iz **dejanskih računovodskih tabel v izolirani lokalni/testni bazi** ter ponovno uporabi \`LedgerPostingGuard::requireWriter\`, \`openPeriod\`, \`journalEntries\` in \`BalanceCalculator::toCents\`.
- Sprejme samo osnutke \`SYN-INV-...\`/\`SYN-ORD-...\`/\`SYN-CRM-...\` z dobesednim opisom \`Synthetic isolated journal\`, strogo označenimi sintetičnimi konti, zneski v centih in uravnoteženostjo.
- HTTP odgovor vsebuje zgolj 3 vrste knjižilnih podatkov (synthetic account IDs, debet/kredit centi), podjetje, referenco in izrecna \`postingAllowed:false\` ter \`mode:synthetic-preview-only\`. Ne pošilja strank, IBAN, opisov, postavk odprtih terjatev ali drugih osebnih podatkov.
- Web odjemalec pred prikazom ponovi validacijo NEXT24. GET je izključno bralen; brez POST, pisanja, avtentikacijskih obvodov, sinhronizacije ali produkcijskega HTTP API-ja.

## Izrecni razvojni pogoji
- \`APP_ENV=local\` ali \`testing\` IN \`FINAI_SYNTHETIC_JOURNAL_PREVIEW_ENABLED=true\`. Privzeto je izključeno. Enaka prepoved velja tudi za neposreden klic Laravelove storitve.
- Potrebna je prijavljena, aktivna, preverjena seja in veljavno članstvo ter \`ledger.post\` v izbranem podjetju. Globalni middleware varuje morebitno obvezno MFA.
- V lokalnem Next.js frontend okolju nastavi \`NEXT_PUBLIC_FINAI_SYNTHETIC_JOURNAL_PREVIEW_BASE=http://127.0.0.1:3000/api\` **samo če je backend na istem originu prek lokalnega proxyja**. Panel se na javnih domenah ne prikaže.
- V sintetični bazi pripravi osnutek po vzorcu \`SYN-INV-12\`, z opisom \`Synthetic isolated journal\` in konti \`Synthetic account 4100\` ipd. Vnesi njegov izolirani številčni ID, ne davčne številke ali pravega računa.

## QA in omejitve
- Test: \`node --test tests/next24SyntheticLedgerPreflight.test.mjs tests/next25SyntheticJournalUi.test.mjs tests/next26SyntheticJournalPreviewClient.test.mjs\`.
- Laravel: \`php artisan test --filter=SyntheticJournalPreviewTest\` na SQLite \`:memory:\`; prek preverjanj se morajo zavrniti tuje podjetje, nepooblaščen uporabnik, tuj konto, neuravnotežen znesek, zaklenjeno obdobje, že knjižena ali ne-sintetična temeljnica in produkcijsko okolje.
- **Ni pravega knjiženja, ni možnosti shranjevanja, ni povezave s produkcijsko MariaDB, ni dokazila o slovenski računovodski ali davčni skladnosti.** Potreben je nadaljnji strokovni QA in prenos na samostojno šifrirano namizno jedro.
- Izvedba se omeji na GitHub FinAI. Brez kakršnihkoli sprememb gostovanja, Laškoteke, STNG ali skupnega \`laskot48\`.
