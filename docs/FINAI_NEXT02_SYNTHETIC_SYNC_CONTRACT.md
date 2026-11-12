# FinAI NEXT-02 — preverljiv protokol za prihodnjo sinhronizacijo

**Faza: zgolj izolirani sintetični integracijski testi.**

## Protokol

- Overjena seja + preverjena e-pošta + obstoječi 2FA za privilegirane uporabnike + varovana CSRF seja + preverjeno aktivno članstvo v podjetju.
- Samo `APP_ENV=testing/local` in eksplicitna zastavica `FINAI_SYNTHETIC_RECEIPT_SYNC_ENABLED=true`. V vseh drugih okoljih je API trajno nedostopen (404), tudi če bi bila zastavica pomotoma omogočena.
- `GET /api/companies/{companyId}/demo/sync-receipts/{documentId}` vrne **le metapodatke verzije** za en sintetični dokument in trenutno prijavljenega uporabnika.
- `POST` na isti URL prejme `client_event_id` (UUID), `expected_version` in strogo določeno strukturo šifriranega AES-GCM dokaznega paketa.
- Sprejme se samo vnaprej definirana sintetična dobavnica za izbrano podjetje. Vnos z istim UUID + istim SHA256 je idempotenten in vrne isto verzijo. Isti UUID z drugim paketom ali napačna pričakovana verzija vrne 409 (konflikt), ne tiho prepisovanje.
- Server **ne dešifrira klientovega AES-GCM paketa** (ne pozna lokalnega gesla). Ovojnico dodatno overjeno šifrira z Laravel Crypt in shrani v izolirano testno tabelo; revizija vsebuje le ID, verzijo, SHA256 in oznako `demo_only`.
- Ni prenosov datotek, knjiženj, PDF podpisa, davčnega ali bančnega postopka, dostopa do drugih podjetij in ni aktivirane avtomatske sinhronizacije mobilne aplikacije.

## Poudarek

Ta protokol še ni varnostno preverjena **produkcijska sinhronizacija**. Sistem ne more dokazati, da šifrirani paket vsebuje res samo sintetične podatke, zato je dostop omejen na izolirano testno okolje in izrecno testno zastavico. Pred javno uporabo bodo potrebni dejanska avtentikacija aplikacijskih naprav, enotni transakcijski ID-ji, ključni material na varnih napravah, robustna obnova, omejitve ponovitev, revizija/retencija, obravnava konfliktov, sinhronizacija več naprav in celovit računovodski QA.

Obnovitev podatkov iz lokalne šifrirane kopije z geslom je ločen proces; strežniška testna ovojnica ni varnostna kopija resničnih dokumentov.

## Minimalni QA

`php artisan test --filter=SyntheticReceiptSyncTest` na izolirani testni SQLite + že obstoječa Laravel preverjanja. Scenariji: privzeti 404, 401 anonimno, podjetniški 403, veljaven sintetični dogodek, idempotentni replay, konfliktna 409, šifrirana hramba in revizijski zapis, zavrnitev nepravilne strukture. Samo testni podatki, brez posegov v Hiper M, STNG in Laškoteko.
