// Screenshots of the real budgetpro Skole pupil pages for the school front page (components/skole/landing/).
// Needs the dev server (`pnpm dev`), then `pnpm shots:skole`. The pupil's saved choices are served by a Playwright
// route with a made-up code, so nothing is read from or saved to the store.
// Output: public/skole/<name>.jpg
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3200";
const OUT = "public/skole";
mkdirSync(OUT, { recursive: true });

const CODE = "BLÅ-ORM-47";
const base = {
  caseId: "sara",
  done: false,
  bolig: 4800,
  faste: { forsikring: true, mobil: true, internet: true, transport: true, fag: true, stream: true },
  cFaste: [],
  mad: 2800,
  toj: 1500,
  buffer: 500,
  months: 12,
  cOps: [],
  scen: {},
  posts: null,
};

const SHOTS = [
  // "Mit budget" on a laptop: the summary's button opens it with the posts seeded from the choices.
  { name: "mit-budget", viewport: [1366, 768], flow: { ...base, step: 8, maxStep: 8, done: true }, open: "Lav dit eget budget med budgetposter" },
  // Step 3 (Bolig) on a phone, before the later choices are made.
  { name: "trin3-mobil", viewport: [390, 844], mobile: true, flow: { ...base, step: 3, maxStep: 3, mad: null, toj: null } },
];

const browser = await chromium.launch({ channel: "chrome" });
for (const s of SHOTS) {
  const ctx = await browser.newContext({
    viewport: { width: s.viewport[0], height: s.viewport[1] },
    deviceScaleFactor: 2,
    isMobile: !!s.mobile,
    hasTouch: !!s.mobile,
  });
  const page = await ctx.newPage();
  const expires = new Date(Date.now() + 30 * 864e5).toISOString();
  await page.route("**/api/skole/elev", (r) =>
    r.request().method() === "POST"
      ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ flow: s.flow, answers: {}, expires }) })
      : r.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await page.goto(`${BASE}/skole/elev`);
  await page.locator("#elevkode").fill(CODE);
  await page.getByRole("button", { name: "Start" }).click();
  if (s.open) await page.getByRole("button", { name: s.open }).click();
  else await page.locator("h1, h2").first().waitFor();
  await page.addStyleTag({ content: "nextjs-portal{display:none!important} *{caret-color:transparent!important}" });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.waitForTimeout(600);
  const path = `${OUT}/${s.name}.jpg`;
  await page.screenshot({ path, type: "jpeg", quality: 84 });
  console.log("ok", path);
  await ctx.close();
}
await browser.close();
