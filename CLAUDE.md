# CLAUDE.md – budgetr

@AGENTS.md

Language: code and comments in English; UI text in Danish (du-form, calm, no exclamation marks, no sales words – see docs/design/HANDOFF.md §2).

## Architecture

- `/` landing page (Next.js, `components/landing/`), `/login` test-user login (Next.js), `/app` = the ORIGINAL budgetr app from the prototype, a single vanilla-JS file at `public/budgetr-app/index.html` (rewritten in `next.config.ts`). The user chose to keep that app 1:1 instead of a React rebuild; change features by editing that file directly, and keep its behaviour and look.
- Vendor libs for the app live in `public/budgetr-app/vendor/` (jsPDF, AutoTable, SheetJS). Don't edit them.
- Test-user layer: `lib/users.ts` (KBJ, TEST1–TEST5, no password). `/login` writes the user id to `localStorage["budgetr:session"]`; the prelude script at the top of the app's `<head>` reads it, redirects to `/login` without it, and stores the budget under `budgetr-app:<userId>`. To add a user, append to `USERS`. Do not add real auth or a backend without being asked.

## Private data (the repo is public)

- Real budget data never goes into git: KBJ's budget is `public/private/kbj.legacy.json` (git-ignored), loaded by the app on a user's first visit when no saved data exists. `pnpm extract:app <Budget2027.html> kbj` regenerates the app and that file from the prototype – it overwrites `public/budgetr-app/index.html`, so only use it to start over.
- Never put real names, amounts, account numbers or e-mails in committed files, tests, docs or screenshots. Scan `public/budgetr-app/` before committing.

## Rules

- Landing design source of truth: `docs/design/HANDOFF.md` + the two facit HTML files; tokens in `app/globals.css`.

## Checks before committing

`pnpm test`, `pnpm typecheck`, `pnpm build`; for UI changes also `pnpm dev` + `pnpm smoke` (no horizontal scroll at 390 px).

## Windows quirks

- Edit source with the Write/Edit tools. Never read/write source with PowerShell `Get-Content`/`Set-Content` (corrupts æøå).
- Dev server runs on port 3200 (3000 is taken by another project).
- Screenshots: `pnpm dlx playwright@1.63.0 screenshot --browser=chromium --channel=chrome --full-page '--viewport-size=390,844' URL out.png`.

## Git

Repo: https://github.com/KBJ1983/Budgetr – commit and push as KBJ1983 (repo-local config and credential helper are set up in `.git/config`; do not switch the global gh account).
