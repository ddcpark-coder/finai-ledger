# FinAI NEXT-13F — varovana nadgradnja Windows QA

## Implementacija
- Inno Setup `AppId` in namestitvena pot ostaneta stabilna; QA različica je povečana na 0.1.1. Lokalne šifrirane zbirke so v uporabnikovem `LocalApplicationData/e-integrator/Desktop/`, ne pod namestitvenim `{app}`.
- Inno Setup `AppMutex` in Windows enojna instanca uporabljata isto ime; namestitev se ne sme izvajati, ko je program odprt. `CloseApplications=no` pomeni, da namestitev programa na silo ne zapira.
- Installer ne vsebuje ukazov za brisanje, premik, ponastavitev ali selitev uporabniških podatkov. Obnova ostane izključno zavestno dejanje uporabnika v novo lokacijo.
- `--upgrade-preservation-self-test` na izoliranem Windows runnerju ustvari sintetični trezor, doda podjetje in osnutek, zamenja samo navidezne programske datoteke in preveri SHA256 obeh šifriranih datotek, ponovno odprtje, avtorizacijo in prenosno AES-GCM obnovo.
- Test je vključen v namenski workflow `finai-windows-installer-qa.yml` poleg dveh kritičnih šifriranih testov in Microsoftovega podpisanega WebView2 Runtime.

## Omejitve
- To preverjanje **simulira** prehod med programskima različicama. Ne predstavlja dokazano uspešne namestitve ali nadgradnje na dejanskem Windows 11 računalniku.
- Ročni preizkus: zapri FinAI, preveri kopijo v ločeno lokacijo, zaženi novo testno namestitev, prijavi se v ista sintetična podjetja, preveri ID osnutkov, odjavo, ponovno odprtje in obratno obnovitev na izoliranem računalniku.
- Še ni produkcijsko podpisanega installerja ali računovodsko-varnostnega dovoljenja za resnične podatke.
- Namestitev na Hiper M ni bila izvedena. Skupni `laskot48` ostaja read-only; Laškoteka in STNG nista predmet FinAI razvoja.
