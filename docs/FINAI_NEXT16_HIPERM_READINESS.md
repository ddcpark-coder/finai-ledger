# FinAI NEXT-16 — prednamestitvena kontrola (GO/NO-GO)

**Stanje 16. 11. 2026: NO-GO za Hiper M pisanje.** Namenski FinAI OS/cPanel račun še ni neodvisno preverjen; GitHub Actions še naprej pripravlja samo artefakte. Skript je bralen in ničesar ne aktivira.

## 1. Razdelitev gostovanja

- Namen: Reseller Hiper M paket s 5 cPanel računi in začetnim prostorom 20 GB. Osnutek razdelitve: približno 8 GB FinAI, približno 8 GB STNG, 4 GB rezerve; vrednosti niso preverjeno stanje ponudnika.
- FinAI mora imeti **svoj** cPanel račun, OS UID/GID in domači direktorij, ločene od starega `laskot48` ter od vseh ostalih projektov.
- Laškoteka ostane na starem gostovanju v nespremenjeni obliki. Migracija STNG se obravnava izključno v projektu STNG, ne v FinAI.
- Brez dodatnega gostovanja ni izjem za pisalni dostop skupnega računa. Nova mapa, `chmod` ali ločen SQL uporabnik na istem UID **niso** dokaz OS izolacije.

## 2. READ-ONLY pregled na novem FinAI računu

Samo po aktivaciji ločenega namenskega računa in pod **njegovim** uporabnikom se lahko izvede naslednja kontrola. Skripta nikoli ne poganjati pod `laskot48` ali root in ne uporabljati za spreminjanje drugih projektov.

```bash
python3 -B ops/finai-isolated-readonly-preflight.py \
  --app-root /home/FINAI_UID/apps/finai-ledger \
  --public-docroot /home/FINAI_UID/public_html
```

Zamenjati `FINAI_UID` z dejanskim namenskim uporabnikom šele, ko je njegov pravi domači direktorij določen. Skript ne ustvarja manjkajočih map, temveč jih označi kot nedokončane. Preverja UID in realne poti znotraj **samo namenskega** domačega direktorija, lastništvo, pisalna dovoljenja skupine/drugih in nevarne simbolne povezave. Ne odpira nobenih datotek Laškoteke/STNG.

Tudi uspešen rezultat vrne `FINAI_DEPLOY_AUTHORIZED=NO`: preverjanje lokalnih poti samo po sebi ne dokazuje SQL izolacije, pravilnosti SSH omejitev, SSL ali obnovitvene točke.

## 3. Neodvisne obvezne kontrole pred prvo objavo

| Področje | Minimalno neodvisno preverjanje |
|---|---|
| Sistem | `id -u`, `id -un`, lastništvo in pravice FinAI mape in resnične poti, brez dostopa za spreminjanje drugih projektov; preverjanje ne sme poskusiti pisanja v Laškoteko ali STNG |
| PHP/Frontend | PHP 8.4 in Composer za Laravel; statična Next.js datoteka izdaje `out/` z SHA-256 |
| Baza | Namenska MariaDB baza in uporabnik samo z dovoljenji nad FinAI podatki; preizkus sintetičnih migracij in rollbacka v namenski testni bazi |
| Domene | `app.e-integrator.si` in `api.e-integrator.si` na samostojnem FinAI računu, HTTPS in pravilni docrooti (API docroot samo `backend/public`), brez preusmeritve na Vercel |
| SSH | Ločeni Ed25519 ključ v **novem** računu, omejeni forced-command prehod, brez spreminjanja `authorized_keys` na skupnem `laskot48` |
| Izdelek | Ciljni synthetic QA, računovodski preflight, minimalni smoke test, revizijska sled in šifriranje; prepoved pravih podatkov do zaključenega varnostnega/računovodskega QA |
| Obnova | Vnaprej ustvarjena varnostna kopija FinAI, dejansko preverjena obnovitev, atomaren preklop in povrnitev na prejšnjo nespremenljivo izdajo |
| Prva objava | Potrjen docroot, začetna obnovitvena točka, neodvisna izolacija, nato eksplicitna odobritev prvega preklopa |

## 4. Obstoječa GitHub avtomatizacija

- `.github/workflows/finai-isolated-deploy.yml` že izvaja izolirane sintetične varnostne teste, statični Next.js build, SHA256 in pakiranje. Koraka `stage` in `promote` sta privzeto izključena z namenskimi GitHub environment/vars in morata takšna ostati.
- Nova datoteka `ops/finai-isolated-readonly-preflight.py` je diagnostika za namenski račun, brez vsakega pisanja. Njen unit test je dodan v `gate-tests` in ne spreminja hosta.
- Pogoji za spremembo GitHub varovalk so zunanja, dokumentirana sistemska izolacija ter pripravljena neodvisna FinAI obnovitev. Nobena GitHub zelena gradnja sama ne potrjuje teh dejstev.
- Vercel je samo morebitni zaščiten razvojni predogled s sintetičnimi podatki. `app.e-integrator.si` se ne usmerja nanj.

## 5. Kar je ostalo odprto

- Aktivacija/identifikacija namenskega Hiper M cPanel/OS računa in njegove dejanske poti.
- Preverjanje možnosti PHP 8.4, izolacije MariaDB, SSH forced-command prehoda, TLS in obnovitvene točke.
- Odločitev o aktivaciji DNS samo FinAI domen po neodvisni izolaciji. Ne izvajaj objave prej.

**Absolutna prepoved:** Laškoteka, STNG, `laskot48`, vse skupne cPanel/SSH/DNS/SSL storitve in rezervne kopije drugih projektov se nikoli ne spreminjajo.