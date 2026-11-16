# FinAI NEXT-13F — Windows ponovna namestitev brez izgube šifriranih sintetičnih podatkov

## Namen
Interne Windows izdaje še vedno niso namenjene resničnim poslovnim podatkom. Ta razvojna faza avtomatizirano preveri, da **ponovna namestitev** istovrstne QA izdaje ne spremeni ločenega lokalnega šifriranega trezorja.

## Kaj smo dodali
- Windows QA namestitev 0.1.1, nespremenjen `AppId` ter nespremenjena ciljna mapa `{localappdata}\Programs\e-integrator-desktop`.
- Inno Setup med nameščanjem omogoča nadzorovano zapiranje odprtih aplikacij brez samodejnega ponovnega zagona. Namenoma **ni** nobenega brisanja/ponastavitve uporabniške podatkovne mape ali izvornega trezorja med namestitvijo oziroma odstranitvijo.
- Začasna testna zbirka se s `--qa-installer-seed` ustvari izključno ob hkratnih oznakah `CI=true` in `GITHUB_ACTIONS=true`, pod `RUNNER_TEMP/finai-synthetic-installer-upgrade-v1`, ne v resničnem uporabniškem profilu.
- Sintetična zbirka vsebuje dve podjetji, en šifriran osnutek ter prenosno kopijo AES-GCM; zajeta je SHA256 kontrolna vsota te kopije.
- CI postopek namesti QA setup v začasen zaseben direktorij, ustvari testne podatke, nato **ponovno namesti isti setup**. Preveri, da delujejo nova prijava v SQLite3MC, pravilno ločevanje podjetij, HMAC/revizijska veriga, osnutek, neokrnjena izvozna kopija in obnova v novo ciljno mapo.
- Vse poteka na izoliranem Windows GitHub Actions runnerju; brez pisanja na Hiper M, druge projekte, DNS ali javni strežnik.

## Kaj ta preizkus NE potrjuje
- Ne dokazuje postopka nadgradnje dejanske *starejše* različice 0.1.0 → 0.1.1. Za to je potrebno zadržati ustrezne podpisane/nespremenljive stare izdaje in posebej preveriti povezavo uporabniške baze.
- Ne dokazuje interaktivnega UX pregleda na uporabnikovem računalniku, namestitve na popolnoma novo Windows 11 napravo brez interneta ali kode-signature same FinAI izdaje.
- Ne opravi računovodskega in varnostnega preverjanja za obdelavo resničnih podatkov.

## Nadaljevanje
Naslednji koraki so izrecen test različice 0.1.0 → 0.1.1 na izoliranem računalniku, upravljanje starejših šifriranih shem brez destruktivne migracije in podpisana javna Windows izdaja šele po celovitem QA.

FinAI GitHub/CI pisanje samo. Skupni `laskot48` izključno read-only; Laškoteka in STNG nedotaknjena.
