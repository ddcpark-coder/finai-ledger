# FinAI / e-integrator.si — OFFLINE-FIRST proizvodna arhitektura

**Potrjena odločitev, 8. november 2026:** uporabnik je od začetka zahteval (1) spletni FinAI na **Hiper M**, (2) pravo **Windows namizno namestitev**, ki dela tudi **brez interneta**. Online-only WebView in povezovanje `app.e-integrator.si` z Vercelom temu ne ustrezata. Vercel ni produkcijsko gostovanje.

## Ciljni načini

| Zmogljivost | Samostojna Windows aplikacija | Spletna aplikacija Hiper M |
|---|---|---|
| Zagon / navigacija | Lokalno, brez omrežja | HTTPS |
| UI | Vgrajen isti statični Next.js/React UI | Statični Next.js/React izvoz |
| Podatki | Lastna lokalna šifrirana zbirka, ločena po podjetjih | MariaDB na Hiper M |
| Poslovna logika | Lokalni preverjeni poslovni engine (še ni izveden) | Laravel 13 |
| Integracije FURS/banke/eDavki | Uvrsti v varno čakalno vrsto; oddaja **samo online** | Prek strežnika in identitete uporabnika |
| Sinhronizacija | Neobvezna, ko je povezava vzpostavljena | Verzionarni in avtenticirani API |
| Namestitev | Podpisan, samostojen Windows namestitveni paket | Varovana izdaja z obnovitveno točko |
| Vercel | Ni potreben | Ni v produkcijski poti |

## Trenutni dejansko izveden pilot (OFFLINE-01)

- `next.config.mjs` in GitHub CI pripravljata `out/` brez Next Node.js procesa.
- Windows `.NET 10` WinForms/WebView2 prikazuje **lokalno priložene** datoteke prek `SetVirtualHostNameToFolderMapping` na rezerviranem internem izvornem naslovu. Za zagon ne kontaktira Hiper M.
- `/offline/` omogoča samo testne osnutke: `draft.create/list/delete` preko ozkega WebMessage pogodbenega mostu, vezanega na lokalni izvor. SQLite ima vsebino osnutkov šifrirano z Windows DPAPI. Preverjena je odprtost lokalne zbirke po ponovnem zagonu. **To ni poslovna knjiga in ni primerno za prave finančne podatke.**
- Windows namestitveni program temelji na Inno Setup, vključuje self-contained .NET ter Microsoftov **WebView2 Evergreen Standalone Installer x64 za offline namestitev**; preverja se njegov digitalni podpis. Testni program še ni podpisan in se ne distribuira strankam.
- Zaščite: brez neposrednega SQL iz JS, brez WebView2 host objects, blokirani file/http/custom URL, brez vgrajenih poverilnic. Sam UI/DPAPI ne predstavlja popolnega varnostnega modela za občutljive podatke.

## Obvezni naslednji razvojni koraki — brez prehitevanja

### OFFLINE-02: lokalno računovodsko jedro in šifrirana baza
- Enoten strojno preverljiv podatkovni model in sheme za podjetja, partnerje, dokumente, kontne načrte, postavke, davke, skladišča ter delovne naloge.
- ACID transakcije, dvostavno knjiženje (`sum(debit) == sum(credit)` za vsako knjižbo), stroga decimalna aritmetika, obvezna tenant/company izolacija.
- Nespremenljiva revizijska sled; popravljanje potrjenih knjižb izključno prek stornacije, brez spreminjanja zgodovine.
- Lokalna celostna šifrirana hramba, varna obnova in izvoz ob zamenjavi Windows profila ali računalnika. **Samo DPAPI šifrirani osnutki iz OFFLINE-01 ne zadoščajo za resnične knjigovodske dokumente**.
- Skupni konformančni primeri za namizni offline engine in Laravel. Enaka pravila in zneski, ne dva divergentna implementacijska sistema.

### OFFLINE-03: dvosmerna sinhronizacija
- Lokalni append-only outbox, stabilni ULID/UUID, `company_id`, uporabnik, `base_version`, `idempotency_key`, `schema_version`, identifikator naprave, podpis/ponovitveno preprečevanje.
- Varni prenosi po HTTPS, pooblastila po podjetjih in uporabnikih, strežniško preverjanje vsakega dogodka.
- Ločevanje osnutkov od potrjenih računov in knjižb; slednjih brezčasovno ne prepisovati; konflikta ne reši tiha `last-write-wins`. Posebna obravnava številčenja računov, rezerviranih obsegov, FURS/oddaje.
- Več uporabnikov/podjetij in več naprav; spremembe in izbrisi propagirajo le ob pravilno potrjenih pravicah. Ob izpadu omrežja aplikacija nadaljuje lokalno, ob povrnitvi pravilno poravna dogodke.

### DESKTOP-02: zrel namestitveni program
- Digitalni podpis aplikacije in installerja, preverjen in varen avtomatski update z obnovitvijo.
- Test sveže offline namestitve na Windows 11, zagon brez aktivne mrežne kartice; test posodobitve in odstranitve brez izgube lokalne baze.
- UI/UX usklajenost, napake omrežja, lokalno zaklepanje, več uporabnikov, tiskanje/PDF brez omrežja; testiran recovery.
- Status podpora macOS/Linux je ločena odločitev.

### HOSTING-02/03: Hiper M
- Natančna DNS načrta za `app` in `api` **na Hiper M**, ne na Vercel, s pregledom obstoječih zapisov.
- Ločen Hiper M račun za FinAI pred dejansko produkcijo, svoje DB privilegije, Laravel `backend/public`, certifikati in konfiguracija `shared/.env`, varnostne kopije in obnova.
- Trenutna okvara lokalnega cPanel UAPI (`exit=2`) je odprta `#41`. Ne spreminjaj zaščite deljenega računa ali Laškoteke, da bi jo obšel.

## Odločitev o izdaji

Spletna predstavitev `e-integrator.si` ostane javno aktivna. Računovodsko spletno aplikacijo in namizno testno izdajo lahko testiramo samo s sintetičnimi podatki. **Prava uporaba računovodskih/osebnih podatkov je blokirana**, dokler niso potrjeni lokalna varnost, pravilnost, izolacija podjetij, sinhronizacija in obnova.


### Izvedena omejena faza OFFLINE-02C (9. 11. 2026)

- V GitHub `main` je dodan **ločen testni šifriran lokalni računovodski ledger** na `SQLite3MC.PCLRaw.bundle 2.6.1`, skupaj z obveznim DPAPI zaščitenim naključnim ključem. Surova SQLite datoteka nima jasne standardne glave; testi za napačen ključ in ponovno odprtje so PASS.
- Lokalni sintetični uporabniki imajo salted PBKDF2 verifikatorje, vloge po podjetjih (admin/accountant/viewer), dovoljenja pri branju/knjiženju in HMAC integritetno verigo revizijskih dogodkov. Nobena funkcija ni izpostavljena WebView2 ali produkciji.
- To **še ni uporabna računovodska aplikacija za resnične podatke**: manjkajo prenosni backup celotnega ledgerja, revokacija sej, zaklepanje, varen recovery po izgubi Windows profila, dokazana fizična namestitev, neodvisen varnostni pregled in slovenska poslovna pravila.
- Glej `docs/OFFLINE_02C_ENCRYPTED_LOCAL_LEDGER.md`, [PR #50](https://github.com/ddcpark-coder/finai-ledger/pull/50), [OFFLINE-02D #51](https://github.com/ddcpark-coder/finai-ledger/issues/51) in [CI 42583450455](https://github.com/ddcpark-coder/finai-ledger/actions/runs/42583450455).
