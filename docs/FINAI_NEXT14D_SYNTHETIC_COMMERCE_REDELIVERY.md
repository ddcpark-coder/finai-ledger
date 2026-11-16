# FinAI NEXT-14D — idempotentna ponovna dostava sintetičnih naročil

## Namen

Ponudnik lahko pošlje **isto** naročilo večkrat, vendar z novim identifikatorjem dostave. Ponavljanje nespreminjivega dogodka je doslej varno vrnilo isti rezultat; drug ID istega naročila je sprožil napako zaradi podvojenega naročila. Nova funkcija prepozna semantično idempotentnost brez podvajanja.

## Pravila

- Vse ostaja omejeno na lokalno/testno aplikacijsko storitev in sintetične podatke. Realnih webhookov ali javnega HTTP endpointa ni.
- Pred vsakim korakom ostanejo obvezni provider HMAC podpis surovega telesa, omejitve sintetičnega JSON, dovoljenja uporabnika podjetja, status testne povezave, aktivno skladišče in preslikava artiklov.
- Najprej se preveri obstoječi `(connection_id,event_id)`. Če je njegova normalizirana vsebina drugačna, se ponovitev zavrne.
- Če pod novim `event_id` že obstaja isti `(connection_id,external_order_id)`, se vrne prvotni ID in `replayed=true` **samo**, če je fingerprint normaliziranih vrstic, centov, valute in skladišča povsem enak.
- Pri različnem znesku, SKU, količini ali skladišču istega naročila se vnos zavrne brez novega zapisa in brez nove revizijske sledi.
- Baza še naprej uveljavlja unikatnost `(connection_id,event_id)` in `(connection_id,external_order_id)`, zato ponovna dostava ne ustvari podvojenega naročila niti v podatkovni shemi.
- Stanje ostane izključno `review` in `posting=false`. Nobenih izdaj računov, rezervacij zalog ali knjiženja.

## Testiranje

`Next14cSyntheticProviderOrdersTest` zdaj za oba ponudnika simulira enako sintetično naročilo z drugim ID dostave. Preverja `replayed=true`, isti ID, samo en revizijski zapis na naročilo in zavrnitev podpisanega, toda drugačnega zneska.

Pravi trgovinski priklop bo potreboval tudi robustno obravnavo sočasnih zapisov, retry/dead-letter vrste, omejitve števila zahtev in revizijo pravil naročanja/knjiženja na izolirani namenski FinAI MariaDB. Zeleni SQLite Feature testi ne pomenijo zaključene produkcijske integracije.

Na Hiper M, Laškoteki, STNG in skupnem `laskot48` ni nobenih dovoljenih FinAI pisalnih posegov.