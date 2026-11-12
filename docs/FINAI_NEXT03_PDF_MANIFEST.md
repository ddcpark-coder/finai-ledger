# FinAI NEXT-03 – preverljiv manifest demonstracijskega PDF

Za terenski zaslon `/field/` je dodan še dokazni par: 
- uporabnik najprej prenese izvirno **sintetično, digitalno nepodpisano** dobavnico PDF s sliko ročnega podpisa,
- za natanko iste PDF bajte FinAI izdela `SHA-256` manifest,
- pred izvozom manifest preveri berljivost izvirnega PDF, pravilno `template=v2`, povezavo na evidence SHA-256, company/document ID in točen hash PDF,
- po menjavi podjetja ali izdelavi novega podpisa se prejšnja povezava PDF/manifest ponastavi,
- datoteki se izvozita lokalno brez pošiljanja na strežnik. Druga naprava ali naknadna ročna sprememba datoteke brez ustreznega manifestnega ujemanja bi bila zaznavna ob ponovnem preverjanju SHA-256.

**Pravne omejitve:** manifest dokazuje skladnost kontrolnih vrednosti, ne identitete podpisnika, ne kvalificiranega e-podpisa, ne neizpodbitnega časa ali integritete dokumenta po zlonamerni zamenjavi *obeh* datotek. Ustvarjeni PDF ne vsebuje PAdES podpisa in ni dokazano skladen s PDF/A. Pred resnično uporabo potrebuje FinAI registracijo naprav, avtentikacijo, podpisnika, varovan časovni žig, izbranega ponudnika zaupanja, revizijo in zanesljivo hrambo.

**Ciljni QA:** sintetični Node test ustvarjanja/validacije manifestov, zavrnitev lažnih oznak `qualified=true`, poškodovanega PDF, napačnega podjetja in naknadne spremembe; po en Playwright prenos PDF+manifest na namizju in mobilni emulaciji. Nobenih pisalnih posegov v Hiper M, Laškoteko ali STNG.
