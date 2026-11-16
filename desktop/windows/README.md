# e-integrator / FinAI — Windows namizna različica OFFLINE-01

**Zahteva:** FinAI je samostojna namizna aplikacija z namestitvenim programom, ki mora ob vsakodnevnem delu delovati **brez povezave z internetom**. Hiper M je **spletna produkcija in prihodnji sinhronizacijski strežnik**, ne odvisnost lokalnega zagona.

## Kaj je izvedeno v OFFLINE-01

- Windows aplikacija v `.NET 10` s funkcionalnim lokalnim vmesnikom, sestavljena kot self-contained `win-x64` paket.
- Next.js UI se vgradí kot datoteke `wwwroot/**` ter v WebView2 naloži prek lokalnega navideznega HTTPS gostitelja `finai-desktop.invalid`. Internet, DNS `app.e-integrator.si`, Hiper M, Next server in Laravel za prikaz **niso potrebni**.
- Posebni zaslon `/offline/` omogoča **testne lokalne osnutke** (ustvarjanje, seznam, brisanje, ponovni zagon). Osnutki so v SQLite `%LOCALAPPDATA%\e-integrator\Desktop\drafts.db`.
- Vsebina SQLite osnutkov je šifrirana z Windows DPAPI in vezana na aktualnega uporabnika Windows. Podatki se ne sinhronizirajo; prenos datoteke v drug Windows profil sam po sebi ne omogoča dešifriranja. Zamisel potrebujeta varno izvozno/backup politiko pred resnično uporabo.
- WebView2 `postMessage` uporablja zgolj fiksne tipe `draft.list`, `draft.create`, `draft.delete` in `offline.status`; preverja točen izvor, ne dovoljuje direktnih SQL poizvedb, ne vklopi JavaScript host object mostu in ne odpira `file:`/HTTP URL.
- GitHub Actions sam sestavi nepodpisani `.exe`, vključi statične datoteke in ločeni **offline WebView2 Runtime Standalone Installer** s preverjenim Microsoft Authenticode podpisom ter ustvari notranji preizkusni `setup.exe` z Inno Setup. Ni produkcijske objave.
- Minimalni avtomatizirani test `EIntegrator.Desktop.exe --self-test` ustvari šifriran lokalni osnutek, zapre in ponovno odpre SQLite, preveri, da vsebina na disku ni v jasnem besedilu, in ga izbriše.

## NEXT-01 — šifrirana sintetična dobavniška vrsta (Windows)

- Zaslon `/offline/` vključuje izbor demonstracijskega podjetja in gumb za dodajanje **fiksne sintetične dobavnice** v lokalno vrsto; ponovni vnos je idempotenten.
- Namenska SQLite `synthetic-delivery-queue.db` vsebuje samo identifikator in ID podjetja v običajnih stolpcih; vsebina vsakega zapisa je za trenutnega uporabnika Windows šifrirana z **DPAPI CurrentUser** in preverjena pred prikazom. Dejanske poslovne dobavnice ali drugi dokumenti niso dovoljeni.
- Izbira podjetja omejuje izpis in brisanje; tuje podjetje ne more izbrisati drugega zapisa. Vrsta nima strežniških zahtevkov, prenosa ali funkcije »sinhroniziraj« in ne predstavlja trajne produkcijske shrambe.
- Vključeno v obstoječi Windows CI s ciljnim `--delivery-queue-self-test`: ponovno odprtje, različna podjetja, ni dvojnikov, ni nezavarovanega besedila dokumenta v SQLite in zavrnitev spremenjene šifrirane vsebine.
- Šele pozneje: izolirana mobilna offline vrsta, avtoriziran strežnik, idempotentni dogodki, sinhronizacijski konflikti, varovana obnova in resnična prijava. Ne uporabljati realnih podatkov.

## Omejitve prve izdaje

To **še ni celovita offline računovodska aplikacija**. Obstoječi Next.js moduli so večinoma demonstracijski, vse prave knjižbe, davčne evidence, fakturiranje, zaloge, dokumenti, več podjetij in sinhronizacija zahtevajo nadaljnjo implementacijo. Lokalna SQLite za zdaj vsebuje samo testne osnutke; ne sprejemamo pravih finančnih ali osebnih podatkov.

Potrjena končna usmeritev:
1. Poslovna logika mora biti pravilno definirana v skupnih determinističnih pravilih in testih, čeprav jo izvajata ločeni Laravel in namizni lokalni runtime.
2. Lokalna produkcijska shema: tenant/company isolation, zaporedno številčenje, transakcije, double-entry, irreversible audit log, obnovitev in šifrirana varna hramba. Tega ni dovoljeno prikazovati kot izvedeno.
3. Sinhronizacija z Hiper M, kadar je internet na voljo: varovana dvosmerna vrsta dogodkov, idempotency keys, verzioniranje, nadzor konfliktov, varen izvoz/obnova. Brez avtomatičnega spreminjanja že potrjenih računov/knjižb.
4. Šele nato testna podpora realnim poslovnim podatkom; podpisan distribuiran namestitveni program in test na dejanskem Windows 11.

## Lokalni razvoj

Na Windows z .NET 10 SDK:

```powershell
npm install
npm run build
dotnet restore desktop/windows/EIntegrator.Desktop.csproj --runtime win-x64
dotnet publish desktop/windows/EIntegrator.Desktop.csproj -c Release -r win-x64 --self-contained true -p:PublishTrimmed=false -o dist/windows
Copy-Item -Recurse out dist/windows/wwwroot
.\dist\windows\EIntegrator.Desktop.exe --self-test
```

Za GUI zaženi `dist/windows/EIntegrator.Desktop.exe`. Lokalni test deluje brez aktivnega spletnega API.

### Preizkusni namestitveni program

Workflow `FinAI Hiper M web + Windows desktop build` v GitHub Actions zgradi `eintegrator-win-x64-offline-installer-unsigned-review`. Paket vključuje lastno aplikacijo, statične UI datoteke, .NET self-contained runtime in Microsoftov polni WebView2 offline installer. Installer je **nepodpisan** in primeren samo za notranji QA, ne za končne uporabnike.

Vsaka izdaja zahteva: verzioniranje, podpis kode, nadgradnjo brez izgube lokalnih podatkov, varno obnovo, preizkus brez aktivne internetne povezave ter ERP domain tests.

## Izboljšava DESKTOP-ZOOM-01 (namizna uporabnost)

Windows aplikacija ima v zgornji orodni vrstici tri dostopne gumbe **− / 100 % / +**, ki neodvisno od spletnega CSS nadzorujejo lokalno povečavo vmesnika WebView2 od **80 do 160 %** v korakih po 10 %. Sprememba je omejena na trenutno sejo aplikacije in ne vpliva na računovodske podatke, shrambo, operacijski sistem ali strežnik. Gumbi imajo dostopna slovenska imena za bralnike zaslona. Povečava v namizju je dodatna k prilagoditvam posameznih poslovnih podpogledov.

Omejitve: ni individualnega shranjevanja namizne povečave med zagoni, ni univerzalnega preurejanja vseh notranjih oken ali končnega preverjenega WCAG AA; ciljni test je sestava Windows aplikacije in obstoječi offline/šifrirani ledger self-testi. Ni prisilne posodobitve obstoječe namestitve.


## NEXT-13C — varovan izvorni Windows obrazec za sintetična naročila

V zgornji orodni vrstici namizne aplikacije je gumb **Šifrirana naročila**. Odpre nativno Windows Forms okno, ki ne sprejema JavaScript sporočil in ne izvaja HTTP klicev. Uporabnik mora lokalni šifrirani trezor izrecno ustvariti oziroma se vanj prijaviti. Testni trezor je v zasebnem uporabniškem območju LocalApplicationData/e-integrator/Desktop/SyntheticOrderVault-v1 in vsebuje samo dve ustvarjeni izmišljeni podjetji in sintetične osnutke.

Vnos zahteva lokalno 15-minutno sejo, izbiro podjetja, fiksni izmišljeni SKU, količino in ceno v centih. SQLite3MC šifrira podatke, DPAPI varuje ključ, HMAC zagotavlja preverjanje celovitosti in zapis spremembe doda revizijski dogodek. Native varnostna kopija AES-GCM ter obnova samo v še neobstoječi trezor ne prepisujeta podatkov. To ni povezano z resničnim ERP knjiženjem.

## NEXT-13D — samostojna QA namestitvena izdaja

Nov ciljni potek GitHub Actions finai-windows-installer-qa.yml izdela preizkusni Inno Setup paket z vsemi lokalnimi sredstvi, .NET runtime in Microsoftovim polnim podpisno preverjenim WebView2 offline installerjem.

- GitHub Actions preverjen run: https://github.com/ddcpark-coder/finai-ledger/actions/runs/43850976824
- Artefakt: finai-next13d-win-x64-offline-qa-unsigned; 7-dnevna hramba.
- Nameščalnik FinAI je nepodpisan in primeren izključno za notranji sintetični QA.
- Uporabljati na testnem Windows 11 računalniku; pred resničnimi podatki sta nujna preverjena offline namestitev in varna nadgradnja brez izgube lokalne baze, podpis izdaje ter neodvisen varnostni in računovodski pregled.


## NEXT-13F — Windows 0.1.1 QA: prenosna obnova in ponovna namestitev

Napaka v prejšnjem Windows preizkusu je bila posledica zagona GUI aplikacije brez čakanja na njeno izhodno kodo. Zdaj vsak test uporablja \`Start-Process -Wait -PassThru\` in je preveril tudi postopek prenosne obnove.

**Aktualni interni testni namestitveni paket 0.1.1**:
- https://github.com/ddcpark-coder/finai-ledger/actions/runs/43860251753
- Razdelek \`Artifacts\` → \`finai-next13d-win-x64-offline-qa-unsigned\` (ZIP).
- SHA256 nameščalnika \`setup.exe\`: \`C39BDECFF29E183122FBD592CA9569506BC70A70EBBBD640BC49334C86D69510\`.

Na **namenskem testnem Windows 11 računalniku** (brez resničnih poslovnih podatkov) pred testiranjem z PowerShell preveri SHA256 datoteke z \`(Get-FileHash 'pot-do-setup.exe' -Algorithm SHA256).Hash\`; neskladje je razlog STOP. Nepodpisanega razvojnega paketa ne obravnavaj kot varno javno izdajo in ne izklapljaj zaščit Windows za potrebe realnega poslovanja.

CI je že samodejno namestil in znova namestil isto različico v izolirano začasno okolje ter potrdil ohranitev šifriranih podjetij, naročila in AES-GCM obnovitvene kopije. **Nista še preverjena** čista ročna offline namestitev na uporabnikovem računalniku in nadgradnja stare izdaje 0.1.0 → 0.1.1. Zato ne vključuj resničnih podatkov.

Obseg preizkusa: izvorni trezor uporablja Windows DPAPI in SQLite3 Multiple Ciphers. Prenosna varnostna kopija vsebuje **samo šifrirane** SQLite podatke in je dodatno zaščitena z AES-GCM/geslom. Pred njenim nastankom SQLite izdela ločen konsistenten šifriran posnetek, namesto neposrednega branja zaklenjene datoteke. Sinhronizacija z Hiper M še ni aktivirana.
