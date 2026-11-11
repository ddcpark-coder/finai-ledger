# FINAI PRINT-DELIVERY-01 — priprava dobavnice za tisk ali PDF iz brskalnika

Mobilni in namizni demonstracijski podpisani dobavnici je dodan **predogled za tisk**.

Po zaključku demonstracijskega prevzema aplikacija ponovno preveri lokalni SHA-256 dokazni paket, ujemanje podjetja, zamrznjene vsebine dobavnice in risbe podpisa. Šele po uspehu uporabnik vidi dokument za tisk, ki vsebuje vse postavke, identiteto sintetičnega podjetja, podpisnika, UTC čas, sliko risbe in SHA-256 vrednosti.

Gumb **Natisni / shrani kot PDF** odpre sistemski tiskalni dialog brskalnika. Uporabnik lahko na podprti napravi izbere *Shrani kot PDF*. Na mobilnih napravah je postopek odvisen od Android/iOS brskalnika.

**To ni kriptografsko podpisan PDF.** Brskalnik ustvari običajno tiskano kopijo. Risba na zaslonu ni kvalificiran podpis, čas ni certificiran in lokalni JSON dokazni paket ne zagotavlja identitete podpisnika. Še ni certificiranega eIDAS postopka, samodejnega generiranja PDF v ozadju, podpisovanja PDF/A/PAdES, strežniške hrambe, e-pošte ali originalne poslovne dobavnice.

Dokumenti in preverjanje so samo sintetični. Ob menjavi podjetja se predogled odstrani. Vsa dejanja potekajo lokalno, brez dostopa do Hiper M, Laškoteke ali STNG.

### Nadaljnja produkcijska faza
Podpisan zapis v neodvisni FinAI šifrirani hrambi, neizbrisna revizijska sled, overjen čas, omejen dostop in varen podpisni postopek; uporaba PAdES oziroma QES samo tam, kjer to zahtevajo pravila in s certificirano storitvijo.
