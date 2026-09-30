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
];

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
        ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(demoBudget) })
        : r.fulfill({ status: 200, body: "{}" }),
    );
    await page.route("**/private/**", (r) => r.fulfill({ status: 404, body: "" }));
    await page.addInitScript((t) => {
      localStorage.setItem("budgetr:session", "test5");
      localStorage.setItem("hb-theme", t);
    }, theme);
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
