# FinAI NEXT-23 – nadzorovano dvosmerno usklajevanje sintetičnega CRM in naročil

## Zakaj

Novi NEXT-22 je vzpostavil preverjen sintetični Laravel podatkovni sloj. NEXT-23 ureja **ročno in konfliktno varno usklajevanje** med že obstoječim per-company pomnilniškim modelom Next.js in lokalnim Laravel CRM. Trgovinski pregled uporablja obstoječo transakcijsko CAS odločitev `review` → `reviewed/hold`. **Ni avtomatske strežniške sinhronizacije, ponavljanja zahtevkov ali uporabe pravih podatkov.**

## CRM: dvosmerni tok

1. **»Poveži lokalno testno CRM bazo«** samo v istega izvora `localhost` / `127.0.0.1`, z ročno prijavo, CSRF in pooblastili. Najprej naredi GET. Če je testna baza prazna in lokalni demo še nespremenjen, na izrecen klik registrira deterministične sintetične priložnosti, nato ponovno prebere. Nepopolna ali tuja baza se zavrne; ne izvaja se avtomatsko popravljanje delnih zapisov.
2. **»Preveri spremembe CRM«** sproži samo GET; ne prevzame podjetja, dodatnega zapisa, spremenjene vrednosti ali enote, starejše različice, preskoka faze in ne prepiše lokalne nepotrjene spremembe. Spremembe iz strežnika prevzame samo, če se poveča različica in faza sledi pravilnemu zaporedju. Po uspešni osvežitvi se preračuna isti skupni model NEXT-21, ki ga bere CRM in FinAI Intelligence.
3. **»Premakni v naslednjo fazo«** v povezanem načinu naredi izključno eksplicitni CSRF-zaščiten POST z `expected_version` v Laravel. Strežnik uporabi `lockForUpdate` in SQL CAS. Po odgovoru brskalnik **še enkrat preveri trenutno verzijo in fazo** na aktivnem podjetju; zamujen odgovor ne sme prepisati kasnejše lokalne spremembe.
4. Konflikt HTTP 409, napačna referenca, zamenjava podjetja med zahtevo ali lokalna druga verzija blokira nadaljnje povezane premike, dokler uporabnik ročno ne prebere strežniških zapisov ali ponastavi testni prikaz. **Samodejnega ponavljanja POST ni.**

CRM opomniki ostanejo zgolj lokalni demonstracijski zapisi. Niso del API sinhronizacije.

## Trgovinska pregledna vrsta

Če Laravel med eksplicitno potrditvijo naročila vrne **409** (druga seja je že zaključila pregled), UI naredi samo svež GET in pokaže strežniško odločitev. **POST ni samodejno ponovljen** in ne spreminja ločene lokalne sintetične vrste. Statusi so terminalni; na strežniku obstoječi `SyntheticCommerceReview` zagotavlja atomarno spremembo s pogojem `status=review` in revizijsko sledjo.

## Meje in tveganja

- Dostop je možen samo pri **izrecno vključenem lokalnem testnem API**. `NEXT_PUBLIC_FINAI_SYNTHETIC_CRM_API_BASE` in `NEXT_PUBLIC_FINAI_SYNTHETIC_COMMERCE_API_BASE` se v javni gradnji ne nastavita. Backend ostaja `APP_ENV=local/testing` in zastavice privzeto izključene.
- Nove spremembe **niso** avtomatsko shranjene v ERP. Sinhronizira se samo preizkušena CRM faza po obstoječem API-ju. Zaloge, knjižbe, FURS, davki, izdajanje računov, resnične spletne trgovine in plačila se ne spreminjajo.
- Ročna sinhronizacija je **po podjetjih**; zahteve s tujim podjetjem ali neveljavnimi referencami se zavrnejo. Pozno prejeta asinhrona potrditev ne spremeni trenutnega podjetja.
- UX ob konfliktu ne obljublja, da bo mogoče vse ločene lokalne spremembe samodejno združiti; nevarna dvoumnost zahteva ročno odločitev.
- Integracijski Playwright test uporablja **prestrezane sintetične odzive lokalnega API-ja** in preverja dejanske klike namiznega ter emuliranega mobilnega vmesnika. To ni fizični telefon in ne preverja resničnih CRM/API uporabnikov. Preverjanje transakcijskega Laravel CAS in dovoljenj je v ločenih izoliranih `backend/tests/Feature/Next12SyntheticCrmPersistenceTest.php` in `Next14cSyntheticProviderOrdersTest.php`, že v Laravel CI.

## QA

- `tests/next23SyntheticCrmReconciliation.test.mjs`: deterministični test poslovnih pravil, stopnje, verzije, dvojna optimistična primerjava ter zavrnitve napačnih podjetij in nepopolnih seznamov.
- `tests/e2e/next23-controlled-crm-sync.spec.cjs`: eksplicitno CRM GET/POST, konflikta iz druge seje, točno ena verzionirana zahteva, GET-only ponovni pregled, preklop podjetja, ter trgovinski 409 brez ponovljenega POST.
- `.github/workflows/finai-next23-crm-sync-qa.yml`: izoliran Chrome desktop/mobile prek `127.0.0.1`, ne ustvarja produkcijskih povezav ali deploya.

**Strežniška objava ostaja NO-GO**, dokler ni dokazano namensko izoliran FinAI OS/cPanel račun. Laškoteka, STNG in skupni račun `laskot48` so absolutno nedotakljivi; vse pisalne strežniške operacije ostajajo prepovedane.
