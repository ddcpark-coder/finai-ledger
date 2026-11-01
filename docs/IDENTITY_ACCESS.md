# FinAI Ledger — Identity, podjetja in dostopi

## Cilj
FAZA 3 uvaja varno identiteto uporabnika, več podjetij, RBAC, 2FA, seje in revizijsko sled.

## Avtentikacija
- browser: Laravel session auth;
- API/SPA: Laravel Sanctum;
- registracija/reset/verifikacija: Laravel Fortify ali enakovreden lasten headless auth sloj;
- ob uspešni prijavi se regenerira session ID;
- e-pošta mora biti verificirana pred dostopom do finančnih modulov;
- občutljive operacije zahtevajo svežo ponovno potrditev gesla.

## 2FA
- TOTP;
- recovery codes;
- 2FA obvezna za Owner/Admin in priporočena za Accountant;
- vključitev/izključitev 2FA je audit dogodek;
- izklop 2FA zahteva ponovno potrditev gesla.

## Multi-company
Uporabnik lahko pripada več podjetjem. Aktivno podjetje je del seje in vsaka poslovna poizvedba mora biti scoped na company_id.

## Vloge
- Owner — vse pravice, lastništvo podjetja;
- Admin — uporabniki, nastavitve, integracije, brez prenosa lastništva;
- Accountant — računovodski moduli, knjiženje, DDV, poročila;
- Operator — dokumenti, računi, partnerji; brez zaključevanja obdobij;
- Viewer — read-only.

## Permission model
Vloge so privzete predloge dovoljenj. Končna autorizacija se preverja prek Policies/Gates na strežniku.

Primeri permissions:
- company.manage
- users.manage
- roles.manage
- invoices.read / invoices.write / invoices.approve
- ledger.read / ledger.post / ledger.close_period
- bank.read / bank.reconcile
- tax.read / tax.prepare / tax.submit
- integrations.manage
- audit.read
- settings.manage

## Seje
- pregled aktivnih sej;
- možnost preklica drugih sej;
- zapis IP, user-agent, last_activity;
- kritične spremembe prekličejo obstoječe privilegirane seje po potrebi.

## Audit
Audit log je append-only na aplikacijskem nivoju.

Zabeleži najmanj:
- login/logout/failed login;
- password reset;
- email verification;
- 2FA enable/disable/recovery;
- company switch;
- invitation / role change / user removal;
- kritične računovodske in integracijske spremembe.

## Workspace
Personalizacija FAZE 2B se v produkciji shrani po user_id + company_id.

## Varnostna pravila
- skrivnosti in 2FA recovery codes niso zapisani v audit metadata;
- password hash nikoli ni izpostavljen API-ju;
- authorization se nikoli ne izvaja samo v UI;
- company_id se ne zaupa iz requesta brez preverjanja članstva;
- Owner vloge ni mogoče odstraniti, dokler lastništvo ni preneseno.
