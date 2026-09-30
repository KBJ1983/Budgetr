// Screenshots of the real app for the landing page, made from the fictional example budget in
// scripts/demo-budget.mjs. Needs the dev server (`pnpm dev`), then `pnpm shots`.
// The budget is served to the page by a Playwright route, so nothing is read from or saved to data/.
// Output: public/landing/<name>-<light|dark>.jpg
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { demoBudget } from "./demo-budget.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3200";
const OUT = "public/landing";
mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { name: "overblik", viewport: [1180, 737] },
  { name: "poster", viewport: [1180, 737], tab: "poster" },
  { name: "laan", viewport: [1180, 737], tab: "laan" },
  { name: "maal", viewport: [1180, 737], tab: "maal" },
  { name: "bank", viewport: [880, 900], el: "section.bank" },
  { name: "hvem", viewport: [940, 1000], el: "section:has(.people)" },
  { name: "mobil", viewport: [390, 780], mobile: true },
  // The login note (a goal milestone + the update reminder) and the reminder settings.
  { name: "besked", viewport: [760, 760], el: "#dlgNote", notes: true },
  { name: "paamind", viewport: [1100, 700], el: "#dlgSet", settings: "paamind" },
];

// Last change to the budget four months ago, so the 3-month update reminder is due; reminders also go by mail.
// The house goal started a year ago, so the estimate has passed its 50 % milestone.
const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const withReminders = {
  ...demoBudget,
  goals: demoBudget.goals.map((g) => (g.id === "gh" ? { ...g, start: monthsAgo(12) } : g)),
  settings: { ...demoBudget.settings, milestones: true, touched: monthsAgo(4), remind: { every: 3, mail: true, sms: false } },
};

const browser = await chromium.launch({ channel: "chrome" });
for (const theme of ["light", "dark"]) {
  for (const s of SHOTS) {
    const ctx = await browser.newContext({
      viewport: { width: s.viewport[0], height: s.viewport[1] },
      deviceScaleFactor: 2,
      colorScheme: theme,
      isMobile: !!s.mobile,
      hasTouch: !!s.mobile,
    });
    const page = await ctx.newPage();
    await page.route("**/api/budget/**", (r) =>
      r.request().method() === "GET"
        ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(s.notes || s.settings ? withReminders : demoBudget) })
        : r.fulfill({ status: 200, body: "{}" }),
    );
    await page.route("**/private/**", (r) => r.fulfill({ status: 404, body: "" }));
    // Fictional, already masked contact details for Indstillinger > Påmindelser.
    await page.route("**/api/profile/**", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ email: "a…@eksempel.dk", phone: null }) }),
    );
    await page.addInitScript(
      ([t, notes]) => {
        localStorage.setItem("budgetr:session", "test5");
        localStorage.setItem("hb-theme", t);
        if (!notes) sessionStorage.setItem("budgetr:quiet", "1"); // no login note over the screenshot
      },
      [theme, !!s.notes],
    );
    await page.goto(`${BASE}/app`);
    await page.getByRole("heading", { name: "Hvem betaler hvad" }).waitFor();
    await page.evaluate(() => {
      const u = document.getElementById("bxUser");
      if (u) u.textContent = "AJ";
      const st = document.createElement("style");
      st.textContent = "nextjs-portal{display:none!important} *{caret-color:transparent!important}";
      document.head.append(st);
    });
    if (s.tab) await page.locator(`.tabs [data-page="${s.tab}"]`).click();
    if (s.notes) await page.locator("#dlgNote").waitFor();
    if (s.settings) {
      // The app opens a settings page from any [data-set] element (its functions are not on window).
      await page.evaluate((sec) => {
        const b = document.createElement("button");
        b.dataset.set = sec;
        document.body.append(b);
        b.click();
        b.remove();
      }, s.settings);
      await page.locator(`#set-${s.settings}`).waitFor();
    }
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.waitForTimeout(500);
    const path = `${OUT}/${s.name}-${theme}.jpg`;
    if (s.el) {
      await page.locator(s.el).first().screenshot({ path, type: "jpeg", quality: 84 });
    } else {
      await page.screenshot({ path, type: "jpeg", quality: 84 });
    }
    console.log("ok", path);
    await ctx.close();
  }
}
await browser.close();
