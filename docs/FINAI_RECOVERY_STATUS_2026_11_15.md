# FinAI — obnovitveno stanje razvoja, 15. november 2026

Namen: neodvisna, trajna točka za nadaljevanje projekta tudi, če prejšnjega klepeta ChatGPT ni mogoče odpreti.

## Preverjeni viri

- Repozitorij: `ddcpark-coder/finai-ledger`; glavna veja `main`.
- Osnovna faza NEXT11D: commit `b50763a`, PR #114 (14. 11. 2026).
- NEXT12A: [PR #115](https://github.com/ddcpark-coder/finai-ledger/pull/115), squash `3e577cd` (15. 11. 2026).
- NEXT12B: [PR #116](https://github.com/ddcpark-coder/finai-ledger/pull/116), squash `acd2b47` (15. 11. 2026).
- NEXT12A: GitHub Actions `FinAI Laravel foundation tests` run #64, SUCCESS.
- NEXT12B: ciljni Node CRM/BI QA, offline Windows/mobile BI QA, multibranch QA in izolirani build CI vsi SUCCESS.
- Push `acd2b47`: build statične spletne izdaje SUCCESS; **stage = skipped; promote = skipped**. Ni produkcijske objave.

## Potrjeno izvedeno

1. NEXT11A: sintetični KPI/grafi in interaktivni CRM, doslej samo RAM.
2. NEXT11B: sintetična večskladiščna logistika in primer WooCommerce/Shopify.
3. NEXT11C: read-only poslovni KPI v Windows in mobilnem offline predogledu.
4. NEXT11D: Laravel shema poslovnih enot, skladišč in sintetičnega e-commerce inboxa; izolirani testi.
5. NEXT12A: dodatna izolirana sintetična CRM podatkovna tabela, pravice `crm.read/write`, verzionirani prehodi, nespremenljivi ponovni vpisi, atomaren audit in lokalno omejene API-poti. Privzeto izklopljeno; uporaba samo lokalno/testing.
6. NEXT12B: ročna lokalna povezava CRM prikaza z API-jem. Brez samodejnih API zahtevkov; sprejemajo se samo isti loopback origin, sintetični ID-ji, celoštevilski centi in potrjeni odgovori. Z javnega predogleda nedostopno.

## Preostale faze

| Faza | Naslednja konkretna razvojna naloga | Odvisnost |
| --- | --- | --- |
| NEXT12C | Zaledni CRM model poenotiti s poslovnimi enotami, pravicami in realnimi partnerji; ciljna MariaDB transakcijska QA brez resničnih podatkov | Izolirana testna MariaDB, migracijski načrt |
| NEXT13 | Windows: offline poslovne transakcije, šifrirana baza, tenant izolacija, obnovitev; mobilno: nadzorovano zavarovano delo brez povezave in dvosmerni konfliktni protokol | Določena pravila in izolirani synthetic QA |
| NEXT14 | WooCommerce/Shopify: preverjanje in avtorizacija povezav, podpis webhookov, deduplikacija in mapping izdelkov; pozneje banka, e-računi in davčne storitve | QA, skladnost, varna hramba poverilnic; brez pravih podatkov |
| NEXT15 | Preveriti odprte PR-je #34/#35 (stare verige BACKEND) in #87/#88 (print PWA), predvidoma prenesti relevantne spremembe na novo vejo iz `main`, ne združiti starega konflikta na silo | Ciljni pregled diff, brez regresij |
| NEXT16 | Ločeni FinAI OS/cPanel račun na Hiper M, ločena baza, varovan deploy, TLS, obnovitvena točka, preverjena izolacija in ciljni QA pred produkcijo | Dokazana sistemska izolacija in pripravljen lasten račun |

## Odprti PR-ji: preverjeno stanje 15. 11. 2026

- #34: osnutek BACKEND-05, ciljna veja `backend-04-isolated-deployment-prep`. Ne združevati neposredno v `main`.
- #35: osnutek BACKEND-06, ciljna veja `backend-05-domainless-provisioning`; vključuje migracijske popravke in stare nastavitve Vercela. Potreben pregled po posameznih datotekah.
- #87: stari PRINT-DELIVERY-01, `mergeable=false` ob preverjanju. Oceniti, katere funkcije so že v `main`; narediti novo ciljno vejo, če so spremembe še potrebne.
- #88: stari PWA-DEMO-01, `mergeable=false`. PWA/Service Worker lahko vpliva na offline cache in občutljive poslovne podatke: brez avtomatične združitve.

## Neodpravljene meje in varnostni pogoji

- Repo je javen: nikoli ne zapisuj skrivnosti, gesel, strank, računov, podpisov ali dejanskih poslovnih podatkov v repo/CI.
- Na skupnem `laskot48` ni dovoljen noben FinAI pisalni poseg. Laškoteka, STNG in njihove skupne storitve se ne smejo spreminjati niti posredno.
- Vercel je dovoljen le za zaščitene sintetične razvojne predoglede; `app.e-integrator.si` se ne preusmerja na Vercel.
- Pred javno produkcijo FinAI potrebuje lasten preverjeno izoliran Hiper M račun, svojo bazo, prijavo/2FA, revizijo, obnovitev in računovodsko/varnostni QA.
- GitHub merge sam po sebi ne pomeni produkcijske objave. Zadnji preverjeni workflow na `main` je oba strežniška koraka preskočil.
- Windows je še preizkusna offline aplikacija; mobilna različica PWA, ne nativna iOS/Android aplikacija. Ni potrjena uporabnost z resničnimi podatki.
- Opravljeni so bili ciljni sintetični testi, ne celovita produkcijska certifikacija.

## Prednostno nadaljevanje

1. NEXT12C: zaključiti lokalni CRM → poslovni podatkovni model in skladnost v SQLite/MariaDB.
2. NEXT13: dopolniti Windows/mobile offline poslovne tokove (brez predčasne sinhronizacije).
3. NEXT15: razrešiti stare PR #87/#88 z novima ciljema, ohraniti stroge offline meje.
4. NEXT14: postopni realni konektorji, a samo v izoliranem sintetičnem testnem okolju.
5. NEXT16: Hiper M objava šele ob dokazani izolaciji; pred tem nadaljevati razvoj na GitHubu.

Status je namenoma zasnovan kot **evidenca doseženega in naslednjih nalog**, ne kot izjava, da je produkcijski sistem zaključen.
