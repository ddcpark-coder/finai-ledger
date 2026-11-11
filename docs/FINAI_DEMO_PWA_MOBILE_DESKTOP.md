# FINAI-PWA-DEMO-01 — namestljiv zaščiten sintetični predogled

Namestljiv PWA prikaz za Android/iPhone (kjer ga brskalnik podpira) in namizne brskalnike uporablja obstoječi Next.js static export, manifest z ikonama 192/512 PNG in strogo omejen Service Worker.

**Privzeto IZKLJUČENO:** v običajnem build okolju `NEXT_PUBLIC_FINAI_DEMO_PWA_ENABLED` ni nastavljen, zato se Service Worker ne registrira. Za zaščiten sintetični demo build izrecno nastavi `NEXT_PUBLIC_FINAI_DEMO_PWA_ENABLED=true`, izvede `npm run build` in objavi samo v izolirano razvojno okolje. Nikoli ne vključuj zastavice brez dovoljenj/strokovnega pregleda v produkcijsko aplikacijo z resničnimi finančnimi podatki.

## Offline omejitve

- Worker poskuša predpomniti samo začetno statično stran, manifest, ikone in datoteke `/_next/static/` na istem originu. Ne predpomni poslovnih API-jev, prijav, dokumentov, uporabniških datotek, piškotkov, zahtevkov za pisanje, finančnih evidenc ali drugih domen. Omejen offline prikaz je odvisen od predhodno prenesenih statičnih komponent.
- `localStorage` in `sessionStorage` iz demonstracije nista varna trajna offline hramba računovodskih podatkov in nista vključena v sinhronizacijo.
- Dejanski PWA način in gumb za namestitev sta odvisna od podpore v Android/iOS/namiznem brskalniku; potrebna je HTTPS povezava (ali razvojni localhost).
- Ločena samostojna **Windows aplikacija** z namestitvenim paketom, šifrirano bazo, revizijo in pravo offline obnovo **NI** izvedena s tem PR. Ostaja samostojna obvezna naloga.

## Naslednja faza

Izolirano Reseller gostovanje FinAI → HTTPS → registrirana avtentikacija → varovan sync queue z uporabnikom/podjetjem, idempotentnimi dogodki in reševanjem konfliktov; šele nato prenosi resničnih dokumentov, mobilni podpis s strežniškim dokazilom in produkcijsko šifrirano offline shrambo.

Test: manifest+SW politični smoke test in en namizni/mobilni lokalni PWA preizkus offline statične lupine. Laškoteka, STNG in skupni Hiper M niso vključeni.
