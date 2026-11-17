# FinAI NEXT-22 – Laravel skupni sintetični poslovni graf

## Stanje in obseg

Ta faza poveže **obstoječe podatke Laravel** (izolirane sintetične CRM priložnosti in PII-free testna Shopify/WooCommerce naročila) z novo, **izključno načrtovalno** skladiščno tabelo in revizijsko sledjo. Namen je pokazati dejanske povezave in identifikatorje v podatkovni bazi brez izvajanja inventurnih ali računovodskih transakcij.

### Canonical ID

Vsak zapis vrne enoličen identifikator po podjetju:
- `SYN:C<companyId>:CRM:<rowId>` – testna CRM priložnost;
- `SYN:C<companyId>:ORDER:<rowId>` – testno trgovinsko naročilo;
- `SYN:C<companyId>:PLAN:<rowId>` – **predlog** medskladiščne prerazporeditve, ne dejanski premik;
- `SYN:C<companyId>:AUDIT:<rowId>` – revizijski zapis.

Zapisi načrta vsebujejo preverjeni povezavi `order_ref` in `crm_ref`; revizijski zapisi vsebujejo `entity_ref`. SQL vsako povezavo preveri glede na **dejansko lastništvo podjetja**, ne zgolj predpono besedila. Končnim uporabnikom se ne izdajajo surovi podatki ponudnikov, osebni podatki, gesla ali vsebina revizijskih metapodatkov.

### API – samo lokalni testi

`GET /api/companies/{companyId}/demo/business-graph?limit=20` – omejen read-only posnetek treh domen in relevantnih revizijskih zapisov, do 50 zapisov na domeno. Podjetju se vrnejo le njegovi objekti in povezana revizija.

`POST /api/companies/{companyId}/demo/business-graph/stock-plans` – preverjen sintetični predlog med skladiščema. Zahteva natanko `demoOnly`, `eventId`, `sourceWarehouseId`, `targetWarehouseId`, `commerceOrderId`, `crmDealId`, `sku`, `quantity`. Povezana CRM priložnost in trgovinsko naročilo morata že obstajati v istem podjetju; naročilo mora biti brez knjiženja in ne sme biti zadržano; SKU ter količina morata biti skladna z naročilom. Idempotentna ponovitev istega dogodka ne podvaja načrta ali revizije. Konflikt ali manjkajoč revizijski zapis ustavi in povrne celotno transakcijo.

### Obvezna zaščita

- Route middleware: prijavljena seja `auth:web`, potrjen e-naslov, `RequirePrivilegedTwoFactor`, omejitev zahtevkov.
- Podjetna `Gate(company.access)` in posebna dovoljenja `crm.read`, `orders.read`, `inventory.read`; za vnos še `inventory.write`.
- **Tri neodvisne zastavice** morajo biti vključene, privzeto so vse izključene: `FINAI_SYNTHETIC_BUSINESS_GRAPH_ENABLED`, `FINAI_SYNTHETIC_COMMERCE_STAGING_ENABLED`, `FINAI_SYNTHETIC_CRM_PERSISTENCE_ENABLED`.
- Dodatna nespremenljiva zavrnitev zunaj `APP_ENV=local/testing`, tudi če so zastavice vključene.
- **Nič zapisov v `inventory_movements`, `inventory_balances`, `inventory_reservations`, `sales_orders`, `journals` ali na pravi spletni trgovini**. Gre za demonstracijsko bazo načrtov, ne skladiščni prenos ali davčni dokument.

### Dokazila in znane omejitve

`backend/tests/Feature/Next22UnifiedBusinessGraphTest.php` preverja dejanske DB zapise v izoliranem SQLite, tri domene, pooblastila in odpravo članstva med sejami, zavrnitve tujih referenc, sprememb/podvajanja dogodkov, koruptiranih vrstic ter atomarni rollback brez revizije. Obstoječi Laravel Feature CI zajema iste kritične odvisnosti.

Backend API je **prvi povezani podatkovni sloj**, ne objavljena rešitev. V razdelku **Integracije** je dodan gumb **»Preberi povezane sintetične zapise iz Laravela«**: samo v lokalnem istem izvoru, po prijavi in ročnem pritisku, s strogim preverjanjem podjetja in dovoljenih kanoničnih referenc. Ločeno pokaže CRM, naročila, skladiščne načrte in revizijo. Ta pregled ne spreminja obstoječega Next.js pomnilniškega demonstracijskega modela in ne pošilja pisalnih zahtevkov. Testni odjemalec je opisan v `app/next11/syntheticBusinessGraphClient.mjs`, preverjen v `tests/syntheticBusinessGraphClient.test.mjs`. Podjetja, pravice, revizija in inventura s pravimi podatki zahtevajo kasnejšo produkcijsko pripravo.

**Gostovanje:** FinAI `laskot48` le read-only. Laškoteka, STNG, skupne cPanel/SSH/DNS/SSL/DB nastavitve in varnostne kopije so nedotaknjene. Na Hiper M ni bilo pisalne objave ali migracije.
