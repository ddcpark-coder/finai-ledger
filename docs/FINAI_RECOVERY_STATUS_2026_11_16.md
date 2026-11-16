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
---

## Nadaljevanje 16. 11. 2026 — NEXT-13B/14/15/16, dejansko združeno

| PR | Status | Preverjeno |
|---|---|---|
| [#122](https://github.com/ddcpark-coder/finai-ledger/pull/122) | MERGED `d2bf549` | Windows SQLite3MC: append-only sintetični osnutki naročil po podjetjih, lokalna prijava/vloge, idempotenca, HMAC integriteta, revizijska veriga in prenosna šifrirana obnova; Windows build/self-test CI PASS |
| [#123](https://github.com/ddcpark-coder/finai-ledger/pull/123) | MERGED `37c55fc` | Shopify/WooCommerce podpisani **sintetični** testni dogodki → existing company-scoped inbox `review`, brez pravega webhooka in knjiženja; Laravel Feature CI PASS |
| [#124](https://github.com/ddcpark-coder/finai-ledger/pull/124) | MERGED `4d0c4c9` | Bralno preverjanje ločenega FinAI UID, poti in povezav ter GO/NO-GO; izolirani CI PASS, deploy še vedno prepovedan |
| [#125](https://github.com/ddcpark-coder/finai-ledger/pull/125) | MERGED `a85f10d` | SQL popravki katalog/nabava/projekti in test **vseh 25** migracij dvakrat v disposable MariaDB 10.11; MariaDB + Laravel CI PASS |
| [#126](https://github.com/ddcpark-coder/finai-ledger/pull/126) | MERGED `240ebbb` | Izolirana sintetična produkcijska prijavna varovalka (brez 2FA/ob 2FA) in dokumentirano nadomeščanje starih BACKEND vej; Laravel CI PASS |

### Razrešitev starih osnutkov

- #87 in #88 sta zaprta kot nadomeščena; novi PWA `/field/` že ima sintetično offline predpomnjenje, šifrirano lokalno dokazilo in ročno vrsto s stanji `queued/conflict/acknowledged`.
- #34 in #35 sta zaprta kot zastarela; potrebni popravki in test so preneseni selektivno v #124/#125/#126. Opuščeni so stari Vercel produkcijski načrti in kakršnokoli pisanje na skupni cPanel.

### Kaj še ni zaključeno

1. Windows: nova šifrirana storitev osnutkov je **native-only QA**, še ni uporabniškega obrazca z varno lokalno prijavo in sinhronizacijo. Obstoječi Windows namestitveni artefakt je nepodpisan in samo interni QA.
2. Mobilno: PWA ima podpisovanje sintetičnih dobavnic, offline šifrirano hrambo in ročno pregledovanje konfliktov demo vrste. Ni nativna aplikacija Android/iOS ali produkcijska dvosmerna sinhronizacija.
3. Spletne trgovine: podpisan je samo **testni** sintetični format z veljavnostjo časa; pravi WooCommerce/Shopify transport, ponudnikova dejanska JSON oblika, poverilnice, varna hramba in realni webhooks še niso vklopljeni.
4. Hiper M: namenski FinAI OS/cPanel račun, posebna MariaDB, certifikati, preverjena obnova, DNS in pogoji produkcijske objave še niso neodvisno preverjeni. Lokalni preflight iz #124 izrecno **nikoli** ne dovoljuje pisanja.
5. Realni podatki: do končnega varnostnega in računovodsko-pravnega QA strogo prepovedani.

### Verificirana zadnja kontrola glavne veje

- Zadnji preverjeni GitHub Actions `FinAI isolated-account CI and controlled Hiper M releases`, run `43846393631`, je zgradil statični spletni artefakt in opravil lokalne varnostne kontrole: SUCCESS; `stage=skipped`, `promote=skipped`. Ne sklepaj, da je Hiper M posodobljen.

### Prednostno nadaljevanje

- NEXT-13C: varen native Windows obrazec z lokalnim preverjanjem uporabnika, popis sprememb osnutkov, podporni mobilni postopki in notranji konfliktni QA. Brez resničnih podatkov.
- NEXT-14B: provider-specifični podpisni HTTP adapterji in ločena obdelava ponudnikov na sintetičnem testnem okolju, brez registracije pravih webhookov.
- NEXT-16: šele po dejanski aktivaciji novega FinAI OS/cPanel računa opraviti read-only sistemski pregled, pregled SQL pravic, DNS/SSL in obnovitvene točke. Brez teh dokazov zavrni strežniške pisalne operacije.

Absolutno: nobeno FinAI dejanje ne sme spreminjati Laškoteke, STNG, skupnih SSH/cPanel/DNS nastavitev ali `laskot48`.
