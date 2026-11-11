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
- Produkcijski podpisani PDF z verodostojno identiteto, revizijo, ustreznim PDF-A/PAdES, če zahtevano. Demonstracijski *nepodpisani* PDF s sliko ročnega podpisa je na voljo za lokalni prenos, ni pa produkcijsko dokazilo.
- Pravno ustrezna identifikacija podpisnika, varovan časovni žig, revizija, podpisne izjave.
- Offline šifrirana trajna mobilna hramba in varna sinhronizacija.
- Elektronsko pošiljanje kopije in mobilno podpisovanje s povezavo za zunanjega prejemnika.
- Izoliran FinAI strežnik / zasebna hramba / obnovitev / pravni QA in ponudnik kvalificiranih storitev zaupanja.

Uporabljajo se samo sintetični podatki, brez posegov v Laškoteko, STNG in skupne cPanel/SSH nastavitve.

## Nadaljevanje — DEL-PDF-DEMO-02 (namizje + mobilno)

- Po uspešnem zaključku demonstracijskega prevzema lahko uporabnik prenese **nepodpisani demonstracijski PDF** s podatki sintetične dobavnice, risano sliko podpisa, zabeleženim časom in hash vrednostmi dokaznega JSON.
- PDF nastane **lokalno v brskalniku** s knjižnico `pdf-lib@1.17.1`; pred generiranjem se znova preveri podjetje in nespremenjenost dokazila. Prenos ni strežniški API, v javni ali zunanji shrambi ne ostane nobena kopija.
- Opozorilo: slika podpisa v PDF ni digitalni podpis, PDF ni kvalificiran ali časovno overjen. PDF in JSON se lahko po prenosu spreminjata, zato dokazni paket in vsebina potrebujeta prihodnje varno podpisovanje, revizijo ter hrambo.
- V prvi demonstracijski izdaji so posebni slovenski znaki v osnovnih PDF pisavah poenostavljeni v ASCII zaradi omejitve vgrajene Helvetica pisave. Pred realno uporabo obvezna vdelana licenčno urejena Unicode pisava.
- Na mobilnih zaslonih so pomembna polja/gumbi podpisnega obrazca povečani; na namizju ostane isti postopek in prilagodljiva dvookenska razporeditev.
- Ciljni QA: štirje testi dokazila, dva PDF testa, namizni/mobilni prenos datoteke ter preverba, da ni POST/PUT/PATCH/DELETE omrežnih zahtevkov.
