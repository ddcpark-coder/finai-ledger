# FinAI MOBILE-SIGN-DEMO-01: demonstracijsko podpisovanje dobavnic

Cilj: mobilni uporabnik ali prejemnik s prstom/pisalom zajame podpis k sintetični dobavnici in izrecno potrdi prevzem. **Ni** kvalificiran elektronski podpis (QES), napredni podpis (AdES), validiran eIDAS postopek ali podpisan PDF.

### Izvedeno
- Vnos imena, demonstracijske e-pošte, risanje podpisa, ločen checkbox s potrditvijo pregleda dobavnice.
- Enaka zamrznjena sintetična dobavnica za posamezno podjetje: dokument, postavke in identiteta podjetja so del zapisa.
- Browser WebCrypto izračuna SHA-256 *dokumenta*, *slike podpisa* in *skupnega dokaznega zapisa* ter zabeleži UTC čas.
- Prikaz prejetih hash vrednosti in možnost lokalnega izvoza JSON dokaznega paketa. Uporabnik lahko preveri integriteto paketa, vendar paket ni neizpodbitno dokazilo o identiteti podpisnika.
- Ni POST/PUT/PATCH zahtevkov, shranjevanja na strežnik, pošiljanja e-pošte, zajema IP, geolokacije ali fotografij.
- Podjetja imajo ločene sintetične dobavnice, menjava podjetja ponastavi lokalni podpis in dokazilo.

### Še ni izvedeno (produkcijski pogoji)
- Dejanski PDF z dokumentom in podpisom (ter PDF-A/PAdES, če zahtevano).
- Pravno ustrezna identifikacija podpisnika, varovan časovni žig, revizija, podpisne izjave.
- Offline šifrirana trajna mobilna hramba in varna sinhronizacija.
- Elektronsko pošiljanje kopije in mobilno podpisovanje s povezavo za zunanjega prejemnika.
- Izoliran FinAI strežnik / zasebna hramba / obnovitev / pravni QA in ponudnik kvalificiranih storitev zaupanja.

Uporabljajo se samo sintetični podatki, brez posegov v Laškoteko, STNG in skupne cPanel/SSH nastavitve.
