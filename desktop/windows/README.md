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
