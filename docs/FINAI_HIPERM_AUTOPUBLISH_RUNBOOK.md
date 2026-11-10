# FinAI: hitra objava GitHub → Hiper M

**Status 10. 11. 2026:** GitHub samodejna priprava ZIP + SHA256 deluje; nova pogojna samodejna objava je pripravljena v kodi, a **ni aktivirana na gostovanju**. Javni `e-integrator.si` ostaja nespremenjen, dokler ni dokazana izolacija pisalnih pravic.

## Pravilo petih minut administracije (enkratno)

1. **Hiper M** potrdi namenski sistemski OS/cPanel uporabniški račun FinAI (`uid != laskot48`), ločen `home`, lastništvo ter pravice brez dostopa/pisanja v Laškoteko, STNG, skupni cPanel/SSH. Zgolj FTPS dostop `finai-deploy@e-integrator.si` v `/home/laskot48/apps/finai-ledger/shared/incoming/ftps` ni objava in sam ne dokaže OS izolacije.
2. Hiper M potrdi namenski **HTTPS document root**, ki zares servira `<dedicated-FinAI-home>/finai-deploy/current`. Pred prvim preklopom pripravi obnovitveno točko obstoječe predstavitvene strani in potrdi atomarni povrnitveni postopek. Ne spreminjaj DNS, nastavitev in storitev drugih projektov.
3. **Le v namenskem izoliranem FinAI računu:** namesti že pripravljeno omejeno SSH prisilno ukazno pot, ki sprejme samo `finai:status:v1`, `finai:stage:v1:<SHA256>`, `finai:promote:v1:<SHA256>`. Ni splošnega SSH dostopa. Obstoječih ključev `laskot48` ne spreminjaj.
4. **GitHub:** v zaščitenih okoljih `finai-staging` in `finai-production` nastavi `FINAI_DEPLOY_SSH_PRIVATE_KEY` in `FINAI_DEPLOY_SSH_KNOWN_HOSTS`; registriraj `FINAI_DEPLOY_SSH_HOST`, `FINAI_DEPLOY_SSH_PORT`, `FINAI_DEPLOY_SSH_USER` (nikoli `laskot48`). Repozitorijske spremenljivke: `FINAI_STAGE_ENABLED=true`, `FINAI_PRODUCTION_ENABLED=true`, `FINAI_FIRST_PUBLISH_RESTORE_READY=YES` šele po potrjeni obnovitveni točki; `FINAI_AUTO_PUBLISH_ENABLED` **najprej izključen**.
5. Po uspešnem stage preverjanju **enkrat** zaženi `FinAI isolated-account CI and controlled Hiper M releases` s `workflow_dispatch → promote_to_production=true`. Ko je javni `https://e-integrator.si/finai-build.json` preverjeno identičen SHA commitu izdaje in obstaja predhodna aktivna izdaja za rollback, vklopi `FINAI_AUTO_PUBLISH_ENABLED=true` za naslednje spremembe.

## Običajni potek po aktivaciji

GitHub `main` → statični build → preverjanje SHA256 in ZIP → stage na izoliran FinAI račun → po uspehu avtomatski preklop → **en** HTTPS smoke test `finai-build.json` (primerjava konkretnega SHA commita) → ob neskladju vrnitev zadnje znane izdaje. Za manjše spremembe ni celotnega Playwright ali Windows testiranja. Pri davčni logiki, prijavah, izolaciji podjetij, varnostnih mehanizmih in podatkovnih migracijah so obvezni ciljni dodatni testi.

## Kaj ostane nedovoljeno

- Neposreden upload ali izvajanje pisalnih ukazov prek skupnega `laskot48`; posegi v Laškoteko, STNG ali skupni cPanel/SSH/DNS.
- Vnašanje gesel in ključev v kodo, dokumentacijo, klepet ali CI dnevnike.
- Samodejno prepisovanje predstavitvene strani brez potrjene lastne sistemske identitete in restore točke.
- Uporaba resničnih računovodskih podatkov pred računovodskim in varnostnim QA.

## Znani povezovalni omejitvi

Lokalni WinSCP FTP test uporabnika je uspešno naložil datoteko v FinAI `incoming/ftps`. GitHub-hosted izvajalniki so pri povezovanju na FTP port 21 prejemali `CONNECT_TIMEOUT`, verjetno zaradi pravil FTP Allow/IP. Zato je pot do avtomatske objave pripravljena za ločen, omejen SSH dostop, **ne** za razširjanje FTP dovoljenj na deljenem računu.

**Ko ponudnik potrdi izolirani OS račun in docroot:** konfiguriraj zgoraj navedene skrivnosti/spremenljivke, preveri prvo objavo, nato omogoči samodejni preklop. Do takrat CI ustvarja le artefakte.
