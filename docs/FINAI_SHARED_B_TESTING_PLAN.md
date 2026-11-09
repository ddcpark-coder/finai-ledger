# FinAI – rešitev B: priprava za začasno testiranje ob skupnem Hiper M računu

**Datum:** 9. 11. 2026  
**Stanje:** GitHub razvojna priprava in read-only pregled; **NI ODOBRENA PISALNA NAMESTITEV** na `laskot48`.  
**Obvezno:** Laškoteka (laskoteka.si, public_html, baze, cPanel, DNS, SSL, SSH, ključi, cron, media, backup) in STNG se ne smeta spremeniti v nobenem FinAI klepetu, Work postopku ali CI. Vse omrežne/storitvene nastavitve skupnega računa so nedotakljive.

## Odločitev o opciji B

Domeno je mogoče ločiti na ravni document root in MariaDB podatkovne baze. To pa **ne ustvari ločenega Unix uporabnika**. `laskot48` je isti UID za FinAI, Laškoteko in STNG; niti ločena podmapa, `chmod 700`, omejena MySQL uporabniška vloga niti forced-command SSH skripta sami ne predstavljajo zaščite pred uporabo istih OS datotečnih pravic.

**Končni varnostni izid za skupni račun: NO-GO za FinAI pisalno SSH avtomatizacijo**. To je tudi izrecno projektno pravilo `AGENTS.md`. Pravila ne spreminjamo zgolj zato, ker je razvojna objava označena `test`.

## Trenutno znano o FinAI (zadnja preverjena, bralna dokazila)

- Obstoječa Laravel izdaja: `/home/laskot48/apps/finai-ledger/releases/20013672a44a5c7dd426adb71e3dff07cbb4852b/backend` (laravel + `vendor` prisotna).
- Namenska `shared/.env` **ni prisotna**; `current` symlink **ni prisoten**.
- Možna korenska mapa predstavitvene strani: `/home/laskot48/e-integrator.si`, vendar je aktualni cPanel document root treba potrditi read-only, ne predpostaviti.
- cPanel UAPI vrača `exit=2` pri bralnih poizvedbah za domene/zone. Ne spreminjamo cPanel pravic zaradi diagnostike.
- Dokazila: [read-only SSH audit run 42500098430](https://github.com/ddcpark-coder/finai-ledger/actions/runs/42500098430), [Issue #41](https://github.com/ddcpark-coder/finai-ledger/issues/41).
- `app.e-integrator.si` se ne usmeri na Vercel. Vercel ostane **samo zaščiten, sintetični UX predogled**, ne produkcija.

## Pripravljeni varnostni artefakti – brez gostovalnih sprememb

| Artefakt | Namen | Varovalka |
|---|---|---|
| `ops/finai-shared-account-readonly-preflight.py` | Bralna klasifikacija FinAI aplikacijske in možne spletne mape | `lstat` le predpisanih FinAI poti, preveri simbolne povezave in UID; nikoli ne odobri pisalnega dostopa |
| `tests/test_finai_shared_account_readiness.py` | Negativni testi v sintetičnih začasnih mapah | Dokaže, da isti UID kljub `0700/0600` dostopa do obeh projektnih map; preizkusi zavračanje symlink |
| `.github/workflows/finai-shared-b-readiness.yml` | V GitHub Actions izvede le bralne/sintetične teste | Ne vsebuje SSH skrivnosti, cPanel, SFTP, MySQL ali deploy ukazov |
| `ops/finai-isolated-ssh-gate.py` | Že pripravljen SHA256/forced-command deploy za **ločeni račun** | Izrecno zavrne `laskot48`; brez obhoda |
| `.github/workflows/finai-isolated-deploy.yml` | Static Next.js build, nadzorovan staging/promotion za ločeni račun | `FINAI_STAGE_ENABLED` in `FINAI_PRODUCTION_ENABLED` privzeto nista omogočena |

## Dovoljen postopek za uporabnikov cilj (vizualni in funkcionalni QA takoj)

1. Ločena GitHub veja in minimalni ciljni testi, brez dostopa do Hiper M.
2. GitHub Actions izdela statični `out/`, prenosni Windows offline paket in sintetične backend teste (ločen začasni DB).
3. Pregled na obstoječem zaščitenem interaktivnem predogledu. Gumb **»Pripomba o zaslonu«** pripne kontekst modula, podpogleda, teme in gostote in omogoči kopiranje v FinAI klepet.
4. Po uspešnih testih pregled PR in združitev v `main`; brez avtomatizirane FinAI objave na `laskot48`.
5. Varovani Hiper M staging/produkcijske objave se omogočijo šele, ko je dokazano neodvisno sistemsko pooblastilo FinAI. **To je lahko na istem fizičnem Hiper M strežniku**, če ponudnik to omogoča; ni nujno drug fizični strežnik.

## Pripravljena shema izoliranega testnega okolja, če Hiper M potrdi različnega OS uporabnika

To je **načrt**, ne dovoljenje za ustvarjanje na skupnem računu:

- Račun: lasten UID in HOME, ločen od `laskot48`. Noben FinAI SSH proces ne sme imeti `laskot48` sistemskega UID, skupinskega pisalnega dostopa ali `sudo`.
- Namenska predhodno potrjena korenska mapa statične aplikacije in ločen javni Laravel `backend/public` na FinAI account; brez symlink prehoda na mape drugih projektov.
- Ločena MariaDB baza s cPanel-prefiksom FinAI in **lastni DB uporabnik z dovoljenji le na to bazo**. Brez `GRANT *.*`, superuserja ali skupnih kredencialov; migracije samo nad sintetično razvojno bazo in po preverjenem snapshotu.
- Lasten SSH ključ Ed25519, GitHub environment secret, potrjen podpis host ključa, restriktivni forced-command, brez poljubnega shell ukaza. **Ničesar ne spreminjati v `authorized_keys` na `laskot48`.**
- Samostojni TLS certifikati/poddomena `app`/ `api` na Hiper M šele po izolaciji, preverjen HTTPS, privzeto `noindex`, sintetični podatki in omejen dostop.
- `GitHub CI PASS → SHA256 release → staging → smoke test → varna obnovitvena točka → šele potem odobren preklop`. Vsaka operacija zapisuje samo v FinAI scope in je povrnljiva.

## Stroge omejitve

Ne izvajati `chmod/chown` nad `/home/laskot48`, ne ustvarjati ali menjati `authorized_keys`, ne dodajati SSH ključev, ne zaganjati `composer install` ali `artisan migrate` na skupnem računu, ne spreminjati cPanel ali domen. **Ne nameščati rešitve B na ta račun**, dokler projektna prepoved in dokazila izolacije tega ne omogočijo; samo `chmod` tega ne reši.

**Kratek status:** rešitev B pripravljena do stopnje varnostno preverjenega načrta in simulacije v GitHubu. **Dejanska namestitev in pravice niso izvedene**; razlog je enak sistemski UID na skupnem Hiper M računu in izrecna prepoved njegovih pisalnih avtomatizacij v projektnih pravilih.
