# FinAI BACKEND-07 — uporaba že preverjene infrastrukture Laškoteke

Datum pregleda: 2026-11-07. **Samo dokumentiranje**, brez sprememb Laškoteke, cPanela ali poverilnic.

## Ugotovitve (potrjeno brez ponovnega uporabnikovega klikanja)
- Hiper M strežnik: terminal javlja kratko ime `hcp-30`; polno SSH ime in vrata še nista neodvisno potrjena. Skupni cPanel/SSH uporabnik je `laskot48`. Projekt FinAI je v `/home/laskot48/apps/finai-ledger`; Laškoteka ima svoj ločen aplikacijski koren.
- Na cPanel zaslonskem posnetku sta že **authorized** javna ključa `digitalna-dediscina` in `laskoteka_prod_github`. Obstoječih ključev se **ne spreminja, ne odstranjuje in ne uporablja za FinAI**.
- Zasebni GitHub repozitorij `ddcpark-coder/digitalna-dediscina-lasko` vsebuje obstoječe oddaljene postopke. Primeri: `.github/workflows/sec-dependencies-01-prod-preflight.yml`, `.github/workflows/production-independent-backup.yml`, `.github/workflows/auth-prod-01c-production-deploy.yml`. V njih se uporabljajo environment secret **imena** `HYPER_SSH_HOST`, `HYPER_SSH_USER`, `HYPER_SSH_PORT`, `HYPER_SSH_PRIVATE_KEY`, `HYPER_SSH_KNOWN_HOSTS`, `HYPER_PRODUCTION_APP_ROOT`. Vsebine skrivnosti niso bile pregledane.
- Laškotekin `scripts/ops/github-ssh-setup.sh` uporablja `SSH_PORT:-22`, SSH znani gostiteljski ključ ter primerjavo SHA256 prstnega odtisa. `22` je privzeta vrednost skripte, ne na novo dokazano aktivno vrata Hiper M.
- Iz zasnove lahko ponovno uporabimo **vzorec**: GitHub environment / secrets, preverjeni known_hosts, striktni SSH, minimalni izpisi, ločeni backup postopki in zaščita z GitHub Actions.
- Za FinAI se ne sme prekopirati Laškotekinih zasebnih ključev, njenih produkcijskih environment secret vrednosti, poti do aplikacije, baze, cronov ali pravic.

## Končna odločitev glede avtomatizacije
Priprava v FinAI PR #36 lahko uporabi zgornje znanje brez novih ročnih preverjanj, ali SSH na strežniku sploh obstaja. Za vzpostavitev dejanske FinAI povezave še vedno potrebujemo nov **FinAI-only** avtentikacijski ključ in neodvisno potrditev host-key vezave, če prstnega odtisa varno ni možno podedovati iz že preverjene dokumentacije.

**Varnostna meja:** Oba projekta sta pod istim OS uporabnikom `laskot48`. Forced command na SSH ključu omeji normalen SSH vstop, ne zagotavlja pa resnične OS izolacije. Neomejen SSH dostop do tega uporabnika bi lahko posegel v Laškoteko. Za obsežno nenadzorovano spreminjanje datotek in DB je treba najprej FinAI preseliti na ločen OS/gostovalni račun.

## Obstoječe FinAI stanje
- Namestitev Git SHA `20013672a44a5c7dd426adb71e3dff07cbb4852b` v `releases/<SHA>/backend`, Laravel in Composer preverjena, Git clean.
- `shared/storage` obstaja; `shared/.env` in `current` še nista vzpostavljena.
- Baza `laskot48_finai_dev` obstaja; uporabnik baze še ne obstaja.
- PR #35 je osnutek; PR #36 osnutek na #35. Brez samodejnega združevanja ali preklopa produkcije.

## Naslednji dovoljen korak
Pregledati PR #36 in njegove varovalke, pripraviti ciljano FinAI SSH avtentikacijo in samo bralni audit, brez interakcije z Laškotekinim SSH ključem. Konfiguracijo za **samodejne pisalne operacije** načrtovati šele na ločenem FinAI računu z dokazano obnovo in dodatnimi odobritvami.
