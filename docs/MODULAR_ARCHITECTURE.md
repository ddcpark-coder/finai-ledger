# FinAI Ledger — Modularna arhitektura

## Cilj
FinAI je modularni Business OS. Posamezno podjetje aktivira samo module, ki jih potrebuje, skupni podatkovni model pa ostane enoten.

## Module Registry
Frontend uporablja centralni module registry. Vsak modul ima:
- key
- label
- icon
- group
- defaultEnabled
- pozneje permissions, feature flags in route metadata

Backend uporablja `config/modules.php` in ResolveEnabledModules.

## Pravilo nalaganja
Težki delovni prostori se lazy-loadijo. Prvi prikaz aplikacije ne sme uvoziti kode vseh poslovnih modulov.

Cilj:
- dashboard shell se naloži takoj;
- modul se prenese šele ob odprtju;
- prihodnji moduli CRM, zaloge, projekti itd. ne povečajo linearno initial bundle-a.

## Skupne storitve
Moduli ne podvajajo:
- auth
- company/tenant scope
- RBAC
- audit
- dokumente
- notification/event sistem
- AI provider sloj
- integracije
- design system

## Meje modula
Vsak poslovni modul ima:
- svojo UI mapo
- application services
- domain pravila
- migrations/tabele, kadar so potrebne
- dokumentacijo
- permission mapping
- events/integration contracts

## Komunikacija
Moduli naj se povezujejo prek stabilnih ID-jev, application services in dogodkov, ne prek neposrednega poseganja v UI stanje drugega modula.

Primer:
`OrderCompleted -> DeliveryNoteCreated -> InvoicePrepared -> OpenItemCreated`

## Feature flags
Company-level module enable/disable je ločen od permissionov.
- modul je lahko izklopljen za celotno podjetje;
- če je vklopljen, ga uporabnik vidi samo, če ima ustrezno dovoljenje.

## Rast
Na ta način lahko dodamo CRM, ponudbe, naročila, nabavo, zaloge, projekte, HR in druge module brez pretvorbe aplikacije v en velik monolit.
