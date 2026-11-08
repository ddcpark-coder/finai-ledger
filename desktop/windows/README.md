# e-integrator Desktop — Windows (DESKTOP-01)

Prvi izvorni Windows odjemalec za FinAI. **Ne vsebuje lastnega računovodskega zaledja ali lokalne podatkovne baze.** Isti zaščiteni uporabniški vmesnik in dokumenti se po avtorizaciji odpirajo izključno na `https://app.e-integrator.si/`, ki mora produkcijsko delovati na **Hiper M**. Dokler DNS in Laravel API nista pripravljena, se namizni program ne more povezati; to je pričakovano.

## Tehnologija in varnost

- .NET 10 / Windows Forms in Microsoft Edge WebView2 `1.0.4314.35` (pripeta različica).
- Zaklenjena navigacija na `https://app.e-integrator.si/` (samo HTTPS, privzeta vrata 443, brez uporabnika v URL). Vse druge običajne `https:` in `mailto:` povezave gredo v privzeti brskalnik. Vsebina ne sme odpirati `file:`, `javascript:`, `http:` ali poljubnih lokalnih shem.
- Brez WebView2 host objects in brez host message bridge. Navadne spletne prijavne piškotke upravlja per-user WebView2 profil pod `%LOCALAPPDATA%\e-integrator\Desktop\WebView2`. Aplikacija ne vgrajuje gesel, dostopnih žetonov, API ključev ali certifikatov.
- Standardna TLS verifikacija sistema ni oslabljena. Napake se pokažejo kot nedosegljivost, brez ignoriranja certifikatov.
- Online-only: brez zakulisnega shranjevanja računov, knjižb, finančnih dokumentov ali odloženih sinhronizacij. Zmožnosti več podjetij, podpisovanja in revizijske sledi zagotavlja Laravel.
- NI primerna za obdelavo resničnih podatkov ali namestitev pri strankah, dokler nista produkcijski Hiper M sistem in podpisana namizna izdaja preverjena.

## Razvoj in sestavljanje

Na Windows računalniku z nameščenim .NET 10 SDK:

```powershell
dotnet restore desktop/windows/EIntegrator.Desktop.csproj
dotnet run --project desktop/windows/EIntegrator.Desktop.csproj
```

Nepodpisana prenosljiva testna izdaja:

```powershell
dotnet publish desktop/windows/EIntegrator.Desktop.csproj -c Release -r win-x64 --self-contained true -p:PublishTrimmed=false -o dist/windows
```

Mapa `dist/windows` je komplet, ne kopirajte samo datoteke `.exe`. Ciljni računalnik mora imeti Microsoft Edge WebView2 Runtime (večinoma že prisoten v Windows 11). Odsotnost DNS zapisa za `app.e-integrator.si` se izpiše kot nedosegljivost strežnika.

## Preostali pogoji do izdaje strankam

1. Hiper M subdomena in backend sta aktivirana ter pravilno zaščitena (Sanctum / dovoljenja / tenant isolation).
2. QA z dejanskim Windows 11 sistemom, ločenima uporabnikoma in podjetjema; obravnava nezaupanih povezav, izpada DNS in preklopa računa.
3. Podpisovanje Windows izvršljivih datotek in preverjen namestitveni program (MSI/MSIX ali podpisan NSIS).
4. Oblikovanje politike posodobitev, zasebnosti profila in odstranitev podatkov ob odjavi.
5. Šele po uspešnih testih dovolimo realne finančne podatke.

GitHub workflow `.github/workflows/finai-hiperm-desktop-build.yml` je **build only** in shrani nepodpisan paket kot kratkotrajni CI artefakt; ničesar ne namesti na Hiper M in ne objavi javne izdaje.
