# FinAI NEXT-02 — namestljiva mobilna terenska PWA (synthetic-only)

## Vključeno v aplikacijo

- Samostojni mobilni zaslon `/field/` s tremi sintetičnimi podjetji in fiksnimi demonstracijskimi dobavnicami.
- Ročno risanje podpisa, potrditev pregleda dobavnice in SHA256 preverjanje zamrznjenega sintetičnega dokazila.
- Lokalna šifrirana hramba (AES-GCM/PBKDF2 v IndexedDB, samo testni podatki), obnova z geslom, brisanje kopije in izvoz nepodpisanega PDF/JSON.
- Namestitveni PWA manifest s PNG ikonami 192/512 in skupnim šifriranim servisnim predpomnilnikom **samo javnih statičnih aplikacijskih datotek** (HTML terenskega zaslona, JS, CSS, fonti, ikone). PWA icon asseti in servisni delavec se ustvarijo ob gradnji statičnega Next.js izvoza.
- Service Worker je omejen na območje `/field/`; na zahteve za računovodske API-je, zasebne dokumente, druge poti aplikacije in prijave **ne odgovarja**. Ne predpomni podatkov o podpisu; dokazilo je ločeno šifrirano v IndexedDB.
- Po prvi uspešni online namestitvi ter predpomnjenju je mogoče zagnati terenski zaslon offline (na brskalnikih, ki omogočajo service worker). Stanje omrežja je samo informativno.

## Kaj ostaja neizvedeno

- Sinhronizacija ali samodejni upload terenskih dokumentov, uporabniška avtentikacija, revizija in produkcijska hramba.
- Kvalificirano elektronsko podpisovanje in identiteta prejemnika.
- Produkcijska PWA z verodostojnimi podatki in upravljanjem življenjskega cikla posodobitev. Lokalna hramba se lahko ob izgubi brskalniških podatkov izgubi.
- Različni brskalniki lahko namestitev ponujajo drugače; na iOS je potreben Safari → Deli → Dodaj na domači zaslon.

## Minimalni preizkusi

En namizni in en mobilni Playwright scenarij: prvi online obisk, aktiviran service worker, nato offline odprtje `/field/`, preklop sintetičnega podjetja in potrditev, da `/api/me` brez povezave ne dobi lažnega predpomnjenega odgovora. Gradnja uspe le, če so nabori statičnih datotek prisotni in manjši od 28 MiB.

FinAI je edini cilj. Brez sprememb Laškoteke, STNG ali gostovanja Hiper M.
