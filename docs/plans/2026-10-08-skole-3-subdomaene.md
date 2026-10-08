# budgetpro Skole 3/3 – Subdomain, smoke test and docs Implementation Plan

> **For agentic workers:** Use the executing-plans skill to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** budgetpro Skole also runs on its own subdomain (`skole.<domain>`; `skole.localhost:3200` in development) with short addresses (`/`, `/laerer`, `/klasse/<token>`), while the rest of the site (the budget app, login, other APIs) can't be reached there. The click-through smoke test covers the whole school flow, and CLAUDE.md describes it.

**Architecture:** A pure helper `lib/skole-host.ts` decides per request path what happens on a `skole.` host: pass through, block (404) or rewrite to `/skole/…`. `proxy.ts` (Next 16's name for middleware; it already holds the pre-launch password gate) calls it after the gate. The same helper gives the browser the right addresses for the teacher link, the printed pupil address and the "Prøv budgetpro" link. No DNS or code changes are needed for the main domain; production only needs the subdomain added to the same Vercel project.

**Tech Stack:** Next.js 16 `proxy.ts` (`NextResponse.rewrite`), Vitest, Playwright (`scripts/smoke.mjs`, installed Chrome).

**Depends on:** plans 1 and 2 (`2026-10-08-skole-1-elevforloeb.md`, `2026-10-08-skole-2-klasser.md`) are done.

---

## Ground rules (read first)

- Edit files with the Write/Edit tools only (never PowerShell `Get-Content`/`Set-Content`).
- Next.js 16 docs are in `node_modules/next/dist/docs/` – see `01-app/03-api-reference/03-file-conventions/proxy.md`. The dev server already allows `localhost` subdomains (`allowedDevOrigins` is not needed for `skole.localhost`).
- Commit as KBJ1983; end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File structure

| File | Responsibility |
|---|---|
| `lib/skole-host.ts` (new) | Is this the school host; what to do with a path there; addresses as the visitor sees them |
| `lib/skole-host.test.ts` (new) | Tests for the above |
| `proxy.ts` (modify) | Gate first, then the school-host routing |
| `components/skole/StudentApp.tsx` (modify) | "Prøv budgetpro" goes to the main site |
| `components/skole/TeacherCreate.tsx` (modify) | Teacher link and printed address without `/skole` on the subdomain |
| `scripts/smoke.mjs` (modify) | Teacher → pupil → overview → delete → subdomain |
| `CLAUDE.md` (modify) | Architecture note |

---

### Task 1: `lib/skole-host.ts`

**Files:**
- Create: `lib/skole-host.ts`
- Test: `lib/skole-host.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { isSkoleHost, mainSiteUrl, pupilAddress, skoleBase, skoleRoute } from "./skole-host";

describe("school subdomain", () => {
  it("knows the school host", () => {
    expect(isSkoleHost("skole.budgetpro.dk")).toBe(true);
    expect(isSkoleHost("Skole.localhost:3200")).toBe(true);
    expect(isSkoleHost("budgetpro.dk")).toBe(false);
    expect(isSkoleHost("skolen.dk")).toBe(false);
    expect(isSkoleHost("")).toBe(false);
  });

  it("serves the school pages from the root", () => {
    expect(skoleRoute("/")).toEqual({ kind: "rewrite", path: "/skole" });
    expect(skoleRoute("/laerer")).toEqual({ kind: "rewrite", path: "/skole/laerer" });
    expect(skoleRoute("/klasse/0123456789.abcdefghijklmnopqrstuvwx")).toEqual({ kind: "rewrite", path: "/skole/klasse/0123456789.abcdefghijklmnopqrstuvwx" });
    // Not a school page: rewritten too, so it ends as the school's 404 instead of the main site's page.
    expect(skoleRoute("/app")).toEqual({ kind: "rewrite", path: "/skole/app" });
    expect(skoleRoute("/login")).toEqual({ kind: "rewrite", path: "/skole/login" });
  });

  it("lets the school's own paths and the site's files through", () => {
    for (const p of ["/skole", "/skole/laerer", "/_next/static/chunks/x.js", "/api/skole/elev", "/api/skole/klasse/abc", "/icon.svg", "/robots.txt", "/budgetr-app/vendor/jspdf.umd.min.js"]) {
      expect(skoleRoute(p)).toEqual({ kind: "pass" });
    }
  });

  it("blocks the rest of the site", () => {
    for (const p of ["/api/budget/kbj", "/api/auth/login", "/api/skole", "/private/kbj.legacy.json", "/budgetr-app/index.html"]) {
      expect(skoleRoute(p)).toEqual({ kind: "block" });
    }
  });

  it("gives the addresses as the visitor sees them", () => {
    expect(skoleBase("skole.budgetpro.dk")).toBe("");
    expect(skoleBase("localhost:3200")).toBe("/skole");
    expect(pupilAddress("skole.budgetpro.dk")).toBe("skole.budgetpro.dk");
    expect(pupilAddress("localhost:3200")).toBe("localhost:3200/skole");
    expect(mainSiteUrl({ protocol: "https:", host: "skole.budgetpro.dk" })).toBe("https://budgetpro.dk/");
    expect(mainSiteUrl({ protocol: "http:", host: "skole.localhost:3200" })).toBe("http://localhost:3200/");
    expect(mainSiteUrl({ protocol: "http:", host: "localhost:3200" })).toBe("/");
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm test lib/skole-host.test.ts`
Expected: FAIL – `Failed to resolve import "./skole-host"`.

- [ ] **Step 3: Write `lib/skole-host.ts`**

```ts
/**
 * budgetpro Skole on its own subdomain. On a host starting with "skole." (skole.<domain> in production,
 * skole.localhost:3200 in development) page paths are served from /skole: "/" is the pupils' start page, "/laerer"
 * the teacher page, "/klasse/<token>" the overview. The rest of the site (the app, login, other APIs) is not
 * reachable there. Pure functions: proxy.ts and the browser both use them.
 */

export const isSkoleHost = (host: string) => host.toLowerCase().startsWith("skole.");

export type SkoleRoute = { kind: "pass" } | { kind: "block" } | { kind: "rewrite"; path: string };

// Files from public/ and Next's own; a teacher token ("<hex>.<24 chars>") never ends like one of these.
const FILE = /\.(?:svg|png|jpe?g|webp|gif|ico|js|mjs|css|map|json|txt|xml|woff2?|pdf|webmanifest)$/i;

/** What to do with a request path on the school host. */
export function skoleRoute(pathname: string): SkoleRoute {
  if (pathname === "/skole" || pathname.startsWith("/skole/") || pathname.startsWith("/_next/") || pathname.startsWith("/api/skole/")) return { kind: "pass" };
  if (pathname.startsWith("/api/") || pathname.startsWith("/private/") || pathname.startsWith("/budgetr-app/index")) return { kind: "block" };
  if (FILE.test(pathname)) return { kind: "pass" };
  return { kind: "rewrite", path: pathname === "/" ? "/skole" : `/skole${pathname}` };
}

/** The school pages' path prefix as the visitor sees it: "" on the subdomain, "/skole" elsewhere. */
export const skoleBase = (host: string) => (isSkoleHost(host) ? "" : "/skole");

/** The address pupils type, for the printed codes: "skole.budgetpro.dk" or "budgetpro.dk/skole". */
export const pupilAddress = (host: string) => `${host}${skoleBase(host)}`;

/** The main site, for "Prøv budgetpro": the same domain without "skole.", or "/" when already on it. */
export function mainSiteUrl(loc: { protocol: string; host: string }): string {
  return isSkoleHost(loc.host) ? `${loc.protocol}//${loc.host.slice("skole.".length)}/` : "/";
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm test lib/skole-host.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/skole-host.ts lib/skole-host.test.ts
git commit -m "Skole: routing rules for the school subdomain" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `proxy.ts`

**Files:**
- Modify: `proxy.ts` (whole file)

- [ ] **Step 1: Replace `proxy.ts`**

The gate's behaviour is unchanged; it only moves into `siteGate`, which returns `null` when the request may go on.

```ts
import { NextResponse, type NextRequest } from "next/server";
import { isSkoleHost, skoleRoute } from "./lib/skole-host";

// 1. Pre-launch gate: while SITE_PASSWORD is set, every request (pages, the app, API, files) needs HTTP Basic Auth
//    with that password. Any user name is accepted. Unset = open (local dev).
// 2. budgetpro Skole's subdomain (lib/skole-host.ts): on skole.<domain> the pages come from /skole and the rest of
//    the site is blocked.
export function proxy(request: NextRequest) {
  const locked = siteGate(request);
  if (locked) return locked;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (isSkoleHost(host)) {
    const r = skoleRoute(request.nextUrl.pathname);
    if (r.kind === "block") {
      return new NextResponse("Siden findes ikke.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    if (r.kind === "rewrite") {
      const url = request.nextUrl.clone();
      url.pathname = r.path;
      return NextResponse.rewrite(url);
    }
  }
  return NextResponse.next();
}

function siteGate(request: NextRequest): NextResponse | null {
  const password = process.env.SITE_PASSWORD?.trim();
  if (!password) return null;

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {}
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (safeEqual(given, password)) return null;
  }

  return new NextResponse("Siden er ikke åben endnu.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="budgetpro", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
```

- [ ] **Step 2: Check by hand**

With `pnpm dev` running (Chrome resolves `*.localhost` to this machine):
1. `http://skole.localhost:3200/` → the school start page ("Hvad koster det at være voksen?").
2. `http://skole.localhost:3200/laerer` → "Opret klasse".
3. `http://skole.localhost:3200/app` → the 404 page; `http://skole.localhost:3200/api/budget/kbj` → "Siden findes ikke." (404).
4. `http://localhost:3200/` → the normal landing page; `http://localhost:3200/skole` still works.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "Skole: serve the school pages on the skole. subdomain and block the rest there" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Addresses in the UI

**Files:**
- Modify: `components/skole/StudentApp.tsx`
- Modify: `components/skole/TeacherCreate.tsx`

- [ ] **Step 1: "Prøv budgetpro" in `StudentApp.tsx`**

Add the import:

```tsx
import { mainSiteUrl } from "@/lib/skole-host";
```

Add, next to the other `useState` calls (read in an effect so the server render and the first browser render match):

```tsx
  const [mainSite, setMainSite] = useState("/");
  useEffect(() => setMainSite(mainSiteUrl(window.location)), []);
```

In the `<Summary … />` element change `mainSite="/"` to `mainSite={mainSite}`.

- [ ] **Step 2: Teacher link and printed address in `TeacherCreate.tsx`**

Add the import:

```tsx
import { pupilAddress, skoleBase } from "@/lib/skole-host";
```

Replace these three lines:

```tsx
  const overviewPath = made ? `/skole/klasse/${made.token}` : "";
  const link = made ? `${window.location.origin}${overviewPath}` : "";
  const pupilAddress = made ? `${window.location.host}/skole` : "";
```

with:

```tsx
  // On the subdomain the addresses have no /skole (lib/skole-host.ts). `made` is only set in the browser.
  const overviewPath = made ? `${skoleBase(window.location.host)}/klasse/${made.token}` : "";
  const link = made ? `${window.location.origin}${overviewPath}` : "";
  const address = made ? pupilAddress(window.location.host) : "";
```

and in the print text change `Gå ind på {pupilAddress}, og skriv din kode.` to `Gå ind på {address}, og skriv din kode.`

- [ ] **Step 3: Typecheck and check by hand**

Run: `pnpm typecheck` → no errors.
On `http://skole.localhost:3200/laerer` make a class: the teacher link is `http://skole.localhost:3200/klasse/<token>` and opens the overview; print preview says "Gå ind på skole.localhost:3200, og skriv din kode." On `http://localhost:3200/skole/laerer` the link has `/skole/klasse/…`. On the subdomain's summary, "Prøv budgetpro" points to `http://localhost:3200/`.

- [ ] **Step 4: Commit**

```bash
git add components/skole/StudentApp.tsx components/skole/TeacherCreate.tsx
git commit -m "Skole: short teacher links and pupil address on the subdomain" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Smoke test

**Files:**
- Modify: `scripts/smoke.mjs` (insert a block just before the final `check(errors.length === 0, …)` line)

- [ ] **Step 1: Add the school block**

```js
  // budgetpro Skole: a teacher makes a class, a pupil goes through the 8 steps, the overview shows it, and deleting
  // the class ends the codes. Writes one class under data/skole/ and deletes it again; nothing else in data/.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    const open = async () => {
      const pg = await ctx.newPage();
      pg.on("pageerror", (e) => errors.push(e.message));
      pg.on("dialog", (d) => d.accept());
      return pg;
    };
    const enterCode = async (pg, code) => {
      await pg.goto(`${BASE}/skole`);
      await pg.getByLabel("Din elevkode").fill(code);
      await pg.getByRole("button", { name: "Start" }).click();
    };

    const t = await open();
    await t.goto(`${BASE}/skole/laerer`);
    for (let i = 0; i < 21; i++) await t.getByRole("button", { name: "Færre elever" }).click();
    await t.getByRole("button", { name: "Lav elevkoder" }).click();
    const link = await t.getByLabel("Lærerlink").inputValue();
    const codes = await t.locator("[data-code]").allTextContents();
    check(codes.length === 3 && /\/klasse\/[0-9a-f]{10}\./.test(link), `teacher gets 3 codes and a link (${codes.join(", ")})`);

    const p = await open();
    await enterCode(p, "BLÅ-ORM-09");
    await p.getByText("Skriv den kode, du har fået af din lærer.").waitFor();
    check(true, "a code in the wrong format is refused");
    await enterCode(p, codes[0].toLowerCase());
    await p.getByRole("heading", { name: "Mød din fremtidsperson" }).waitFor();
    check(true, "a class code opens the flow");
    const next = () => p.getByRole("button", { name: "Næste" }).click();
    await p.getByRole("button", { name: /Sara, 20/ }).click();
    await next(); // Indtægt – "Næste" waits until the pay slip is shown
    await next(); // Bolig
    await p.getByRole("radio", { name: /Delelejlighed/ }).click();
    await next(); // Faste udgifter
    await next(); // Mad og hverdag
    await p.getByRole("radiogroup", { name: "Mad" }).getByRole("radio", { name: /Normalt/ }).click();
    await p.getByRole("radiogroup", { name: "Tøj og fritid" }).getByRole("radio", { name: /Normalt/ }).click();
    await next(); // Opsparing
    await next(); // Går det op?
    await p.getByText(/Budgettet går op\./).waitFor();
    check((await p.getByText("+2.473 kr.").count()) > 0, "step 7: Sara's budget adds up to +2.473 kr.");
    await next(); // Hvad nu hvis?
    await p.getByRole("switch", { name: /Huslejen stiger/ }).click();
    check((await p.getByText("Forskel").count()) === 1, "step 8: a scenario shows the difference");
    await p.getByRole("button", { name: "Se opsummering" }).click();
    await p.getByRole("heading", { name: "Saras budget" }).waitFor();
    await p.getByLabel(/Hvor stor en del af lønnen gik til skat/).fill("En tredjedel");
    const [pdf] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Gem som PDF" }).click()]);
    check(pdf.suggestedFilename() === `budget-${codes[0]}.pdf`, `the summary downloads a PDF (${pdf.suggestedFilename()})`);
    await p.getByRole("button", { name: "Lav dit eget budget med budgetposter" }).click();
    await p.getByText("Tilbage pr. måned").waitFor();
    check((await p.getByText("+2.473 kr.").count()) > 0, "Mit budget starts from the pupil's choices");
    await p.screenshot({ path: `${OUT}/skole-budget.png`, fullPage: true });
    await p.waitForTimeout(1500); // the last autosave

    await t.goto(link);
    const row = t.getByRole("row", { name: new RegExp(codes[0]) });
    check((await row.getByText("Færdig").count()) === 1 && (await row.getByText("Sara").count()) === 1, "the overview shows the pupil as finished with Sara");
    check((await t.getByText("1 af 3 elever i gang").count()) === 1, "the overview counts the pupils who started");
    await t.screenshot({ path: `${OUT}/skole-klasse.png`, fullPage: true });

    // The same code on a new page goes on at the summary; the answer stayed in this browser.
    const p2 = await open();
    await p2.setViewportSize({ width: 390, height: 844 });
    await enterCode(p2, codes[0]);
    await p2.getByRole("heading", { name: "Saras budget" }).waitFor();
    check((await p2.getByLabel(/Hvor stor en del af lønnen gik til skat/).inputValue()) === "En tredjedel", "a pupil can go on later, with their answers");
    for (const where of ["summary", "/skole", "/skole/laerer", new URL(link).pathname]) {
      if (where !== "summary") await p2.goto(`${BASE}${where}`);
      await p2.waitForTimeout(600);
      const over = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(over <= 0, `no horizontal scroll at 390px on the school's ${where} (${over}px)`);
    }

    await t.getByRole("button", { name: "Slet klassen" }).click();
    await t.getByText("Klassen er slettet").waitFor();
    await enterCode(p, codes[0]);
    await p.getByText(/Den kode kender vi ikke/).waitFor();
    check(true, "deleting the class ends its codes");

    const sub = BASE.replace("//localhost", "//skole.localhost");
    if (sub !== BASE) {
      const home = await p.goto(`${sub}/`);
      await p.getByRole("heading", { name: "Hvad koster det at være voksen?" }).waitFor();
      check(home?.status() === 200, "skole.localhost shows the school's start page");
      await p.goto(`${sub}/laerer`);
      await p.getByRole("heading", { name: "Opret klasse" }).waitFor();
      check(true, "skole.localhost/laerer is the teacher page");
      const app = await p.goto(`${sub}/app`);
      check(app?.status() === 404, "the budget app is not reachable on the school subdomain");
    }
    await ctx.close();
  }
```

- [ ] **Step 2: Run the smoke test**

Start `pnpm dev` in one terminal, then run `pnpm smoke`.
Expected: every line `ok - …`, including the new school lines, and the exit code is 0. Look at `smoke-out/skole-budget.png` and `smoke-out/skole-klasse.png`.

If "the overview shows the pupil as finished" fails on a slow machine, raise the `waitForTimeout(1500)` before `t.goto(link)` – the pupil's last change is saved 0.6 s after it is made.

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke.mjs
git commit -m "Smoke test: budgetpro Skole from class to overview, and the subdomain" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Docs and final checks

**Files:**
- Modify: `CLAUDE.md` (Architecture list; add after the "Owner overview `/ejer`" bullet)

- [ ] **Step 1: Add the architecture note to `CLAUDE.md`**

```markdown
- budgetpro Skole (`/skole`; on its own subdomain `skole.<domain>` through `proxy.ts` + `lib/skole-host.ts`, which serve `/skole/…` from the root there and block the rest of the site): a simple school version from the sketch `docs/design/skole-skitse.html`. Pupils make a month budget for a fictional young adult in 8 steps, then a summary (PDF) and "Mit budget" (`components/skole/`; cases, texts and all numbers in `lib/skole.ts`). Teachers make a class at `/skole/laerer` without login and get pupil codes plus a secret link to the live overview `/skole/klasse/<id>.<secret>` (only a hash of the secret is kept). `lib/skole-store.ts` keeps classes and each code's choices in the store under `skole/` – no names, the reflection answers stay in the pupil's browser – and forgets a class 90 days after it was made. When a calculation changes, update the step's "Hvorfor?" text in `steps()`.
```

- [ ] **Step 2: Run all checks**

Run: `pnpm test`, `pnpm typecheck`, `pnpm build`, and with `pnpm dev` running: `pnpm smoke`.
Expected: all green.

- [ ] **Step 3: Scan for private data**

The school uses only the fictional cases. Check that no real names, amounts or e-mails slipped into the new files:

```bash
git diff --stat main -- lib components app scripts docs CLAUDE.md
```

Read the list; all new text should be the fictional Sara/Jonas/Mira and the sketch's numbers.

- [ ] **Step 4: Commit and push**

```bash
git add CLAUDE.md docs/plans
git commit -m "Docs: budgetpro Skole in CLAUDE.md" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

- [ ] **Step 5: Production (by the owner, not in code)**

1. Vercel → the project → Settings → Domains → add `skole.<domain>` (same project, same deployment).
2. At the DNS provider: a `CNAME` record `skole` → `cname.vercel-dns.com` (Vercel shows the exact value).
3. Nothing else: the store (Upstash) and `SITE_PASSWORD` already apply to every host of the project. While `SITE_PASSWORD` is set, the school subdomain asks for the password too.
4. Open `https://skole.<domain>/` and `https://skole.<domain>/laerer` and make one test class; delete it again from the overview.
