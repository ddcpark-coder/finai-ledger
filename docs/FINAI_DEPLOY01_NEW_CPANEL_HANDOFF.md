# FinAI DEPLOY-01 — prevzem namenskega cPanel računa

Status 19. 11. 2026: uporabnik potrjuje, da je Domenca ustvarila **nov ločen cPanel račun za e-integrator.si**. Aktivacija računa **ni dokaz preverjene OS/ACL izolacije**, niti dostop ali dovoljenje za objavo. Ta postopek velja izključno za FinAI.

## Kaj preskočimo

Ne ponavljamo generičnih preverjanj paketne ponudbe (različice PHP, MariaDB, SSH, prostor), če jih Domenca zagotavlja; preverimo samo lastnosti, ki so **specifične za novi račun in ciljne domene**. Ne prenašamo starega cPanela, Laškoteke, STNG ali ključev. Noben ukaz se ne izvaja na starem `laskot48`.

## Minimalni prevzem — en bralni ukaz na NOVEM cPanel Terminalu

V novem računu (ne na `laskot48`) je dovoljen naslednji **read-only** ukaz. Izpiše samo sistemsko identiteto, domačo mapo in lastništvo, brez gesel in brez pregledovanja drugih računov:

```bash
printf 'FINAI_USER=%s\nFINAI_UID=%s\nFINAI_HOME=%s\n' "$(id -un)" "$(id -u)" "$HOME"
stat -c 'FINAI_HOME_OWNER=%U:%u MODE=%a PATH=%n' "$HOME"
test "$(id -u)" -ne 0 && test "$(id -un)" != laskot48 && test "$(stat -c %u "$HOME")" = "$(id -u)" \
  && echo FINAI_ACCOUNT_IDENTITY=PASS || echo FINAI_ACCOUNT_IDENTITY=STOP
```

Če je `STOP`, se objava ustavi. `PASS` je zgolj identitetni pogoj: dejansko ločitev pisanja od drugih računov potrdi ponudnik oziroma ustrezne OS/ACL nastavitve. **Ne preizkušamo pisanja v tuje mape.**

Za dokončanje namestitve se brez skrivnosti evidentirajo: sistemsko uporabniško ime, pot `$HOME`, ciljna domenska korena za `app.e-integrator.si` in `api.e-integrator.si`, potrditev namenskega DB uporabnika in baze, HTTPS ter lastna obnovitvena točka. Gesla, `.env`, zasebni ključi in dostopni žetoni ne sodijo v klepet, GitHub ali loge.

## Namestitveni potek, ko je račun preverjen

1. **Namenski koren:** v zasebni domači mapi FinAI ustvarimo `finai-deploy/` z `releases/`, `archives/`, `current`; brez povezav na stare poti. Razmejimo javni docroot spletne aplikacije in `backend/public` za Laravel. Pred ustvarjanjem preglej dejanske cPanel Document Roots; nikoli ne domnevaj, da so enaki starim.
2. **Zagonska konfiguracija:** novo okolje Laravel, nova baza in uporabnik z minimalnimi privilegiji, novi lokalni secrets, dovoljen izvor/cookie domena, `APP_ENV` in namenski TLS. Brez resničnih poslovnih podatkov; brez kopiranja starega `.env`.
3. **Obstoječa zaščitena GitHub izdaja:** uporabi že pripravljeni `ops/finai-isolated-ssh-gate.py` s strogo omejenim ključem; preverjanje originalnega SHA256 arhiva, tar vsebine, docroot in povrnljivega `current` preklopa je obvezno. Novega splošnega SSH dostopa ne uvajaj. Staging/promote ostaneta izključena do preverjene izolacije.
4. **Prva sintetična spletna izdaja:** statični Next.js `out/`, nato ločena Laravel namestitev z lastnim `backend/public` docroot. Migracije samo v *namensko FinAI* bazo po preverjeni identiteti DB. Prava produkcijska prijava je še varnostno omejena; ne oglašuj pripravljenosti sistema za resnične podatke.
5. **Domeni in HTTPS:** DNS `app.e-integrator.si` in `api.e-integrator.si` preklopi na novi Hiper M šele po preverjeni namestitvi in certifikatu. Nikoli na Vercel. Predstavitveno stran `e-integrator.si` ohrani, dokler ni pripravljena nadomestitev.
6. **Minimalni funkcionalni QA:** (a) HTTPS + `index.html` in ključni JS/CSS, (b) API ne razkrije Laravel datotek in uporablja pravilno `backend/public`, (c) izolirana sintetična prijava/tenant test, (d) preklop in povrnitev ene verificirane izdaje. Brez širokega regresijskega izvajanja ali testiranja na Laškoteki/STNG.

## Meja pooblastil

Ustvarjen cPanel račun omogoča **začetek namenske konfiguracije**, ne samodejnega GO za objavo. Pred vsakim pisanjem so nujni dokaz ločenega UID/ACL, preverjena natančna ciljna pot, namenski DB scope, SHA256 izdaje, minimalni testi in obnovitev. Če cilj ali izolacija nista preverjena, ustavimo le strežniški del, nadaljujemo GitHub razvoj.

Odstranjevanje ostankov FinAI/STNG s starega računa **ni del DEPLOY-01**. Skupni `laskot48`, Laškoteka in STNG ostanejo nedotaknjeni.
