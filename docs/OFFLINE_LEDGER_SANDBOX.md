# OFFLINE-02A — lokalno računovodsko jedro, izključno testni sandbox

## Obseg te naloge

`desktop/windows/OfflineJournalSandbox.cs` doda prvo neodvisno, **notranjo testno** knjižbo za preverjanje invariantov lokalne dvo­stavne glavne knjige v SQLite. Ni izpostavljen kot gumb ali zaledni API uporabnikom. Vse operacije se izvajajo samo s sintetičnimi podatki v enkratni začasni mapi testa, ki se po zaključku izbriše.

To še **ni** prenos slovenskega kontnega načrta, komercialni ERP, knjigovodska revizijska sled ali varna produkcijska hramba; ne uporabljati za prave račune, davčne obveznosti, podjetja ali osebne podatke.

## Uveljavljena pravila

1. Vsaka testna knjižba ima veljaven UUID `company_id`, UUID `idempotency_key`, opis in 2–100 knjižnih vrstic.
2. Zneski so celoštevilski manjši EUR enoti (centi). Zahteva se en pozitivni znesek na debetni ali kreditni strani posamezne vrstice. Ni dovoljenih negativnih, ničelnih ali obojestranskih vrstic. Vsota debeta in kredita mora biti **točno enaka**; računanje uporablja `checked` preprečevanje integer overflow.
3. Vnos knjižbe in vrstic je atomaren v eni SQLite transakciji; delna neuspešna knjižba se ne sme ohraniti.
4. Konti imajo sestavljeni ključ `company_id+code`. Knjižba ne more uporabljati konta drugega podjetja; dvojnik `company_id+idempotency_key` je prepovedan.
5. Objavljene knjižbe/vrstice ne smejo biti neposredno posodobljene ali izbrisane (SQL `BEFORE UPDATE/DELETE` trigger); storno je nova uravnotežena knjižba z referenco na original in unikatno povezavo.
6. Vsi pregledi zahtevajo `company_id`; poizvedba drugega podjetja za prvotno knjižbo vrne prazno. **Ta vmesnik še ne izvaja avtentikacije uporabnikov ali popolne izolacije podjetij.**

## Testi

`EIntegrator.Desktop.exe --ledger-self-test`:

- ustvarjanje dveh sintetičnih podjetij in kontov;
- veljavna dvostavna knjižba in ponovni zagon SQLite;
- zavrnitev neuravnotežene knjižbe;
- zavrnitev uporabe konta tujega podjetja;
- zavrnitev podvojene idempotency oznake;
- storno z obrnjenima debet/kredit vrednostma;
- zavrnitev neposrednega UPDATE knjižbe;
- brez produkcijskih omrežnih povezav, brez dostopa do Hiper M/Laškoteke.

Test se samodejno izvede znotraj Windows GitHub Actions, `finai-hiperm-desktop-build.yml`, poleg prejšnjega SQLite/DPAPI testa.

## Pogoji pred OFFLINE-02B produkcijsko razširitvijo

- Celotna šifrirana SQLite/SQLCipher baza, per-user/per-company avtentikacija, rezervne kopije in izvoz/obnova med napravami. Trenutni testni ledger `journal-sandbox.db` namenoma ni šifriran, vendar obstaja samo v naključno ustvarjeni kratkotrajni testni mapi.
- Slovenska/euro davčna in računovodska pravila (rounding, obdobja, storno, dokumenti), nespremenljiva revizijska sled, sekvence številčenja in soft-close periodi.
- Kanonične skupne testne vektorje izvajata tako Laravel na Hiper M kot samostojni Windows engine; odstopanje pomeni FAIL.
- Napredna varnost: naprave, uporabniške vloge, zanesljivo šifriranje in backup; brez realnih podatkov pred tem.
- Šele nato OFFLINE-03: sinhronizacija in konflikti; uporabnik lahko brez interneta dela, vendar online FURS/banke/oddaja zahtevajo zvezo.

Povezane naloge: #43 (OFFLINE-02), #44 (OFFLINE-03), #45 (namestitev), #46 (Hiper M).
