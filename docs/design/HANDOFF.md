# budgetr – handoff af forsiden

Denne mappe indeholder alt, der skal til for at bygge forsiden til **budgetr** på et website: denne brief, en færdig desktopversion og en færdig mobilversion som statisk HTML.

| Fil | Indhold |
|---|---|
| `HANDOFF.md` | Denne brief: opgave, designregler, tekster og tjekliste |
| `forside-desktop.html` | Færdig desktopside (fylder bredden, min. 1.280 px) |
| `forside-mobil.html` | Færdig mobilside (390–480 px, én kolonne) |

Begge HTML-filer kan åbnes direkte i en browser og bruges som facit for layout, tekst og farver.

---

## 1. Prompt til Claude i Chrome

Kopiér teksten herunder ind i Claude i Chrome. Udfyld felterne i [firkantede parenteser] først.

> Du skal bygge forsiden til budgetr på **[PLATFORM, fx Framer, Webflow, WordPress eller Squarespace]**, som jeg allerede er logget ind på i denne browser, i projektet/sitet **[NAVN PÅ SITE]**.
>
> Facit er de to vedhæftede filer `forside-desktop.html` og `forside-mobil.html` samt briefen `HANDOFF.md`. Byg siden, så den matcher dem så tæt som platformen tillader: samme sektioner i samme rækkefølge, samme tekster ord for ord, samme farver, skrifttype, afstande og hjørneradier.
>
> Arbejd sådan:
> 1. Opret en ny side, der hedder "Forside", og brug den som startside.
> 2. Tilføj skrifttypen **Schibsted Grotesk** (Google Fonts, vægt 400, 500 og 700) og farverne fra afsnit 3 som globale stilarter, før du bygger sektionerne.
> 3. Byg sektionerne én ad gangen i rækkefølgen fra afsnit 4. Brug platformens egne sektioner, kolonner og komponenter. Hvis platformen tillader et HTML-/embed-element, må produktudklippene (de mørke app-vinduer) indsættes som HTML fra `forside-desktop.html`.
> 4. Sæt tilmeldingsfeltet op som beskrevet i afsnit 5. Knappen skal sende til **[LINK TIL TILMELDING / APP]**. *Log ind* skal gå til **[LINK TIL LOG IND]**.
> 5. Byg mobilvisningen efter `forside-mobil.html` og reglerne i afsnit 6.
> 6. Udfyld SEO-felterne fra afsnit 7.
> 7. Gennemgå tjeklisten i afsnit 9 i både desktop- og mobilvisning.
>
> Spørg mig, før du publicerer siden, ændrer domæneindstillinger, sletter noget eller accepterer vilkår. Opret ikke konti, og indtast ikke adgangskoder eller betalingsoplysninger. Beholder du en pladsholder i [firkantede parenteser], så sig det til sidst, så jeg kan udfylde den.

---

## 2. Produktet kort

**budgetr** er et gratis budgetværktøj for én person, et par eller en familie. Man samler løn, faste udgifter, lån og opsparing ét sted og ser:

- hvad man har til rådighed, også som banken regner det,
- hvem der betaler hvad, hvis man deler økonomi,
- hvornår lån udløber, og hvad der frigives,
- opsparingsmål med fast beløb eller fast månedlig indbetaling,
- scenarier, fx ny bolig eller barsel, holdt op mod det nuværende budget,
- faste overførsler mellem konti,
- import af kontoudskrift (CSV/Excel) uden adgang til netbanken.

Forsidens eneste opgave er at få besøgende til at **oprette en gratis bruger**. Alle knapper peger derhen.

Tone: rolig, konkret og troværdig. Du-form. Ingen udråbstegn, ingen salgsord. Tekster beskriver, hvad man kan, ikke hvor fantastisk det er.

---

## 3. Designregler

### Farver – selve siden (lys)

| Navn | Hex | Bruges til |
|---|---|---|
| Paper | `#F4F5F1` | Sidens baggrund |
| Card | `#FFFFFF` | Kort, trin-sektionen |
| Stone | `#EDEFEA` | Alternerende sektioner (Deler du økonomi?, Pris) |
| Ink | `#16201D` | Overskrifter, brødtekst, mørk sektion |
| Ink 2 | `#46534E` | Sekundær tekst |
| Ink 3 | `#5F6B66` | Hjælpetekst |
| Rule | `#DCE0DA` | Kanter og streger |
| Pine | `#1F5C4A` | Primær farve, knapper, afsluttende sektion |
| Pine bg | `#E3EEE9` | Lyse mærker og ikonfelter |
| Pine lys | `#6CC2A2` | Knap og accent på mørk baggrund |

### Farver – produktudklippene (appens mørke tema)

| Navn | Hex |
|---|---|
| Baggrund | `#121816` |
| Kort | `#1A2220` |
| Tekst | `#E7ECE9` / `#B3BEB9` / `#8E9A94` |
| Kant | `#2C3633` |
| Grøn (positiv) | `#6CC2A2`, baggrund `#1D3129` |
| Rød (negativ) | `#EE8F78`, baggrund `#3A231D` |
| Gul (tjek/advarsel) | `#E4B758`, baggrund `#352A14` |
| Blå (auto/fordeling) | `#86B8EE` |
| Skifer (scenarie) | `#A7B4C8`, baggrund `#212831` |

### Typografi

Kun én skrifttype: **Schibsted Grotesk** (400, 500, 700). Tal vises med `font-variant-numeric: tabular-nums`.

| Element | Desktop | Mobil |
|---|---|---|
| H1 (hero) | 68 px / 700 / linjehøjde 1,02 / bogstavafstand −0,035em | 42 px / 1,04 |
| H2 (sektion) | 44–48 px / 700 / 1,08 / −0,025em | 32 px / 1,1 |
| H2 (afsluttende) | 56 px | 36 px |
| Mellemrubrik | 13 px / 700 / versaler / bogstavafstand 0,08em / Pine | samme |
| Brødtekst | 17–19 px / linjehøjde 1,55 / Ink 2 | 15–17 px |
| Knapper | 16 px / 700 | 16 px |

### Form og afstand

- Sidemargen: 120 px på desktop, 20 px på mobil.
- Luft i sektioner: 96 px foroven og forneden på desktop, 56 px på mobil.
- Hjørneradius: knapper og felter 12 px, kort 14–18 px, app-vinduer 16 px, mærker 20 px (pille).
- Skygge kun på produktudklip og priskort: `0 40px 80px -30px rgba(18,24,22,.45), 0 12px 24px -12px rgba(18,24,22,.35)`.
- Ikoner: tynde stregikoner (1,8–2,4 px streg), aldrig emoji.
- Knap- og feltstørrelse: højde 52 px (mindst 44 px trykflade).

### Logo

Afrundet kvadrat i Pine med et hvidt hus-omrids og en grøn (`#6CC2A2`) dør, efterfulgt af ordet **budgetr** med små bogstaver, 700, tæt bogstavafstand (−0,03em). Den præcise SVG står øverst i begge HTML-filer.

---

## 4. Siden, sektion for sektion

Teksterne er endelige. Brug dem ord for ord.

### 4.1 Topmenu
- Venstre: logo + **budgetr**.
- Midte (kun desktop): Funktioner · Sådan virker det · Tryghed · Pris. Links scroller til sektionerne.
- Højre: **Log ind** (tekstlink) og **Opret gratis bruger** (mørk knap i Ink).
- Mobil: logo, *Log ind* og en menuknap (☰) med de fire links.

### 4.2 Hero
- Mærke: **Alene, som par eller familie**
- H1: **Hele din økonomi. Ét roligt overblik.** ("Ét roligt overblik." i Pine)
- Tekst: *Saml løn, faste udgifter, lån og opsparing ét sted. Se hvad du har til rådighed, hvad du kan spare op, og hvad der sker, hvis du flytter, skifter job eller betaler et lån ud. Bor I flere sammen, deler I budgettet og fordeler udgifterne fair.*
- Tilmelding: felt *Din e-mail* + knap **Opret gratis bruger →** (se afsnit 5).
- Tre flueben: Gratis · Ingen adgang til netbank · Klar på 10 minutter.
- Højre (desktop): stort app-vindue med Budget-fanen, og ovenpå to små kort: opsparingsmålet *Udbetaling til hus* og scenariet *Nyt hus fra 2027 · holdt op mod nu*. Mobil: et kompakt udklip under tilmeldingen.

### 4.3 Sådan virker det (hvid baggrund)
- Mellemrubrik: SÅDAN VIRKER DET
- H2: **Fra tomt ark til fuldt overblik på en aften.**
- Tekst: *Ingen regneark at vedligeholde og ingen formler at forstå. Du svarer på nogle få spørgsmål, og budgettet bygger sig selv.*
- Tre trin (nummererede, fordi de er en rækkefølge):
  1. **Opret en gratis bruger** – Kun e-mail og en adgangskode. Bor I flere sammen, kan du invitere dem til det samme budget.
  2. **Følg guiden i 7 trin** – Dig og dem, du deler økonomi med, konti, faste udgifter og opsparingsmål. Korte svar, som kan rettes bagefter.
  3. **Importér en kontoudskrift** – Upload CSV eller Excel fra netbanken. Ydelser opdateres, og stigninger bliver markeret.

### 4.4 Rådighed (tekst venstre, udklip højre)
- H2: **Se, hvad du har til rådighed. Som banken ser det.**
- Tekst: *Rådighedsbeløbet regnes, som banken gør, når I søger lån. Mad, opsparing og gaver holdes ude, så du kan se, om du ligger over eller under kravet.*
- Flueben: Nettoindtægt minus faste udgifter, måned for måned · Se hvornår et lån udløber og giver luft i budgettet · Klik på en post for at rette den med det samme.
- Udklip: *Rådighedsbeløb som banken regner det* med seks nøgletal.

### 4.5 Deler du økonomi? (Stone baggrund, udklip venstre)
- H2: **Bor I flere sammen? Så bliver det fair.**
- Tekst: *Bor du alene, springer du det her over. Deler I udgifter, fordeles de efter indkomst, ligeligt eller med en fast procent, og overførslen til budgetkontoen regnes ud for jer.*
- Flueben: Automatiske overførsler, der følger fordelingen · Egne udgifter og egen opsparing holdes for sig · Besked, når en fast overførsel skal rettes i netbanken.
- Udklip: *Hvem betaler hvad* med fordelingsbjælke (58/42) og to personkort.

### 4.6 Lån (tekst venstre, udklip højre)
- H2: **Se, hvornår lånene slipper dig.**
- Tekst: *Restgæld, rente og ydelse giver en beregnet slutdato for hvert lån, og en tidslinje viser, hvor meget der frigives om måneden, efterhånden som de bliver betalt ud.*
- Flueben: Udløb og frigivet beløb for alle lån · Renter pr. måned og hvor langt I er nået · Frigivne beløb regnes med i rådighedsbeløbet.
- Udklip: tre nøgletal, trappekurve med nummererede udløb og en tabel med fire lån.

### 4.7 Alt det andet (mørk sektion i Ink)
- Mellemrubrik (i `#6CC2A2`): ALT DET ANDET
- H2 (lys): **Opsparing, scenarier og det, der ændrer sig.**
- Tekst: *Planlæg det næste skridt uden at røre det budget, du lever efter i dag.*
- Tre kolonner, hver med udklip, rubrik og tekst:
  - **Opsparingsmål** – Et fast beløb til en dato, eller en fast månedlig indbetaling. Feriepenge og bonus kan lægges ind som ekstra indbetalinger.
  - **Scenarier** – Hvad sker der, hvis du køber bolig, går på barsel eller skifter job? Hvert scenarie holdes op mod det nuværende budget.
  - **Faste overførsler** – Se alle pengestrømme mellem dine konti, og få besked, når en overførsel ikke længere passer.
- Bred række: udklip af importen + **Upload kontoudskriften. Vi finder ændringerne.** – *Posteringer genkendes på aftalenummer og tekst. Du vælger selv, hvad der opdateres, og det gamle beløb gemmes, så du kan se udviklingen over tid.* Piller: CSV og Excel · Genkendes på aftalenr. · Stigninger markeres · Nye faste betalinger foreslås.

### 4.8 Tryghed
- H2: **Bygget til de tal, man ikke deler med hvem som helst.**
- Tekst: *Et budget indeholder løn, lån og kontonumre. Derfor er det dig, der bestemmer, hvad der kommer ind, og hvad der kommer ud.*
- Fire kort:
  - **Ingen adgang til netbanken** – Du uploader selv en kontoudskrift. Vi beder aldrig om login til din bank.
  - **Dine data er dine** – Eksportér alt som PDF, Excel eller sikkerhedskopi, når som helst.
  - **Alene eller sammen** – Brug det alene, eller invitér dem, du deler økonomi med. I ser de samme tal.
  - **[Hosting og databehandling]** – [Beskriv hvor data opbevares, og hvem der behandler dem]

### 4.9 Pris og spørgsmål (Stone baggrund)
- Priskort: PRIS · mærke *Alle funktioner* · **0 kr** *også når I er flere* · flueben: Ubegrænset antal budgetposter, konti og lån · Opsparingsmål og scenarier · Import af kontoudskrifter · Eksport til PDF, Excel og sikkerhedskopi · Del budgettet med dem, du bor med · Lyst og mørkt tema · knap **Opret gratis bruger**.
- **Spørgsmål og svar**:
  - *Er det virkelig gratis?* – Ja. Alle funktionerne på denne side er med i den gratis bruger. [Tilføj evt. hvordan tjenesten finansieres]
  - *Skal jeg give adgang til min netbank?* – Nej. Du henter selv en kontoudskrift som CSV eller Excel og uploader den. Beløbene kan også skrives ind i hånden.
  - *Kan jeg dele budgettet med andre?* – Ja. Invitér partner, familie eller en, du deler bolig med. I arbejder i det samme budget, og hver især vælger selv tema og visning.
  - *Hvad hvis jeg vil stoppe?* – Eksportér en sikkerhedskopi og slet din bruger. [Tilføj link til sletning og vilkår]

### 4.10 Afsluttende opfordring (Pine baggrund)
- H2 (hvid): **Giv din økonomi et hjem. Det tager ti minutter.**
- Tekst: *Opret en gratis bruger, følg guiden, og se med det samme, hvad du har til rådighed.*
- Tilmelding i mørk variant (felt `#1A2220`, knap `#6CC2A2` med mørk tekst).

### 4.11 Sidefod (`#121816`)
Logo + budgetr + [Firmanavn · CVR] · Vilkår · Privatlivspolitik · Cookies · Kontakt.

### Om eksempeltallene
Udklippene viser opdigtede eksempeldata (Anna og Jonas / én person i mobil-heroen). De er ikke rigtige brugerdata og må gerne blive stående.

---

## 5. Tilmelding

- Felt: type `email`, label *Din e-mail*, placeholder *navn@eksempel.dk*, `autocomplete="email"`, påkrævet.
- Knap: **Opret gratis bruger** med pil-ikon.
- Ved klik: send e-mailen til **[LINK TIL TILMELDING / APP]**, fx som `?email=` på tilmeldingssiden eller via platformens formular.
- Fejl: *Skriv en gyldig e-mail, fx navn@eksempel.dk.* under feltet.
- Samme opsætning i hero og i den afsluttende sektion. Alle andre *Opret gratis bruger*-knapper scroller til hero-feltet (`#opret`).

---

## 6. Responsiv opførsel

| Bredde | Layout |
|---|---|
| ≥ 1.280 px | Som `forside-desktop.html` |
| 768–1.279 px | Sektionerne med tekst og udklip stables: tekst over udklip. Trin og funktionskolonner i 2 kolonner. Sidemargen 40 px. |
| < 768 px | Som `forside-mobil.html`: én kolonne, tilmelding stablet i fuld bredde, menu bag ☰, sidemargen 20 px. |

Udklippene skaleres ned proportionalt, eller erstattes på mobil af de kompakte udklip fra mobilfilen.

---

## 7. SEO og deling

- Sidetitel: **budgetr – gratis budget for dig, par og familier**
- Metabeskrivelse: *Saml løn, faste udgifter, lån og opsparing ét sted. Se hvad du har til rådighed, og planlæg med scenarier. Gratis og uden adgang til netbanken.*
- Sprog: `da`.
- Delingsbillede (OG): [BILLEDE, fx et skærmbillede af hero-sektionen, 1200×630]

---

## 8. Pladsholdere, der skal udfyldes

- [PLATFORM] og [NAVN PÅ SITE]
- [LINK TIL TILMELDING / APP] og [LINK TIL LOG IND]
- [Hosting og databehandling] + beskrivelse
- [Tilføj evt. hvordan tjenesten finansieres]
- [Tilføj link til sletning og vilkår]
- [Firmanavn · CVR]
- Links til Vilkår, Privatlivspolitik, Cookies og Kontakt
- [BILLEDE] til deling

---

## 9. Tjekliste før publicering

- [ ] Alle sektioner fra afsnit 4 findes i rigtig rækkefølge, med teksterne ord for ord.
- [ ] Schibsted Grotesk indlæses, og tal står i faste kolonner (tabular).
- [ ] Farverne matcher afsnit 3. Ingen andre accentfarver.
- [ ] Menulinks scroller til Funktioner, Sådan virker det, Tryghed og Pris.
- [ ] Begge tilmeldingsfelter validerer e-mail og sender til det rigtige link.
- [ ] *Log ind* går til det rigtige link.
- [ ] Mobilvisning matcher `forside-mobil.html`, og intet scroller vandret.
- [ ] Knapper og links kan nås med Tab og har synligt fokus.
- [ ] Tekst har tilstrækkelig kontrast (mindst 4,5:1 for brødtekst).
- [ ] SEO-titel, metabeskrivelse og sprog er sat.
- [ ] Alle pladsholdere i [firkantede parenteser] er udfyldt eller meldt tilbage.
