# FinAI NEXT31 — ročni šifrirani prenos Windows → Laravel (sintetični QA)

## Namen in dejanska meja

V Windows aplikaciji (nativno okno **Šifrirani osnutki** → **Izvozi demo dogodek**) je mogoče pripraviti **fiksen testni dogodek** za eno od treh izmišljenih podjetij. To niso podatki iz prave glavne knjige, dokumentov ali CRM. Ustvari se lokalni UUID, pričakovana različica in na izrecno uporabniško zahtevo AES-256-GCM ovojnica, z ločeno frazo, ki se ne pošlje na strežnik.

Prenos je **izključno ročen**: JSON se zapiše v preverjeno lokalno mapo `%LOCALAPPDATA%\e-integrator\Desktop\SyntheticWindowsExports-v1`, brez HTTP zahtev, žetonov, računovodskih sprememb ali avtomatskih ponovitev. Uporabnik lahko paket posebej prenese v izolirano lokalno/testno okolje z že obstoječo testno Laravelovo prijavo, CSRF in dovoljenjem `documents.write`. Ta izdaja **NE vsebuje avtomatskega uploaderja, produkcijskega protokola ali strežniške potrditve v Windows aplikaciji**.

## Šifriranje in idempotenca

- Format Windows ovojnice: `finai-windows-synthetic-outbox-v1`, strogo različen od mobilnega `finai-mobile-synthetic-vault-v1`. Notranji fiksen vzorčni JSON vsebuje `finai-windows-synthetic-outbox-evidence-v1`, `demoOnly=true`, isti UUID, podjetje, dokument in pričakovano različico.
- PBKDF2-SHA256, 250.000 ponovitev, naključna 16-B sol; AES-256-GCM z naključnim 12-B IV in 16-B tagom, podoben mobilni ovojnici, a z **drugo AAD domeno**: `finai-windows-synthetic-outbox-v1|companyId|documentId`.
- Pri ponovnem izvozu istega UUID sistem ne ustvari novega ciphertexta: šifrirani JSON je shranjen v namenski DPAPI CurrentUser-zaščiteni lokalni cache in preden ga vrne, ponovno preveri frazo ter AES-GCM integriteto. Napačna fraza, poškodovan zapis ali drugačno podjetje so zavrnjeni.
- Laravel uporablja **obstoječi** `SyntheticReceiptSync` in `SyntheticReceiptSyncController`, ki prepoznata novi format, vendar je API še vedno povsem nedostopen zunaj `APP_ENV=local/testing` ter brez izrecnega `FINAI_SYNTHETIC_RECEIPT_SYNC_ENABLED=true`.
- Strežnik preveri prijavo, preverjeno e-pošto, zahtevani MFA, trenutno podjetje, `documents.write`, obliko ovojnice, ponovljeni UUID, SHA256 in pričakovano verzijo, nato shrani **nepregleden šifriran paket** v testno tabelo in revizijo. 409 pomeni konflikt, nikoli samodejno prepisovanje.

## Pomembna omejitev

Strežnik **ne more dešifrirati** klientove ovojnice in zato ne more kriptografsko dokazati, kaj je v njej. Zgolj sprejem sintetičnega tipa **ni** dokaz veljavnega poslovnega dokumenta, identitete naprave, avtentičnosti strežniškega potrdila ali primernosti za resnične podatke. Windows aplikacija prav tako še **ne preverja strežniškega ACK**. Povezava je sintetični test prenosa, ne produkcijska sinhronizacija ali elektronski podpis.

## Minimalni QA

- Windows: obstoječi `--offline-sync-queue-self-test` vključuje še `SyntheticWindowsTransfer.SelfTest()`: sveža sol/IV, AES-GCM dešifriranje, nespremenljiv ponovni izvoz, napačna fraza, tuje podjetje, prikrit lokalni cache ter zavrnitev poškodovanega DPAPI paketa.
- Laravel: `php artisan test --filter=SyntheticReceiptSyncTest`: novi format, prijava, izolacija, ponovljen identičen dogodek, 409 konflikt, zavrnjena stara shema, revizija ter izklop v produkciji.
- Povezan GitHub CI za Windows gradnjo + lokalni šifrirani selftest ter sintetični Laravel API. Testi na izoliranem runnerju, brez produkcijskih podatkov ali posegov v gostovanje.

Nadaljnje delo: preverjen identitetni register naprav, javno-ključni podpis/overjen ACK, varna potrditev strežniškega prejema v Windows outbox, conflict-resolution UX, dejanski šifrirani računovodski podatki šele po formalnem QA. Strogo brez sprememb Laškoteke, STNG, `laskot48`, skupnega SSH/cPanela in Hiper M.
