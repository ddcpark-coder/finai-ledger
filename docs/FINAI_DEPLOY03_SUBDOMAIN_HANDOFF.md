# FinAI DEPLOY-03 — izvedba poddomen na ločenem računu

**Podatki iz Terminala uporabnika (19. 11. 2026):**
- `einteg86`, UID `1256`, home `/home/einteg86`, gostitelj `lcp-86`
- `/home/einteg86/public_html` je realna mapa, lastnik `einteg86:1256`, dovoljenja `750`
- `getent passwd laskot48` na novem gostitelju ne vrne zapisa; to samo po sebi ni celoten dokaz izolacije ACL
- Osnovna domena `e-integrator.si` je edina domena iz `DomainInfo list_domains`
- IP v konfiguraciji cPanela: `212.44.101.133` (ne dokaz DNS)
- Rizična stara infrastruktura `laskot48` je zunaj obsega; brez pisanja ali čiščenja.

## Enkratna nastavitev poddomen v NOVEM cPanelu

V cPanel → Domains → Create A New Domain (dodaj poddomeno) ustvari:
1. `app.e-integrator.si` z **lastnim** Document Root, predlagano `/home/einteg86/finai-web` oziroma znotraj dovoljene strukture, ki jo sprejme novi cPanel. Ne izberi »Share document root« in ne uporabi `public_html`.
2. `api.e-integrator.si` z **lastnim** Document Root, ki bo po pravilni namestitvi Laravela omejen izključno na `backend/public`. Če cPanel ne dovoljuje take poti ali korena še ni, se ustavi in ne ustvarjaj javno dosegljivega praznega Laravel projekta.
3. Po kreiranju enkrat uporabi `uapi --output=jsonpretty DomainInfo domains_data` in potrdi dejansko dobljene poti. Šele potem naj jih orodja za izdaje uporabijo.

**Pozor:** nekatera okolja samodejno ustvarijo koren pod `public_html/app...` ali `public_html/api...`; teh poti ne domnevaj. Uporabniški vmesnik cPanela lahko omejuje izbiro. Ni smiselno vnesti proizvoljne poti v nepreverjen ukaz UAPI. Obstoječi statični `out/` release gate potrebuje resnično konfiguriran `current` docroot, ne zgolj ustvarjene poddomene.

## Minimalni naslednji GO/NO-GO

Pred strežniškim pisanjem zahtevamo dokaz: namenski OS/ACL (brez tujega pisanja), natančen docroot vsake poddomene, zasebno bazo in uporabnika samo za FinAI, TLS, znano povrnitev, omejeni SSH dostop, originalni SHA256 release. Za prvo sintetično izdajo zadošča minimalni HTTP + API + en tenant sintetični test in rollback. Ni treba ponavljati splošnega PHP/MariaDB inventarja.

**Stanje:** DNS, poddomeni, baza, HTTPS in namestitev še niso potrjeni. Noben deploy ni bil izveden. `app.e-integrator.si` se ne sme usmeriti na Vercel. Laškoteka/STNG ostaneta nedotaknjeni.
