# FinAI NEXT-21 — skupni sintetični podatkovni model CRM, trgovine, skladišč, naročil in analitike

## Namen in dejanska funkcionalnost

Pred NEXT-21 sta modula Integracije in Zaloge ob navigaciji izrabila ločeno lokalno stanje, CRM pa svoj prodajni lijak. To je preprečevalo sledenje istemu demonstracijskemu naročilu med moduli.

Novi `app/next11/sharedDemoCompany.mjs` omogoča **enoten, nespremenljiv model po podjetjih** za trenutno odprti brskalniški zavihek. Omogočen je *samo* nabor sintetičnih podjetij 1, 2 in 3. Posamezna sprememba ustvari novo verzijo skupnega podjetja, obstoječe podatke zaščiti pred nenamerno mutacijo in obvesti odprte React poglede. Podatki ostajajo **izključno v pomnilniku** in se ob ponovnem nalaganju strani ponastavijo. Ni API-ja, IndexedDB, localStorage, skrivnosti ali kakršnekoli povezave z resničnimi podatki.

Sklop je integriran v:

- **Integracije:** Shopify/WooCommerce testna naročila, `review`, `reviewed`, `hold`, napoved pomanjkanja po SKU in skladišču, reset samo za demonstracijsko trgovinsko/skladiščno domeno;
- **Zaloge:** medskladiščni premiki spreminjajo isti sintetični skladiščni model in napoved kot Integracije; novi skupni KPI-ji so nad starejšo, še vedno ločeno statično tabelo;
- **CRM:** spremembe faz in opomniki so ohranjeni med prehodi med moduli; reset CRM ne izbriše naročil in zalog; povezava z lokalnim testnim CRM lahko prevzame le enako ali novejšo verzijo in ne sme tiho povrniti starega podatka;
- **Naročila:** operativni povzetek prikazuje naročila iz Integracij, brez mešanja z neodvisnim starejšim prikazom vzorčnega CMS uvoza;
- **FinAI Intelligence:** ločen operativni povzetek vključuje CRM napoved, število trgovinskih naročil, njihovo *neknjiženo* vrednost in napoved pomanjkanja. Zgodovinski demo grafikon prihodkov in stroškov ostaja ločen model — ne prištevamo ga trgovinskim naročilom.

### Pomembna pravila

- Vrednosti trgovinskih naročil niso računovodski prihodki; `posting=false`, `inventoryReserved=false`. Ni fiskalizacije, rezervacij, prodaje ali dejanskih skladiščnih premikov.
- Podjetja so izolirana: tuje enote, skladišča, CRM priložnosti in aktivnosti se zavrnejo, ne združujejo.
- Prikaz podpira enoto `all` oziroma samo dovoljeno poslovno enoto podjetja; enot podjetij ni dovoljeno mešati.
- Ponastavitev domen ne poškoduje drugega dela skupnega modela. Celoten model je namenoma omejen na **eno sejo zavihka**, ne pa sinhronizaciji med brskalniki.
- V izhodiščnih pogledih `CrmWorkspace`, `SalesOrdersWorkspace` in `InventoryWorkspace` so še prisotni nekateri **starejši neodvisni statični vzorci**. Novi skupni povzetki jih jasno označijo; to ni lažna produkcijska usklajenost.

## Ciljni sintetični QA

- `tests/sharedDemoCompany.test.mjs`: nespremenljivost modela, isti poslovni podatki v petih modulih, zadržana naročila, CRM stage/version, skladiščne bilance, ločitev podjetij in dovoljenih poslovnih enot, domenno ločeno ponastavljanje ter zavrnitev napačne identitete.
- `tests/e2e/next21-shared-company.spec.cjs`: sintetično naročilo → Zaloge → preusmeritev → Integracije → Naročila → CRM → preverjanje drugih podjetij; brez HTTP pisalnih zahtevkov. Ponovni zagon strani ponastavi podatke.
- `finai-next11-operations-qa.yml`: ciljni Node testi in samostojna statična gradnja; obstoječi browser QA zajame interakcijo namiznih in emuliranih mobilnih zaslonov.

## Naslednja faza

Povezati pristne enotne tabele in transakcijski model v izoliranem Laravel/MariaDB FinAI z revizijsko sledjo, dovoljenji po podjetju, optimističnimi ključavnicami, atomarnim skladiščnim knjigovodstvom, preverjenimi temeljnicami, pravilnim DDV in zakonodajo RS/EU. Šele nato lahko zamenjamo preostale statične vzorce ter uporabimo resnične podatke.

**Brez strežniških objav.** Skupni Hiper M `laskot48` je samo read-only. Laškoteka, STNG in vse skupne datoteke, baze, DNS, SSL, SSH, cPanel in backupi ostajajo nedotaknjeni.
