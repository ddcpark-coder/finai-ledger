# FinAI NEXT-18A — dva ločena mobilna brskalniška profila

Ta ciljna razvojna faza preverja dejanski pretok šifriranega **sintetičnega** paketa med dvema med seboj neodvisnima Playwright Chromium mobilnima profiloma (390 × 844 in 375 × 812). Vsak profil ima lastno IndexedDB, piškotke, Service Worker in omrežno stanje.

Test `tests/e2e/field-two-device-transfer.spec.cjs` izvaja: ustvarjanje demonstracijskega podpisa na napravi A, lokalno AES-GCM šifriranje, odhodno vrsto z izvirnim UUID, izvoz v2 paketa z PBKDF2-HMAC, na napravi B zavrnitev tujega podjetja in napačne fraze, pravilen prenos z enakim UUID, potrditev brisanja testne fraze po uvozu, osvežitev drugega profila in preverjanje izključno B-jevega offline Service Workerja. Obe napravi morata ohraniti svoji izolirani vrsti; nobenega HTTP pisalnega zahtevka ne smeta ustvariti.

Preizkus se izvaja v `field-offline-pwa-qa.yml` z izključno lokalnim statičnim spletnim strežnikom v Github Actions. Omrežni API za sinhronizacijo ostaja **onemogočen**. Namestitev na fizični Android/iPhone, identiteta naprav, resnično kriptografsko potrjevanje, produkcijska HTTPS seja in resnični uporabniški podatki so **izven obsega** tega testa.

Nadaljnji fizični QA: na dveh testnih napravah pregledati namestitev PWA, dostop do lokalnega šifriranega dokazila, prenos paketa v2, napačno frazo, menjavo podjetja, obnovitev brez omrežja, opozorila ob konfliktih in prikaz ob ponovnem zagonu. Uporabiti izključno sintetične podatke.

Delo ne vključuje pisanja na Hiper M, račun `laskot48`, Laškoteko, STNG, podatkovne baze ali skupne cPanel/SSH nastavitve.
