# FinAI MOBILE-SAMPLE-01 — lokalni predogled fotografije/PDF

V **Prejeti računi → Nov demo račun** je dodana možnost izbire sintetične slike JPG/PNG ali PDF do 10 MB, na mobilnem brskalniku pa tudi izbira zajema s kamero (če jo naprava/brskalnik podpira).

- Izbrani vzorec ostane **samo v trenutnem brskalniku**. Slike se začasno prikazujejo z lokalnim objektovim URL, ki se ob odstranitvi ali zaprtju očisti. Za PDF se prikazujejo samo metapodatki (ime, velikost); PDF se ne odpira, pošilja ali arhivira.
- Vnos demonstracijskega računa vsebuje le ročno vnesene sintetične metapodatke. Datoteka **ni nikoli del zahtevka na strežnik**.
- Filter imena, končnice, MIME in velikosti je le osnovna uporabniška zaščita, **ni** dokaz varnosti vsebine ali antivirusni pregled.
- Namenjeno samo sintetičnim vzorcem. OCR, šifrirana trajna hramba originalov, povezava s podjetjem, obdelava računov in mobilni podpis še niso implementirani.
- Pri pravi nadgradnji obvezna preverba podpisov datotek, izolirano shranjevanje po podjetjih, antivirus, šifriranje, revizija in obnovitev.

Najmanjši QA: `node --test tests/demoIncoming.test.mjs tests/localFilePreview.test.mjs` in ena ciljana namizna/mobilna Playwright simulacija izbire predogleda brez POST/PUT/PATCH zahtevka. Brez sprememb Hiper M, Laškoteka ali STNG.
