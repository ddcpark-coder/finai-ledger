# FinAI Ledger

FinAI Ledger je AI-podprta računovodska SaaS aplikacija za podjetja in računovodske servise v Sloveniji.

## Status
MVP 0.1 — začetna razvojna faza.

## Okolja
- `main` → Production
- `develop` → Preview / integracijski razvoj
- feature veje → kratkotrajni razvoj posameznih funkcij

## Tehnologija
- Next.js
- React
- TypeScript
- Vercel
- načrtovana PostgreSQL podatkovna baza

## Ključne zahteve
- Dark / Light tema
- responsive desktop, tablica in mobilni prikaz
- večjezična pripravljenost
- popolna revizijska sled
- priprava na eDavki / FURS integracijo
- skladnost z zakonodajo RS in EU

## Razvojni potek
1. Razvoj poteka na `develop` ali feature vejah.
2. Preview deployment se preveri pred združitvijo.
3. `main` vsebuje samo preverjeno produkcijsko stanje.
4. Skrivnosti, certifikati in produkcijske poverilnice niso dovoljene v repozitoriju.

## Verzija
Trenutna začetna verzija: `0.1.0`.
