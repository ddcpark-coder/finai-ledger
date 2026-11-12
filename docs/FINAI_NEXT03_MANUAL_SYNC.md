# FINAI NEXT-03 — preizkus ročne mednapravne izmenjave šifriranih dokazil

**Razvojna izvedba; samo sintetični podatki. NI aktivna produkcijska sinhronizacija.**

## Izvedeno

- Laravelova obstoječa verzionirana testna storitev sprejme šifrirano ovojnico AES-GCM, doda svojo overjeno šifrirno plast, preveri pripadnost podjetju in prijavljenemu uporabniku, obvlada podvojene UUID dogodke in napake 409 ter zapiše revizijo.
- Novi `GET /api/companies/{companyId}/demo/sync-receipts/{documentId}/latest` vrne **zadnjo klientu že šifrirano ovojnico** ter verzijo, nikoli ne vrne Laravelovega DB šifrata ali nešifriranega dokumenta. Dostop ima samo isti prijavljeni uporabnik s preverjenim aktivnim članstvom v podjetju. Ta API še vedno deluje **izključno** pri `APP_ENV=testing/local` in zastavici `FINAI_SYNTHETIC_RECEIPT_SYNC_ENABLED=true`.
- Terenski mobilni zaslon `/field/` ima ročne gumbe »Preveri testno različico«, »Ročno pošlji šifriran demo« in »Ročno obnovi iz testnega API-ja«. Gumbi ostanejo **onemogočeni** na kateremkoli javnem predogledu ali produkcijski domeni.
- Odjemalec omogoča povezavo **samo** kadar je `NEXT_PUBLIC_FINAI_SYNTHETIC_SYNC_API_BASE` nastavljena na `http://localhost…/api` ali `http://127.0.0.1…/api` in je na **istem originu** kot lokalni razvojni vmesnik. API mora biti lokalno posredovan po isti domeni/vratih; nikoli neposredno na nezaščiten oddaljeni naslov. Zahteva preverjeno sejo in CSRF piškotek.
- Pri pošiljanju se pošlje **samo že lokalno šifrirana ovojnica**, ne geslo, podpis v čisti obliki ali PDF. Lokalni metapodatki shranijo UUID, hash in zadnjo potrjeno strežniško verzijo za idempotentne ponovitve.
- Pred obnovo na drugi napravi uporabnik vnese isto lokalno testno geslo, vsebina se dešifrira in ponovno preveri **pred** kakršnokoli zamenjavo lokalne kopije. Če lokalna kopija že obstaja, zamenjavo posebej potrdi.
- Ob drugačni verziji druge naprave se pošiljanje ne sproži in uporabnik dobi stanje »konflikt«; ni samodejnega združevanja, ponovnega knjiženja ali nevidnega prepisovanja.

## Meje in naslednji pogoji

**To še ni sinhronizacija med resničnima mobilnima napravama prek produkcijskega strežnika.** Na različnih napravah izraz »localhost« pomeni različno napravo; dejanski mednapravni test potrebuje preverjen izoliran testni strežnik, TLS, avtentikacijo naprave in varovan proxy. Ta sklop preveri protokol v lokalnem testnem okolju s simuliranima napravama in prepreči pomotno aktivacijo na javnem gostovanju.

Pred resnično sinhronizacijo: ločen FinAI Reseller OS/cPanel, HTTPS, registracija zaupanja vrednih naprav, končna šifrirna/ključna arhitektura, strežniško preverjena pristnost dokumentov, več podjetij in uporabnikov, obnova/retencija, konfliktne strategije, ciljna varnostna analiza, podpisna/verodostojna identiteta, računovodska in pravna skladnost.

## Minimalni QA

`php artisan test --filter=SyntheticReceiptSyncTest` ter `node --test tests/syntheticSyncClient.test.mjs`, en obstoječi mobilni/namizni offline scenarij, ki potrdi, da **javni statični predogled sinhronizacije ne more sprožiti**.

Delo omejeno na FinAI. Laškoteka, STNG, skupni Hiper M in njunih podatkov ter nastavitev ni dovoljeno spreminjati.
