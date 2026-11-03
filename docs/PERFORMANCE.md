# FinAI Ledger — Performance Budget

## Temeljno pravilo
Hitrost delovanja je produktna funkcija. Performance se načrtuje v arhitekturi in se ne prepušča zaključni optimizaciji.

## Frontend budget
Cilji za produkcijski frontend na običajnem poslovnem računalniku in sodobnem telefonu:
- shell / navigacija: takojšen interaktiven odziv
- route/module transition: zaznan odziv < 100 ms, če je modul že v cache-u
- težki modul: lazy load, ne initial bundle
- interakcije: brez dolgih main-thread blokad
- tabele: virtualizacija pri večjih seznamih
- debounce za iskanje in filtre
- slike/dokumenti: thumbnail/preview derivati, ne originali

## Backend budget
- tipične read poizvedbe: cilj p95 < 250 ms brez zunanjih integracij
- tipične write operacije: cilj p95 < 500 ms brez zunanjih integracij
- zunanji API/OCR/AI/FURS: asinhrono, kadar ni nujno za trenutni response
- noben velik export/report/OCR ne sme blokirati interaktivnega requesta

## MariaDB
Vsaka nova tabela mora imeti indekse za:
- company_id / tenant scope
- status
- datumske filtre
- foreign keys uporabljene v list pogledih

Prepoved:
- N+1 query pattern
- neomejeni SELECT *
- neomejena paginacija
- full-table search na večjih tabelah brez ustreznega indeksa/search strategije

## API
List endpointi:
- cursor ali omejena paginacija
- privzeti page size 50
- največ 200 brez posebnega export endpointa
- eksplicitno izbrane kolone
- conditional caching za read-heavy reference podatke

## Cache
Primerni cache kandidati:
- module registry
- permissions
- chart of accounts
- tax codes
- company settings
- static reference data

Finančne salde, statuse oddaj in podobne časovno občutljive vrednosti se cache-a samo z jasno invalidacijo.

## Jobs
V job/queue sloj sodijo:
- OCR
- AI extraction
- PDF generation
- e-mail
- FURS polling
- large exports
- document thumbnails
- batch imports
- BI recomputation

## Merjenje
Vsaka večja faza mora preveriti:
1. build size trend
2. počasne poizvedbe
3. število queryjev na ključni workflow
4. odzivnost mobile UI
5. regresije initial load-a

## Prag za release
Performance regresija brez funkcionalne nuje blokira release enako kot funkcionalna napaka.
