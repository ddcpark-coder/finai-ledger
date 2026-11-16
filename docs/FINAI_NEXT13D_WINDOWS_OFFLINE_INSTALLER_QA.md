# FinAI NEXT-13D — samostojni offline Windows namestitveni paket, sintetični QA

## Obseg

- Nov ločen GitHub Actions workflow `finai-windows-installer-qa.yml` sestavi **nepodpisani interni testni** `e-integrator-desktop-offline-setup-win-x64-unsigned.exe`, brez objave na spletno produkcijo ali podpisovanja kot javni komercialni produkt.
- Gradnja: Next.js statični `/offline/` vmesnik, self-contained .NET 10 `win-x64` program, lokalna SQLCipher/SQLite3MC šifrirana baza in native NEXT-13C uporabniško okno.
- Vključen je Microsoftov polni WebView2 Runtime **offline** namestitveni paket, preverjen z veljavnim Microsoft Authenticode podpisom.
- Nameščalnik se sestavi z Inno Setup samo na izoliranem začasnem GitHub Windows runnerju. Ne spreminja Hiper M, osebnih računalnikov ali drugih projektov.
- Pred sestavo namestitvenega programa se na Windows runnerju izvedeta samo kritična offline self-testa: šifrirani osnutki/tenant/vloge in prenosna AES-GCM/DPAPI obnova.
- GitHub artefakt se hrani 7 dni za interni prenos in ročni pregled; SHA256 nastalega `setup.exe` je izpisan v gradbenem dnevniku.

## Omejitve

- To je nepodpisani razvojni QA namestitveni paket, ne javno izdan produkt. Njegova preverjena gradnja še ne dokazuje pravilne nadgradnje že nameščenega programa ali delovanja na poljubnem Windows 11 računalniku brez interneta.
- Pred javno izdajo mora biti aplikacija digitalno podpisana, dejansko preizkušena na čisti Windows 11 namestitvi brez interneta, s preverjeno obnovitvijo med OS profili in dodatnim računovodskim/varnostnim QA.
- Nameščeni WebView2 runtime je podpisan pri Microsoftu, vendar je sam **FinAI setup.exe nepodpisan**.

Ni spletnega deploymenta in ni pravih uporabniških/finančnih podatkov. Laškoteka, STNG in skupni Hiper M `laskot48` ostanejo nedotaknjeni.