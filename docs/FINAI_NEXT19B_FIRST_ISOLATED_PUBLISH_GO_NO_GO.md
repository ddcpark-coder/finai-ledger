# FinAI NEXT-19B — predobjavni GO/NO-GO in preverjanje nespremenljivih izdaj

**Trenutni status: NO-GO za gostovanje, dokler ni preverjen namenski OS/cPanel račun FinAI.** Ta dokument ni dovoljenje za pisanje ali poseganje v Laškoteko in STNG.

## Tehnična zaščita izdaje

Pred vsako aktivacijo `finai:promote:v1:<sha256>` prisilni SSH prehod preveri:

- da obstaja originalni **SHA256-natančno preverjeni CI `.tar.gz`** v zasebni mapi `finai-deploy/archives/<sha256>.tar.gz`, izven javnega `current` in `releases` cilja;
- da ima vsak običajen dokument in statični vir v `releases/<sha256>` **enake bajte** kot originalni arhiv, brez vrinjenih, manjkajočih ali zamenjanih datotek;
- da release ne vsebuje symlinkov ali nenavadnih vrst datotek, niti v vmesnih direktorijih;
- da originalni arhiv ustreza ime-digestu, zato sprememba obeh ne more tiho obiti SHA256 preverjanja brez zamenjave zahtevanega digest-a;
- da pravilo velja tudi za **ponovno staging** istega digest-a (idempotenca le za popolnoma nespremenjeno izdajo).

Pomožni popravek omogoča harmless najvišji imenik `./`, ki ga pri `tar -czf ... -C out .` ustvari dejanski CI, vendar še vedno zavrne root datoteko, poti `..`, symlinke, posebne datoteke in konfiguracijske skrivnosti. Izvorni arhiv je shranjen **izven javne spletne korenske mape**.

## Minimalni nabor dokazil za namenski Hiper M račun

| Kontrola | Zahtevani dokaz | Trenutno |
|---|---|---|
| Lastni OS/cPanel uporabnik | Dejanski OS UID se razlikuje od `laskot48`, lastništvo home/app/docroot in ločene sistemske ACL omejitve | **NI POTRJENO** |
| Ločitev drugih projektov | Dokazano ni pisalnega dostopa do Laškoteke, STNG ali skupnih storitev | **NI POTRJENO** |
| SSH | Lasten Ed25519 ključ, forced-command only in strogo omejeno javno dostopno okolje; brez spreminjanja skupnih `authorized_keys` | **NI POTRJENO** |
| Namenska MariaDB | Ločeno ime baze in uporabnik z minimalnimi privilegiji; brez poti do drugih baz | **NI POTRJENO** |
| DNS in TLS | Pravilno usmerjene FinAI domene, preverjen HTTPS certifikat in docroot; `app.e-integrator.si` ni usmerjen na Vercel | **NI POTRJENO** |
| Obnova | Lastna obnovitvena točka, preizkušena povrnitev in podpis/odgovornost | **NI POTRJENO** |
| Izdaja | CI synthetics PASS, celovit SHA256 manifest, izvorni archive in celotni primerjalni preflight | **PRIPRAVLJENO V KODI; ŠE NE PREVERJENO NA HOSTU** |
| Dovoljenje za pisanje | Vse kontrole izpolnjene, tehnično dokazilo neodvisnega računa, namenski preizkus v FinAI | **BLOKIRANO** |

## Predlagano zaporedje brez spreminjanja gostovanja

1. Za FinAI dejansko ustvariti samostojen cPanel/OS račun prek pooblaščenega ponudnika. To **ni** izvedeno s tem PR-jem.
2. V novem računu uporabiti samo **read-only** `ops/finai-isolated-readonly-preflight.py`; rezultate varno dokumentirati brez tajnosti ali osebnih podatkov. Sam preflight vedno izpiše `FINAI_DEPLOY_AUTHORIZED=NO`.
3. Neodvisno preveriti dejansko izolacijo UID/ACL in privilegije namensko ustvarjenega DB uporabnika, HTTPS, ciljno mapo, simbolne povezave, SHA256 in obnovitveno točko.
4. Šele po dokazanem varnem okolju uporabiti omejene `status/stage/promote` ukaze z izrecno potrditvijo prve objave. Vsi prijavni podatki ostanejo v varno shranjenih povezavah ali GitHub Secrets.
5. Prvi preklop mora biti sintetičen, z minimalnim funkcionalnim testom in povrnljivo izdajo. Resnične poslovne podatke je dovoljeno uporabljati šele po računovodskem, pravnem in varnostnem QA.

## QA obseg

GitHub tests `tests/test_finai_isolated_ssh_gate.py` na izoliranih sintetičnih direktorijih preverjajo idempotentno staging, prvotni tar, napade na datoteke in nedovoljene tar tipe. **Ne preverjajo dejanskega Hiper M**, ker namenski FinAI račun ni potrjen. Postopki `stage` in `promote` ostanejo onemogočeni zaradi neizpolnjenih zunanjih predpogojev.

Absolutna prepoved velja za vse spremembe Laškoteke, STNG, skupnega cPanel/SSH/DNS, računa `laskot48`, tujih baz, podatkov in varnostnih kopij.