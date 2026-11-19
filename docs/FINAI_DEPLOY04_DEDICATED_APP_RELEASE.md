# FinAI DEPLOY-04 – nova namenska domena in priprava prve statične izdaje

Datum: 19. 11. 2026. Obseg: samo FinAI/e-integrator.si, novi cPanel `einteg86`. **Brez strežniških pisalnih operacij.**

## Že preverjeno na novem računu

- OS uporabnik `einteg86`, UID `1256`; domači imenik `/home/einteg86`.
- Glavna domena `e-integrator.si` uporablja `/home/einteg86/public_html`.
- `app.e-integrator.si` uporablja `/home/einteg86/app.e-integrator.si`.
- `api.e-integrator.si` uporablja `/home/einteg86/api.e-integrator.si`.
- Vse tri mape so običajni imeniki lastnika `einteg86:1256`, način `750`, ne symlinki.
- DNS za vse tri domene iz novega računa kaže na `212.44.101.133`.
- HTTPS za vse tri vrne HTTP 404 z `TLS_VERIFY=0` (uspešno TLS preverjanje, aplikacija še ni objavljena).
- Nameščen Let's Encrypt wildcard certifikat; cPanel ima R1Soft Restore Backups, vendar konkretna obnovitvena točka **še ni preverjena**.
- `getent passwd laskot48` na novem računu ne vrne zapisa. To je pozitiven indikator ločitve, **ne** dokončen dokaz dejanske OS/ACL izolacije.
- O javni produkciji z resničnimi podatki še ne odločamo.

## Kritična odpravljena napaka v CI

Prejšnji `finai-isolated-deploy.yml` je po `promote` preverjal `https://e-integrator.si/finai-build.json`. To je **napačna ciljna domena** za nov samostojen cPanel: glavna domena je rezervirana za predstavitveno stran.

V DEPLOY-04:
1. Live smoke preverja samo `https://app.e-integrator.si/finai-build.json`.
2. `stage` in `promote` zahtevata novo GitHub repo varovalko `FINAI_APP_DOCROOT_CONFIRMED=true` *poleg obstoječih* nastavitev. Privzeto ostane izključena.
3. Prva izdaja zahteva lastno obnovitveno točko aplikacije (ne stare predstavitvene strani) in ročno odobritev.
4. Noben globalni račun, stari `laskot48`, Laškoteka ali STNG se ne spreminja. Vercel ostane zgolj razvojni predogled.

## Obvezna uskladitev docroot pred omogočanjem objave

**Pomembno:** obstoječi varovani strežniški prehod `ops/finai-isolated-ssh-gate.py` preklaplja `/home/einteg86/finai-deploy/current`, vendar je dejanski cPanel app docroot trenutno `/home/einteg86/app.e-integrator.si`. To nista isti poti. **Ne nastavi `FINAI_APP_DOCROOT_CONFIRMED=true` in ne sproži stage/promote**, dokler ni varno urejeno in preverjeno, da HTTPS app streže prav `current` izdajo.

Rešitev je namensko nastavljen app Document Root na `/home/einteg86/finai-deploy/current` *samo, če cPanel in webserver to zanesljivo podpirata*, oziroma varna prilagoditev izdajnega mehanizma tako, da preklaplja natančno namenski app docroot brez dotika drugih poti. Enostavno prekopiranje vsebin mimo SHA256 zaščite ali slepo ustvarjanje symlinkov ni sprejemljivo. Prva konfiguracija mora dokazati, da ni prepisala predstavitvene domene.

Za API je docroot `/home/einteg86/api.e-integrator.si` le začetna prazna mapa. Laravel ne sme biti v celoti kopiran v javni koren; dokumentni koren mora biti izključno `backend/public`, ostale datoteke in skrivnosti morajo ostati zasebne.

## Najmanjši naslednji zunanji predpogoji

1. Ponudnik ali ustrezen cPanel pregled potrdi dejansko samostojno OS/ACL izolacijo novega računa; brez poskusov pisanja v tuje mape.
2. Potrjena uporabna lastna obnovitvena točka `einteg86` (R1Soft) in možnost povrnitve na predhodno izdajo. Sam prikaz R1Soft menija ni dokaz točke.
3. Varno usklajen dejanski app docroot z atomarnim `current` preklopom in lastni namenski Ed25519 prisilno omejeni SSH dostop; vse poverilnice samo v GitHub Secrets, nikoli v klepetu.
4. Namenska FinAI DB + uporabnik s privilegiji izključno do te baze pred zagonom Laravel migracij.
5. Prva statična izdaja: obstoječi GitHub build + SHA256 + minimalni enkratni HTTPS/build-marker smoke + nadzorovan rollback. Ne ponavljamo splošnega PHP/MariaDB/DNS/SSL inventarja.

**Trenutni status:** GitHub izdaja pripravljena za CI, strežniški `stage/promote` še nista aktivirana; nobena namestitev, DB, migracija ali javna objava ni bila izvedena.
