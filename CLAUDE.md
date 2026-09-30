# CLAUDE.md – budgetr

@AGENTS.md

Language: code and comments in English; UI text in Danish (du-form, calm, no exclamation marks, no sales words – see docs/design/HANDOFF.md §2).

## Architecture

- `/` landing page (Next.js, `components/landing/`), `/login` test-user login (Next.js), `/app` = the ORIGINAL budgetr app from the prototype, a single vanilla-JS file at `public/budgetr-app/index.html` (rewritten in `next.config.ts`). The user chose to keep that app 1:1 instead of a React rebuild; change features by editing that file directly, and keep its behaviour and look.
- Vendor libs for the app live in `public/budgetr-app/vendor/` (jsPDF, AutoTable, xlsx-js-style = SheetJS 0.18.5 with cell styles). Don't edit them.
- Test-user layer: `lib/users.ts` (KBJ, TEST1–TEST5, no password). `/login` writes the user id to `localStorage["budgetr:session"]`; the prelude script at the top of the app's `<head>` reads it, redirects to `/login` without it, and stores the budget under `budgetr-app:<userId>`. To add a user, append to `USERS`.
- Real accounts (next to the test users): `/opret` takes first name, last name, e-mail and a Danish mobile number and mails a confirm link; later logins also use a mailed link (no passwords). `lib/signup.ts` (form rules, shared with the browser), `lib/accounts.ts` (`data/accounts/<id>.json`, ids `u-…`, one-time links stored as a hash), `lib/session.ts` (signed httpOnly cookie `budgetr_session`; `/api/budget` and `/api/profile` serve an account only to its own session, test users need none), `lib/auth-mail.ts`, routes `app/api/auth/*`, link page `/login/bekraeft` (the link is only used on a button press, so mail scanners can't spend it). Confirming writes `data/profiles/<id>.json` for reminders. The app also keeps the name in `localStorage["budgetr:session-name"]`.
- Env (`.env.local`): `RESEND_API_KEY` + `MAIL_FROM` (or `REMINDER_MAIL_FROM`) to send mail – without them dev shows the link on the page and in the server log; `AUTH_SECRET` (≥32 chars, else a random key in `data/auth-secret`); `APP_URL` for links (default: the request origin).

## Private data (the repo is public)

- Real budget data never goes into git: KBJ's budget is `public/private/kbj.legacy.json` (git-ignored), loaded by the app on a user's first visit when no saved data exists. `pnpm extract:app <Budget2027.html> kbj` regenerates the app and that file from the prototype – it overwrites `public/budgetr-app/index.html`, so only use it to start over.
- Saved budgets live on disk in `data/<userId>.json` with backups in `data/backups/<userId>/` (git-ignored, `lib/budget-file.ts`, route `app/api/budget/[user]`). The app also keeps a localStorage copy; the disk copy wins unless the last save never reached it. Never delete `data/`.
- Never put real names, amounts, account numbers or e-mails in committed files, tests, docs or screenshots. Scan `public/budgetr-app/` before committing.

## Rules

- Landing design source of truth: `docs/design/forside-v2.html` ("Forside v2", Sept 2026; its product mock-ups are replaced by real screenshots) + the copy rules in `docs/design/HANDOFF.md`; the landing palette is the `.page` block in `components/landing/landing.module.css`.
- The landing shows real screenshots of the app in both themes (`public/landing/`). After visible app changes, run `pnpm shots` with the dev server up; it renders the fictional budget in `scripts/demo-budget.mjs` (never real data) and touches nothing in `data/`.
- Brand is **budgetpro** ("Skov" design, Sept 2026): wordmark "budget" (Bricolage Grotesque 200) + "pro" (Instrument Sans 600) + a green dot (logo 11a3), and the app icon = the green dot on a dark rounded square, in `components/Logo.tsx` / `public/icon.svg` / the app's `.logo`, font Geist (+ Geist Mono for KPI amounts), pine `#2C6A4D` (dark `#7ED4A8`). The app's copy of the palette is the `:root` block in `public/budgetr-app/index.html`; keep both in step. Storage keys and paths keep the old `budgetr` name – don't rename them (saved data would be lost).

- The app's "Sådan regnes det" dialog (`helpHtml()` in `public/budgetr-app/index.html`) explains the calculation rules in plain Danish. When you change how anything is calculated (shares, transfers, udligning, rådighed, opsparing), update that text in the same change.

## Checks before committing

`pnpm test`, `pnpm typecheck`, `pnpm build`; for UI changes also `pnpm dev` + `pnpm smoke` (no horizontal scroll at 390 px).

## Windows quirks

- Edit source with the Write/Edit tools. Never read/write source with PowerShell `Get-Content`/`Set-Content` (corrupts æøå).
- Dev server runs on port 3200 (3000 is taken by another project).
- Screenshots: `pnpm dlx playwright@1.63.0 screenshot --browser=chromium --channel=chrome --full-page '--viewport-size=390,844' URL out.png`.

## Git

Repo: https://github.com/KBJ1983/Budgetr – commit and push as KBJ1983 (repo-local config and credential helper are set up in `.git/config`; do not switch the global gh account).
