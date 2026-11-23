# FinAI NEXT36 — preverjanje aktualne spletne izdaje in varna priprava nadgradnje

**Datum 23. 11. 2026; obseg:** izključno namenski račun FinAI `einteg86` (UID 1256) in repozitorij `ddcpark-coder/finai-ledger`. Ta sprememba ne objavlja izdaje in ne vklaplja izdajnih zastavic.

## Ugotovljena vrzel

- Na `https://app.e-integrator.si/finai-build.json` se 23. 11. še izpisuje commit `35264aaa8dd9ee97c5f07fc0429aca573e340b77`, medtem ko GitHub `main` že vsebuje novejšo izdajo CRM 360 in pravila C. Starejša javna aplikacija je zgrajena; to ni dokaz, da je najnovejša izdaja nameščena.
- Javni `https://api.e-integrator.si/up` je pri ločenem bralnem pregledu vrnil HTTP 404. To je dokaz samo za točno to URL-pot; ni dovolj za trditev o vseh API endpointih ali stanju podatkovne baze.
- GitHub build in SHA256 preverjanje sta uspešna, vendar sta bila koraka `stage` in `promote` preskočena zaradi neaktiviranih oziroma nepotrjenih namestitvenih pogojev. Preskočen korak ni zaključena namestitev.
- Prvotna statična objava je bila pripravljena tudi z mehanizmom, ki lahko poveže obstoječi cPanel app docroot z namensko mapo izdaj prek `_finai_current` in omejenih pravil v `.htaccess`. Pred novo objavo je treba **preveriti dejansko nameščeno stanje**, ne avtomatično spreminjati docroota ali predpostavljati, da pot ni povezana.

## Kaj zdaj naredi GitHub sam

`.github/workflows/finai-isolated-deploy.yml` na `main` po uspešni gradnji izvede samostojen **read-only** job `deployment-readiness`. `ops/finai-release-readiness.py` opravi le dva HTTPS GET na fiksni FinAI domeni, brez preusmeritev na tuje gostitelje, in zapiše v GitHub Actions Job Summary:

- dejanski `finai-build.json` in primerjavo z natančnim Git SHA gradnje;
- HTTP status javne poti `/up` na FinAI API;
- ali so nastavljene ključne repo varovalke: stage, server-ready, document-root-confirmed, production, auto-publish, restore, ter ali je SSH uporabnik točno `einteg86`.

Ne izpisuje poverilnic, skrivnosti, imen drugih projektov ali katerihkoli podatkov iz baz. Ocena vedno izpiše `deploy_authorized=NO`: vrednosti GitHub spremenljivk in javni HTTP ne dokazujejo izolacije, pravilne pravice ali povrnitve. Ob izpadu javnega naslova ne podre sicer veljavnega gradbenega paketa.

## Edini naslednji strežniški pregled — namenski FinAI cPanel, brez sprememb

Na **novem** računu `einteg86` po uporabniški prijavi izvedemo skript iz pregledane in odobrene GitHub izdaje `ops/finai-dedicated-docroot-readonly.py` (prenos naj bo preverjen s SHA256 oziroma pridobljen iz točno določene revizije). Skript sam zavrne napačno identiteto, UID, HOME ali odsotno CageFS sejo. Brez pisanja preveri samo znane lokacije:

- `/home/einteg86/app.e-integrator.si` in `/home/einteg86/finai-deploy` — lastništvo in dovoljenja;
- obstoječa `.htaccess` — točno določen FinAI rewrite blok brez razkrivanja ostale vsebine;
- `_finai_current` → `finai-deploy/current` in `current` → `finai-deploy/public-releases/<SHA256>` — točno dovoljeni simlinki, brez sledenja drugim ciljem;
- nameščeni `finai-isolated-ssh-gate.py` — kontrolna vsota z vnaprej pregledano različico.

Izpis `PASS_READONLY_ONLY` **ni** dovoljenje za objavo; manjkajo še potrditev resničnega cPanel document-root usmerjanja, izolirane DB, uporabne obnovitvene točke in dostopnosti s strani spletnega strežnika. Če je katerakoli povezava nepričakovana, se strežniški postopek ustavi brez sprememb.

## Ko so vsi pogoji dokazani

1. Potrditi namenske pravice, izključno FinAI domenske korene, stanje obstoječe izdaje na strežniku in poskus obnovitve iz lastne varnostne kopije. Za preverbo se uporabljajo izključno sintetični podatki.
2. Preveriti dejansko konfiguracijo GitHub environment/secret in obstoj namenskega omejenega SSH prehoda. Ne objavljati zasebnih ključev ali gesel v klepetu in jih ne prepisovati zaradi diagnostike.
3. Šele nato omogočiti **stage** nespremenljive izdaje in primerjati njen SHA256 z GitHub artefaktom. Stage še ne spremeni javne izdaje.
4. Po potrjenem povratnem postopku in natančnem docroot/marker preflightu dovoliti ročni **promote** trenutne izdaje ter opraviti en ciljni HTTPS smoke test; ob napaki povrniti natančno predhodno izdajo. Samodejno objavo vklopiti pozneje, ko je ena nadgradnja res uspešna.
5. Laravel in DB preveriti ločeno. `api.e-integrator.si` sme javno servirati samo `backend/public`, brez izpostavljanja aplikacijskih datotek. Nobena funkcija z resničnimi podatki ne sme postati javna pred računovodskim in varnostnim QA.

## Kaj izrecno še ni bilo narejeno

Ni bila izvedena nova strežniška objava ali poseg v domene, TLS, podatkovno bazo, obnovitev, ključe ali SSH. Zgolj pripravljena GitHub izdaja in nov bralni pregled. Za odstranitev stare FinAI namestitve veljajo ločeni pogoji iz `docs/FINAI_LEGACY_CLEANUP_HANDOFF.md`.