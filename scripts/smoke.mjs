// Click-through smoke test against a running dev server: `pnpm dev`, then `pnpm smoke`.
// Uses the installed Chrome. Exits non-zero on the first failed check.
// KBJ opens the real budget when public/private/kbj.legacy.json exists; TEST users start in the app's guide.
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3200";
const OUT = process.env.SMOKE_OUT ?? "smoke-out";
mkdirSync(OUT, { recursive: true });
const PRIVATE = "public/private/kbj.legacy.json";
const HAS_PRIVATE = existsSync(PRIVATE);
// A name from KBJ's private data, to tell their budget apart from the others (never hard-coded here).
const kbjName = HAS_PRIVATE ? JSON.parse(readFileSync(PRIVATE, "utf8")).persons?.[0]?.name : null;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
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
  await page.getByText(/Vi kender ikke den bruger/).waitFor();
  check(true, "unknown login is rejected");

  // Hero: a button to the login, no e-mail field
  await page.goto(`${BASE}/`);
  check((await page.locator('#top input[type="email"]').count()) === 0, "hero has no e-mail field");
  await page.locator("#top").getByRole("link", { name: /Opret gratis bruger/ }).click();
  await page.waitForURL(/\/login/);
  check(true, "hero button opens the login");

  // Tryghed comes right after "Sådan virker det"
  await page.goto(`${BASE}/`);
  const order = await page.evaluate(() => [...document.querySelectorAll("main > section")].map((s) => s.id).filter(Boolean));
  check(order.indexOf("tryghed") === order.indexOf("saadan") + 1, `Tryghed follows Sådan virker det (${order.join(" → ")})`);

  // Final signup form prefills the login
  const signup = page.locator('form:has(input[type="email"])');
  await signup.locator('input[type="email"]').fill("ikke-en-mail");
  await signup.locator('button[type="submit"]').click();
  await page.getByText("Skriv en gyldig e-mail, fx navn@eksempel.dk.").first().waitFor();
  check(true, "signup rejects an invalid e-mail");
  await signup.locator('input[type="email"]').fill("test@eksempel.dk");
  await signup.locator('button[type="submit"]').click();
  await page.waitForURL(/\/login\?/);
  check((await page.getByLabel("E-mail eller initialer").inputValue()) === "test@eksempel.dk", "signup prefills the login");

  // KBJ: the original app with the real budget
  await loginAs("KBJ");
  check((await page.locator("#bxUser").textContent()) === "KBJ", "app shows the logged-in test user");
  if (HAS_PRIVATE) {
    await page.getByText("Hvem betaler hvad").first().waitFor();
    for (const t of ["Måned for måned", "Udvikling i poster", "Rådighedsbeløb som banken regner det", "Ekstra indtjening"]) {
      check((await page.getByText(t).count()) > 0, `KBJ budget shows “${t}”`);
    }
  }
  for (const [name, text] of [
    ["Overblik over lån", /restgæld/i],
    ["Faste overførsler", /overfør/i],
    ["Opsparingsmål", /opspar/i],
    ["Budget", /Poster|Intet budget/],
  ]) {
    await tab(name).click();
    await page.waitForTimeout(400);
    check((await page.locator("#app").getByText(text).count()) > 0, `tab “${name}” renders`);
  }
  await page.screenshot({ path: `${OUT}/kbj.png` });

  // Switch to TEST1: empty budget → the app's own guide / empty budget
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
    await page.getByText("Hvem betaler hvad").first().waitFor();
    check((await page.getByText(kbjName).count()) > 0, "KBJ still has the real budget");
  }
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("budgetr-app:")).sort());
  check(keys.includes("budgetr-app:test1"), `per-user storage keys (${keys.join(", ")})`);

  // No horizontal scroll on mobile
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/login", "/app"]) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(800);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(over <= 0, `no horizontal scroll at 390px on ${path} (${over}px)`);
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
