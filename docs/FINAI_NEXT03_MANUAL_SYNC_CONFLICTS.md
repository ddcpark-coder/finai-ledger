# FinAI NEXT-03 – ročni sintetični prenos, idempotenca, konflikti

## Funkcija za terensko PWA

1. Uporabnik z izključno sintetično dobavnico ustvari demonstracijski podpis in shrani lokalni šifrirani dokazni paket.
2. Izrecno pritisne **Pripravi lokalni demo zahtevek**. FinAI v ločenem IndexedDB shrani samo AES-GCM ovojnico, enolični UUID in pričakovano verzijo 0 (brez gesla ali nešifriranega podpisa).
3. **Ročno pošlji v lokalni testni API** se omogoči samo pri namenski sintetični gradnji s `NEXT_PUBLIC_FINAI_SYNTHETIC_SYNC_TEST_API_BASE=/api` na `localhost` oziroma `127.0.0.1`, ko naprava javlja povezavo. Zahteva uporablja prijavno sejo, pridobi XSRF piškotek in prenese samo šifrirano ovojnico prek HTTPS oziroma zaupanega lokalnega testnega protokola.
4. Server dodatno šifrira in evidentira zgolj sintetično ovojnico v ločeni tabeli. Isti UUID z identično vsebino je idempotenten; zato ponovitev po izgubljenem potrditvenem odgovoru ne ustvarja dvojnika.
5. Ob HTTP 409 se pridobi samo številka aktualne verzije. Čakalna vrsta se označi kot **KONFLIKT**, zahtevek ni prepisan in samodejnega ponavljanja ni. Uporabnik lahko izvozi šifrirani zahtevek ali po ročni odločitvi odstrani **samo zahtevek**; lokalno šifrirano dokazilo ostane.
6. Pri uspešnem odzivu se preverijo `company_id`, `document_id`, pričakovana verzija in izrecna oznaka `real_sync_enabled=false` ter `business_document_created=false`. Stanje se označi kot **Testno potrjen** in ga sistem ne pošilja ponovno.

## Varnostne meje

- Privzeta javna statična izdaja nima nastavljene sintetične testne zastavice in ne more izvajati POST za sinhronizacijo.
- Preverjanje lokalnega gostitelja na klientu je **dodatna zaščita**, ne nadomešča strežniške avtentikacije in podjetniških pravic.
- Strežniški API je ne glede na klienta privzeto izključen in deluje samo v `APP_ENV=local/testing` z eksplicitno testno zastavico. Dostop zahteva preizkušeno sejo, aktivno podjetje, preverjeno e-pošto in 2FA, kjer je obvezna.
- Podatkov ni mogoče sinhronizirati med dejanskimi napravami v produkciji, računovodski dokumenti pa se ne ustvarjajo. Brez samodejnega background sync, pravega podpisa, dejanskih dokumentov ali server-side obnove.
- Strežnik ne zna vsebinsko preveriti klientove šifrirane ovojnice. Nikoli ga ne omogoči za realne dokumente brez dodatne zasnove šifriranja in pregledovanja.

## Minimalni QA

`node --test tests/demoReceiptSyncGateway.test.mjs` in trije tarčni Playwright scenariji na sintetični gradnji:
offline ohranitev brez POST, 409 konflikt z ročnim izvozom in zavrnitvijo prepisovanja ter uspešen eksplicitno potrjen testni prejem. Strežniški API ima ločene že izvedene Laravel Feature teste.

**Produkcijski predpogoji:** lasten verificiran Reseller OS/cPanel račun, registracija naprav, HTTPS, pravilno upravljanje ključev, dokazljiva obnova, sinhronizacija uporabnikov in podjetij, zakonodajni/računovodski QA ter neodvisne varnostne kopije.

Brez posegov na Laškoteko, STNG ali skupni Hiper M.
