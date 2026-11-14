# FinAI NEXT11C — mobilni in Windows analitični pregled

- Mobilna terenska aplikacija (/field/) prikaže kratko sintetično poslovno poročilo izbranega podjetja; to ni podpis dobavnice, hramba računa ali knjiženje.
- Windows WebView2 prototip (/offline/) prikaže enak primer, vezan na že obstoječi izbor testnega podjetja v lokalni vrsti.
- V obeh je mogoče izbrati poslovno enoto in prikazati mesečno primerjavo prihodkov, poslovni izid, odprte CRM priložnosti in razpoložljivo zalogo.
- Vsi izračuni so deterministični, v celoštevilskih centih, brez omrežja, gesel, skrivnosti, zahtevkov API ali pisanja v dejansko bazo. Vsebina je predizpolnjena s sintetičnimi primeri.
- Windows lokalno šifrirano shranjevanje drugih obstoječih demo osnutkov ostane nespremenjeno. Ta BI pregled je **samo read-only predstavitev**, ni še shranjen ali usklajen z dejansko namizno glavno knjigo.
- Mobilno delo ostaja PWA/terenski prototip, ne native aplikacija za iOS/Android in ne produkcijsko sinhroniziran ERP.
- QA: node --test tests/next11CompactBrief.test.mjs; povezana CI gradnja Windows/web in mobile PWA.

FinAI lahko nadaljuje varno izolirano razvojno delo. Brez sprememb Laškoteke, STNG, skupnega Hiper M ali produkcijskih podatkov.
