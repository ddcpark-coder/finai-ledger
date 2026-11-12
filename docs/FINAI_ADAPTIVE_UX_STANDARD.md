# FinAI UX — prilagodljivost za vsako stopnjo računalniškega znanja

## Trajna funkcionalna zahteva

Uporabnik mora imeti v vsakem poslovnem modulu in podpogledih dostop do nastavitev:
- **Osnovno**: pregleden potek z manj sekundarnimi informacijami.
- **Običajno**: vsakodnevno delo z običajno količino informacij.
- **Napredno**: celoten računovodski/tehnični kontekst.
- Razporeditev **dve okni / navpično / samo seznam / samo podrobnosti**.
- Nastavitev širine desnega podrobnega okna (260–700 px) in velikost prikaza (100, 115, 130 %).
- Ponastavitev pogledov brez izgube transakcij ali podatkov.
- Prednastavitve so ločene na ravni **podjetje + modul + podpogled** v lokalnem demonstracijskem brskalniku, pripravljene za kasnejši strežniški profil.

Nastavitve vplivajo na prikaz, ne na uporabnikova dovoljenja, validacijo, revizijo ali DDV izračune. Mobilni prikaz ohranja navpično postavitev in dostop do upravljanja zahtevnosti.

## Trenutna implementacija

Skupni `AdaptiveWorkspace` je že povezan z vsemi glavnimi moduli FinAI. Podpira standardizirane večokenske strukture; nadzorna plošča dodatno omogoča urejanje kartic, velikosti in vrstnega reda.

**Še ni dokončano:** posamično premikanje vsakega notranjega podokna/dialoga, uporabniško ustvarjene plošče, mednapravna sinhronizacija nastavitev, dostopnost z bralniki zaslona po celotnem programu in napredne uporabniške profile po vlogah. Nobene od teh funkcij ne smemo označiti kot zaključene brez implementacije in ciljnega QA.

## Naslednji razširitveni koraki

1. Potrditev konfiguracije razporeditve vsakega gnezdenega okna/detajlnega panela in shranjevanje po podjetju, podmodulu in uporabniku.
2. Preglednost: semantična imena polj, razlaga računovodskih izrazov, vodeni postopki, zmanjšanje števila klikov, uvozi z jasnimi napakami.
3. Povezava s prijavljenim uporabniškim profilom prek izoliranega API-ja s kontrolami verzij in pravicami.
4. Ciljni dostopnostni QA: tipkovnica, povečava, širine oken, mobilni zaslon, kontrast in bralniki zaslona.

Do dokazane varne namestitve ostaja lokalni prikaz sintetičen; produkcija na Hiper M ni objavljena.

## Razvoj: sinhronizacija oken v uporabniški profil (PROFILE-SYNC-01)

Pripravljena je prva implementacija **za prihodnji izolirani FinAI backend**:
- `GET/PUT /api/companies/{companyId}/my/adaptive-views/{moduleKey}?view=...` shranjuje nastavitve `level`, `arrangement`, `detailWidth` in `textScale` v že obstoječi tabeli `workspace_layouts`.
- Identiteta uporabnika izhaja iz prijavljene seje, podjetje se preveri s `company.access`, ime modula je omejeno na registrirane module in podpogled na kontrolirano dolžino. Strežnik preveri obseg nastavitev in `expected_version`; spremenjena druga seja vrne **409** brez prepisa.
- V brskalniku se ob prisotnem **preverjenem** `NEXT_PUBLIC_FINAI_API_BASE_URL` najprej poskusi pobrati uporabniški profil; ob nedosegljivem API ostane lokalna nastavitev. Prikaz uporabnika jasno označi lokalno, sinhronizirano ali konfliktnost stanja.
- Statika in sintetični demo ostaneta **brez URL API** in zato lokalna. Tabela ne vsebuje računovodskih podatkov.
- Profilni API še ni objavljen, zato mednapravne sinhronizacije na `e-integrator.si` **ni dovoljeno označiti za aktivno**.

Povezava s prijavljeno sejo v produkciji je pogojena z ločenim FinAI gostovanjem, HTTPS, pravilnimi Sanctum first-party domenami, ustreznimi migracijami in ciljnim CSRF/2FA QA. Delno prilagajanje posameznih notranjih podoken je ločen prihodnji razvojni korak.

## Dodatno prilagajanje dvookenskih pogledov — PANEL-ORDER-01

Za prepoznane glavne dvookenske delovne prostore je dodana možnost **»Seznam najprej / Podrobnosti najprej«**. Deluje ob postavitvi v dva stolpca ali navpičnem prikazu; v načinu »Samo seznam« in »Samo podrobnosti« ni uporabna in je izbira onemogočena. Nastavitev `paneOrder` se shranjuje v isti profil uporabnik/podjetje/modul/podpogled, lokalno ali prek pripravljene zaščitene API poti.

**Znana meja:** prvi korak uporablja vizualni CSS vrstni red v standardnih dvookenskih strukturah; DOM vrstni red in zaporedje tabulatorja ostaneta prvotna. To **še ni popolna dostopna reorganizacija notranjih oken**. Pred javno produkcijo je potreben namenski prehod na semantično pravilno spremembo DOM/keyboard zaporedja v posameznih modulih in ciljni pregled s tipkovnico/bralnikom zaslona. Prav tako ostanejo nezajete posebne notranje kartice, dialogi in tridelni zasloni.

Kritični zneski, pravice, odobritve in računovodska pravila se z vrstnim redom ne spreminjajo.

## A11Y-PANE-DOM-01 — prava semantična razporeditev (razvoj)

Za naslednjih deset modulov je vizualni CSS vrstni red **nadomeščen z dejanskim vrstnim redom elementov React/DOM**:
`incomingGrid`, `issuedGrid`, `bankGrid`, `quotesGrid`, `docsGrid`,
`partnerGrid`, `edGrid`, `catalogGrid`, `crmGrid`, `procGrid`.

Skupni `AdaptivePaneGrid` ob spremembi nastavitev prestavi prvi (seznam) in drugi (podrobnosti) element v dejanskem DOM. Tako bralniki zaslona in tabulator sledijo prikazanemu vrstnemu redu. V načinu »Samo seznam« oziroma »Samo podrobnosti« se vedno skrije pravo semantično okno, ne zgolj »prvi« ali »drugi« element. Kjer par oken ni zaznan, komponenta ne ugiba o vlogi oken in ne spreminja zaporedja.

**Omejitev:** posebni pogledi (npr. DDV in nekatere računovodske/identitetne kompozicije), več kot dve okni ter modalni obrazci še nimajo univerzalnega semantičnega premikanja. Dinamično preurejanje lahko pri posameznem podoknu ponovno ustvari DOM; nadaljnji cilj je ohranitev fokusa in stanja notranjih obrazcev. Ločen ciljni pregled s tipkovnico in bralnikom zaslona je še potreben za produkcijski WCAG QA.

## NEXT-01: gostota obrazcev (namizno in mobilno)

Vsako podjetje/modul/podpogled lahko v skupnem meniju **Gostota obrazca** izbere:

- **Udobno – večja polja:** osnovne tekstovne kontrole imajo najmanj 42 px višine in več navpičnega odmika.
- **Zgoščeno – več podatkov:** na namizju uporabljamo manjše polje (od 32 px) in ožjo notranjo razdaljo za profesionalne uporabnike.

Na mobilnih napravah in zaslonih z grobim kazalcem imajo interaktivna vnosna polja in gumbi **najmanj 44 px**, tudi če je izbran zgoščen način. Izbira je predstavitvena nastavitev, ne spreminja polj, validacije, označb, dovoljenj ali računovodskih pravil. Nastavitve se shranjujejo lokalno oziroma v obstoječem uporabniškem profilu FinAI (če je avtenticirani API dejansko dostopen); stare nastavitve brez polja `formDensity` se dopolnijo z `comfortable`.

**Še odprto:** individualne predloge vsakega obrazca, premikanje posameznih polj in dokumentnih blokov, napredna prilagoditev po vlogah ter WCAG QA za vsak specializiran dialog.

## NEXT-02: štirje hitri uporabniški profili

V razdelku »Hitri profil« lahko uporabnik z enim izborom nastavi:
- **Začetnik – vodeno:** osnovni pogled, navpična okna, večji napisi in udobni obrazci.
- **Običajno – uravnoteženo:** standardni prikaz (privzete nastavitve).
- **Profesionalec – več podatkov:** napredni pogled z dvema oknoma in zgoščenimi polji.
- **Terensko – večja polja:** osnovni pogled z navpično razporeditvijo in večjimi elementi.

Uporabnik lahko po uporabi profila **vsako nastavitev še ročno spremeni**; takrat se profil označi kot »Moja prilagoditev«. Profil se hrani po uporabniku/podjetju/modulu/podogledu prek že obstoječega sistemskega mehanizma, ne spreminja pa avtorizacije, davčnih pravil ali pravic.

Ti profili niso sistemske vloge niti ločene ravni dostopa. Skrivanje dekorativnih prikazov ne sme nadomestiti preverjanja pravic na strežniku. PWA terenski zaslon in namizni Windows UI ostajata funkcionalno ločena od uporabniških profilov za računovodske podatke.
