# FinAI DEPLOY-02 — potrjena identiteta in domenski podatki novega cPanela

Datum uporabnikovega read-only pregleda: 19. 11. 2026. Vir: izpisa cPanel UAPI `DomainInfo list_domains` in `DomainInfo domains_data`, ki ju je posredoval lastnik računa. Podatki niso potrdilo, da je aplikacija že nameščena.

## Potrjeno

| Lastnost | Vrednost |
|---|---|
| Namenski cPanel/OS uporabnik | `einteg86` |
| UID | `1256` |
| Home | `/home/einteg86` |
| Home owner | `einteg86:1256` |
| Home mode | `711` |
| Gostitelj (terminalski prompt) | `lcp-86` |
| Glavna domena | `e-integrator.si` |
| Document root glavne domene | `/home/einteg86/public_html` |
| IP v zapisu cPanel | `212.44.101.133` |
| PHP open_basedir protection (glavna domena) | `1` |
| Dodatne/parkirane/poddomene | trenutno prazno |
| UAPI status | `1`, brez napak |

## Še ni potrjeno

To NE potrjuje lastništva/delegacije DNS pri registrarju, že delujočega HTTPS, neodvisnih ACL, namenske DB, obnovitve, dejanskega docroot za prihodnji poddomeni ali povezave GitHub → novi host. IP je **konfiguracija cPanela**, ne dokaz, da javni DNS že kaže tja.

## Najkrajši naslednji varni korak (read-only v novem cPanel Terminalu)

```bash
printf 'CURRENT_USER=%s UID=%s\n' "$(id -un)" "$(id -u)"
getent passwd laskot48 | awk -F: '{print "SHARED_UID=" $3}' || true
stat -c 'MAIN_DOCROOT_OWNER=%U:%u MODE=%a TYPE=%F' /home/einteg86/public_html
uapi --output=jsonpretty DomainInfo list_domains
```

Ni iskanja, branja ali spreminjanja datotek Laškoteke/STNG. Vrednost `SHARED_UID` se uporabi samo za primerjavo (ne zahteva dostopa do starega računa). Če uporabnik `laskot48` v ločenem sistemskem okolju ni viden, to ni napaka; ne sklepamo o ACL iz same odsotnosti uporabnika.

## Predlagana domenska razdelitev (NE ustvarjeno)

- `e-integrator.si` → `/home/einteg86/public_html` (predstavitvena stran).
- `app.e-integrator.si` → namenski koren statične izdaje FinAI, ločeno od glavne strani; dejanski docroot določi cPanel ob ustvarjanju.
- `api.e-integrator.si` → samo `backend/public` Laravela; ostala Laravel koda in `.env` zunaj javnega docroot.

**Ni dovoljen avtomatski poskus ustvarjanja poddomen, mape, SSL ali DNS**, dokler niso preverjeni dejanski cilji in pravice novega računa. Konfiguracijske spremembe naj zadevajo izključno nov FinAI račun; nobenega upravljanja DNS/cPanela/SSH drugih projektov.

Po potrditvi izolacije in dejanskih docrootov: iz GitHub CI pripraviti statični `out/`, preveriti SHA256 in originalni arhiv, namenski omejeni SSH prehod, izoliran Laravel z novo bazo, HTTPS, sintetični cilj QA in povrnljiv preklop. Ne ponavljati splošnih zmogljivostnih testov gostovanja.

Produkcijska obdelava resničnih podatkov ostaja prepovedana do zaključka zahtevanega QA; razvojni deploy ostaja NO-GO do minimalnega dokazila izolacije, ciljne poti in obnovitve.
