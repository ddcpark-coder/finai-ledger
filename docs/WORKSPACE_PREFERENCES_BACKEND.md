# FinAI — strežniške nastavitve uporabnika (pripravljena integracija)

Status: **API in preverjanje članstva delujeta v testnem Laravel 13/PHP 8.4 okolju (8 integracijskih testov PASS).** Hiper M produkcijska namestitev še ni opravljena.

## Podatkovni model
`user_workspace_preferences` je vezan na `user_id + company_id` (unikatni par).

Polja: `last_route`, `favorites`, `appearance`, `version`, `updated_at`.

Primer oblike odgovora:
```json
{"data":{"version":2,"last_route":{"module":"vat","view":"DDV-O","subview":"Izračun"},"favorites":[{"module":"vat","view":"DDV-O","subview":"Izračun"}],"appearance":{"theme":"dark","density":"comfortable"},"updated_at":"2026-11-03T10:00:00Z"}}
```

## API
- `GET /api/companies/{companyId}/my/workspace-preferences`
- `PUT /api/companies/{companyId}/my/workspace-preferences`

Middleware: `auth:sanctum`, throttle.

**Dostop je omejen na aktivnega in preverjenega uporabnika z aktivnim članstvom v podjetju.** Gate `company.access` preverja `company_user` in `companies.active`; 401/403 in ločevanje podjetij sta avtomatizirano preizkušena. Produkcijska prijava je začasno blokirana do uvedbe 2FA.

`expected_version` je obvezen; neujemanje povzroči odgovor 409 in prepreči prepis sprememb. Ne uporabljati pred aktivacijo avtentikacije, tenant izolacije, database migracij in integracijskih testov.

## Odjemalec
Za priklop mora biti nastavljeno `NEXT_PUBLIC_FINAI_API_BASE_URL` do avtoriziranega Laravel API. Odjemalec uporablja `credentials:'include'` in strežniški JSON; do takrat ostaja funkcionalno lokalno shranjevanje.

Pred dejansko aktivacijo:
1. nadzorovano vzpostaviti Laravel na Hiper M s PHP 8.4, SSL, MariaDB in dokumentnim korenom v public/;
2. zakleniti Composer verzije, dodati 2FA in preveriti postopke obnove prijave;
3. preizkusiti CSRF, CORS in piškotke na dveh first-party poddomenah;
4. ponoviti 401/403/409 na realni MariaDB, z dvema uporabnikoma in dvema podjetjema;
5. preveriti resnično sinhronizacijo med računalnikom in telefonom.

Privzetega lokalnega načina ne predstavljamo kot sinhronizacijo v oblak.
