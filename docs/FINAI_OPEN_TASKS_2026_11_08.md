# FinAI / e-integrator.si — pregled odprtih nalog in dejanskih rezultatov (8. 11. 2026)

## Potrjena usmeritev

1. **Spletna produkcija:** izključno Hiper M, ne Vercel.
2. **Namizna aplikacija:** samostojen Windows program in namestitveni paket; uporabnik mora delati **brez interneta**. Lokalno shranjevanje je obvezno.
3. **Sinhronizacija:** šele ko je omrežje na voljo, varno in po potrditvi računovodskih pravic; ni pogoj za offline zagon.
4. **Laškoteka:** ne sme biti prizadeta; do ločenega gostovalnega računa FinAI ni pisalnih CI pravic na skupnem `laskot48` računu.

## Potrjeno v tej fazi

| Opravilo | Rezultat in dokaz |
|---|---|
| Predstavitvena spletna stran `e-integrator.si` | Objavljeno na Hiper M, HTTPS 200 |
| OFFLINE-01: Next.js izvoz brez Node strežnika | **PASS**, GitHub Actions run [42507758209](https://github.com/ddcpark-coder/finai-ledger/actions/runs/42507758209) |
| OFFLINE-01: Windows samostojna aplikacija | **PASS** kompilacije, self-contained `.NET 10`, lokalni WebView2 UI |
| OFFLINE-01: SQLite/Windows DPAPI demo osnutki | **PASS** avtomatskega save/reopen/delete in preverjanje, da označevalec ni v jasnem besedilu |
| OFFLINE-01: popoln namestitveni paket brez omrežnega prenosa runtime | **PASS** sestavljanja, Microsoft WebView2 Standalone Installer digitalno preverjen |
| OFFLINE-01: statični UX desktop/mobile | **PASS**, [run 42507758197](https://github.com/ddcpark-coder/finai-ledger/actions/runs/42507758197) |
| OFFLINE-01: združitev v GitHub main | PR [#42](https://github.com/ddcpark-coder/finai-ledger/pull/42), squash `1f4d1571cb99f93c4ec7d74fce423fa381448026` |
| SSH read-only status / varovalo | **PASS** po nadgradnji, [run 42499264894](https://github.com/ddcpark-coder/finai-ledger/actions/runs/42499264894) |
| Produkcijska objava ali migracije v Hiper M | **NI IZVEDENO** (namenoma blokirano) |
| Dejanski offline GUI na fizičnem Windows 11 | **NI PREVERJENO**, treba ga je testirati lokalno |
| Računovodske knjižbe in sinhronizacija offline | **NI IZVEDENO**, ne uporabljati pravih podatkov |

### Installer artefakt za notranji QA

- **GitHub Actions:** [Windows offline installer run 42507758209](https://github.com/ddcpark-coder/finai-ledger/actions/runs/42507758209).
- Artefakt: `eintegrator-win-x64-offline-installer-unsigned-review`; originalni build SHA `7c2b5d20c4e5551a979e3aac8475939568b3cdf2`, znotraj istega PR.
- Artefakt (ZIP) po GitHub retention politiki poteče **15. 11. 2026**, če ni prenesen. ZIP velikost približno 253 MB.
- Sam installer EXE SHA256: `44228B70491B32CE4C73958F0CA4AFB15A3797B79F001B20B470B5E2CB6480F0` po Windows CI.
- **Nepodpisan; dovoljen samo sintetični QA**, ne javna prodaja ali resnični finančni podatki. Poln WebView2 runtime je v paketu; uporabnik med normalnim delom ne potrebuje povezave na splet.

## Odprte naloge po prioritetah

| Prioriteta | Naloga | Status/blokada |
|---|---|---|
| P0 | [OFFLINE-02 #43](https://github.com/ddcpark-coder/finai-ledger/issues/43): pravo lokalno dvostavno knjiženje, izolacija podjetij, šifrirana baza in preverjena obnova | Obvezno pred realnimi podatki |
| P0 | [OFFLINE-03 #44](https://github.com/ddcpark-coder/finai-ledger/issues/44): varna dvosmerna sinhronizacija in reševanje konfliktov | Odvisno od OFFLINE-02 in varnega Laravel API |
| P0 | [HOSTING-02 #46](https://github.com/ddcpark-coder/finai-ledger/issues/46): samostojen Hiper M račun, TLS, app/api DNS na Hiper M, Laravel, MariaDB in backup/restore | Skupni račun še ni izoliran |
| P1 | [DESKTOP-02 #45](https://github.com/ddcpark-coder/finai-ledger/issues/45): podpis Windows paketa, namestitveni in offline device QA, posodobitve in povrnitev | Internal unsigned build PASS |
| P1 | [BACKEND-06-REBASE #47](https://github.com/ddcpark-coder/finai-ledger/issues/47): selektivni prenos varnostnih/migracijskih popravkov iz starega draft PR #35 | Ne združi stare verige vej neposredno |
| P1 | [SITE-EI-02 / cPanel UAPI #41](https://github.com/ddcpark-coder/finai-ledger/issues/41): `uapi` exit 2, bralni DNS pregled in docroot | Čaka pojasnilo Hiper M; možno tudi ročno Zone Editor |
| P2 | Razvoj offline/online funkcionalnih modulov, UI, mobilni podpis, FURS, integracije, DDV poročila, OCR | Odvisni od podatkovnih modelov, varnosti in konformančnih testov |

Stari draft PR #36 je zaradi nadomeščene SSH infrastrukture **zaprt kot zastarel**; PR #34 in #35 ostajata zgodovinska osnutka, uporabne spremembe je treba selektivno prenesti na aktualni `main`, da ne obnovimo napačne Vercel produkcijske arhitekture.

## Stroge varovalke

Nobene produkcijske spremembe na Laškoteki, `public_html`, MariaDB ali DNS drugih aplikacij. Vercel `app.e-integrator.si` custom-domain binding je še treba varno odstraniti; **ne ustvarjati CNAME na Vercel**. Login in FURS integracije brez testov ostanejo izključene. Vsi primeri in trenutni QA so testni in ne pomenijo računovodske pravilnosti.


## OFFLINE-02A – osnovni testni ledger (dodatno potrjeno)

- PR [#48](https://github.com/ddcpark-coder/finai-ledger/pull/48) združen na `main`, merge SHA `6957c98e90266f3d330e07dcc40d2cc8cc65475d`.
- GitHub Actions [run 42532940971](https://github.com/ddcpark-coder/finai-ledger/actions/runs/42532940971) – **static-web PASS + windows-desktop PASS**.
- `OfflineJournalSandbox` vsebuje interno **nešifrirano testno** SQLite shemo v začasni mapi, z natančnimi centnimi debet/kredit invarianti, podjetjem ločenimi konti in vrsticami, idempotency omejitvami, atomarnostjo, storno ter zaščito pred neposrednim UPDATE/DELETE in pred naknadnim dodajanjem vrstic v zapečateno knjižbo. Vse je namenjeno sintetičnim testom; v UI ni gumba za dejansko knjiženje.
- OFFLINE-02 (#43) ostaja **odprta**, ker produkcijsko varno šifriranje, prijava, večuporabniški režim, backup/restore, DDV pravila in popolna revizijska sled niso izvedeni. OFFLINE-03 (#44), DESKTOP-02 (#45) in HOSTING-02 (#46) prav tako ostajajo odprte.

## 9. 11. 2026 – OFFLINE-02B: varne kopije testnih osnutkov

- Implementacija združena v `main` prek [PR #49](https://github.com/ddcpark-coder/finai-ledger/pull/49), SHA `7b74610c78a561b393c7cbe13935667e4f0373f8`.
- [Windows CI run 42582135200](https://github.com/ddcpark-coder/finai-ledger/actions/runs/42582135200): **static-web=PASS**, **windows-desktop=PASS**; `FINAI_OFFLINE_DRAFT_BACKUP_RECOVERY=PASS`, `FINAI_OFFLINE_LEDGER_INVARIANTS=PASS` in `FINAI_WINDOWS_DESKTOP_COMPILE=PASS`.
- Izvedeno: lokalni Windows gumba `Shrani kopijo` in `Obnovi kopijo`; prenosna šifrirana testna kopija z PBKDF2-HMAC-SHA256 (600.000 ponovitev) in AES-256-GCM; autentikacija pred obnovitvijo; uvoz samo v prazno SQLite zbirko, v eni transakciji, brez prepisovanja obstoječih datotek.
- Preizkušeno: 103 sintetični osnutki (presežejo 100 prikazanih), ponovni zagon, napačna fraza, poškodovana glava/šifrirani podatki, prekinjena datoteka, obstoječa ciljna datoteka in zavrnitev uvoza v neprazno zbirko.
- Izvorni demo SQLite še vedno šifrira **posamezne vsebine prek Windows DPAPI**, ne cele baze. `OfflineJournalSandbox` je še vedno nešifriran testni engine v začasni mapi; ni povezan z varnostnimi kopijami ali UI. **Ne uporabljaj realnih podatkov.**
- `OFFLINE-02 #43` ostaja odprta za vzdrževano celostno šifriranje SQLite, pravilno avtentikacijo, podjetja/uporabnike, obnovitev resničnih podatkov in konformančne računovodske teste. `OFFLINE-03 #44` sinhronizacija še ni izvedena.
- Podroben protokol: `docs/OFFLINE_02B_PORTABLE_DRAFT_RECOVERY.md`. Fizični GUI QA na Windows 11 in ločena obnova na drugem Windows uporabniku/računalniku **še nista potrjena**.
