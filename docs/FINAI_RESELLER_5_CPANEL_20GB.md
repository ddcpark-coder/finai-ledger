# FinAI — odločitev gostovanja (11. 11. 2026)

Uporabnik je potrdil arhitekturni načrt: **nov Reseller paket s 5 samostojnimi cPanel računi in skupno 20 GB prostora**.

## Razporeditev, okvirno
- FinAI / e-integrator.si: **ločeni** cPanel in Linux OS uporabnik, začetna kvota ~8 GB.
- STNG: **drug** ločeni cPanel/OS uporabnik, začetna kvota ~8 GB; preselitev izključno v samostojnem projektu STNG, ne v okviru FinAI.
- 4 GB rezerve ostane nerazporejenih, do utemeljene potrebe. Trije od petih računov lahko ostanejo neustvarjeni ali rezervirani.
- **Laškoteka ostane nespremenjena** na obstoječem Hiper M, kjer ima naročnik predplačano 14-mesečno gostovanje. Nobena FinAI/STNG migracija ne sme spreminjati Laškoteke ali skupnih nastavitev.
- Morebitna sekundarna hramba naj bo *neodvisno, namensko* šifrirano objektno skladišče ali tretji izolirani cPanel z lastnimi dostopnimi pravicami. **Ne** uporabiti prostora/DB/FTP Laškoteke kot ciljne hrambe FinAI.

## Koraki po dejanskem aktiviranju storitve
1. WHM ustvaritev **dveh** cPanel računov, vsak s svojim UID/lastništvom in namenoma ločeno bazo ter uporabnikom z omejenimi privilegiji; preveriti dovoljene sistemske vire, PHP/Composer, cron/queue, HTTPS in SSH.
2. Za FinAI ustvariti izolirano sistemsko okolje brez sklicev, symlinkov ali pisalnih pravic na Laškoteko ali STNG; preveriti realpath, owner, SQL scope in vzpostaviti samo FinAI SSH ključ (brez posegov v skupni račun).
3. Uvesti varovane nespremenljive izdaje iz GitHub Actions s SHA256, izoliranimi sintetičnimi testi, povratno točko in atomarnim preklopom.
4. Reševanje DNS in preusmeritev domene FinAI šele po preverjeni testni objavi, HTTPS, obnovitvi in odobrenem preklopu. Laškotekine DNS/SSL in delovanje ostanejo nespremenjeni.
5. STNG migracija se vodi ločeno, z lastnimi odločitvami, pravili in rollback preizkusom.
6. Pred realnimi FinAI podatki preveriti pravno in računovodsko skladnost, šifriranje, pravilnost knjiženja, revizijo in ločevanje podjetij.

## Jasna ločnica
To je načrt, **ne naročilo ali potrjena aktivacija gostovanja**. Ne izvesti nakupa, ustvarjanja računov, DNS sprememb ali strežniškega pisanja brez razpoložljivega preverjeno izoliranega okolja.
