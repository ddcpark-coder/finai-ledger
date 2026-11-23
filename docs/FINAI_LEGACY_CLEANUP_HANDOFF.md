# FinAI – predaja za varno odstranitev zapuščenih FinAI datotek s starega gostovanja

**Status 23. 11. 2026: NAČRT / NI DOVOLJENJA ZA BRISANJE.** To je samo navodilo za poznejšo, posebej odobreno administrativno vzdrževanje **zunaj** FinAI Work, GitHub CI in razvojnih agentov. Nobena tukajšnja naloga ne sme brati skrivnosti, ustvariti dodatnih pravic, preimenovati, premakniti ali izbrisati datotek v starem cPanel računu.

## Zakaj ne danes

Namenski račun `einteg86` je ustvarjen in je cilj FinAI, vendar to še ne dokazuje uspešnega popolnega cutoverja aplikacije, Laravela, baze in obnovitve. Pri javnem read-only pregledu 23. 11. 2026 je `https://app.e-integrator.si/finai-build.json` vrnil commit **`35264aaa8dd9ee97c5f07fc0429aca573e340b77`**, medtem ko je GitHub `main` že dosegel **`04a514acb8db622940394797c13829cb1ad697b2`**. Preverjena neposredna pot `https://api.e-integrator.si/up` je vrnila **HTTP 404**; to še ni dokaz delujočega Laravela (sam status `/` ne bi bil odločilen). GitHub CI trenutno gradi nove izdaje, toda stage in promote ostajata preskočena, dokler niso aktivirani varnostni predpogoji.

## Kdaj lahko skrbnik zunaj projekta posebej odobri čiščenje

- **Cutover:** aktualni javni `app.e-integrator.si/finai-build.json` se ujema s točno odobreno, SHA256 verificirano izdajo; preverjeni so dejanski dokumentni koren, HTTPS in ključne funkcije; morebitni Laravel API je pravilno nameščen, avtoriziran in deluje na namenski bazi z namenskim uporabnikom.
- **Podatki:** seznam FinAI potrebnih datotek, konfiguracije, domen in DB je preverjen; nič ni odvisno od starega gostovanja. Če na starem računu ni bilo produkcijskih podatkov, to izrecno označi, ne domnevaj.
- **Obnovitev:** nova namenska obnovitvena točka obstaja in je praktična možnost povrnitve potrjena. Stari FinAI podatki imajo ločen berljiv arhiv in popis SHA256, shranjen zunaj računa, ki se čisti. Gesla in ključi niso vključeni v poročilo.
- **Stabilnost:** priporočeno vsaj **7 zaporednih dni** preverjenega delovanja po zadnjem produkcijskem preklopu, brez potrebe po vrnitvi na stari račun. Če je potrjeno, da gre samo za nedelujoče sintetične artefakte, lahko odgovorni administrator posebej določi krajše obdobje, nikoli pa brez popisa in obnovitve.
- **Odobritev:** skrbnik starega računa na osnovi poti, lastništva, odvisnosti, arhiva in možnosti obnove podpiše **ločeno, točno omejeno vzdrževalno nalogo**. FinAI GitHub PR / »izvedi« te odobritve ne nadomesti.

## Kandidate je treba preveriti, ne sklepati o njih

Zgodovinska FinAI mesta (njihov obstoj **ni** sveže potrjen):
- `/home/laskot48/apps/finai-ledger/` – stare razvojne izdaje, skupna FinAI mapa, vključno z morebitnim `shared/incoming/ftps/`;
- `/home/laskot48/e-integrator.si/` – starejši spletni predstavitveni koren;
- namenski stari FTPS račun `finai-deploy@e-integrator.si` in morebitni FinAI-specifični stari deployment opisi, kontrolni zapisi ali začasni paketi, če jih ne uporablja nobena druga storitev.

**Nikoli** ne obravnavaj `/home/laskot48/public_html` ali širšega `/home/laskot48/apps/` kot cilj čiščenja. Starega `authorized_keys`, uporabniških računov, skupnih DNS/cPanel, cronov, certifikatov ali varnostnih kopij ni dovoljeno spreminjati iz FinAI postopka, niti za »odklop« ostankov.

## Varni vrstni red ločenega administrativnega opravila

1. **Popis brez sprememb:** skrbnik se prijavi neposredno v **stari** cPanel z lastnim dovoljenjem, ne z novim FinAI ključem ali CI prehodom. Sam ročno pregleda natančne kandidatne poti, lastnike, `realpath`, simbolne povezave, datume, velikosti in namembnost. Popiše tudi potencialne povezave iz starih domen, domenskih korenov, FTP, cronov in deployment konfiguracije. Če je karkoli dvoumno, se ta element izloči.
2. **Neodvisna kopija in manifest:** po potrditvi identitete datotek skrbnik shrani samo stare FinAI datoteke v ločen, varovan arhiv, izven brisanega računa; zapiše pot, velikost in SHA256 vsake dovoljene datoteke. Obnovljivost arhiva preveri neodvisno od produkcijskega sistema. Brez prenosa starih `.env`/ključev v GitHub ali nov javni koren.
3. **Potrditev ničelnih odvisnosti:** preveri, da DNS, stari docroot, deployment skripti, namenske FTPS konfiguracije, povezani procesi, varnostni pregledi in druga infrastruktura več ne zahtevajo starega FinAI direktorija. Ločeno potrdi, da trenutno spletno delovanje in možnost povrnitve uporabljata samo `einteg86`.
4. **Omejena odstranitev:** šele s posebno pisno odobritvijo starega gostovalnega skrbnika uporabi cPanel **File Manager** ali preverjeno ročno administrativno orodje samo za natančno poimensko potrjene datoteke/imenike, po možnosti v majhnih, preglednih korakih. Ne uporabljaj wildcardov, rekurzivnih skriptov ali `rm -rf` v FinAI CI. Ne slediti simbolnim povezavam. Če orodje pokaže nepričakovan cilj, se opravilo ustavi.
5. **Ločena odprava zastarelih dostopov:** stare FTPS račun(e), specifične preskusne poverilnice ali deployment konfiguracije obravnavaj *ločeno* po lastništvu in vplivu. Iz FinAI nalog se stari SSH `authorized_keys`, skupne nastavitve ali ključi nikoli ne urejajo; če jih je treba ukiniti, to predaj pristojnemu skrbniku v izrecno dovoljeni administraciji starega sistema.
6. **Preverba:** po vzdrževanju preveri javno spletno aplikacijo, namenski API, lastni restore, stanje starega gostovanja drugih projektov ter odsotnost dejanskih preostalih FinAI odvisnosti. Potrjeni manifest shrani v varno administrativno dokumentacijo (brez skrivnosti). Ob napaki se obnovi samo točno potrjena FinAI vsebina iz arhiva.

## Evidenca stanja za odločitev

| Pogoj | Zadnje znano stanje | Odločitev |
|---|---|---|
| Namenski OS/cPanel `einteg86` | Vzpostavljen, UID 1256 | Potrjeno |
| Trenutni javni commit | Zadnji pregled: starejši SHA od `main` | Čaka |
| Namenski Laravel API + DB | Celovita funkcionalna verifikacija manjka | Čaka |
| Obnovitvena točka nove izdaje | R1Soft je viden, praktična obnova ni dokazana | Čaka |
| Točen popis starih FinAI datotek | Brez svežega neodvisnega popisa | Čaka |
| 7 dni po dokončanem cutoverju | Še ni začetka obdobja | Čaka |
| Posebna dovoljena odstranitev | Ni odobrena | **NO-GO** |

**Pravila:** nobena redna FinAI naloga, varovani GitHub agent ali Work postopek se ne uporablja za uničenje starih datotek. Ta dokument je samo predaja zunanjim pooblaščenim skrbnikom, ne izvajalno dovoljenje.
