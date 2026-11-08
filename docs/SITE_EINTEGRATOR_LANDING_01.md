# SITE-EI-01 — e-integrator.si začetna stran in varna namestitev

**Stanje: 8. 11. 2026.** Domena e-integrator.si in www.e-integrator.si imata HTTPS in 404, poddomeni app.e-integrator.si in api.e-integrator.si pa sta pri browser testu vračali ERR_EMPTY_RESPONSE. Domena je registrirana, spletna vsebina pa še ni pravilno objavljena.

## Sprejeta arhitektura

| Domena | Vloga | Stanje |
|---|---|---|
| `e-integrator.si` / `www.e-integrator.si` | Varna statična predstavitvena stran na Hiper M | V pripravi |
| `app.e-integrator.si` | Pozneje samostojen Next.js uporabniški vmesnik (Vercel) | Brez povezave s custom domain; ne aktiviraj javnega prijavljanja |
| `api.e-integrator.si` | Pozneje Laravel API (Hiper M; samo `current/public`) | Ni varno aktivirati dokler ni zasebne konfiguracije in preflighta |

**Potrjen cPanel document root iz predhodne konfiguracije:** `/home/laskot48/e-integrator.si`. Laškoteka je v `/home/laskot48/public_html`. Obe lokaciji sta znotraj istega uporabnika `laskot48`, zato mora biti obseg vsakokratne spremembe ozek.

## Vsebina

`website/landing/index.html` je samostojna, odzivna slovenska predstavitvena stran v sodobni temni vizualni podobi. Brez piškotkov, analitike, zunanjih pisav in zunanjih skript. Vse načrtovane funkcije so označene kot **v razvoju**; ni javne prijave ali zavajajočih trditev o že delujočem računovodskem sistemu. Do uradne predstavitve ostane `noindex,nofollow` (prek meta oznake). Vsi prikazani poslovni podatki so izmišljeni.

## Varnostni pogoji za objavo

`ops/finai-landing-deploy.sh`:
- Privzeto naredi samo pregled (`--inspect`).
- Pri `--apply` preveri uporabnika `laskot48`, kanonični dokumentni koren, lastništvo in pravice, zasebni FinAI shared, identiteto HTML datoteke in meta `noindex`.
- Ne spreminja obstoječih datotek. Če že obstaja drugačen `index.html`, `index.php`, `default.html` ali simbolna povezava, **STOP**.
- Če ni konflikta, atomarno doda **samo** `/home/laskot48/e-integrator.si/index.html`. Zaklep ostane izven spletnega korena pod FinAI private shared.
- Ne spreminja DNS, .htaccess, cPanel nastavitev, SSH ključev, cronov, Laravel aplikacije, podatkovnih baz, drugih domen ali Laškoteke. Ne uporablja neomejenega SSH avtomatizacijskega ključa.
- Če so pogoji drugačni od pričakovanih, **ne poskušaj obiti**; ustavi in izpiši razlog.

## Postopek (ena lokalna cPanel izvedba, po odobritvi)

Po združitvi na pregledani `main` naj bo namestitev izvedena iz **nespremenljivega SHA**, ne iz trenutnega HEAD; najprej ločeni zasebni staging, nato pregled in na isti seji izvedba. Uporabi le preverjen repozitorij `https://github.com/ddcpark-coder/finai-ledger`.

Po objavi je obvezna zunanja HTTPS-verifikacija obeh `e-integrator.si` in `www.e-integrator.si`; če je status še vedno 404, ne spreminjaj globalnega DNS ali drugih document root map. Najprej read-only preveri učinkoviti cPanel document root. Dodatnih aplikacijskih domen ne spreminjaj, dokler ni potrjena ustrezna varnostna priprava.

## Ločeni nadaljnji koraki

1. Preveriti učinkovita document roota `app` in `api` z read-only cPanel UAPI; ne ustvarjati ali spreminjati DNS na pamet.
2. Za `api`: zasebni `shared/.env`, ločen FinAI DB uporabnik in samo kandidatni migraciji 001+018, po ciljni varnostni kopiji in testu obnove. `FINAI_AUTH_RELEASE_ENABLED=false`.
3. Za `app`: usmerjanje preko Vercela šele po pregledu DNS, certifikata, avtorizacije in prvih integracijskih testov. Pri custom domain je treba preveriti Vercel zaščito, da ne postane razvojni UI javno dostopen.
4. Javna uporaba z realnimi podatki šele na ločenem gostovalnem računu FinAI.

## Zaključek SITE-EI-01 — 8. november 2026

- Uporabnik je na Hiper M uspešno izvedel `ops/finai-landing-deploy.sh --inspect` in `--apply` iz potrjene izdaje Git SHA `5ebc05496fdd853a19857341a6c4fba0e8042616`.
- Namestitveni dnevnik: `FINAI_LANDING_PREFLIGHT=PASS` za oba načina, `FINAI_LANDING_DEPLOY=PASS`, cilj `/home/laskot48/e-integrator.si/index.html`, SHA-256 `1474eceff785ce743e43504a9e94d3afec81bb19459d3eb9b0d2e912f63083d3`.
- Z neodvisnim read-only obiskom brskalnika sta bili na `https://e-integrator.si/` in `https://www.e-integrator.si/` uspešno prikazani strani z naslovom `e-integrator | Poslovanje povezano v celoto`, vodilnim naslovom `Vse poslovanje. Ena povezana platforma.` in sporočilom, da prijava še ni mogoča. Nobene opažene TLS/HTTPS napake; prejšnja 404 je odpravljena na obeh domenah.
- V istem preverjanju sta `https://app.e-integrator.si/` in `https://api.e-integrator.si/` še vedno vrnili brskalniško napako `ERR_EMPTY_RESPONSE`. Vzrok ni dokazan. Ni dovoljeno domnevati, da gre izključno za DNS ali certifikat; potreben je usmerjen read-only pregled cPanel domen/DNS/document root in Vercel povezave.
- Vercel `finai-ledger` še nima povezane custom domene `app.e-integrator.si` v pregledani konfiguraciji. Javne objave nedokončanega Next.js UI ne omogočati brez pregleda zaščite za custom domene.
- Laravel `shared/.env` in `current` še nista nastavljena; API naj ostane brez javno aktiviranega dostopa. Laškoteka v tem opravilu ni bila spreminjana.

**Status:** SITE-EI-01 = PASS (osnovna predstavitvena stran v javnem delovanju). Poddomeni app/api = odprti nalogi, brez varnega preklopa. Prihodnja objava UI/API zahteva ločeno preverjanje in dovoljenje.

## Diagnostika javnih DNS in HTTPS povezav — 8. 11. 2026

GitHub Actions read-only diagnostika: [zagon #42491151512](https://github.com/ddcpark-coder/finai-ledger/actions/runs/42491151512), **PASS**, brez zahtev po dostopu do cPanel. Javni DNS in preverjanje certifikata za HTTPS:
- `e-integrator.si` → `212.44.112.125`, HTTP **200**, `curl` exit 0, `SSL_VERIFY=0` (uspešen pregled certifikata).
- `www.e-integrator.si` → `212.44.112.125`, HTTP **200**, `curl` exit 0, `SSL_VERIFY=0`.
- `app.e-integrator.si` → iz okolja GitHub Actions se ime ne razreši, `curl` exit 6. Ne nastavljati povezave Vercel na javno nedokončano aplikacijo pred preverjanjem nadzora dostopa.
- `api.e-integrator.si` → iz okolja GitHub Actions se ime ne razreši, `curl` exit 6. Ne izpostavljati Laravela, dokler ni `shared/.env`, `current/public`, zasebne DB in preflighta.

Rezultat je omejen na zunanje razreševanje v času pregleda; ne izkazuje, ali v cPanel DNS cono obstajajo neobjavljeni, napačni ali nedokončani zapisi. Naslednji ukrep: pred DNS spremembami je potreben **read-only** pregled dejanske cone in dokumentnih korenov, da ne ustvarimo kolizij z obstoječimi zapisi. Ker je FinAI SSH ključ samo bralen in dopušča zgolj preverjene statusne ukaze, sama diagnostika ne daje pooblastila za DNS/cPanel spremembe.
