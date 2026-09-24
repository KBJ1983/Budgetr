# CLAUDE.md – budgetr

@AGENTS.md

Language: code and comments in English; UI text in Danish (du-form, calm, no exclamation marks, no sales words – see docs/design/HANDOFF.md §2).

## Rules

- Design source of truth: `docs/design/HANDOFF.md` + the two facit HTML files. Colours only from the tokens in `app/globals.css` (site) and `app/app/app.css` (app, light + dark). One font: Schibsted Grotesk; numbers `tabular-nums`. Line icons, never emoji.
- No login yet. Everything is stored in the browser via `lib/store.ts`. Do not add a backend or auth without being asked; when it comes, replace the store behind the same hooks.
- Domain logic in `lib/domain/` is pure (no React, no `Date.now()` inside calculations – pass `now` as "YYYY-MM"). Add/adjust tests in `lib/domain/domain.test.ts` for every calculation change.
- Money: DKK, amounts per payment + `interval` (1/3/6/12 months); monthly = amount / interval. Format with `kr()` from `lib/domain/format.ts` (real minus sign).
- Example data (Anna og Jonas) is invented and lives in `lib/domain/example.ts`.

## Checks before committing

`pnpm test`, `pnpm typecheck`, `pnpm build`; for UI changes also `pnpm dev` + `pnpm smoke` (no horizontal scroll at 390 px).

## Windows quirks

- Edit source with the Write/Edit tools. Never read/write source with PowerShell `Get-Content`/`Set-Content` (corrupts æøå).
- Dev server runs on port 3200 (3000 is taken by another project).
- Screenshots: `pnpm dlx playwright@1.63.0 screenshot --browser=chromium --channel=chrome --full-page '--viewport-size=390,844' URL out.png`.

## Git

Repo: https://github.com/KBJ1983/Budgetr – commit and push as KBJ1983 (repo-local config and credential helper are set up in `.git/config`; do not switch the global gh account).
