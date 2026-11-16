# FinAI NEXT-13A — enotni offline scenarij naročila in zaloge

Status: samo demonstracijski mobilni in Windows pogled z izmišljenimi podatki.

## Izvedeno

- `app/next13/offlineBusinessScenario.mjs` je deterministični, povsem lokalni izračun: za izbrano podjetje, poslovno enoto in sintetični SKU preveri razpoložljivo zalogo (na roki minus rezervirano), izvedljivo količino in primanjkljaj.
- Pričakovani dodani prihodki/stroški/rezultat se izračunajo v celoštevilskih centih samo za izvedljivi del naročila, ne pa za manjkajoče enote.
- Izračun uporablja obstoječo sintetično poslovno analitiko in skladiščno mrežo, brez podvajanja podatkovnih virov.
- Dostopen je iz skupne komponente BusinessBriefCompact v mobilnem `/field/` in Windows `/offline/` statičnem vmesniku.
- Uporabnik lahko spreminja količino, sintetično prodajno ceno in sintetični strošek na kos. Vnos se ne shrani.
- Niso izvedeni omrežni zahtevki, avtorizacija realnih uporabnikov, knjiženje, rezervacija zaloge, sinhronizacija ali shranjevanje v pravo lokalno bazo.

## Omejitve

Ta izračun je **predogled**, ne davčno/računovodsko pravilen obračun. Izhodiščni podatki o prihodkih in stroških so sintetični. Različni SKU-ji niso seštevani v eno razpoložljivo količino izdelka; računa se SKU v obsegu izbrane poslovne enote. Manjkajoča naročena količina ni prikazana kot ustvarjen prihodek.

Windows še vedno uporablja ločeno šifrirano lokalno bazo za obstoječe testne osnutke, ta simulacija pa ne zapisuje ničesar vanjo. Mobilna PWA ostaja prototip, ne namenska iOS/Android aplikacija.

## QA

`node --test tests/next11CompactBrief.test.mjs tests/next13OfflineBusinessScenario.test.mjs`

Preverjanje izolacije med tremi demonstracijskimi podjetji, enotami, SKU-ji, natančnosti centov, primanjkljaja in odsotnosti sprememb izvornega stanja. Ob spremembi komponente sta ciljna tudi statična Next.js gradnja in offline mobilni/Windows prikaz, ne prava namestitev na gostovanje.

## Naslednja faza

NEXT-13B: preverjen šifriran lokalni poslovni zapis z lastno izrecno uporabo in prenosljivo obnovitvijo v Windows, mobilno offline vrsto dogodkov, tenant avtentikacijo in različice. To zahteva ločen QA in ne sme neopazno spremeniti obstoječih šifriranih izdaj.

Vsa dejanja so izključno FinAI GitHub; `laskot48` samo za branje, Laškoteka in STNG nedotaknjena.