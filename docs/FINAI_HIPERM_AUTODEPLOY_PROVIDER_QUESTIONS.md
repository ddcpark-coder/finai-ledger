# FinAI – Hiper M: potrditev pogojev za varne samodejne testne objave

**Namen:** odprava zadnjega infrastrukturnega blokatorja za delovni predogled `app.e-integrator.si` na Hiper M. To ni zahteva za spremembo Laškoteke ali STNG. Trenutna pravila dovoljujejo na skupnem `laskot48` samo bralni dostop za FinAI.

## Podatki, ki jih imamo že potrjene

- Domena `e-integrator.si` že prikazuje samostojno predstavitveno stran na Hiper M.
- GitHub `ddcpark-coder/finai-ledger` že uspešno izdela statično Next.js izdajo (imenik `out/`) in QA artefakte; vanjo ne sodijo resnični podatki.
- Za FinAI je pripravljena varovana namestitev prek prisilnih SSH ukazov, ki deluje **samo na lastnem izoliranem OS/cPanel uporabniku**; sistemski uporabnik `laskot48` je izrecno blokiran.
- Alternativa v raziskavi: namenski uporabnik FTPS z omejitvijo na en sam direktorij. Natančne pravice in konfiguracija na Hiper M še **niso preverjene**.
- `app.e-integrator.si` ni dokazano že ustvarjena testna aplikacija. DNS in cPanel spremembe na skupnem računu za FinAI niso dovoljene brez varne izolacije.

## Predlog besedila za vprašanje podpori Hiper M

**Zadeva:** Hiper M – izoliran razvojni dostop za e-integrator.si na istem gostovanju

Pozdravljeni,

na obstoječem Hiper M paketu že gostujemo več ločenih spletnih projektov. Za razvojno aplikacijo **e-integrator.si (FinAI)** želimo omogočiti samodejne testne objave iz GitHub Actions, ne da bi novi dostop lahko spreminjal kateri koli obstoječi projekt.

Prosimo za tehnično potrditev:

1. Ali lahko na **istem fizičnem strežniku oziroma znotraj obstoječega paketa** FinAI dobi **ločeno OS/cPanel identiteto** s samostojnim home, docroot, SSH in podatkovno bazo, ki nima pravic do drugih aplikacij? Če je potreben dodaten račun/strošek, navedite način in strošek.
2. Če dodatna OS identiteta ni možna: ali je mogoče ustvariti **namenski FTPS račun** za `e-integrator.si`, katerega pravice so strežniško zaklenjene na točno določen direktorij in **ni mogoče** z njim brati ali spreminjati vsebin ali konfiguracij drugih domen? Ali sta dejansko vklopljena chroot in zaščita proti prehodu prek symlink? Ali račun uporablja lastno strežniško identiteto/ACL ali isti sistemski UID?
3. Kateri sta **natančen document root** ter pravilen, s TLS-certifikatom skladen naslov za FTPS (in pasivni priključki)? Ali je mogoče na izoliranem FinAI računu uporabiti preverljiv mehanizem za **atomaren in povrnljiv preklop izdaj**, ne da bi morali spremeniti skupni cPanel/SSH?
4. Ali sta `app.e-integrator.si` in `api.e-integrator.si` lahko postavljena kot ločena FinAI docroota z lastnim HTTPS, pri čemer ostanejo **vsi obstoječi projekti, skupne storitve, ključi, DNS nastavitve drugih domen in varnostne kopije nedotaknjeni**?
5. Prosimo za pisno potrditev, ali lahko opisano izolacijo zagotovite **brez poseganja v druge aplikacije**. Ne izvajajte sprememb na računu, dokler se o natančnem postopku ne dogovorimo.

Trenutno gre izključno za testno okolje s sintetičnimi podatki. Pred javno produkcijo je načrtovan namenski FinAI račun.

Hvala.

## Naš naslednji korak po odgovoru

1. Odgovor preveriti proti obstoječim pravilom `AGENTS.md` in `docs/FINAI_CHATGPT_PROJECT_INSTRUCTIONS.md`.
2. Opraviti read-only preverjanje ločene identitete, dejanskih map, dovoljenj in FTPS/SSH varoval.
3. Če ponudnik **ne dokaže neodvisne izolacije**, objavljanje ostane izključeno; GitHub CI in zaščiten UX predogled nadaljujeta.
4. Če je izolacija resnična: konfigurirati **izključno FinAI** secrets v namenskem GitHub okolju, preveriti SHA256 izdanih datotek, varno staged namestitev, kontrolni HTTP/HTTPS test, točko za obnovitev in šele nato omogočiti avtomatizacijo.
5. Ne zahtevati ali objavljati gesel, ključev ali osebnih podatkov v klepetu oziroma repozitoriju.

## Pripravljene datoteke za CI

- `ops/finai-static-release-verify.py` preveri, da statična izdaja vsebuje vstopno HTML stran, zahtevane assete, ne vsebuje symlink ali prepovedanih konfiguracijskih/izvedljivih datotek, nato izdela kontrolni SHA256 manifest.
- `tests/test_finai_static_release_verify.py` preizkusi varovalke na sintetičnih datotekah.
- `.github/workflows/finai-isolated-deploy.yml` preveri manifest in ga priloži preverjenemu arhivu izdaje. **Transport na Hiper M ostaja ločeno zaščiten in izključen**.

**Stanje:** tehnična priprava napreduje; samodejni prenos na Hiper M še ni aktiven. Laškoteka, STNG in njihove nastavitve ostanejo nedotaknjeni.
