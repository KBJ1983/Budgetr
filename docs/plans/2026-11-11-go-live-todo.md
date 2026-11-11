# Go-live: det, der mangler (11.11.2026)

Fra den fulde gennemgang 11.11.2026. Del 1 (de alvorligste sikkerhedshuller) og del 2 (mobil og tekster) er lavet;
resten står her. Afkryds, når et punkt er klaret.

## A. Opsætning (gøres i kontrolpanelerne, ikke i koden)

- [ ] **Vercel-plan:** Pro (Hobby må ikke bruges kommercielt).
- [ ] **Region:** funktioner i EU (`fra1`) – i Vercel > Settings > Functions, eller `"regions": ["fra1"]` i `vercel.json`.
- [ ] **Upstash:** bekræft, at databasen ligger i EU (siderne lover det). Slå daglig backup til.
- [ ] **Separat Upstash-database til Preview**, så test-deploys aldrig rører rigtige data.
- [ ] **Miljøvariabler i Vercel (Production):** Upstash-nøglerne, `AUTH_SECRET` (min. 32 tegn – sættes én gang og
      skiftes aldrig, ellers logges alle ud og udsendte pladskoder holder op med at virke), `RESEND_API_KEY`,
      `MAIL_FROM` (fx `budgetpro <noreply@budgetpro.dk>`), `APP_URL=https://budgetpro.dk`, `CRON_SECRET`,
      `OWNER_EMAILS`, evt. `ADMIN_PASSWORD` og `GATEWAYAPI_TOKEN`.
- [ ] **Ved go-live:** fjern `SITE_PASSWORD` i Production (så lukker testlogins af sig selv – DEMO bliver), sæt
      `ALLOW_INDEXING=1`, og deploy igen (robots-indstillingen låses ved build).
- [ ] **Domæner i Vercel:** `budgetpro.dk`, `www`, `erhverv`, `skole` – A/CNAME-poster som Vercel viser; www sendes
      videre til budgetpro.dk.
- [ ] **Resend:** opret domænet i EU-regionen, DKIM/SPF-poster som Resend viser, DMARC (`_dmarc`,
      `v=DMARC1; p=none; rua=mailto:…`). Test hele vejen: oprettelse, login, invitation, lærer, kundeadmin,
      "Send på mail", påmindelser.
- [ ] **`info@budgetpro.dk`** skal være en rigtig postkasse (MX-poster).
- [ ] **GatewayAPI** (kun hvis sms tilbydes): brug EU-endpointet `gatewayapi.eu` (koden bruger i dag `.com` –
      `lib/reminder-run.ts`), afsendernavn.
- [ ] **Node-version** i Vercel: 22.x eller 24.x.

## B. Kode, der bør laves før go-live

- [ ] **Betaling:** der er ingen betalingsløsning, og intet lukker adgangen efter de 30 dage. Vælg udbyder (Stripe,
      Frisbii, QuickPay), byg lukning efter prøveperioden og en "prøveperioden slutter"-mail – eller gå live som
      "gratis i prøveperioden" og byg det, før de første prøveperioder slutter. Erhverv: faktura; offentlige skoler:
      e-faktura (OIOUBL/EAN).
- [ ] **Daglig oprydning af udløbne skoleklasser** i cron-jobbet (i dag slettes de kun, når nogen åbner dem, men
      privatlivspolitikken siger "slettes automatisk").
- [ ] **Slet bruger:** slet eller anonymisér også pladser fra aftaler, linjen i ejeroversigten og påmindelsesloggen
      (`deleteAccount()` i `lib/accounts.ts`) – eller skriv i `/privatliv`, hvad der gemmes og hvorfor.
- [ ] **Opslag fra e-mail til konto** (`findLogin` læser alle konti – bliver for langsomt ved et par tusinde
      brugere).
- [ ] **Slet ubekræftede konti** efter 48 timer.
- [ ] **Ejeroversigten og pladser:** samtidige ændringer kan overskrive hinanden, og samtidige udsendelser kan sende
      flere pladser end købt (versionstjek eller atomisk tæller).
- [ ] **Logud** kan i dag ikke trække en session tilbage (cookie gælder 90 dage) – sessionsversion pr. konto.
- [ ] **Danske 404- og fejlsider** (`app/not-found.tsx`, `error.tsx`).
- [ ] **Delingsbilleder og SEO:** `metadataBase`, Open Graph-billeder pr. forside, canonical, `app/sitemap.ts`;
      noindex på `*.vercel.app`.
- [ ] **Fejlovervågning** (fx Sentry) og oppetidstjek på forsiderne og `/app`; alarm når cron-jobbene fejler.
- [ ] **Skærmbilleder og film:** `pnpm shots`, `pnpm shots:skole`, `pnpm video …` (privat, erhverv, kom-i-gang) og
      hæv `MEDIA_V` – de viser appen før de nye ikoner og tekster. Privat-filmen viser notifikationer som mails, der
      ikke findes (milepæle vises kun i appen) – ret det samtidig.
- [ ] Eventuelt en fuld Content-Security-Policy (kræver at appens inline-scripts flyttes eller får nonce).

## C. Beslutninger, du skal tage

- [ ] **Skole-pris:** forsiden sælger "1.500 kr. pr. skoleår" for hele skolen, men koden sælger lærerpladser fra pakker.
      Hvilken model gælder?
- [ ] **Henvendelser fra Erhverv:** hvor længe gemmes de (fx 12 måneder, eller 5 år hvis de bliver kunder)? Skal ind i
      `/privatliv`.
- [ ] **Inaktive konti og lærerbrugere:** slettes efter hvor lang tid uden brug?
- [ ] **Repo'et:** privat i stedet for offentligt? (Hele produktet kan læses og kopieres.)

## D. Jura og persondata (med advokat/revisor, hvor det står)

- [ ] **Databehandleraftale til Skole** (skolen/kommunen er dataansvarlig for elevdata; KL's skabelon). Gælder også den
      gratis klasse – kræv aftalen, eller lad læreren bekræfte, at skolen har godkendt værktøjet.
- [ ] **Databehandleraftale med banker/ejendomsmæglere** for de e-mails og noter, de giver os.
- [ ] **Underskriv/accepter databehandleraftaler** med Vercel, Upstash, Resend og GatewayAPI; skriv land og
      overførselsgrundlag for hver i `/privatliv`.
- [ ] **GDPR-papirer:** fortegnelse over behandlinger (art. 30), konsekvensanalyse (DPIA – økonomidata og børns
      fritekst), procedure for sikkerhedsbrud.
- [ ] **Betaling og forbrugerret** (før nogen trækkes penge): "bestilling med betalingspligt"-knap, fortrydelsesret og
      -formular, bekræftelse på varigt medie, online opsigelse, EU's fortrydelsesknap (fra 19.6.2026), og
      "Et årsabonnement kører året ud" holdt op mod forbrugeraftaleloven (5-måneders-reglen). [advokat]
- [ ] **CVR og moms:** er "Budgetpro" det præcise registrerede navn, og er virksomheden momsregistreret? Ellers er
      "inkl. moms" misvisende. Overvej Erhverv-priser ekskl. moms. [revisor]
- [ ] **Besøgstællingen** kører et lille script i browseren; efter EDPB's fortolkning kan det kræve samtykke.
      Alternativ: tæl på serveren uden script. [advokat]
- [ ] **Varemærke:** søg "budgetpro"/"budget pro" hos DKPTO, EUIPO og WIPO (klasse 9, 36, 41, 42) og i app-butikkerne;
      tjek at domænerne står i virksomhedens navn.
- [ ] **Fotos** på forsiden og Erhverv (`public/landing/foto-*.jpg`, `public/erhverv/foto-moede.jpg`): find kilde og
      licens (og modelrelease, hvis personer kan genkendes).
- [ ] **Licensfiler:** læg OFL-licenserne for skrifttyperne ved `public/budgetr-app/fonts/`, og en kort fil med
      tredjepartslicenser (jsPDF, AutoTable, xlsx-js-style, pdf.js).
- [ ] **Mixkit-musik:** tjek vilkår for brug i reels på sociale medier (Content ID).
- [ ] **Tilgængelighed:** kommuner vil spørge efter WCAG 2.1 AA og en tilgængelighedserklæring for Skole.
- [ ] **Git-historikken** indeholder et mobilnummer fra en tidligere sidefod. Er det privat, skal historikken omskrives
      (eller accepteres).
