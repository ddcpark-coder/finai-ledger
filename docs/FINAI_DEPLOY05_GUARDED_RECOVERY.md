# FinAI DEPLOY-05 — priprava varnejšega prvega preklopa

Obseg: izključno FinAI, namenski račun `einteg86`. Te spremembe same **ne
namestijo** aplikacije in **ne dokazujejo** strežniške izolacije.

- Strežniški prehod in namestitveni skript zahtevata točno uporabnika
  `einteg86`, UID `1256` in dom `/home/einteg86`. To ni nadomestilo za
  potrditev dejanske OS/ACL izolacije pri ponudniku.
- Namestitev omejenega ključa ter vsaka njegova SSH seja morata zaznati
  `/var/.cagefs/.cagefs.token`. CloudLinux ta kazalec dokumentira kot
  potrditev, da trenutna seja teče znotraj CageFS. Če kazalca ni, se
  ustavi samo namestitev oziroma dostop; uporabniških ali skupnih nastavitev
  CageFS se ne spreminja. Kazalec sam ne dokazuje vseh ACL ali ločitve
  drugih vrst povezav in ne nadomesti ostalih predpogojev.
  Vir: https://docs.cloudlinux.com/cloudlinuxos/deprecated/
- Začetni bootstrap preverja dejanski UID lastnika in način dovoljenj
  ciljnih FinAI imenikov. UID uporabnika in GID skupine nista samodejno
  enaka; zato ne zahteva, da bi bil GID `1256`. Ob odstopanju izpiše samo
  metapodatke ciljnega imenika in se ustavi pred strežniškim pisanjem.
- Varovani preklop uporablja `finai:promote:v2:<pričakovani>:<novi>`.
  Znotraj zaklepa preveri, da se aktivna izdaja medtem ni spremenila. Stari
  neomejeni način `promote:v1` je zavrnjen. Pri nameščanju je zato treba
  uporabiti usklajeni različici prehoda in CI odjemalca; namestitveni skript
  ne prepiše tiho že nameščenega drugačnega prehoda.
- Če prva objava ali njen HTTPS pregled spodleti in je še vedno aktivna prav
  nova izdaja, `unpublish` odstrani samo kazalec `current` in vrne stanje
  brez aktivne izdaje. Če obstaja prejšnja izdaja, se pogojno vrne nanjo.
  Po povratku CI preveri kazalec. Ob nepričakovani izdaji ali nedostopnem
  strežniku prekine in zahteva ročno obnovo.
- Odstranitev `current` **ne** povrne spremembe nastavitev cPanel docroota
  ali njegove prvotne vsebine. Za to je še vedno potrebna preverjena
  obnovitvena točka in ločen načrt prvega preklopa.
- GitHub stage/publish zahtevata dodatno `FINAI_DEPLOY05_SERVER_READY=YES`,
  poleg drugih varovalk. Zastavice ne nastavljaj, dokler niso izpolnjeni
  in preverjeni vsi pogoji za strežniško pisanje, vključno z izolacijo,
  obnovitveno točko in omejenim prehodom.
- Zasebni `stage` preverjen arhiv samo shrani v `finai-deploy/releases`
  in ne spreminja aktivnega `current`. Zato lahko po izpolnitvi teh
  pogojev pripravi prvo izdajo še pred povezavo docroota.
  `FINAI_APP_DOCROOT_CONFIRMED` ostaja izključen do preverjene povezave
  domene in je še vedno obvezen za `promote` in samodejno objavljanje.
  Sama odstranitev pogoja iz zasebnega `stage` ne poveže domene, ne
  sproži preklopa in ne potrdi, da spletni strežnik datoteke lahko bere.

Pred dejansko namestitvijo so odprti: potrditev izolacije s strani ponudnika;
praktična izvedljivost obnove konkretne obnovitvene točke; varen način
povezave trenutnega app docroota
`/home/einteg86/app.e-integrator.si` z `finai-deploy/current`; preverba,
da ima spletni strežnik dostop do statičnih datotek ob obstoječih pravicah;
namestitev omejenega SSH ključa; namenski Laravel docroot in baza. Glavne
domene in drugih projektov se ta postopek ne dotika.

## Ugotovitve pri namenskem računu 20. 11. 2026

- V cPanelu je prikazan uporabnik `einteg86` in dom `/home/einteg86`.
- R1Soft za ta račun prikazuje obnovitveno točko št. 21 z dne
  19. 11. 2026 ob 22:00 CET. V njej sta mapi `app.e-integrator.si` in
  `api.e-integrator.si`; za izbrano app mapo je na voljo gumb obnove.
  Obnova ni bila izvedena in uspešnost dejanske obnove ni dokazana.
- cPanel omogoča ločeno spremembo dokumentnega korena poddomene
  `app.e-integrator.si`; nastavitev ni bila spremenjena. Na računu ni
  prikazanih baz, uporabnikov baz ali nameščenih SSH ključev.
- Terminal v brskalniku je javil `The WebSocket handshake failed` tudi po
  enem poskusu ponovne povezave. Upravitelj datotek je pri odpiranju app
  mape javil `Data error.`; njegove vsebine ni bilo mogoče preveriti.
- Prejšnji odgovor ponudnika obravnava stari skupni cPanel in ne dokazuje
  izolacije novega računa. Pred pisanjem ostaja potrebno dokazilo o
  neodvisnih OS/ACL pravicah za `einteg86` in delujoč varen način
  namestitve omejenega ključa; splošnega ključa se ne avtorizira.
- Uporabnik je 20. 11. 2026 izrecno potrdil, da je novi račun v celoti
  izoliran, in naročil, da se Domenci ne pošilja dodatnega sporočila.
  Ta izjava se evidentira kot uporabnikova potrditev; ne predstavlja
  ločeno pridobljenega izpisa OS/ACL ali potrditve ponudnika.
- cPanel Git Version Control je na novem računu na voljo; v času pregleda
  ni imel registriranega repozitorija. Kloniranje ni bilo izvedeno in ne
  vzpostavi samo po sebi omejenega SSH dostopa ali preverjene izdaje.

## Zasebni gradbeni paket Laravel

`.github/workflows/finai-laravel-artifact.yml` na GitHub runnerju sestavi
Laravel z zaklenjenimi produkcijskimi Composer odvisnostmi in brez zagona
Composer skript. Paket vsebuje izvorne datoteke in zato ni spletni koren.
Vsebuje `public/index.php` in `public/.htaccess`; **samo podmapa `public`**
je lahko spletni dokumentni koren, vsa ostala vsebina in skrivnosti morajo
ostati zunaj njega.

Vidnost GitHub artefakta je odvisna od pravic in vidnosti repozitorija;
izraz zasebni označuje predvideno strežniško hrambo, ne zagotavlja zasebne
vidnosti na GitHubu. Artefakt zato ne sme vsebovati skrivnosti.

Paket se zavrne, če vsebuje `.env`, lokalno SQLite bazo, simbolne povezave,
predpomnilnik konfiguracije ali nepričakovane javne PHP vstopne točke.
Manifest vsebuje SHA256 arhiva in posameznih datotek. CI paket razširi samo
v svoj začasni izolirani direktorij in preveri Laravel `/up` s sintetično
konfiguracijo. Ni konfiguracije prave baze, migracij ali povezave na Hiper M.
Izdelan artefakt ni dokaz delujočega API-ja na gostovanju; sedanji statični
SSH prehod namerno ne sprejema Laravel/PHP arhivov.
