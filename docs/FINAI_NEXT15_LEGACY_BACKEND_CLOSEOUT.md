# FinAI NEXT-15 — zaključevanje zastarelih BACKEND vej #34/#35

Osnutka #34 in #35 sta iz začetka novembra in temeljita na starih osnovnih vejah, ki niso aktualna `main`. Ne izvajaj neposrednega merge.

## Selektivno ohranjeno na aktualnem main

- Popravki SQL imen treh migracij, trenutna domena `e-integrator.si` in sintetični MariaDB 10.11 test vseh 25 migracij so vključeni v [PR #125](https://github.com/ddcpark-coder/finai-ledger/pull/125).
- Novejši strogo bralni pregled namenskega OS uporabnika in varovanega deployment gate je v [PR #124](https://github.com/ddcpark-coder/finai-ledger/pull/124).
- Zaklenjeni `composer.lock` je bil primerjan; vsebina v legacy veji in `main` je enaka.
- Ta popravek ločeno ohranja izoliran `ProductionLoginGateTest`: produkcijska prijava ostane zaprta, dokler ni izrecno omogočena, tudi za uporabnika z nastavitvami 2FA.

## Namenoma opuščeno

- Stara Vercel ideja produkcijskega `app.e-integrator.si` gostovanja: neveljavna; spletna produkcija je samo namenski Hiper M.
- Stare komponente domenske priprave, ki so računale na skupni OS račun `laskot48`, niso varna pisalna pot.
- Dodatni `mariadb-isolated.yml` z fiksnim pričakovanim številom 18 migracij je nadomeščen z aktualnim CI testom 25 migracij.
- Stara `backend/deploy/hiperm.env.example` ni aktivna konfiguracija in se ne dodaja v namen obvoda izolacije.

## Nadaljnje zahteve

Neodvisno dokazati izolacijo FinAI cPanel/OS, pravice nad DB, HTTPS, varnostno kopijo in dejansko obnovitev ter pravilnost knjiženja in 2FA/CSRF, preden je dovoljen realen računovodski promet. Zaprtje starih PR-jev ni odobritev namestitve.

FinAI-only GitHub razvoj, brez posegov na Laškoteko, STNG, `laskot48` ali skupni DNS/SSH/cPanel.