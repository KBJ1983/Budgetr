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
  await page.locator("#top").getByRole("link", { name: /Prøv gratis i 30 dage/ }).click();
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
  // Log ud goes back to the landing page
  await page.waitForURL((u) => u.pathname === "/");
  await page.goto(`${BASE}/login`);
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
  for (const path of ["/", "/login", "/opret", "/login/bekraeft?t=x", "/app", "/admin"]) {
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
      version: 1, persons: [{ id: "p1", name: "Person 1" }], accounts: [{ id: "budget", name: "Budgetkonto", type: "faelles", owner: "", startSaldo: 0, todo: "Opret kontoen i banken" }],
      entries: [
        { id: "e1", type: "overfoersel", desc: "Til opsparing", freq: 1, start: 1, amount: 500, from: "budget", to: "budget", active: true, check: true, todo: "Ret beløbet på den faste overførsel", note: "" },
        { id: "e2", type: "overfoersel", desc: "Til ferie", freq: 1, start: 1, amount: 200, from: "budget", to: "budget", active: true, made: false, note: "" },
      ],
      settings: { split: "indkomst", touched: iso(d.getFullYear() - 1, d.getMonth()), remind: { every: 3 } },
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
    check((await note.getByText(/Du har også 4 opgaver/).count()) > 0, "login note mentions the open tasks");
    const over = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(over <= 0, `no horizontal scroll at 390px with the login note (${over}px)`);
    await p2.screenshot({ path: `${OUT}/login-note.png` });
    await p2.locator("#btnNoteClose").click();
    await p2.waitForTimeout(900);
    check(saved?.goals?.[0]?.hit === 25 && !!saved?.settings?.remindSeen, "closing the note saves it as seen");
    check(saved?.settings?.touched === budget.settings.touched, "a seen note does not count as a change to the budget");
    // Opgaver: the bell counts the account task, the entry task, Skal tjekkes and the transfer not yet created in
    // the bank; Klar clears one and saves.
    check((await p2.locator("#todoN").textContent()) === "4", "the bell shows 4 open tasks");
    await p2.locator("#btnTodo").click();
    const todos = p2.locator("#todoMenu");
    check((await todos.locator(".tdrow").count()) === 4 && (await todos.getByText("Opret den faste overførsel i banken").count()) === 1, "the task list shows the tasks, with the transfer not created in the bank");
    const overT = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overT <= 0, `no horizontal scroll at 390px with the task list open (${overT}px)`);
    await p2.screenshot({ path: `${OUT}/todos.png` });
    await todos.locator(".tdok").first().click();
    await p2.waitForTimeout(900);
    check(!(await todos.isHidden()) && (await todos.locator(".tdrow").count()) === 3 && (await p2.locator("#todoN").textContent()) === "3", "Klar removes the task and keeps the list open");
    check(!saved?.accounts?.[0]?.todo && saved?.entries?.[0]?.todo && saved.entries[0].todoSince, "the cleared task is saved, the open one has a start day");
    check(saved?.entries?.[1]?.made === false && !!saved.entries[1].madeSince, "a transfer not created in the bank gets a start day");
    await todos.locator(".tdrow", { hasText: "Til ferie" }).locator(".tdok").click();
    await p2.waitForTimeout(900);
    check(saved?.entries?.[1]?.made === undefined && (await p2.locator("#todoN").textContent()) === "2", "Klar marks the transfer as created in the bank");
    await ctx.close();
  }
  // A task open for 20 days gives a login note of its own (update reminder off), on a fictional TEST4 budget.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p4 = await ctx.newPage();
    p4.on("pageerror", (e) => errors.push(e.message));
    const d = new Date(), ymd = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    const old = ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 20));
    const budget = {
      version: 1, persons: [{ id: "p1", name: "Person 1" }], accounts: [{ id: "budget", name: "Budgetkonto", type: "faelles", owner: "", startSaldo: 0, todo: "Opret kontoen i banken", todoSince: old }],
      entries: [], goals: [], settings: { split: "indkomst", touched: old },
    };
    let saved = null;
    await p4.route("**/api/budget/**", (r) => {
      if (r.request().method() === "GET") return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(budget) });
      saved = JSON.parse(r.request().postData() || "null");
      return r.fulfill({ status: 204 });
    });
    await p4.route("**/private/**", (r) => r.fulfill({ status: 404, body: "" }));
    await p4.addInitScript(() => localStorage.setItem("budgetr:session", "test4"));
    await p4.goto(`${BASE}/app`);
    const note = p4.locator("#dlgNote");
    await note.waitFor();
    check((await note.getByText("En opgave venter stadig").count()) > 0 && (await note.getByText(/mere end 14 dage/).count()) > 0, "a task open for 20 days shows a login note");
    await p4.screenshot({ path: `${OUT}/todo-note.png` });
    await p4.locator("#btnNoteGo").click();
    await p4.waitForTimeout(900);
    check(!(await p4.locator("#todoMenu").isHidden()), "the note's button opens the task list");
    check(saved?.settings?.todoSeen && saved.settings.touched === old, "the task note is saved as seen without counting as a change");
    await ctx.close();
  }
  // The "Kom i gang" film opens once by itself on a first visit without a budget, then only from the profile menu.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p5 = await ctx.newPage();
    p5.on("pageerror", (e) => errors.push(e.message));
    await p5.route("**/api/budget/**", (r) => (r.request().method() === "GET" ? r.fulfill({ status: 404, body: "" }) : r.fulfill({ status: 204 })));
    await p5.route("**/private/**", (r) => r.fulfill({ status: 404, body: "" }));
    await p5.addInitScript(() => { localStorage.setItem("budgetr:session", "test3"); localStorage.removeItem("budgetr-app:test3"); });
    await p5.goto(`${BASE}/app`);
    await p5.evaluate(() => localStorage.removeItem("hb-film"));
    await p5.reload();
    await p5.locator("#dlgFilm[open]").waitFor({ timeout: 5000 });
    check((await p5.locator("#filmVid").getAttribute("src"))?.endsWith("budgetpro-kom-i-gang-reel.mp4"), "the film opens on a first visit, as the reel on a phone");
    await p5.locator("#filmClose").click();
    await p5.reload();
    await p5.waitForTimeout(1200);
    check(!(await p5.locator("#dlgFilm").evaluate((d) => d.open)), "the film does not open again");
    await p5.locator("#btnUserMenu").click();
    await p5.locator('[data-um="film"]').click();
    check(await p5.locator("#dlgFilm").evaluate((d) => d.open), "the profile menu opens the film");
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
    check(!(await wiz.locator("#wzSkip").isVisible()), "guide: the start step can't be skipped");
    check((await wiz.locator("[name=wzStart]").count()) === 3, "guide: starts with empty / statements / existing budgets");
    await wiz.locator('[name=wzStart][value="budget"]').check();
    await next(); // Start
    await wiz.locator("#wzName").fill("Testbudget");
    await next(); // Navn
    await wiz.locator("[data-wp='0'] [data-f=name]").fill("Person 1");
    await wiz.locator("[data-wp='0'] [data-f=sal]").fill("30000");
    await next(); // Personer
    check(await wiz.locator("#wzSkip").isVisible(), "guide: the accounts step can be skipped");
    await next(); await next(); await next(); await next(); // Konti, Overskrifter, Fordeling, Opsparingsmål
    check(await wiz.locator("#wzSkip").isVisible(), "guide: the bank step can be skipped");
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
    check((await wiz.getByText("Start: ud fra eksisterende budgetter, der lægges ind, når budgettet er oprettet").count()) > 0, "guide: summary shows the start choice");
    await p3.screenshot({ path: `${OUT}/guide-summary.png` });
    await next(); // Opret budget
    await p3.waitForTimeout(900);
    const st = saved?.settings;
    check(st?.remind?.every === 3 && st.remind.mail === true && !("email" in st.remind), "guide: reminder settings are saved, without contact details");
    check(st?.bank?.children === 2, "guide: bank choices are saved");
    check(await p3.locator("#dlgDImp").evaluate((d) => d.open) && (await p3.locator("#dimpTitle").textContent()) === "Filer til budgettet",
      "guide: starting from budgets opens the file import on the new budget");
    check((await p3.locator("#dimpBody").getByText(/Læg de budgetter ind, du vil bygge videre på/).count()) > 0, "guide: the import speaks of budgets when started from budgets");
    await ctx.close();
  }
  // budgetpro Skole: a teacher signs up and logs in with the code, makes a class, a pupil goes through the 8 steps,
  // the overview shows it, and deleting the class ends the codes. Writes a fictional teacher (a new e-mail each run,
  // so the resend gap never blocks a rerun) and one class under data/skole/; the class is deleted again.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    const open = async () => {
      const pg = await ctx.newPage();
      pg.on("pageerror", (e) => errors.push(e.message));
      pg.on("dialog", (d) => d.accept());
      return pg;
    };
    const enterCode = async (pg, code) => {
      await pg.goto(`${BASE}/skole/elev`);
      await pg.getByLabel("Din elevkode").fill(code);
      await pg.getByRole("button", { name: "Start" }).click();
    };

    const t = await open();
    await t.goto(`${BASE}/skole/laerer`);
    await t.getByRole("heading", { name: "Log ind som lærer" }).waitFor();
    await t.getByRole("group", { name: "Log ind eller opret bruger" }).getByRole("button", { name: "Opret bruger" }).click();
    const submit = t.locator("form").getByRole("button", { name: "Opret bruger", exact: true }).last();
    await submit.click();
    await t.getByText("Skriv dit navn.").waitFor();
    check(true, "signing up asks for name, school and e-mail");
    await t.getByLabel("Dit navn").fill("Lærer Eksempel");
    await t.getByLabel("Din skole").fill("Eksempel Skole");
    await t.getByLabel("Din e-mail").fill(`laerer-${Date.now()}@eksempel.dk`);
    await submit.click();
    // No mail provider in development: the page shows the code instead.
    const mailCode = await t.locator("[data-dev-code]").textContent();
    await t.getByLabel("Kode fra mailen").fill(mailCode);
    await t.getByRole("button", { name: "Log ind", exact: true }).click();
    await t.getByRole("heading", { name: "Mine klasser" }).waitFor();
    check((await t.getByText("Du har ingen klasser endnu.", { exact: false }).count()) === 1, "a new teacher logs in with the mailed code and has no classes yet");

    // Click until the counter says 3: the first clicks after the page load can come before React is ready.
    const count = t.locator('[aria-live="polite"]').first();
    for (let i = 0; i < 60 && (await count.textContent()) !== "3"; i++) await t.getByRole("button", { name: "Færre elever" }).click();
    await t.getByRole("button", { name: "30 dage" }).click();
    check((await t.getByRole("button", { name: "30 dage" }).getAttribute("aria-pressed")) === "true", "the teacher picks how long the codes live");
    await t.getByRole("button", { name: "Lav elevkoder" }).click();
    await t.waitForURL(/\/klasse\/[0-9a-f]{10}$/);
    const link = t.url();
    const codes = await t.locator("[data-code]").allTextContents();
    check(codes.length === 3, `the new class opens with its 3 codes (${codes.join(", ")})`);
    check((await t.getByText(/Elevkoderne udløber den/).count()) === 1, "the codes' expiry date is shown");

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
    check((await p.getByText(/Din kode udløber den/).count()) === 1 && (await p.getByText(/Din lærer kan se dine svar/).count()) === 1, "the pupil sees the expiry date and that the teacher reads the answers");
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
    check((await t.getByText(/Elevkoderne udløber den .* \(om 30 dage\)/).count()) === 1, "the overview shows when the codes expire");
    await row.getByRole("button", { name: codes[0] }).click();
    const detail = t.getByRole("region", { name: `Elev ${codes[0]}` });
    await detail.getByText("En tredjedel").waitFor();
    check((await detail.getByText("Delelejlighed, 4.800 kr.").count()) === 1, "the teacher sees the pupil's choices and answers");
    await t.screenshot({ path: `${OUT}/skole-klasse.png`, fullPage: true });

    // The same code on a new page goes on at the summary; the answer stayed in this browser.
    const p2 = await open();
    await p2.setViewportSize({ width: 390, height: 844 });
    await enterCode(p2, codes[0]);
    await p2.getByRole("heading", { name: "Saras budget" }).waitFor();
    check((await p2.getByLabel(/Hvor stor en del af lønnen gik til skat/).inputValue()) === "En tredjedel", "a pupil can go on later, with their answers");
    for (const where of ["summary", "/skole", "/skole/elev", "/skole/laerer", new URL(link).pathname, "/skole/klasse/demo"]) {
      if (where !== "summary") await p2.goto(`${BASE}${where}`);
      await p2.waitForTimeout(600);
      const over = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(over <= 0, `no horizontal scroll at 390px on the school's ${where} (${over}px)`);
    }

    // The demo class (for teachers without a seat) shows made-up pupils and their answers, read-only.
    await t.goto(`${BASE}/skole/klasse/demo`);
    await t.getByRole("button", { name: "BLÅ-ODDER-23" }).click();
    await t.getByText("Næsten en tredjedel", { exact: false }).waitFor();
    check((await t.getByRole("button", { name: "Slet klassen" }).count()) === 0, "the demo class shows made-up pupils' answers and can't be deleted");

    // The teacher's front page lists the class with its codes.
    await t.goto(`${BASE}/skole/laerer`);
    const card = t.getByRole("region", { name: "8. klasse" });
    check((await card.getByText(/3 elevkoder · 1 i gang · 1 færdige/).count()) === 1, "the front page lists the class with how far the pupils are");
    await card.getByRole("button", { name: "Vis elevkoder" }).click();
    check((await card.locator("[data-code]").count()) === 3, "the front page shows the class's codes");
    await t.screenshot({ path: `${OUT}/skole-laerer.png`, fullPage: true });

    // Someone who isn't logged in can't open the class.
    const other = await browser.newContext();
    const o = await other.newPage();
    await o.goto(link);
    await o.getByText("Log ind for at se klassen").waitFor();
    check(true, "a class can only be opened by its teacher");
    await other.close();

    await t.goto(link);
    await t.getByRole("button", { name: "Slet klassen" }).click();
    await t.getByText("Klassen er slettet").waitFor();
    await enterCode(p, codes[0]);
    await p.getByText(/Den kode kender vi ikke/).waitFor();
    check(true, "deleting the class ends its codes");
    await t.goto(`${BASE}/skole/laerer`);
    await t.getByRole("button", { name: "Log ud" }).click();
    await t.getByRole("heading", { name: "Log ind som lærer" }).waitFor();
    check(true, "the teacher can log out");

    const sub = BASE.replace("//localhost", "//skole.localhost");
    if (sub !== BASE) {
      const home = await p.goto(`${sub}/`);
      await p.getByRole("heading", { name: "Hvad koster det at være voksen?" }).waitFor();
      check(home?.status() === 200, "skole.localhost shows the school's front page");
      await p.goto(`${sub}/elev`);
      await p.getByLabel("Din elevkode").waitFor();
      check(true, "skole.localhost/elev is where pupils type their code");
      await p.goto(`${sub}/laerer`);
      await p.getByRole("heading", { name: "Log ind som lærer" }).waitFor();
      check(true, "skole.localhost/laerer is the teacher login");
      const app = await p.goto(`${sub}/app`);
      check(app?.status() === 404, "the budget app is not reachable on the school subdomain");
    }
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
