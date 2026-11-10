# FinAI – možnost avtomatske objave na obstoječem Hiper M: FTPS v namenski mapi

**Datum:** 9. 11. 2026.  
**Status:** raziskan alternativni transport in implementiran **izključno read-only preflight**; objava NI aktivirana.

## Zakaj preverjamo FTPS namesto novega SSH ključa

cPanel dovoljuje navadne FTP uporabnike z navideznim domačim direktorijem, ki je lahko omejen na mapo posamezne domene. Dokumentacija navaja, da taki uporabniki privzeto ne morejo dostopati izven svojega home ter da s symlinkom ne morejo nalagati izven dovoljenega direktorija. Vendar lahko ponudnik FTP konfiguracijo prilagodi; `ChrootEveryone` je potrebno potrditi, ne predpostaviti. Samo `FTP Accounts` **ni** enakovreden lastnemu OS/cPanel računu.

Varen prenos mora uporabljati **FTPES/FTPS z eksplicitnim TLS in preverjanjem certifikata**, ne navadnega FTP in ne SFTP s primarnim SSH računom. cPanel opozarja, da običajni uporabniki FTP **ne podpirajo SFTP**, saj SFTP zahteva sistemski dostop.

Uradna dokumentacija:
- https://docs.cpanel.net/cpanel/files/ftp-accounts/
- https://support.cpanel.net/hc/en-us/articles/4402390715543-How-to-limit-an-FTP-account-s-access-to-a-single-directory
- https://support.cpanel.net/hc/en-us/articles/360056523454-How-to-prevent-FTP-users-from-listing-or-accessing-files-outside-of-their-home-directory
- https://support.cpanel.net/hc/en-us/articles/4413517293719-Use-Web-Disk-or-FTPES-FTP-SSL-to-provide-secure-access-for-file-upload-management-without-sharing-cPanel-login-information
- https://support.cpanel.net/hc/en-us/articles/9269621863575-How-to-create-an-SFTP-only-user

## Obvezne varovalke pred kakršnokoli aktivacijo

1. Hiper M mora neodvisno potrditi, da lahko FinAI dobi **dejansko varno izoliran pisalni transport** in da ta nima možnosti spreminjanja Laškoteke ali STNG, niti prek indirektnih poti ali simbolnih povezav.
2. Preveriti je treba ločeno ciljno domeno/document root, lastništvo, dejanske poti, FTP jail, TLS, dostop do kritičnih direktorijev in druge mehanizme, ki omejujejo pravice. Virtualni FTP root sam še ne dokazuje OS izolacije.
3. **Veljavna projektna pravila B še vedno dovoljujejo na `laskot48` samo FinAI read-only operacije in prepovedujejo spreminjanje skupnih cPanel/SSH nastavitev.** Zato v okviru FinAI ni dovoljeno ustvariti FTP računa na skupnem cPanel računu, spreminjati FTP demona ali aktivirati FTP/FTPS pisalnega deploya, dokler ni dokazano zahtevano neodvisno pisalno okolje in ustrezno urejena dovoljenja.
4. Šele po prehodu vseh preflight pogojev pripravimo namenske GitHub environment secrets, preverjeni transport, SHA256-pinned artefakte, nedestruktiven stage v `releases/<hash>`, testni HTTPS pregled, snapshot in atomarni, obnovljivi preklop. Privzeto mora biti deployment OFF.
5. Ne spreminjati `/home/laskot48/public_html`, STNG poti, obstoječih `authorized_keys`, shared cPanel, DNS, cron ali servisov. `app.e-integrator.si` se ne usmeri na Vercel. Laravel migracij se ne izvaja brez ločeno preverjene baze.

## Kaj je trenutno pripravljeno v GitHubu

| Datoteka | Namen | Dostop |
|---|---|---|
| `ops/finai-ftps-readonly-capability.py` | TLS-verified FTPS login in preverjanje virtualnega FTP root z `PWD`/`CWD`; nikoli ne uporablja prenosov ali sprememb | Bralno |
| `tests/test_finai_ftps_readonly_capability.py` | Negativni testi z lažnim FTP strežnikom: neustrezen host, cPanel admin, traversal, manjkajoča skrivnost | Sintetično |
| `.github/workflows/finai-ftps-readonly.yml` | Samodejno lokalni testi; dodatni `workflow_dispatch` remote read-only probe samo s posebnim GitHub environment | Brez deploya |

Preverjevalnik sme uporabljati samo namensko prijavo `finai-…@e-integrator.si` do prej potrjenega FTP strežnika `ftp.laskoteka.si:21` (podatki iz cPanel *Configure FTP Client*, 10. 11. 2026). Golo SSH ime `laskot48` in drugi hosti se zavrnejo. Uporabnik je ustvaril `finai-deploy@e-integrator.si`; cPanel prikazuje oddaljeni FTP strežnik `ftp.laskoteka.si`, vrata 21 za FTP/explicit FTPS in imenik s končnico `incoming/ftps`. Celotna pot direktorija na posnetku ni vidna. **Sam obstoj računa in ponudnikova potrditev mapnega FTP dostopa še ne dokazujeta zahtevane sistemske izolacije.** GitHub secrets za FTP še niso potrjeni, `FINAI_FTPS_READONLY_PROBE_ENABLED` ni aktiviran.

Tudi če je osnovni test `PWD/CWD` uspešen, izpiše **`FINAI_PROVIDER_ISOLATION_VERIFICATION=REQUIRED`**. Tak test ne dovoljuje pisalnih operacij.

## FTPS certifikat in povezljivost brez prijave – FTPS-TLS-01

Ustvarjeni namenski račun: `finai-deploy@e-integrator.si`, FTP gostitelj v cPanel: `ftp.laskoteka.si`, explicit TLS na vratih `21`. **To je FTP strežnik, ne dovoljenje za pisanje v Laškoteko.**

- `ops/finai-ftps-tls-only-preflight.py` naredi samo `CONNECT` in `AUTH TLS`, obvezno preveri CA + hostname na strežniškem certifikatu ter zaključi povezavo. Ne uporablja FTP uporabniškega imena, gesla, `LOGIN`, `CWD`, `STOR`, `DELE` ali drugih ukazov za spremembe.
- `.github/workflows/finai-ftps-tls-preflight.yml` izvede sintetični test odjemalca in **omrežni, vendar neavtenticiran bralni TLS handshake** do točno določenega gostitelja. Ne potrebuje novih skrivnosti.
- Uspešen TLS handshake **ne dokazuje** FTPS omejitve na direktorij, uporabniških pravic, HTTPS poddomene ali možnosti objave. Ne vključi `FINAI_STAGE_ENABLED` ali drugih pisalnih spremenljivk.
- Ob neuspehu certifikata ne izključi preverjanja TLS; uporabi natančen FTPS naslov z veljavnim certifikatom, ki ga potrdi ponudnik.

### Rezultat prvega dejanskega preverjanja – 10. 11. 2026

- [GitHub Actions #42780098979](https://github.com/ddcpark-coder/finai-ledger/actions/runs/42780098979) – sintetični testi **PASS**, dejanska neavtenticirana FTP/TLS omrežna povezava **FAILED: `CONNECT_TIMEOUT`** po približno 12 sekundah.
- To pomeni, da GitHub-ov izvajalnik **ni dokončal TCP povezave na `ftp.laskoteka.si:21`**. Vzroka brez ponudnikovih omrežnih dnevnikov ni mogoče določiti: strežniški požarni zid, omejitve IP, neustrezen hostname/DNS, servis ali druga omrežna ovira.
- `CONNECT_TIMEOUT` **ni** dokaz napake certifikata, niti uspešnega preverjanja FTPS jaila; TLS pogajanje se še ni začelo. FTP uporabniško ime in geslo **nista bila uporabljena**. Ni bilo FTP prijave, prenosov ali sprememb.
- Dodana je diagnostika z vnaprej določenimi kategorijami (`CONNECT_TIMEOUT`, `CONNECT_REFUSED`, `TLS_CERTIFICATE_REJECTED` itd.) brez izpisa skrivnosti ali surovega odziva FTP strežnika.
- Po prvem neuspehu je omrežni preizkus v `.github/workflows/finai-ftps-tls-preflight.yml` omejen na **izrecni `workflow_dispatch` iz `main`**. Običajni PR izvaja samo sintetične teste in ne sproža ponavljajočih neuspešnih omrežnih poizkusov.

**Zahteva podpori Hiper M:** preverite, ali je port TCP 21 na gostitelju `ftp.laskoteka.si` dosegljiv iz GitHub-hosted izvajalnikov, in ali obstaja požarni zid ali IP filtriranje. Prosimo za preverjen zunanji FTPS hostname s certifikatom za ta hostname in pravilno nastavitev pasivnih FTP vrat. Ne spreminjajte nastavitev Laškoteke ali STNG zaradi tega pregleda. Če je do strežnika mogoče dostopati samo z omejenega IP obsega, naj ponudnik predlaga varen način povezovanja (npr. namenski statični izhodni IP) brez širjenja SSH pravic na `laskot48`.

## Potrditev od Hiper M, potrebna za nadaljevanje

Podpora Hiper M naj brez sprememb skupnih servisov pisno pojasni:

- Ali lahko za FinAI na istem fizičnem gostovanju uredi lasten izoliran račun oziroma drugi varen transport brez dostopa do drugih domen.
- Ali je FTP virtualni uporabnik na njihovem strežniku trajno zaklenjen v lasten root, ali je vklopljen `ChrootEveryone/DefaultRoot`, ali je mogoče obiti root prek symlink in ali so dostopni zunanji direktoriji.
- Ali lahko neodvisno jamčijo, da FinAI ne more zapisati niti v Laškoteko niti v STNG in da s tem ni treba spreminjati obstoječega SSH, cPanela drugih projektov, varnostnih kopij ali storitev.
- Kako zagotoviti atomarno preklapljanje statičnih izdaj oziroma varno, obnovljivo objavo. FTPS protokol tega sam ne zagotavlja.

## Izvedljivost

**Danes:** GitHub Next.js static build, Windows offline kandidati, sintetični QA in interaktivni zaščiten UX predogled že delujejo.  
**Pogoj za Hiper M autodeploy:** neodvisno dokazano omejeno strežniško pisanje ter izpolnitev veljavnih projektnih pravil. Ni ga mogoče varno omogočiti samo z dodatnim SSH ključem pod `laskot48`.

**Javna produkcija:** obvezen premik na samostojen Hiper M OS/cPanel račun.
