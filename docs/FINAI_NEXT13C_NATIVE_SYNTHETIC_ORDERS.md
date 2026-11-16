# FinAI NEXT-13C — Windows izvorni obrazec za šifrirane sintetične osnutke

## Izvedeno

- V Windows orodni vrstici je gumb **Šifrirana naročila**, ki odpre izvorno WinForms okno `SyntheticOrdersDialog` (niti WebView2 JS niti HTTP).
- Ob prvem zagonu uporabnik izrecno ustvari namenski testni trezor pod lastnim `%LOCALAPPDATA%/e-integrator/Desktop/SyntheticOrderVault-v1` z uporabniškim imenom in vsaj 16-mestno frazo.
- Ustvarita se dve podjetji **SYNTH-PODJETJE-A/B**. Vsa nadaljnja uporaba zahteva prijavo v obstoječi šifrirani SQLite3MC trezor; brez samodejne odjave v JavaScript, brez omrežnih klicev.
- Pregled podjetij je omejen na lokalna članstva uporabnika; seznam osnutkov se zgradi šele po uspešni prijavi in preveri tenant scope.
- Vpis dopušča izključno tri fiksne `SYN-*` SKU, celo število kosov (1–200), ceno v centih (1–10.000.000). Ustvari se šifriran append-only osnutek z auditom in idempotentnim UUID, ne dejanski račun, naročilo ali rezervacija zaloge.
- Native-only izvoz uporabi obstoječo prenosno AES-GCM/DPAPI zaščiteno kopijo **cele** šifrirane zbirke. Obnova je dovoljena le v še neobstoječo lokacijo in ne prepiše ničesar.
- Preverijo se lokalni direktorij, reparse points (junction/symlink), ločena prijava in neaktivnost/revokacija 15-minutne lokalne seje. Osnovne napake so prikazane brez gesel, SQL, lokalnih poti ali drugih občutljivih vrednosti.

## Ciljni QA

GitHub workflow `finai-hiperm-desktop-build.yml` sestavi .NET 10 win-x64 portable aplikacijo s sintetičnim lokalnim Next.js izvozom in izvede `--synthetic-order-draft-self-test`, ki dodatno preverja samo svoja podjetja, viewer/member omejitve, zavrnjene seje, natančne cente in obnovitev.

QA ne pomeni že verificirane podpisane Windows namestitve ali ročnega UX pregleda: obrazec se za zdaj uporablja **izključno za sintetični razvoj**.

## Ostanek razvoja

- Zahtevana je še presoja upravljanja uporabniških vlog in življenjskega cikla prijav za realna podjetja ter varna nadgradnja shem v obstoječih lokalnih trezorjih.
- Trenutni izvorni demo trezor ni povezan z WebView2 uporabniškimi dokumenti ali s produkcijskim ERP zaledjem. Ni samodejne sinhronizacije ali resničnih računov.
- Pred resničnimi podatki: neodvisni varnostni pregled šifriranja, podpisan namestitveni paket, uporabniški QA, preizkus obnovitve med različnimi Windows računi, računovodski in pravni pregled.

Vse spremembe so omejene na GitHub FinAI. Skupni Hiper M račun `laskot48` je read-only. Laškoteka in STNG ostajata absolutno nedotaknjena.