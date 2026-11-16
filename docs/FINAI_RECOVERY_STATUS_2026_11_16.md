# FinAI — obnovitveno razvojno stanje, 16. november 2026

To je dodatna točka za nadaljevanje projekta ob nedostopni zgodovini ChatGPT. Predhodno stanje: `docs/FINAI_RECOVERY_STATUS_2026_11_15.md`.

## Potrjeno združene spremembe

| PR | Glavni commit | Izvedeno in preverjeno |
|---|---|---|
| [#118](https://github.com/ddcpark-coder/finai-ledger/pull/118) | `22c40c0` | NEXT-12C: strožja izolacija CRM po podjetjih, aktivne pravice, povezava s poslovno enoto, varna pretvorba lead in faze; sintetični Laravel CI PASS |
| [#119](https://github.com/ddcpark-coder/finai-ledger/pull/119) | `9a97765` | NEXT-13A: skupni read-only offline scenarij za naročilo, SKU zalogo, primanjkljaj in izračun poslovnega rezultata za mobilno/Windows; 4 povezani CI PASS |
| [#120](https://github.com/ddcpark-coder/finai-ledger/pull/120) | `5f3b09e` | NEXT-15: selektivno prenesen predogled sintetične dobavnice za tisk v dokumentnem in mobilnem pogledu, SHA-256 pre-verifikacija, ciljna Node/Playwright QA; 5 povezanih CI PASS |

Po zadnjem združevanju na `main`: GitHub Actions 'FinAI isolated-account CI and controlled Hiper M releases' run 43841188333 = PASS. Nalogi `stage` in `promote` sta SKIPPED; to **ni** spletna produkcijska objava.

## Starejši PR-ji

- PR #87 je zaprt kot nadomeščen s PR #120. Prepisovanje stare veje ni potrebno.
- PR #88 je odprt in konfliktnen; potrebna je preverba varnega PWA predpomnilnika in previden selektivni prenos na novejšo vejo.
- PR #34 in #35 ostajata odprta osnutka s starimi baznimi vejami; pred kakršnimkoli združevanjem preglej datoteke, migracije in neuporabljene Vercel predpostavke.

## Končano ni isto kot produkcijsko uporabno

- CRM: zaledne storitve so utrjene, celoten živi CRM HTTP API, dostop do resničnih partnerjev in migracija na produkcijsko MariaDB **niso** aktivirani.
- Windows: ostaja namestljiv offline QA prototip s svojimi šifriranimi testnimi zbirkami; današnji novi scenario je lokalna demonstracija z brezstanjskim izračunom, ne nova računovodska transakcija.
- Mobilno: PWA demo, ne nativna Android/iOS aplikacija. Tiskanje uporablja brskalniški dialog in ni kvalificirano podpisan PDF.
- Spletne trgovine, banke, FURS in drugi poslovni sistemi še nimajo produkcijskih konektorjev. Realni poslovni podatki niso dovoljeni.

## Prednostni naslednji koraki

1. NEXT-13B: varno, preverjeno lokalno shranjevanje poslovnega osnutka v šifrirani Windows zbirki; isolacija podjetij, revizija, preverljiva izvozna/obnovitvena pot. Nato razširitev na mobilni offline event model z reševanjem konfliktov. Samo sintetični QA.
2. NEXT-14: WooCommerce/Shopify preverjanje webhookov, vrste dogodkov in povezovanje SKU v izključno izoliranem testnem okolju; brez produkcijskih poverilnic.
3. NEXT-15: ločeno oceniti PR #88 za koristne PWA izboljšave, brez cache API zahtevkov, računov ali osebnih podatkov.
4. NEXT-16: nov FinAI-only Hiper M cPanel/OS uporabnik, lastna DB, TLS, privzeto omejen SSH, preverjena obnova in atomaren deploy. Do takrat brez gostiteljskega pisanja.
5. Računovodski, pravni in varnostni QA pred obdelavo resničnih podatkov.

## Absolutne varnostne meje

FinAI GitHub razvoj je dovoljen. Skupni račun `laskot48` za FinAI ostaja izključno read-only. Laškoteka, STNG, skupni DNS/SSH/cPanel, mediji in baze so nedotakljivi. Vercel ni produkcijsko gostovanje. Nikoli ne zapisuj gesel ali realnih poslovnih podatkov v repo ali CI dnevnik.

Projekt naj se nadaljuje od tega dokumenta in aktualne veje `main`, ne iz predpostavke, da so stare razvojne veje produkcijsko združljive.