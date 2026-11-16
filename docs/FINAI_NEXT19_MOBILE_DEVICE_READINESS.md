# FinAI NEXT-19 — lokalna diagnostika mobilnih naprav

## Namen

Na strani **/field/** je na voljo nov razdelek **Diagnostika mobilne naprave**. Uporabnik sproži samo lokalno preverjanje, vidi rezultate in lahko prenese JSON poročilo za pregled. Diagnostika se ne povezuje z nobenim ponudnikom, API-jem ali strežnikom in ne vsebuje uporabniških dokumentov.

## Samodejne kontrole

1. **Varno okolje:** HTTPS ali zaupanja vreden localhost (`isSecureContext`).
2. **Kriptografija:** lokalni PBKDF2/AES-GCM roundtrip s fiksnim sintetičnim besedilom in svežimi naključnimi vrednostmi. Namen je preveriti podporo, ne dejansko varnost strojne naprave.
3. **IndexedDB:** ustvari se *nova, edinstveno imenovana začasna baza*, vanjo se zapiše samo beseda `synthetic`, prebere se in baza se zapre ter odstrani. Obstoječega FinAI trezorja, čakalne vrste in podatkov podjetij se nikoli ne bere ali briše.
4. **Service Worker:** samo bralno preveri registracijo za `/field/`.
5. **Offline cache:** samo bralno preveri prisotnost predpomnilnika `finai-field-demo-*`.
6. **Trajnost:** samo bralno preveri, ali brskalnik podpira in potrjuje `navigator.storage.persisted()`; če ni potrjeno, je rezultat opozorilo, ne lažno zagotovilo.
7. **Omrežje:** informativno pokaže `navigator.onLine`, ne zatrjuje, da je strežnik res dosegljiv.

Rezultat je `pass`, `review` ali `fail`. Format `finai-synthetic-mobile-readiness-v1` navaja `synthetic_only=true`, `real_data_allowed=false`, `production_approved=false`, `server_contacted=false`; ob izvozu se strogo zavrnejo dodatna polja. Izvoz ne vključuje `userAgent`, UUID-ja dokumenta, številke podjetja, gesla, podpisa ali ID-ja naprave.

## Kratek fizični QA — izključno sintetični podatki

1. Odpri `/field/` na testnem Androidu (Chrome) ali iPhonu (Safari); po odprtju znova naloži aplikacijo.
2. Sproži **Preveri pripravljenost naprave**. Prenesi poročilo in poglej oznake `NAPAKA` ter `PREVERI`. To samo po sebi **ni** potrditev produkcijske pripravljenosti.
3. V testnem podjetju pripravi sintetično dobavnico, podpisi z demonstracijskim podpisom, shrani v šifriran trezor in v čakalno vrsto ter z lokalno testno frazo izvozi prenosni paket v2.
4. Na drugi napravi najprej izberi drugo sintetično podjetje in poskusi uvoz (zavrnitev), nato napačno frazo (zavrnitev), nato pravilno frazo (uvoz z izvirnim UUID).
5. Na drugi napravi izključi mobilne podatke in Wi-Fi, znova odpri aplikacijo ter preveri prisotnost UUID-ja in odsotnost samodejne sinhronizacije.
6. Poročaj o morebitni izgubi shrambe pri zaprtju/ponovnem zagonu; brskalnik lahko podatke odstrani tudi po uspešnem testu.

## Omejitve in distribucija

Preizkus v GitHub CI uporablja Chromium in Playwright, ne fizičnih naprav. Dejanska testna stran je dostopna šele, ko je statični FinAI predogled zakonito na voljo prek izoliranega okolja oziroma lokalno; sprememba sama **ne objavlja** spletnega mesta.

Vsi preizkusi so sintetični. Pred resničnimi podatki so potrebni samostojen FinAI OS/cPanel, baza, HTTPS, pravice, revizija, obnova, računovodski QA in RS/EU skladnost. Skupnega računa `laskot48`, Laškoteke in STNG ni dovoljeno spreminjati.