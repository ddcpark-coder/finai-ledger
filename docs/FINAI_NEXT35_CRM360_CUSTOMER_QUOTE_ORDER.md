# FinAI NEXT35 — CRM 360: stranka, kontakti, aktivnosti, ponudba, osnutek naročila

## Izvedena funkcionalnost

CRM 360 je namenoma omejen na **sintetični pilot v brskalniku**. Zdaj uporablja isti obstoječi, podjetniško izolirani CRM prodajni lijak NEXT11/21/23 in odstrani prejšnji podvojeni nabor nepovezanih statičnih priložnosti iz CRM zaslona.

V kartici stranke uporabnik izbere eno od že obstoječih sintetičnih priložnosti podjetja, vidi partnerja, enoto, fazo, različico, predvideno vrednost in verjetnost. Izbrana faza se posodobi ob ročnem premiku v že obstoječem interaktivnem lijaku. Možno je filtrirati podjetniško poslovno enoto in iskati stranko/priložnost.

CRM 360 vsebuje ločen strogo izoliran, nespremenljivo preverjen model `app/crm/crm360Session.mjs` za podatke, ki jih stari CRM lijak še ne hrani: kontakte z izključno sintetičnim imenom, testnim e-naslovom `@example.test`, vlogo in optimistično različico; aktivnosti s kontaktnim in podjetniškim ID-jem; osnutke ponudb ter iz njih ročno ustvarjene osnutke naročil.

## Voden primer

1. **CRM**: izberite podjetje, priložnost in povezano kartico stranke; ustvarite ali uredite izmišljeni kontakt. Dodajte testni klic, sestanek, nalogo ali opombo. Stale contact version (CAS) zavrne prepis.
2. **CRM**: ročno pripravite največ en osnutek ponudbe na priložnost (v EUR centih, podedovanem znesku iz demo lijaka). Tu se ne obračuna DDV in se ne izdela pravna ponudba/PDF.
3. **Ponudbe**: novi namenski razdelek `CRM 360 → ponudbe` pokaže isti osnutek. Uporabnik posebej označi potrditveno polje in klikne **Ročno potrdi demo ponudbo**. Vsak postopek je podjetniško omejen in preverjen.
4. **Ponudbe**: šele odobreno ponudbo lahko izrecno pretvorite v **osnutek naročila za pregled**. Idempotenca zavrne dvojni zapis iz iste ponudbe.
5. **Naročila**: novi namenski razdelek `CRM 360 → naročila` prikaže isti povezani osnutek s pripadajočo ponudbo, CRM priložnostjo, partnerjem in zneskom. Rezervacije zaloge, izdaja računa, DDV, FURS, plačila in knjiženje ostanejo izključeni.

## Varnostna in arhitekturna meja

- Spremembe so **samo v pomnilniku trenutnega brskalniškega zavihka**. Ne uporabljajo HTTP, localStorage, sessionStorage, API skrivnosti, Laravel, resničnih podatkov ali produkcijskega CRM. Osvežitev strani resetira model. Ne obljubljajo trajnega uporabniškega dela.
- Vsa tri podjetja in vsi njihovi kontakti, aktivnosti, ponudbe in naročila imajo preverjen `companyId` in references na izvirni sintetični CRM `dealId`. Kopiranje kontaktov, naročil ali ponudb med podjetji je zavrnjeno; dodajanje izmišljenih kontaktov ima predpono `Sintetični`, njihovi e-naslovi pa samo domeno `example.test`.
- Stara statična CRM kartica z nepovezanimi osebnimi imeni je odstranjena. Stare demonstracijske ponudbe so zdaj označene z `companyId=1`, zato se ne prikazujejo drugim podjetjem.
- Sistem CRM 360 **ne razširja** obstoječega Laravel testnega CRM API-ja. NEXT23 še naprej ročno usklajuje samo fiksne testne priložnosti in prehode faz. Novi kontaktni in dokumentni podatki na API še niso dovoljeni; ni samodejnega usklajevanja ali realnih povpraševanj.
- Simulirano potrjevanje ponudbe ne nadomesti pravega poslovnega, davčnega ali računovodskega postopka. **Nobenih realnih strank ali kontaktov** ni dovoljeno vnašati.

## Minimalni testi

`node --test tests/next35Crm360Session.test.mjs tests/sharedDemoCompany.test.mjs` preverja meje podjetij, fixture povezave, zamujene verzije, neveljavne referenčne ID-je, nedovoljeno nesintetično osebno vsebino, nespremenljivost, idempotenco in neodvisne reset postopke.

`tests/e2e/next35-crm360.spec.cjs` v Chromium Desktop in Mobile preveri dejansko klikanje skozi celotno pot CRM → ponudba → ročna odobritev → naročilo → menjava podjetja → povratek → reload. Vseh HTTP pisalnih zahtevkov mora biti nič.

## Delo pred dejansko uporabo

V namenskem in dokazano izoliranem cPanel računu `einteg86`: preverjen staging Laravel/MariaDB, namenski RBAC za CRM zapis, različice, revizija in zaščitena konfiguracija, test obnove, CSRF/MFA ter šifriranje. Nato povezati CRM 360 z resničnim podatkovnim modelom, urediti formalno izdajanje ponudb in povezavo z naročili; šele po poslovnem ter računovodskem QA omogočiti resnične podatke in javno produkcijo. Ne aktivirati produkcijskih pisnih CRM API-jev zgolj zaradi tega pilota.

V tej fazi se piše izključno v FinAI repozitorij. **Nobenih** posegov v Laškoteko, STNG, druge projekte, `laskot48`, cPanel, DNS, SSH ali javno gostovanje.