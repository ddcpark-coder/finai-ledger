# FinAI NEXT-13G — prenos šifrirane mobilne čakalne vrste

Izključno sintetična mobilna PWA `/field/`. Brez samodejne ali produkcijske sinhronizacije.

## Funkcionalnost

- Pri **čakajočem** testnem dogodku PWA izvozi prenosni JSON `finai-portable-synthetic-outbox-v1`, ki vsebuje že šifrirano AES-GCM dokazilo iz lokalne zbirke, ID podjetja in dokumenta, UUID odjemalčevega dogodka in pričakovano strežniško verzijo.
- Paket vsebuje SHA-256 kontrolno vsoto izbranega podjetja ter izvornega nespremenjenega JSON telesa. **SHA-256 ni podpis ali dokaz zaupanja vrednega pošiljatelja**; zaščita vsebine izvira iz obstoječega AES-GCM šifriranja z uporabnikovo lokalno frazo.
- **Uvoz** je ročno uporabniško dejanje; dovoljen je samo za izbrano sintetično podjetje, prazen lokalni odhodni predal in čakajoči dogodek brez strežniške potrditve.
- Import ohrani izvirni UUID (idempotentni ključ) in `expectedVersion` ter preveri podjetje, velikost, obliko, dovoljene ključe, sintetični dokument in ovojnico. Obstoječega drugačnega dogodka nikoli ne prepiše.
- Konfliktni, ujemajoči ali že potrjeni dogodki niso sprejemljivi za ta izvoz in ponovni uvoz; ročni pregled konfliktov ostaja ločen in ne simulira potrditve strežnika.
- Dogodek je v IndexedDB, nikoli v nešifrirani računovodski bazi. Datoteka sama ne omogoča dešifriranja brez ločene lokalne fraze; uporabnik mora poskrbeti za varovanje izvožene datoteke.
- Noben HTTP POST se ne izvrši med izvozom ali uvozom; morebitna poznejša demo sinhronizacija potrebuje ločen izrecen klik, lokalno avtorizacijo in CSRF.

## QA

- Node test `tests/demoOutboxPortable.test.mjs`: ohranitev UUID, podjetja in verzije, zavrnitev tujega podjetja, dodatnih polj, spremenjenega paketa, plaintext ključa, poškodovanega zapisa in prevelikega prenosa.
- `field-offline-pwa-qa.yml`: ciljni Node test + obstoječi Playwright mobilni offline testi in aplikacijska gradnja.
- Pred uporabo resničnih podatkov je potrebna celovita revizija avtorizacije mobilnih naprav, sinhronizacijskih konfliktov, šifriranja, obnove in pravnega statusa podpisovanja.

Na Hiper M ni bilo pisanja; Laškoteka, STNG in skupni `laskot48` so zaščiteni.
