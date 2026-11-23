# FinAI NEXT37 – namenski GitHub SSH status (read-only)

Datum: 23. 11. 2026. Ta korak je namenoma omejen na preverjanje komunikacije GitHub Actions → `einteg86`. **Ne sproža stage, promote, unpublish, spremembe datotek, DNS ali baze.**

## Izhodišče

Preverjanje, izvedeno neposredno na namenskem računu, je vrnilo:

```text
FINAI_HOME=PASS
FINAI_APP_DOCROOT=PASS
FINAI_RELEASE_ROOT=PASS
FINAI_GATE=PASS_PINNED
FINAI_APACHE_REWRITE=PASS
FINAI_DOCROOT_POINTER=PASS
FINAI_RELEASE_POINTER=PASS
FINAI_RELEASE_DIGEST=6e1c95c822b6996ae18a04d20e8ee1346bf4291cdfd534f0315c7c2a04818b1f
FINAI_DOCROOT_INSPECT=PASS_READONLY_ONLY
FINAI_STAGE_AND_PROMOTE_AUTHORIZED=NO
```

To dokazuje lokalne poti, dovoljeno kontrolno vsoto nameščenega omejenega prehoda in pravilne povezave, ne pa še dostopa iz GitHuba, stanja obnovitvene točke ali namenske baze. Javna verzija je še vedno stara `35264aaa8dd9ee97c5f07fc0429aca573e340b77`.

## Novost

Workflow `.github/workflows/finai-dedicated-ssh-ready.yml` se sam zažene na push tega workflowa v `main` ali z ročnim `workflow_dispatch` in uporablja environment `finai-staging`. Pred statusom varno izpiše izključno **PRESENT/MISSING**, nikoli vrednosti, za:

- environment secrets: `FINAI_DEPLOY_SSH_PRIVATE_KEY` in `FINAI_DEPLOY_SSH_KNOWN_HOSTS`;
- environment oziroma repo vars: `FINAI_DEPLOY_SSH_HOST` (`lcp-86.controlpanel.si`), `FINAI_DEPLOY_SSH_USER` (`einteg86`), `FINAI_DEPLOY_SSH_PORT` (`22`).

Šele če so vrednosti prisotne in cilj pravilen, workflow preveri pripet SHA256 gostiteljskega ključa in zažene obstoječi strogo omejeni `finai:status:v1`. Ta SSH klient pred vsakim dovoljenim ukazom preveri tudi zavrnitev nedovoljenega ukaza `id` (pričakovan izhod 64); nič ne piše na gostovanje.

**Interpretacija:** `FINAI_READONLY_SSH_READY=PASS` pomeni delujoč varen bralni GitHub → FinAI prehod. Izpis `MISSING` pomeni manjkajočo GitHub binding, `STOP_UNEXPECTED_HOST_BINDING` napačnega naslovnika, druge zavrnitve pa zahtevajo pregled nespremenjenih GitHub nastavitev ali lastnega računa.

## Meje in nadaljevanje

Repo-level varovalke `FINAI_STAGE_ENABLED`, `FINAI_DEPLOY05_SERVER_READY`, `FINAI_PRODUCTION_ENABLED`, `FINAI_APP_DOCROOT_CONFIRMED` in `FINAI_AUTO_PUBLISH_ENABLED` se **ne omogočijo** s tem preverjanjem. Te varovalke mora določiti odobren postopek po dokazani izolaciji, preverjeni namestitvi, lastni obnovitveni točki, zanesljivem atomarnem rollbacku in preverbi SHA256. Samo uspešen status še ne potrjuje pripravljenosti za objavo.

Prednostni vrstni red: 1) uspešen bralni status, 2) preverjen live marker/rollback in lastna obnovitvena točka, 3) zasebni stage novega SHA256 paketa, 4) ročna nadgradnja sintetične aplikacije z rollbackom, 5) šele nato ločeno Laravel/API/DB.

Ne pošiljaj zasebnega ključa, `.env`, `known_hosts` vsebine ali gesel v klepet. Vse spremembe naj ostanejo znotraj namenskega FinAI računa.