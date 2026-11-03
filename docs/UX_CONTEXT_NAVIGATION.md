# FinAI — večnivojska kontekstna navigacija (UX-CONTEXT-02)

## Cilj
Zgornja navigacija združi module, podmodule in tretji nivo v jasno, hitro in barvno povezano hierarhijo.

## Vizualna pravila
- 2. nivo: okvirjeni gumbi, najmanj 39 px višine
- 3. nivo: okvirjeni gumbi, najmanj 34 px višine
- aktivni gumb 2. nivoja določi barvni ton skupine
- VSI gumbi 3. nivoja prevzamejo isti barvni ton v okvirju/ozadju
- izbrana možnost 3. nivoja ima močnejše polnilo in poudarjen rob
- stanje ni označeno samo z barvo: aktivni gumb ima tudi večjo vizualno težo
- mobilno: horizontalno drsenje brez prelamljanja

## Funkcionalno povezano v trenutnem previewu
- Knjiženje: temeljnice, glavna knjiga, kontni načrt, obdobja, stroškovna mesta
- DDV in poročila: pregled, evidence z izborom smeri, DDV-O, RP-O, kontrole, obdobja, oddaja
- CRM: pipeline, lead-i, kontakti, aktivnosti in napoved
- Artikli in ceniki: katalog, ceniki, dobavitelji, računovodske povezave, zaloga
- Nabava: pregled naročilnic, potrebe, povpraševanja, ponudbe dobaviteljev, prevzemi in 3-way match
- Zaloge: stanje, premiki, rezervacije, skladišča, inventura in opozorila
- Projekti: pregled, naloge, delovni nalogi, čas, material, finance in dokumenti

### Omejitve
- To so prikazni podatki in interaktivni previewi; frontend build ni dokaz delovanja Laravel API-jev ali produkcijskih poslovnih procesov.
- Nekateri podfiltri tretjega nivoja in moduli zunaj zgornjega seznama še nimajo lastnih podatkovnih pogledov. Ne predstavljamo jih kot produkcijsko zaključene.
- Zgornji zavihki še niso povezani z URL deep-linki ali server-side RBAC za vsak podpogled; to spada v naslednji funkcionalni korak.

## Minimalni QA
1. Zamenjava modula ponastavi aktivni 2. in 3. nivo.
2. Sprememba 2. nivoja posodobi obarvanje in prikaže njegove možnosti 3. nivoja.
3. Sprememba 3. nivoja ne spreminja glavnega modula.
4. Zgornji navigacijski gumbi v povezanih modulih spreminjajo vidni prikaz.
5. Desktop in mobilni nav ostajata horizontalno drsna.
6. Preveriti Next.js preview build po spremembah; ročni interakcijski QA ostaja ločen od samega builda.

## Performance
Navigacijska konfiguracija je lahka; poslovni moduli se še vedno nalagajo z next/dynamic šele ob odprtju.
