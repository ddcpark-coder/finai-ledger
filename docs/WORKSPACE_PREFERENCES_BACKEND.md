# FinAI — strežniške nastavitve uporabnika (pripravljena integracija)

Status: **API pogodba in izvorna koda, ne delujoč produkcijski Laravel API.**

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

**Dostop je privzeto blokiran.** Storitev zahteva strežniško Gate politiko `company.access`. Identiteta prihaja iz prijave, nikoli iz zahteve odjemalca. Politiko bo treba pravilno povezati z dejansko membership tabelo in testirati zavrnitev za tuj company ID.

`expected_version` je opcijski varovalni podatek pred izgubo sprememb v več sejah. Ne uporabljati pred aktivacijo avtentikacije, tenant izolacije, database migracij in integracijskih testov.

## Odjemalec
Za priklop mora biti nastavljeno `NEXT_PUBLIC_FINAI_API_BASE_URL` do avtoriziranega Laravel API. Odjemalec uporablja `credentials:'include'` in strežniški JSON; do takrat ostaja funkcionalno lokalno shranjevanje.

Pred dejansko aktivacijo:
1. vzpostaviti Laravel runtime, `composer.json`, `artisan`, registrirane route in Sanctum;
2. migracije in membership policy/Gate testirati z resničnimi uporabniki dveh podjetij;
3. vključiti zaščito pred CSRF, CORS/origin omejitve, varne httpOnly session piškotke, autorizacijo tenantov;
4. dodati funkcionalni test GET/PUT, 401/403/409, omejitev 8 priljubljenih, različna podjetja;
5. preveriti verzioniranje, konfliktne seje in sinhronizacijo dveh naprav.

Privzetega lokalnega načina ne predstavljamo kot sinhronizacijo v oblak.
