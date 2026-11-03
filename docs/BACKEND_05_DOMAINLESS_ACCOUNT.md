# FinAI BACKEND-05 — priprava samostojnega Hiper M računa brez končne domene

**Datum:** 2026-11-03  
**Odločitev:** FinAI bo imel **drug cPanel/sistemski račun**, ne zgolj drugo domeno ali mapo pod obstoječim računom `laskoteka.si`. Končno ime/domene določimo pozneje.  
**Status:** dokumentacija pripravljena; novi račun **še ni ustvarjen**. Ne spreminjaj Laškoteke, ne ustvarjaj baze ali DNS v njenem računu.

## Preverjena zunanja podlaga in odprta odvisnost

- cPanel/WHM od različice 130 podpira **Choose a domain later** ob ustvarjanju novega računa; WHM lahko dodeli začasno domeno `cpanel.site`, če je funkcija omogočena. Dokumentacija: https://docs.cpanel.net/whm/account-functions/create-a-new-account/
- Začasna domena ne podpira običajnih e-poštnih storitev, DNS upravljanja in SEO. Prehod na registrirano domeno se izvede prek ponudnika/WHM; preveriti je treba ustrezno konfiguracijo SSL.
- Pri javni naročilnici Hiper gostovanja Domenca.com je zahtevana **nosilna domena** (https://www.domenca.com/portal/kosarica-hiper-gostovanje/idServiceType/HyperCreateM/period/1). To ne dokazuje, da ponudnik ne more ponuditi začasne domene — zahteva **njihovo potrditev**.
- Ne domnevaj, da obstoječa naročnina Hiper M omogoča drugi samostojni cPanel račun brez doplačila. Neomejene domene znotraj istega računa **niso** enakovredne ločenim uporabnikom.
- Uporabnikov trenutni dostop je cPanel, ne potrjen skrbniški WHM. Zato samo novi račun pri ponudniku lahko zagotovi ustrezno izolacijo.

## Zahteva ponudniku (odprto)

**Pošiljanje ali naročilo ni izvedeno.** Podpora naj potrdi:
1. Ali je na voljo **nov, ločen cPanel račun** z začasno `cpanel.site` domeno ali začasno poddomeno v njihovem lastništvu.
2. Ali zadošča obstoječi paket oziroma je potreben nov paket; cena, resursi, bazne kvote in pogodbeni pogoji.
3. Ločen OS/cPanel uporabnik, datotečni prostor, MariaDB baza in uporabnik; dostop PHP 8.4/Composer/Git/SSH/cron ter vključitev novega računa v R1Soft.
4. Ali lahko API domenska korenska mapa kaže izključno v Laravel `backend/public` tudi po poznejši menjavi domene.
5. Kako se zamenja začasna domena s končno (DNS, HTTPS/AutoSSL, morebitna sprememba primarne domene); brez posega v Laškoteko.

## Kaj lahko opravimo BREZ končne domene

| Naloga | Mogoče brez končne domene? | Pogoj |
|---|---|---|
| Vzpostavitev izoliranega cPanel uporabnika | Da, *če potrdi ponudnik* | Začasna domena ali druga ureditev |
| Prazna zasebna struktura `~/apps/finai-ledger` | Da | Preverjen **novi** uporabnik; BACKEND-04 skript `--dry-run` |
| Namestitev pregledane Laravel kode in Composer odvisnosti | Da | Zasebni GitHub dostop + varna namestitvena pot, brez javne prijave |
| Ustvarjanje lastne prazne MariaDB | Da | Izrecna odobritev, nove pravice in ločen backup |
| Izolirani CLI/API testi brez resničnih podatkov | Da | Brez javnega prometa in brez privzetih gesel |
| Uporabniška prijava, HTTPS, cookie/CSRF, 2FA E2E | **Ne v končni konfiguraciji** | Končni first-party `app.` / `api.` domeni, veljaven SSL |
| Produkcijsko računovodstvo / realni podatki | **Ne** | Podatkovna izolacija, varnost, backup, domenski QA, izrecna odobritev |

## Vrstni red izvedbe, brez ponavljanja Laškotekinih pregledov

**GATE A — ponudnik:**
- Pridobiti pisno potrditev in ponudbo za ločen račun.
- Brez potrditve ne uporabljaj `laskoteka.si` ali njenih poddomen kot improviziranega gostovanja.
- Ne ustvarjati novega naročila ali stroškov brez potrditve naročnika.

**GATE B — nov račun:**
- Preveriti le dejansko **identiteto novega cPanel računa**, njegov `HOME` in privzeti document root (ne ponovno splošne Hiper M PHP/R1Soft/cron diagnostike).
- Potrditi, da je račun različen od računa Laškoteke. Ne prenašati njenih datotek, DB uporabnikov, backupov ali cron opravil.
- Na novem računu se najprej uporabi `backend/scripts/finai-backend04-scaffold.sh --dry-run`; `--apply` šele po pregledu ciljne poti in odobritvi.

**GATE C — domena neodvisna namestitev:**
- Določiti preverjen Git SHA, pripraviti `releases/<sha>` in zasebno `shared/`.
- `.env` in poverilnice ostanejo samo na novem strežniku, v zaščitenem direktoriju; ne zapisovati v GitHub/klepet/loge.
- Inicializirati **samo novo FinAI bazo** s potrebnimi pravicami in pred migracijami zagotoviti ciljno obnovitveno točko. Brez resničnih poslovnih podatkov.
- `FINAI_AUTH_RELEASE_ENABLED=false`; preveriti `php artisan finai:preflight --database`, ki je read-only. Morebitne migracije dovoliti šele po posebni odobritvi in pregledu točnega seznama.
- Do končnega SSL in first-party domen ne odpirati aplikacije za javno prijavo in ne povezovati frontenda s finančnim API-jem.

**GATE D — prihodnja domena in dejanska objava:**
- Registrirati potrjeno ime domene in uskladiti `app.<domena>` ter `api.<domena>`, DNS, HTTPS/AutoSSL.
- Posodobiti `APP_URL`, `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS`, `FINAI_ALLOWED_ORIGINS` in `NEXT_PUBLIC_FINAI_API_BASE_URL`.
- Nastaviti CORS/CSRF, varen HTTPS cookie, testirati 2FA in obnovitvene kode ter izolacijo med podjetji.
- Potrditi obnovitveno točko **FinAI** in pot obnove; brez skupinskega R1Soft restore, ki bi vplival na Laškoteko.
- Šele po testih omogočiti produkcijsko prijavo.

## Varovalke in prepovedani posegi

- **BREZ** dodajanja domene, tabel, cron opravil ali aplikacijskih datotek na računu Laškoteka.
- **BREZ** pošiljanja plačanega naročila ali registracije domene pred odobritvijo.
- **BREZ** samodejnega API/prod deploya, migrations ali odklepa prijave samo zato, ker je GitHub CI PASS.
- **BREZ** ponovnega zbiranja že potrjenih splošnih Hiper M dokazil. Za nov račun preverimo samo konkretno izolacijo, njegove nastavitve in lastne varnostne kopije.
- GitHub `finai-ledger` ima trenutno **javno** vidnost; pred produkcijsko integracijo in dostopnimi podatki naj bo zaseben.

## Trenutni status

BACKEND-04: pripravljalni skript + CI PASS v draft PR #33.  
BACKEND-05: odločitev o ločenem računu potrjena, projektni onboarding dokument pripravljen; **dejanska vzpostavitev čaka na odziv ponudnika in odobritev njegove ponudbe**.
