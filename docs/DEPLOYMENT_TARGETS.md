# FinAI — ciljni načini izdaje (potrjeno 8. 11. 2026)

**Hiper M je edina načrtovana spletna produkcija. Windows namizna različica mora biti samostojna in delovati tudi brez internetne povezave. Vercel ni produkcijsko gostovanje.**

## Hiper M — spletna produkcija

- `e-integrator.si`: obstoječa statična predstavitvena stran, HTTPS 200.
- `app.e-integrator.si`: predvidena spletna uporabniška aplikacija z Next.js **statičnim izvozom** `out/` in brez potrebe po stalnem Node.js procesu na Hiper M.
- `api.e-integrator.si`: predvideni Laravel 13 / PHP 8.4 API in MariaDB 10.11, z javnim docroot samo `backend/public`.
- Pred pravo uporabo je potreben **ločeni Hiper M račun**, ločena baza, TLS, zaščiten Laravel identitetni sistem, verified backup/restore, migracije in varnostni QA. Trenutni `laskot48` račun gosti tudi Laškoteko; avtomatizirane pisalne objave niso dovoljene.
- Lokalni cPanel UAPI zaradi izhodne kode 2 ostaja blokiran (issue #41). DNS `app/api` **ne usmerjaj na Vercel**; najprej preveri obstoječe DNS in docroot v Hiper M.

## Namizna izdaja — Windows brez interneta

- Isti statični Next.js UI se zgradi v GitHub CI, vendar je **priložen in naložen lokalno** iz namestitvenega paketa.
- Windows .NET 10/WebView2 je nativni odjemalec z lokalnim SQLite storage slojem; za OFFLINE-01 omogoča zgolj preizkusne lokalno šifrirane osnutke.
- Namestitveni program vsebuje self-contained .NET in polni Microsoftov WebView2 offline runtime; ni obvezne povezave na Hiper M za zagon.
- Vse resnične poslovne operacije, offline davčne evidence, revizijska sled, podjetja, varnostne kopije in sinhronizacija so nadaljnji **OFFLINE-02/03** (issues #43/#44), ne del končanega OFFLINE-01.
- Namizni namestitveni program je za zdaj nepodpisan **interni QA artefakt**, ne komercialna izdaja (issue #45).

## Vercel — zgolj zaščiten development preview

- Ni produkcijski hosting, nima pravice do resničnih finančnih/osebnih podatkov; SSO = `all`.
- Prejšnja povezava domene `app.e-integrator.si` v Vercelu je ostanek napačne predpostavke; DNS zanjo ni bil spremenjen. Povezavo je treba odstraniti v namenskem prihodnjem administrativnem koraku, ne usmerjati DNS k Vercelu.
- `vercel.json` za zdaj onemogoča samodejno objavo na `main`; ne odstrani blokade zaradi samodejnega builda.

## Tok razvoja

`feature/* → ciljna CI preverjanja → pregled → main → varovana izdelava Hiper M / samostojna Windows izdaja`.

Ločene produktne poti delijo pogodbe in domenska pravila, ne produkcijskih skrivnosti. Za realne podatke ostajajo vse izdaje blokirane do izpolnitve testov in zahtev v `docs/OFFLINE_FIRST_ARCHITECTURE.md`.
