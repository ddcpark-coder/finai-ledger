# FinAI NEXT-12 — trajno shranjevanje sintetičnega CRM (prvi korak)

Status: razvojna koda. **Ni produkcijska uvedba ali priklop resničnih CRM podatkov.**

## Namen

Faza NEXT-11A je uporabljala samo brskalniški pomnilnik. NEXT-12 dodaja ločeno tabelo `synthetic_crm_opportunities` in aplikacijsko storitev, da je mogoče demonstracijske priložnosti v **izolirani lokalni/testni bazi** dejansko shraniti in nadaljevati po ponovnem branju.

- `company_id` in `business_unit_id` sta obvezna, pripadnost podjetju se preveri pri vsaki operaciji.
- Shranjujejo se samo ID-ji `SYN-CRM-...`, koda sintetične poslovne enote, faza, verzija in celoštevilski centi; nobenih kontaktnih podatkov, strank, gesel ali spletnih trgovin.
- Vpis zahteva aktivnega verificiranega člana s pravico `crm.write`; branje zahteva `crm.read`.
- Ponoven enak vpis ne ponastavi že spremenjene faze. Napačen preskok ali zastarela verzija sta zavrnjena.
- Vpis, premik in revizijski zapis so atomarna transakcija; manjkajoča revizijska tabela sproži rollback.
- API uporablja obstoječo sejo, preverjanje podjetja in TOTP politiko prek skupnega middleware.
- Vsaka pot ima dvojno omejitev: `APP_ENV=local/testing` **in** `FINAI_SYNTHETIC_CRM_PERSISTENCE_ENABLED=true` (privzeto false).

## Razvojni API, samo ob izrecnem lokalnem vklopu

- `GET /api/companies/{companyId}/demo/crm/opportunities` — seznam, samo `crm.read`.
- `POST /api/companies/{companyId}/demo/crm/opportunities` — prva registracija ali nespremenjeni ponovni vpis, `crm.write`.
- `POST /api/companies/{companyId}/demo/crm/opportunities/{dealId}/advance` — samo dovoljen naslednji korak, `crm.write`, preverba verzije.

Primer sintetičnega vpisa:

```json
{"demoOnly":true,"dealId":"SYN-CRM-101","unitCode":"PE-01","initialStage":"qualification","valueCents":1250000}
```

Sprememba:

```json
{"demo_only":true,"expected_version":1,"next_stage":"discovery"}
```

Novo tabelo migriraj **izključno** v izolirani lokalni/testni SQLite/MariaDB po pripravi sheme poslovnih enot iz NEXT-11D. Ne izvajaj migracij na skupnem Hiper M.

## Ciljni QA

`php artisan test --filter=Next12SyntheticCrmPersistenceTest` v izoliranem CI; obvezni primeri: anonimni dostop, privzeto izključeno, pravice branja/pisanja, dve podjetji, podvojitev, napačni podatki, preskok, zastarela verzija, atomaren rollback.

## Odprto

- Spletni CRM NEXT-11A še uporablja lastni RAM model; API je pripravljen kot varen razvojni pogodbeni sloj, **brez samodejnega prenosa demo podatkov iz UI**.
- Potrebni so ločen, izrecen odjemalski lokalni most, poenotenje CRM modela in dovoljenj, načrt migracij/obnove MariaDB in dejanski računovodski integracijski testi.
- Windows in mobilna offline različica obdržita obstoječi read-only sintetični KPI prikaz in lokalno šifrirano vrsto; sinhronizacija ni aktivirana.
- Odprti PR #34/#35/#87/#88 se ne združujejo na slepo zaradi zastarelih baz in morebitnih podvojenih funkcij.
- Gostovanje `laskot48` ostaja izključno read-only. Prepoved kakršnekoli spremembe Laškoteke, STNG in skupnih cPanel/SSH nastavitev ostaja absolutna.

## NEXT-12B — ročni lokalni most do spletnega CRM prikaza

- `app/next11/syntheticCrmClient.mjs` dovoljuje samo isti lokalni `localhost`/`127.0.0.1` izvor in natanko pot `/api`, z eksplicitno nastavitvijo `NEXT_PUBLIC_FINAI_SYNTHETIC_CRM_API_BASE=http://127.0.0.1:3000/api` v lokalni sestavi. To **ni** produkcijska nastavitev.
- V CRM NEXT11 se **samo v lokalnem predogledu** pojavi gumb »Poveži lokalno testno CRM bazo«. Pred klikom ni nobene CRM HTTP zahteve; brez veljavne lokalne prijave, CSRF piškotka in backendove dovolilnice dejanje zavrne.
- Ob ročnem vklopu so predizpolnjene sintetične priložnosti vpisane idempotentno; lokalno stanje se prebere nazaj in preveri identiteta podjetja, enote, vrednosti ter faze. Naslednji ročni premik se izvede strežniško z nadzorom verzije.
- »Ponastavi demo« ob povezavi odklopi **samo prikaz**, nikoli ne briše trajne testne baze ali knjižb. Windows/mobile offline KPI ostaneta popolnoma read-only.
- Demo poslovne enote in uporabniško članstvo/prijavo je treba pred ročnim lokalnim testom ustvariti v namenski izolirani bazi; most ne odpira ali ustvarja produkcijskih poslovnih enot.
- QA: `node --test tests/next11BusinessModel.test.mjs tests/next12SyntheticCrmClient.test.mjs`. Obravnava se dovoljenje samo lokalnega izvora, prepoved PII/podatkov drugih podjetij, CSRF, 401/403/409 ter odsotnost samodejnih ponovnih poskusov.
