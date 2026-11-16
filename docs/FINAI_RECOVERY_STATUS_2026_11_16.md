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


---

## Dopolnitev 16. 11. 2026 — NEXT-13C, NEXT-14B in NEXT-13D

Razvoj se nadaljuje na glavni veji main; vse spremembe ostajajo sintetične in lokalne ali na izoliranih GitHub CI runnerjih.

| PR | Commit v main | Funkcija in preverjanje |
|---|---|---|
| [#128](https://github.com/ddcpark-coder/finai-ledger/pull/128) | 30030322 | NEXT-13C: izvorno Windows Forms okno za šifrirano lokalno prijavo, izbor članom dostopnih podjetij, sintetične naročilne osnutke in šifrirano obnovo. Windows CI PASS. |
| [#129](https://github.com/ddcpark-coder/finai-ledger/pull/129) | 62702bb4 | NEXT-14B: ločena Shopify/WooCommerce sprejemna adapterja sintetičnih dogodkov, surovi HMAC in varovana vezava ID dostave. Laravel CI PASS. |
| [#130](https://github.com/ddcpark-coder/finai-ledger/pull/130) | 8d5b446d | NEXT-13D: avtomatizirana izdelava nepodpisanega Windows offline QA namestitvenega paketa. Windows installer CI PASS. |

### Windows namestitveni artefakt (testni, nepodpisan)

- [GitHub Actions run #43850976824](https://github.com/ddcpark-coder/finai-ledger/actions/runs/43850976824).
- Ime artefakta: finai-next13d-win-x64-offline-qa-unsigned, ID 14216429169, ZIP velikosti približno 254 MB; predviden iztek 23. 11. 2026.
- SHA-256 priloženega setup.exe po Windows CI: 67506ED873750612ACF4368A0ED51C30F4D4DEBC265630492DB5448289985485.
- Ločena SHA-256 vsota GitHub ZIP artefakta: 45410adbeff57e9d7d15ff0ba7dd983291933c4b07e57e8e0cf241bbb2d6958c. Ne zamenjuj obeh vrednosti.
- Izgradnja statičnega UI, win-x64 .NET, šifriranje osnutkov, prenosna obnova in podpis Microsoft WebView2 so prestali preverjanje. Dejanska namestitev na čist Windows 11 brez interneta, ročni GUI test in nadgradnja s hrambo podatkov niso še potrjeni.

### Prednostno nadaljevanje in obvezne omejitve

1. NEXT-13E: ročno preveriti namestitev na čistem Windows 11 brez interneta, uporabniško prijavo, izolacijo podjetij in nadgradnjo brez izgube lokalne baze. Nadaljevati z izoliranimi sintetičnimi primeri.
2. NEXT-14C: dekodiranje resničnih ponudniških formatov šele po vzpostavitvi namenskega FinAI testnega strežnika, varovane hrambe ključev ter varnosti osebnih podatkov. Testni adapterji trenutno sprejmejo samo sintetični FinAI JSON.
3. NEXT-16: ločen FinAI OS/cPanel račun Hiper M, lastna MariaDB, HTTPS, preverjena obnova, DNS in povrnljiv deploy. Na skupnem laskot48 nobeno FinAI pisanje ni dovoljeno.
4. Pred realnimi poslovnimi podatki: računovodska, varnostna in pravna revizija.

Laškoteka, STNG, skupne nastavitve cPanel/SSH/DNS in drugi projekti niso bili spreminjani.


---

## Zaključeno nadaljevanje — mobilni konflikti, ponudniška naročila in Windows obnova (16. 11. 2026)

| PR | Commit main | Potrjeni ciljni testi |
|---|---|---|
| [#132](https://github.com/ddcpark-coder/finai-ledger/pull/132) | f2bff29 | NEXT-13E: lokalna ročna primerjava šifrirane mobilne vrste pri konfliktu, strogo razlikovanje \`matched\` od dejanske potrditve \`acknowledged\`; pet GitHub CI postopkov PASS |
| [#134](https://github.com/ddcpark-coder/finai-ledger/pull/134) | 7d309e4 | NEXT-14C: sintetična provider-shaped naročila Shopify/WooCommerce, podpis HMAC, strogo dovoljene tipke, izmišljeni SKU/ID in celoštevilska denarna matematika; izolirani Laravel CI PASS |
| [#133](https://github.com/ddcpark-coder/finai-ledger/pull/133) | 4ce2a9d | NEXT-13F: pravilno sinhrono zaganjanje vseh Windows WinExe self-testov, odprava napake zaklenjene SQLite datoteke pri prenosni kopiji, SQLite3MC online encrypted snapshot, varna ponovna namestitev interne 0.1.1 izdaje. Windows CI, fokus kriptografskega QA in namestitveni CI PASS |

### Pomembna ugotovitev pri Windows QA

Stari Windows PowerShell testni ukazi so lahko predčasno zaključili, preden se je zagnan Windows GUI \`.exe\` dejansko iztekel. Prehod na \`Start-Process -Wait -PassThru\` je razkril dotlej prikrito napako pri prenosni obnovi; zeleni rezultati iz prejšnjih buildov zato **niso bili zadosten dokaz prenosne obnovitve**. Po preverjenem popravku se posnetek pridobi z \`SqliteConnection.BackupDatabase\` v namenski, prav tako SQLite3MC šifrirani začasni bazi, nato se preveri integriteta in datoteka odstrani.

- Osnovna Windows portable/static CI: [run #43860251667](https://github.com/ddcpark-coder/finai-ledger/actions/runs/43860251667), PASS.
- Kriptografski ciljni Windows CI: [run #43860251682](https://github.com/ddcpark-coder/finai-ledger/actions/runs/43860251682), PASS za šifriranje, prenosno obnovo, osnutke, pripravo in preverjanje ponovne namestitve.
- Polni Windows QA namestitveni postopek: [run #43860251753](https://github.com/ddcpark-coder/finai-ledger/actions/runs/43860251753), PASS. To vključuje namestitev, ustvarjanje šifriranega podjetja/naročila, ponovno namestitev iste izdaje in verificirano obnovo.
- Nova različica: \`0.1.1\`, **nepodpisani QA namestitveni program**, ne javna izdaja.
- Artefakt: \`finai-next13d-win-x64-offline-qa-unsigned\`, GitHub artifact ID \`14223645026\`, približno 254 MB ZIP, veljavnost predvidoma do **23. 11. 2026**.
- SHA-256 **setup.exe**: \`C39BDECFF29E183122FBD592CA9569506BC70A70EBBBD640BC49334C86D69510\`.
- SHA-256 **GitHub ZIP**: \`8a50c99251f5cdf13190713e25d3bfd0bac69c674c8f01bcc012e1b676756e73\`. Vsoti pripadata različnima datotekama.
- **Prejšnji nepodpisani 0.1.0 QA artefakt** je zastarel in se ne sme uporabljati za presojo prenosne obnove.

### Še odprto

- Windows: dejanska ročna čista Windows 11 namestitev brez interneta in **prehod 0.1.0 → 0.1.1** z ohranjenimi sintetičnimi podatki še nista preverjena; opravljena je ponovna namestitev iste 0.1.1 izdaje. Koda še ni podpisana za javno distribucijo.
- Mobilno: PWA sintetični konflikti so preglednejši; ni prave produkcijske dvosmerne sinhronizacije, kvalificiranega elektronskega podpisa ali shranjevanja resničnih podatkov.
- Shopify/WooCommerce: prilagojen je izmišljeni, strogo omejeni provider-shaped format; resnični webhooki, davki, PII, storno, popusti in varna shramba produkcijskih ključev ostanejo izključeni.
- Gostovanje: samostojni, dokazano izolirani FinAI OS/cPanel račun, namenski DB/TLS, povrnljiv deploy in obnovitev še niso potrjeni; pisanje na skupni \`laskot48\` je prepovedano.

Brez sprememb Laškoteke, STNG, skupnih cPanel/SSH/DNS, drugih podatkovnih baz ali produkcijskega gostovanja.
