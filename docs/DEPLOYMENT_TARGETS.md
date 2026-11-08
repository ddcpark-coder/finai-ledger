# FinAI / e-integrator.si — deployment targets

**Odločitev 8. 11. 2026:** FinAI se produkcijsko gostuje na **Hiper M**, z lastno spletno aplikacijo in **namiznim odjemalcem**. Vercel je izključno zaščiten razvojni predogled in ni produkcijsko okolje.

## Hiper M — edina načrtovana produkcija

| Naslov | Namen | Tehnologija | Stanje |
|---|---|---|---|
| `https://e-integrator.si/` | Predstavitvena stran | statični HTML | **Objavljeno, HTTPS 200** |
| `https://app.e-integrator.si/` | Računovodski uporabniški vmesnik | Next.js/React **statični izvoz**, LiteSpeed/Apache statične datoteke | **Še ni objavljeno; DNS nedelujoč** |
| `https://api.e-integrator.si/` | Identiteta, računovodska logika, API | Laravel 13 / PHP 8.4 / MariaDB 10.11 | **Ni aktivirano; DNS nedelujoč** |

- GitHub Actions gradi statični spletni UI v mapo `out/`; Hiper M v produkciji **ne potrebuje dolgotrajnega Node.js strežnika**.
- Laravel ostane avtoritativen za prijave, podjetja, pravice, knjiženje, FURS, podatke in dokumente. Na Hiper M mora biti document root za Laravel samo `backend/public` iz izdaje; `.env`, izvorna koda in dokumentni originali niso javni.
- Pred produkcijo: **samostojen Hiper M račun za FinAI**, ločen DB uporabnik, TLS, preverjen backup/restore, cron/queue režim in zapisane pravice. Dokler je račun skupen z Laškoteko, ne omogočiti avtomatiziranih pisalnih izdaj.
- Statični Next.js izvoz ne omogoča Next.js API routes, server actions, `cookies()`, SSR, ISR ali proxy middleware. Takšne funkcije sodijo v Laravel ali zahtevajo ločeno arhitekturno spremembo. Frontendov prikaz samo po sebi ne dokazuje, da so podatki resnični.
- `app` in `api` ne povezuj z Vercelom. DNS v Hiper M naj se ureja šele po pregledu obstoječih zapisov in document root. Glavna stran ne sme izgubiti 200/HTTPS.

## Namizna različica

- `desktop/windows/`: izvorna **Windows aplikacija** (.NET 10 WinForms + WebView2), ki varno prikaže isto Hiper M aplikacijo `https://app.e-integrator.si/`. Ne ustvarja druge poslovne baze in ne podvaja računovodske logike.
- Domači zaslon je neposreden in izoliran; po veljavni spletni prijavi uporablja spletni UX, dokumente, delovne naloge in prilagoditve, ki jih podpira Laravel API.
- Prva faza je **online-only**. WebView2 na Windows vzdržuje standarden lokalni profil brskalnika; gesla, FURS certifikati in skrivnosti niso v aplikacijski kodi. Privilegiranega JS/native bridge ni.
- Vmesnik ne sledi neodobrenim zunanjim HTTP navigacijam; zunanje HTTPS in `mailto:` povezave odpre v sistemskem brskalniku. Ne dovoljuje lokalnih `file:` ali poljubnih custom shem.
- GitHub Actions generira samo **nepodpisan Windows testni paket**. Pred javno distribucijo: podpisovanje kode, namestitveni paket, mehanizem posodobitev, pravilnik hrambe in lokalno preverjanje Windows 11. Podpora macOS/Linux je poznejša faza, ne obljuba za ta korak.

## Vercel — samo preview

- Vercel ni in ne bo produkcijsko gostovanje; zaščita SSO mora ostati **`all`**.
- `app.e-integrator.si` je bila pomotoma dodana v Vercel kot custom-domain binding. **DNS zanjo ni bil usmerjen na Vercel**. Vezavo je treba odstraniti, ko je mogoče opraviti namensko administrativno dejanje; dokler ni odstranjena, je prepovedano dodati DNS CNAME za Vercel.
- `vercel.json` trenutno onemogoča Git deployment na `main`; te blokade ne odstranjuj samodejno. Vercel ni potreben za build produkcijskih spletnih sredstev.

## Preflight in izdaje

1. GitHub CI: `npm run build` → `out/` in namizni `dotnet publish`; QA ostane brez podatkov podjetij, gesel in certifikatov.
2. Hiper M: read-only preflight domen, PHP, docroot, DB, backup/restore, TLS, pravic. Ne posegati v Laškoteko.
3. DNS: po potrditvi, `app` usmeri **na Hiper M**, ne Vercel; `api` šele ob pripravljenem varovanem Laravelu.
4. Pripravi preverjene, obnovljive izdaje backend/public + frontend out, z ločenimi spletnimi koreni; minimalni smoke testi.
5. Prvo javno uporabo vklopi samo po varnostnih, finančno pravilnostnih in večpodjetniških testih.
