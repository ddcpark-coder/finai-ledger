# FinAI BACKEND-03 – read-only pregled Hiper M
**Datum:** 3. november 2026  
**Način:** ogled povezanega Vercel projekta, pregleda repozitorija in javne dokumentacije; brez prijave v gostovanje, brez sprememb na strežniku.

## Dejanska ugotovljena dejstva

| Kontrolna točka | Stanje | Utemeljitev |
|---|---|---|
| FinAI Vercel preview | POTRJENO | V projektu sta `finai-ledger-bay.vercel.app` in `finai-ledger-git-main-c-park117.vercel.app` |
| Lastna domena vezana na FinAI Vercel projekt | NI POVEZANA | Pregled nastavitev trenutnega projekta Vercel |
| Laravel/PHP 8.4 v GitHub testih | PREVERJENO V CI | Prejšnja faza BACKEND-02, **ne** Hiper M |
| TOTP, obnovitvene kode in izključena produkcijska prijava | PREVERJENO V CI | 14 PHP testov, 68 preverjanj v prejšnji fazi |
| PHP 8.4 za FinAI na Hiper M | NEPREVERJENO | Potrebna prijavljena seja cPanel |
| Razširitve PHP (PDO MySQL, mbstring, intl, zip ...) | NEPREVERJENO | Potreben per-domain PHP pregled ali terminal |
| MariaDB server verzija | NEPREVERJENO | CLI `mysql --version` preverja odjemalca, ne strežnika |
| SSH/Terminal | NEPREVERJENO ZA FINAI | Brez prijavljenega računa ali izpisa s strežnika |
| Git, Composer 2 in cron na Hiper M | NEPREVERJENO | Brez izvajanja ukaza na Hiper M |
| SSL in DNS za lastni FinAI app/API domeni | NEPREVERJENO | Domeni nista določeni/povezani |
| Document Root `backend/public` | NEPREVERJENO | FinAI strežniška namestitev še ni izvedena |
| Izolirana MariaDB, kvote, kopije in obnovitev | NEPREVERJENO | Ni dostopa do nastavitve konkretnega FinAI računa |
| Dejanska produkcijska namestitev in end-to-end API | NI IZVEDENO | V tej fazi ni bilo sprememb na Hiper M |

**Pomembna ločitev:** cPanel lahko *podpira* MariaDB 10.11, vendar to ni dokaz različice na gostovanju. Prav tako lahko druga aplikacija uporablja isti ponudnik, kar ne dokazuje razpoložljivosti ali nastavitev za FinAI.

## Diagnostični paket (pripravljen, neizveden na Hiper M)

Datoteka: `backend/scripts/hiperm-readonly-check.sh`

Vsebuje samo read-only ukaze: PHP CLI in razširitve, razpoložljive binarne poti PHP 8.4, Composer, Git, Node, OpenSSL, MySQL/MariaDB **odjemalca**, cron command in sistemske kvote. Ne bere okolijskih skrivnosti, ne odpira baznih povezav, ne izvaja omrežnih zahtev in ne zapisuje datotek.

Če je repozitorij že na Hiper M, zagon v cPanel > Terminal:
```bash
bash backend/scripts/hiperm-readonly-check.sh
```

Če repozitorija ni, **ga ne nameščaj samo za pregled**: odpri skript v GitHubu ter njegovo preverjeno vsebino kopiraj v cPanel Terminal. CPanel mora biti prijavljen na pravi račun; ni treba nikamor posredovati gesel.

## Preostale preverbe v cPanel (izključno ogled)

1. **MultiPHP Manager ali Select PHP Version:** ali je PHP 8.4 na voljo za želeno domeno in katere razširitve so aktivne.
2. **Terminal / SSH Access:** delovanje terminala, dovoljen dostop s SSH, morebitne omejitve izvajanja Composer/Git.
3. **Databases / phpMyAdmin:** dejanska MariaDB/MySQL server verzija, pravice, namestitvene kvote. Ne ustvarjaj baze še.
4. **Domains in SSL/TLS Status:** ali obstaja primerna FinAI domena ter ali sta `app.` in `api.` v istem first-party registracijskem območju; korenska mapa, DNS in certifikat.
5. **Backup/Restore:** preveri obstoj povratne točke in pot do varne obnove, ne sprožaj obnove.
6. **Cron Jobs in Resource Usage:** PHP limiti, prosti prostor, CPU/RAM/procesi, možnost kratkotrajnih ozadnih opravil.

## Varnostni prehod

BACKEND-03 lahko dobi status **PASS na gostovanju** šele po resničnem read-only pregledu. Do takrat ostanejo `FINAI_AUTH_RELEASE_ENABLED=false`, brez migracij na Hiper M, brez lastnih domen, nameščenega API-ja, testnih uporabnikov ali vklopa sinhronizacije.

**Naslednji izvedljivi korak:** s prijavljeno sejo cPanela v načinu ChatGPT Work izvesti zgornji pregled in izpolniti tabelo z dejanskimi različicami ter omejitvami. Tega ne nadomesti PASS iz GitHub Actions.
