# FinAI NEXT-05 — sintetična sled ponudba → naročilo → dobavnica → zaloga

Samo demonstracija; brez sprememb pravih skladišč, računov, potrjenih računovodskih dogodkov ali pravih dokumentov.

- Tri vnaprej določena podjetja imajo svoj demo SKU, začetno zalogo in količino naročila.
- `create_order` preveri razpoložljivo demo zalogo in zabeleži rezervacijo brez zmanjšanja fizične zaloge.
- `confirm_delivery` je dovoljen le po naročilu/rezervaciji; sprosti rezervacijo in simulira izdajo ter znižanje demo zaloge.
- Zgodovina korakov vsebuje deterministične premike; ni drugega izdajanja ali ponovnega knjiženja z istim korakom.
- Panel prikazuje demo količine in nudi izvoz sintetične sledi v JSON (`demoOnly:true`, `posting:false`). Export rekonstruira kanonično stanje iz zaporedja prehodov, ne zaupa neposredno spremenjenim številkam v brskalnikovi shrambi.
- Poslovni tok ostaja shranjen samo v brskalnikovi seji. Zaloga v ločenem UI modulu se **ne** spreminja, ni pravega ERP/knjigovodskega vpisa.

Minimalni QA: `node --test tests/demoCommercialFlow.test.mjs`, CI za spremembe poslovnega panela in obstoječa gradnja statične aplikacije. Naslednji razvoj je avtoriziran zaledni dokumentni tok po podjetju, s transakcijskimi evidencami zalog in dvojnim knjigovodstvom ter revizijo — vendar šele po ločenem varnostnem/računovodskem preverjanju. Brez Hiper M pisalnih operacij ali posegov v Laškoteko/STNG.
