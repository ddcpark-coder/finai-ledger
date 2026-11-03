# FinAI Ledger

FinAI Ledger je modularna AI-podprta poslovno-računovodska platforma za slovenska podjetja in računovodske servise.

## Trenutno stanje — november 2026
- Next.js 16 frontend: funkcionalen demonstracijski predogled na Vercelu, z moduli, navigejsko hierarhijo in demonstracijskimi podatki.
- Laravel 13/PHP 8.4 backend: dejanski zagon in osnovni identitetni/preferences API je dodan pod backend/ ter preverjen v CI.
- Obsežnejši ERP backend moduli (računovodstvo, eDavki, banka, zaloge itd.) še niso integrirani v popolnoma delujoče HTTP API-je.
- Dejanska MariaDB na Hiper M, migracije vseh ERP področij, 2FA in sinhronizacija z Vercelom še niso aktivirani.
- Ne uporabljaj demonstracijskega okolja za resnične poslovne, finančne ali osebne podatke.

## Arhitektura
- Frontend: Next.js/React na Vercelu za preview in UX QA.
- Backend: Laravel 13, PHP 8.4, Sanctum + session auth.
- Ciljna produkcijska podatkovna baza: MariaDB 10.11 na Hiper M.
- Tenant izolacija: company_id, članstvo company_user in obvezno strežniško preverjanje pravic.
- Delovanje: lazy-loaded moduli in materializirani pregledi, kjer je upravičeno.

## Navodila
- backend/README.md — zagon Laravela in varnostni pogoji za Hiper M.
- docs/WORKSPACE_PREFERENCES_BACKEND.md — zaledna shema in meje sinhronizacije.
- docs/QA_DESKTOP_MOBILE_01.md — rezultati frontend QA.
- docs/UX_CONTEXT_04.md — navigacija, neposredne povezave, priljubljeni.

## Razvoj
Izvorna koda se verzionira v GitHub. Vercel samodejno gradi frontend ob spremembah.
Zaledni Laravel testni pipeline ne uporablja produkcijske baze. Skrivnosti, certifikati in produkcijske poverilnice nikoli ne sodijo v repozitorij.

Vsa produkcijska namestitev Hiper M je ločen varovan korak z obnovitveno točko, minimalnimi testi in izrecno potrditvijo ciljne infrastrukture.
