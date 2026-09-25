# budgetr

Gratis budgetværktøj for én person, et par eller en familie: løn, faste udgifter, lån og opsparing ét sted.

- **Forside** (`/`) – bygget efter designet i [docs/design/](docs/design/) (`HANDOFF.md`, `forside-desktop.html`, `forside-mobil.html`).
- **App** (`/app`) – budget, rådighedsbeløb som banken regner det, fordeling mellem personer, lån med udløb og frigivne beløb, faste overførsler, opsparingsmål, scenarier, import af kontoudskrift (CSV/Excel) og eksport (PDF, CSV, sikkerhedskopi).
- **Guide** (`/app/start`) – opret dit eget budget i 7 trin. *Opret gratis bruger* på forsiden fører hertil.

## Status: testbrugere, intet rigtigt login endnu

*Log ind* (`/login`) tager en mail eller initialer uden adgangskode. Brugerne står i [lib/users.ts](lib/users.ts):

| Login | Starter med |
|---|---|
| `KBJ` | Det rigtige budget fra den første prototype, hvis `public/private/kbj.json` findes lokalt – ellers eksemplet |
| `TEST1` … `TEST5` | Tomt – guiden åbner |

Rigtige budgetdata ligger aldrig i repoet. `pnpm import:legacy <sti til Budget2027.html> kbj` konverterer den første prototype til `public/private/kbj.json`, som git ignorerer.

Hver bruger har sine egne budgetter i browserens `localStorage` (`lib/store.ts`), så data deles ikke mellem computere. Rigtig brugerhåndtering med mail og login kommer senere – så skiftes `lib/store.ts` ud med en API-baseret version med de samme hooks.

## Kom i gang

```sh
pnpm install
pnpm dev          # http://localhost:3200
pnpm test         # beregninger (vitest)
pnpm typecheck
pnpm build
pnpm smoke        # klik-igennem-test mod en kørende dev-server (Playwright + Chrome)
```

## Struktur

| Sti | Indhold |
|---|---|
| `app/page.tsx`, `components/landing/` | Forsiden |
| `app/app/`, `components/app/` | App og guide |
| `lib/domain/` | Ren beregningslogik uden React: budget, rådighed, fordeling, lån, overførsler, scenarier, import |
| `lib/store.ts` | Lager i browseren |
| `docs/design/` | Designhandoff (facit) |
