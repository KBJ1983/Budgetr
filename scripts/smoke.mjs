// Click-through smoke test against a running dev server: `pnpm dev`, then `pnpm smoke`.
// Uses the installed Chrome. Exits non-zero on the first failed check.
// KBJ opens the real budget when public/private/kbj.legacy.json exists; TEST users start in the app's guide.
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3200";
const OUT = process.env.SMOKE_OUT ?? "smoke-out";
mkdirSync(OUT, { recursive: true });
// TEST1 must start empty; its disk copy (lib/budget-file.ts) would otherwise come back. Never touch KBJ's.
rmSync(path.join(process.env.BUDGETR_DATA_DIR ?? "data", "test1.json"), { force: true });
const PRIVATE = "public/private/kbj.legacy.json";
const HAS_PRIVATE = existsSync(PRIVATE);
// A name from KBJ's private data, to tell their budget apart from the others (never hard-coded here).
const kbjName = HAS_PRIVATE ? JSON.parse(readFileSync(PRIVATE, "utf8")).persons?.[0]?.name : null;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
// No login notes here: closing one would mark KBJ's real milestones as seen. They are checked below on a fictional budget.
await page.addInitScript(() => sessionStorage.setItem("budgetr:quiet", "1"));
const check = (ok, msg) => {
  if (!ok) throw new Error(`FAIL: ${msg}`);
  console.log(`ok - ${msg}`);
};
const tab = (name) => page.locator(`.tabs [role=tab]`, { hasText: name }).first();
async function loginAs(login) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("E-mail eller initialer").fill(login);
  await page.getByRole("button", { name: /Skift bruger|Log ind/ }).click();
  await page.waitForURL(/\/app$/);
  await page.locator("#app").waitFor();
}

try {
  // Without a session /app sends you to the login page
  await page.goto(`${BASE}/app`);
  await page.waitForURL(/\/login/);
  check(true, "/app requires a test-user login");

  // Landing → Log ind → unknown user is rejected
  await page.goto(`${BASE}/`);
  await page.getByRole("link", { name: "Log ind" }).first().click();
  await page.waitForURL(/\/login/);
  await page.getByLabel("E-mail eller initialer").fill("TEST9");
  await page.getByRole("button", { name: "Log ind" }).click();
  await page.getByText(/Skriv den e-mail, du oprettede din konto med/).waitFor();
  check(true, "unknown login is rejected");

  // Hero: a button to the login, no e-mail field
  await page.goto(`${BASE}/`);
  check((await page.locator('#top input[type="email"]').count()) === 0, "hero has no e-mail field");
  await page.locator("#top").getByRole("link", { name: /Opret gratis bruger/ }).click();
  await page.waitForURL(/\/opret/);
  check(true, "hero button opens the signup");

  // Tryghed comes right after "Sådan virker det"
  await page.goto(`${BASE}/`);
  const order = await page.evaluate(() => [...document.querySelectorAll("main > section")].map((s) => s.id).filter(Boolean));
  check(order.indexOf("tryghed") === order.indexOf("saadan") + 1, `Tryghed follows Sådan virker det (${order.join(" → ")})`);

  // Final signup form prefills the account signup
  const signup = page.locator('form:has(input[type="email"])');
  await signup.locator('input[type="email"]').fill("ikke-en-mail");
  await signup.locator('button[type="submit"]').click();
  await page.getByText("Skriv en gyldig e-mail, fx navn@eksempel.dk.").first().waitFor();
  check(true, "signup rejects an invalid e-mail");
  await signup.locator('input[type="email"]').fill("test@eksempel.dk");
  await signup.locator('button[type="submit"]').click();
  await page.waitForURL(/\/opret\?/);
  check((await page.getByLabel("E-mail").inputValue()) === "test@eksempel.dk", "signup prefills the account form");
  check((await page.getByLabel("Fornavn").count()) === 1 && (await page.getByLabel("Mobilnummer").count()) === 1, "account form asks for name and phone");

  // KBJ: the original app with the real budget
  await loginAs("KBJ");
  check((await page.locator("#bxUser").textContent()) === "KBJ", "app shows the logged-in test user");
  if (HAS_PRIVATE) {
    await page.getByRole("heading", { name: "Hvem betaler hvad" }).first().waitFor();
    for (const t of ["Måned for måned", "Rådighedsbeløb som banken regner det", "Ekstra indtjening"]) {
      check((await page.getByText(t).count()) > 0, `KBJ budget shows “${t}”`);
    }
  }
  for (const [name, text] of [
    ["Overblik over lån", /restgæld/i],
    ["Faste overførsler", /overfør/i],
    ["Opsparingsmål", /opspar/i],
    ["Budgetposter", /Udvikling i poster|Intet budget/],
    ["Overblik", /Hvem betaler hvad|Intet budget/],
  ]) {
    await page.locator(`.tabs [role=tab]`, { hasText: new RegExp(`^${name}$`) }).first().click();
    await page.waitForTimeout(400);
    check((await page.locator("#app").getByText(text).count()) > 0, `tab “${name}” renders`);
  }
  await page.screenshot({ path: `${OUT}/kbj.png` });

  // Switch to TEST1: empty budget → the app's own guide / empty budget
  await page.locator("#btnUserMenu").click();
  await page.locator("#btnUser").click();
  await page.waitForURL(/\/login/);
  await page.getByLabel("E-mail eller initialer").fill("TEST1");
  await page.getByRole("button", { name: "Log ind" }).click();
  await page.waitForURL(/\/app$/);
  await page.getByText("Intet budget endnu").waitFor();
  if (kbjName) check((await page.getByText(kbjName).count()) === 0, "TEST1 starts without KBJ's data");
  await page.locator("#btnStart").click(); // Opret tomt budget
  await page.waitForTimeout(800);
  check((await page.getByText("Intet budget endnu").count()) === 0, "TEST1 can create an empty budget");

  // Reload: TEST1 keeps their budget, KBJ is untouched
  await page.reload();
  await page.waitForTimeout(800);
  check((await page.getByText("Intet budget endnu").count()) === 0, "TEST1's budget is saved");
  await loginAs("KBJ");
  if (HAS_PRIVATE) {
    await page.getByRole("heading", { name: "Hvem betaler hvad" }).first().waitFor();
    check((await page.getByText(kbjName).count()) > 0, "KBJ still has the real budget");
  }
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("budgetr-app:")).sort());
  check(keys.includes("budgetr-app:test1"), `per-user storage keys (${keys.join(", ")})`);

  // No horizontal scroll on mobile
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/login", "/opret", "/login/bekraeft?t=x", "/app"]) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(800);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(over <= 0, `no horizontal scroll at 390px on ${path} (${over}px)`);
  }
  // Login notes on a fictional TEST2 budget served by a route (nothing in data/ is read or written):
  // a goal that should be at 30 % shows the 25 % milestone, and closing the note saves it as seen.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p2 = await ctx.newPage();
    p2.on("pageerror", (e) => errors.push(e.message));
    const d = new Date(), iso = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const start = new Date(d.getFullYear(), d.getMonth() - 3, 1), end = new Date(d.getFullYear(), d.getMonth() + 7, 1);
    const budget = {
      version: 1, persons: [{ id: "p1", name: "Person 1" }], accounts: [{ id: "budget", name: "Budgetkonto", type: "faelles", owner: "", startSaldo: 0 }],
      entries: [], settings: { split: "indkomst", touched: iso(d.getFullYear() - 1, d.getMonth()), remind: { every: 3 } },
      goals: [{ id: "g1", name: "Testmål", mode: "target", target: 10000, saved: 0, start: iso(start.getFullYear(), start.getMonth()), end: iso(end.getFullYear(), end.getMonth()), from: "budget", to: "", payer: "faelles", active: true, scopes: ["base"], extras: [] }],
    };
    let saved = null;
    await p2.route("**/api/budget/**", (r) => {
      if (r.request().method() === "GET") return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(budget) });
      saved = JSON.parse(r.request().postData() || "null");
      return r.fulfill({ status: 204 });
    });
    await p2.route("**/private/**", (r) => r.fulfill({ status: 404, body: "" }));
    await p2.addInitScript(() => localStorage.setItem("budgetr:session", "test2"));
    await p2.goto(`${BASE}/app`);
    const note = p2.locator("#dlgNote");
    await note.waitFor();
    check((await note.getByText("Tillykke").count()) > 0 && (await note.getByText("25 % af dit opsparingsmål").count()) > 0, "login note congratulates on the 25 % milestone");
    check((await note.getByText(/siden, du sidst rettede i budgettet/).count()) > 0, "login note reminds to update the budget");
    const over = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(over <= 0, `no horizontal scroll at 390px with the login note (${over}px)`);
    await p2.screenshot({ path: `${OUT}/login-note.png` });
    await p2.locator("#btnNoteClose").click();
    await p2.waitForTimeout(900);
    check(saved?.goals?.[0]?.hit === 25 && !!saved?.settings?.remindSeen, "closing the note saves it as seen");
    check(saved?.settings?.touched === budget.settings.touched, "a seen note does not count as a change to the budget");
    await ctx.close();
  }
  // The new-budget guide on a phone, with the optional bank and reminder steps (served by a route, nothing in data/).
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p3 = await ctx.newPage();
    p3.on("pageerror", (e) => errors.push(e.message));
    let saved = null;
    await p3.route("**/api/budget/**", (r) => {
      if (r.request().method() === "GET") return r.fulfill({ status: 404, body: "" });
      saved = JSON.parse(r.request().postData() || "null");
      return r.fulfill({ status: 204 });
    });
    await p3.route("**/private/**", (r) => r.fulfill({ status: 404, body: "" }));
    await p3.addInitScript(() => { sessionStorage.setItem("budgetr:quiet", "1"); localStorage.setItem("budgetr:session", "test3"); localStorage.removeItem("budgetr-app:test3"); });
    await p3.goto(`${BASE}/app`);
    await p3.locator("#btnWizStart").click();
    const wiz = p3.locator("#dlgWiz"), next = () => wiz.locator("#wzNext").click();
    await next(); // Navn
    await wiz.locator("[data-wp='0'] [data-f=name]").fill("Person 1");
    await wiz.locator("[data-wp='0'] [data-f=sal]").fill("30000");
    await next(); await next(); // Personer, Konti
    await wiz.locator("[data-we='0'] [data-f=amt]").fill("9000");
    await wiz.locator("[data-we='1'] [data-f=amt]").fill("500");
    await wiz.locator("[data-we='12'] [data-f=amt]").fill("4000");
    await next(); await next(); await next(); // Faste udgifter, Fordeling, Opsparingsmål
    check(await wiz.locator("#wzSkip").isVisible(), "guide: the bank step can be skipped");
    const boxes = wiz.locator("[data-wb]");
    check((await boxes.count()) === 3 && !(await boxes.nth(2).isChecked()), "guide: bank step lists the expenses, household unticked");
    await boxes.nth(1).uncheck();
    await wiz.locator("#wzBkC").fill("2");
    let over = await p3.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(over <= 0, `no horizontal scroll at 390px on the guide's bank step (${over}px)`);
    await p3.screenshot({ path: `${OUT}/guide-bank.png` });
    await next();
    await wiz.locator("#wzEvery").selectOption("3");
    // Mail and SMS go to the profile's contact details, so the guide only asks for the channel.
    check((await wiz.locator('input[type="email"], input[inputmode="email"], input[inputmode="tel"]').count()) === 0, "guide: no e-mail or phone field (they come from the profile)");
    await wiz.locator("#wzRmMail").check();
    check((await wiz.getByText(/du opgav, da du oprettede din profil/).count()) > 0, "guide: says reminders go to the profile's e-mail and number");
    await p3.screenshot({ path: `${OUT}/guide-remind.png` });
    await next();
    check((await wiz.getByText("Påmindelse hver 3. måned · også på mail").count()) > 0, "guide: summary shows the reminder");
    await p3.screenshot({ path: `${OUT}/guide-summary.png` });
    await next(); // Opret budget
    await p3.waitForTimeout(900);
    const st = saved?.settings, ex = saved?.entries?.filter((e) => e.type === "udgift") ?? [];
    check(st?.remind?.every === 3 && st.remind.mail === true && !("email" in st.remind), "guide: reminder settings are saved, without contact details");
    check(st?.bank?.children === 2 && ex.length === 3 && ex.filter((e) => e.bank).length === 1, "guide: bank choices are saved");
    await ctx.close();
  }
  check(errors.length === 0, `no page errors ${errors.join(" | ")}`);
} catch (e) {
  await page.screenshot({ path: `${OUT}/failure.png`, fullPage: true }).catch(() => {});
  console.error(e.message);
  if (errors.length) console.error("page errors:", errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
