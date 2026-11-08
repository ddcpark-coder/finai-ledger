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
