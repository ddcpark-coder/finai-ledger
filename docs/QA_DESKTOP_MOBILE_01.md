# FinAI — QA-DESKTOP-MOBILE-01 (3. november 2026)

## Rezultat

**Interakcijski frontend QA: PASS**

- GitHub Actions run: [41696311586](https://github.com/ddcpark-coder/finai-ledger/actions/runs/41696311586)
- Ciljni commit: `3c3d273ae51809a57437ca246a2df21cb8bc37be`
- 18 posameznih Playwright zagonov: **16 PASS, 2 SKIP**
- Namerno preskočeno: mobilno-specifičen test pri desktop profilu in desktop-specifičen test menjave podjetja pri mobilnem profilu
- Brskalnik: Chromium, emuliran namizni profil 1440 × 900 in iPhone 13 profil (mobilni viewport/touch emulacija)
- Zagon: lasten Next.js strežnik znotraj GitHub Actions, brez dostopa do produkcijske baze

## Preverjeno

1. Odpiranje povezave neposredno na 2. in 3. nivo (primer: DDV evidence / Izhodni DDV)
2. Menjava 2. in 3. nivoja in sprememba vidne vsebine
3. Pravilno delovanje zgodovine Nazaj/Naprej
4. Shranjevanje, odpiranje, ponovno nalaganje in odstranjevanje priljubljenih
5. Obnovitev zadnjega podpogleda
6. Varno obravnavanje neveljavnih URL modulov
7. Horizontana podnavigacija na mobilnem viewportu
8. Izolacija demonstracijskih priljubljenih po podjetjih
9. Neposreden URL za vseh **17 glavnih modulov** brez React pageerror
10. Ohranitev teme po osvežitvi strani
11. Uspešno sestavljanje aplikacije z `next build`

## Odpravljene napake

Ob začetnem zagonu QA je bilo ugotovljeno, da **7 novejših modulov** ni imelo vpisov v legacy `moduleData`, zaradi česar so ob neposrednem odpiranju padali v runtime, čeprav `next build` ni javil napake.

Odpravljeno za: Artikli in ceniki, CRM, Ponudbe, Naročila, Nabava, Zaloge, Projekti. Novi moduli dobijo opisno glavo in ne ponarejajo KPI iz nadzorne plošče.

Testni runner je bil premaknjen z nezdružljivega `ubuntu-latest` na podprt `ubuntu-24.04`.

## Preference / zaledje

Pripravljeni so:
- tabela `user_workspace_preferences` z enoličnostjo podjetje + uporabnik
- preverjena JSON struktura za zadnji pogled, priljubljene in temo/gostoto
- `GET/PUT` contract, predvidena Sanctum avtentikacija, fail-closed company Gate
- opcijski frontend odjemalec (env `NEXT_PUBLIC_FINAI_API_BASE_URL`) in informacija o stanju sinhronizacije
- lokalno delovanje, če API ni povezan

**Še ni aktivno:** Laravel runtime, registrirani middleware/Gate, povezava na MariaDB, migracije, produkcijska avtentikacija in dejanska sinhronizacija med napravami. API-pogodba ni dokaz integracijskega PASS.

## Meje izvedenega QA

- iPhone 13 je Chromiumova mobilna emulacija, ne fizični iPhone ali Safari
- niso izvedeni testi na resničnem Android telefonu/iPhone
- ni ročnih pregledov vseh kombinacij barv, gostot in resolucij
- niso izvedeni Laravel/PHP testi ali realne finančne transakcije
- CI potrjuje pravkar testirani izvorni frontend in ne delovanja Hiper M produkcijskega zaledja

## Naslednji infrastrukturni predpogoj

Vzpostavitev Laravel aplikacije na Hiper M, aktivacija identitetnega sistema in tenant membership Gate, nato minimalna integracijska matrika GET/PUT (200/401/403/409) za dve podjetji in dva uporabnika.
