# budgetr

Gratis budgetværktøj for én person, et par eller en familie: løn, faste udgifter, lån og opsparing ét sted.

- **Forside** (`/`) – Next.js, bygget efter designet i [docs/design/](docs/design/) (`HANDOFF.md`, `forside-desktop.html`, `forside-mobil.html`).
- **Log ind** (`/login`) – testbrugere uden adgangskode (se nedenfor).
- **App** (`/app`) – den oprindelige budgetr-app fra prototypen (`Budget2027.html`), 1:1: budget med posttabel, rådighed som banken regner det, hvem betaler hvad med ekstra indtjening og opsparing pr. person, udvikling i poster, måned for måned, lån, faste overførsler, opsparingsmål, scenarier, guide, import af kontoudskrift og eksport til PDF/Excel/JSON. Filen ligger i [public/budgetr-app/index.html](public/budgetr-app/index.html) og redigeres direkte.

## Testbrugere – intet rigtigt login endnu

Brugerne står i [lib/users.ts](lib/users.ts). Man logger ind med initialerne:

| Login | Starter med |
|---|---|
| `KBJ` | Det rigtige budget, hvis `public/private/kbj.legacy.json` findes lokalt – ellers app'ens guide |
| `TEST1` … `TEST5` | Tomt – app'ens guide eller et tomt budget |

Hver bruger gemmer i browserens `localStorage` under `budgetr-app:<bruger>`, så data deles ikke mellem computere. Rigtig brugerhåndtering med mail og login kommer senere.

**Rigtige budgetdata ligger aldrig i repoet.** `public/private/` er git-ignoreret. `pnpm extract:app <sti til Budget2027.html> kbj` trækker app'en ud af prototypen (uden data) og lægger dataene i `public/private/kbj.legacy.json`. Kør det kun, hvis app'en skal startes forfra fra prototypen – ellers overskrives rettelser i `public/budgetr-app/index.html`.

## Kom i gang

```sh
pnpm install
pnpm dev          # http://localhost:3200
pnpm test
pnpm typecheck
pnpm build
pnpm smoke        # klik-igennem-test mod en kørende dev-server (Playwright + Chrome)
```

## Struktur

| Sti | Indhold |
|---|---|
| `app/page.tsx`, `components/landing/` | Forsiden |
| `app/login/`, `components/app/LoginForm.tsx`, `lib/store.ts`, `lib/users.ts` | Testbruger-login |
| `public/budgetr-app/` | Budget-app'en (vanilla JS) + `vendor/` (jsPDF, jsPDF-AutoTable, SheetJS) |
| `next.config.ts` | Omskriver `/app` til `public/budgetr-app/index.html` |
| `docs/design/` | Designhandoff til forsiden |
