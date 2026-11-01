# Deployment targets

## Hiper M — Production
- PHP 8.4
- MariaDB 10.11
- Composer/Git
- Node.js samo za asset build
- cron za periodična opravila
- brez predpostavke o Dockerju ali trajnem queue workerju
- release direktoriji + `current` symlink/ekvivalent za rollback
- konfiguracija prek strežniških environment spremenljivk

## Vercel — Preview only
- samo UI/preview in hitra vizualna preverjanja
- brez produkcijskih računovodskih podatkov
- brez FURS certifikatov
- brez produkcijskih skrivnosti
- ni produkcijski hosting

## Self-hosted
- ista poslovna koda kot Hiper M
- konfiguracija prek `.env`
- MariaDB kot privzeta baza
- filesystem/object storage adapter
- možnost Docker paketa v ločeni distribucijski fazi

## Deployment tok
`feature/* -> develop -> Preview QA -> main -> Hiper M Production`

Vercel deployment na `main` je lahko začasno vključen med razvojem, vendar ni kanonični production deployment.
