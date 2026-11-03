# UX-CONTEXT-04 — Pomnjenje položaja in neposredne povezave

## Izvedeno
- URL shrani tri nivoje: `module` (stabilen module key), `view` in `subview`.
- Deljenje pogleda: »Kopiraj povezavo« ustvari poln URL do trenutnega modula in podpogleda.
- Ob nalaganju strani ima veljaven URL prednost pred nazadnje shranjenim pogledom.
- Ob odsotnosti URL-parametrov se obnovi zadnji pogled za aktivno demonstracijsko podjetje; na prvi obisk se odpre nadzorna plošča.
- Klik po modulih in podnivojih ustvari posamičen vnos v zgodovini brskalnika.
- `popstate` (Nazaj/Naprej) obnovi aktivne gumbe in vsebino brez dodajanja novega history vnosa.
- »☆ Pripni pogled« shranjuje največ 8 priljubljenih pogledov.
- Priljubljeni in zadnji pogled so shranjeni lokalno pod `finai:context:demo-user:company-{id}`.
- Preklop podjetja naloži njegove priljubljene in, če obstaja, njegov nazadnje uporabljeni pogled.
- Preverjanje poti ne dovoli neobstoječega modula; za zastarel/napak zapis podmodula izbere veljavno privzeto možnost.
- Ohranja druge query parametre in URL fragment pri generiranju povezav.

Primer deljive povezave:
`/?module=vat&view=DDV+evidence&subview=Vstopni+DDV`

## Hitrost in varnost
- To je lahek, izključno klientni mehanizem; ne dodaja novih API zahtev ali nalaganja poslovnih modulov.
- Zgodovina brskalnika uporablja `pushState` / `popstate`, ne preusmeritev in ne polnega ponovnega nalaganja.
- URL vsebuje samo identifikator modula in javna imena pogledov, **ne** davčnih podatkov ali identifikatorjev dokumentov.
- Pomnjenje v `localStorage` je **demo rešitev**, vezana na brskalnik, ne na prijavo v resničnem Laravel backendu.
- Pri produkciji se preference shranijo v profilu uporabnika in podjetja ter preverjajo po strežniških dovoljenjih.
- Povezava do podpogleda ni dovoljenje za dostop. Pred dejanskim API branjem podatkov bo potreben tenant RBAC.

## Testi
`node --test tests/contextRoute.test.mjs`

Pokrito:
1. privzeti pogled;
2. neposredna povezava s šumniki;
3. neveljaven modul;
4. zastarel/neveljaven podpogled;
5. ohranjanje drugih URL parametrov;
6. odstranjevanje dvojnih/neveljavnih priljubljenih;
7. omejitev osmih priljubljenih.

Next.js build preveri sestavljanje frontenda; polno ročno testiranje klikanja, uporabe zgodovine in mobilnega prikaza je ločen QA.
