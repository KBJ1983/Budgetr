// Click-through smoke test against a running dev server: `pnpm dev`, then `pnpm smoke`.
// Uses the installed Chrome. Exits non-zero on the first failed check.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3200";
const OUT = process.env.SMOKE_OUT ?? "smoke-out";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
const check = (ok, msg) => {
  if (!ok) throw new Error(`FAIL: ${msg}`);
  console.log(`ok - ${msg}`);
};

try {
  // Without a session the app sends you to the login page
  await page.goto(`${BASE}/app`);
  await page.waitForURL(/\/login/);
  check(true, "app requires a test-user login");

  // Landing → Log ind → unknown user is rejected, KBJ gets the example
  await page.goto(`${BASE}/`);
  await page.getByRole("link", { name: "Log ind" }).first().click();
  await page.waitForURL(/\/login/);
  await page.getByLabel("E-mail eller initialer").fill("TEST9");
  await page.getByRole("button", { name: "Log ind" }).click();
  await page.getByText(/Vi kender ikke den bruger/).waitFor();
  check(true, "unknown login is rejected");
  await page.getByLabel("E-mail eller initialer").fill("kbj");
  await page.getByRole("button", { name: "Log ind" }).click();
  await page.waitForURL(/\/app$/);
  await page.getByRole("heading", { name: "Anna og Jonas’ budget" }).waitFor();
  check(true, "KBJ opens the example budget");

  // Scenario comparison
  await page.getByRole("button", { name: /^Nyt hus fra/ }).click();
  await page.getByText(/holdt op mod nuværende budget/).waitFor();
  check(true, "scenario comparison shows");
  await page.getByRole("button", { name: "Nuværende" }).click();

  // Import the generated sample statement
  await page.getByRole("button", { name: /Importér/ }).click();
  await page.getByRole("menuitem", { name: /Kontoudskrift/ }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Hent en eksempelfil" }).click();
  const file = `${OUT}/eksempel.csv`;
  await (await dl).saveAs(file);
  await page.locator('input[type="file"]').last().setInputFiles(file);
  await page.getByText(/budgetposter genkendt/).waitFor();
  const rows = await page.locator(".bx-dialog tbody tr").count();
  check(rows > 0, `import found ${rows} changed items`);
  await page.getByText("Podimo abonnement").first().waitFor();
  check(true, "import suggests a new fixed payment");
  await page.screenshot({ path: `${OUT}/import.png`, fullPage: true });
  await page.getByRole("button", { name: "Opdatér valgte" }).click();
  await page.getByText(/er opdateret/).waitFor();
  check(true, "import updates items");
  await page.getByRole("button", { name: "Luk", exact: true }).last().click();

  // Edit an item
  await page.getByRole("button", { name: /^Husleje/ }).first().click();
  await page.getByRole("heading", { name: "Ret budgetpost" }).waitFor();
  await page.locator(".bx-dialog input.num").first().fill("10.100");
  await page.getByRole("button", { name: "Gem" }).click();
  await page.getByText("10.100 kr").first().waitFor();
  check(true, "editing an item updates the budget");

  // Light theme
  await page.getByRole("button", { name: /Skift til lyst tema/ }).click();
  check((await page.locator(".bx").getAttribute("data-theme")) === "light", "theme switches to light");
  await page.screenshot({ path: `${OUT}/light.png`, fullPage: true });

  // Switch to TEST1: starts empty and lands in the guide
  await page.getByRole("button", { name: /Skift bruger/ }).click();
  await page.waitForURL(/\/login/);
  await page.getByLabel("E-mail eller initialer").fill("TEST1");
  await page.getByRole("button", { name: "Log ind" }).click();
  await page.waitForURL(/\/app\/start/);
  check((await page.getByText("Anna og Jonas").count()) === 0, "TEST1 starts empty in the guide");

  // Guide from the landing signup (as TEST1)
  await page.goto(`${BASE}/`);
  await page.locator('#opret input[type="email"]').fill("ikke-en-mail");
  await page.locator("#opret button").first().click();
  await page.getByText("Skriv en gyldig e-mail, fx navn@eksempel.dk.").first().waitFor();
  check(true, "signup rejects an invalid e-mail");
  await page.locator('#opret input[type="email"]').fill("test@eksempel.dk");
  await page.locator("#opret button").first().click();
  await page.waitForURL(/\/app\/start\?email=/);
  await page.getByLabel("Dit navn").fill("Maja");
  await page.getByRole("button", { name: /Næste/ }).click(); // konti
  await page.getByRole("button", { name: /Næste/ }).click(); // indtægter
  await page.getByLabel(/Løn Maja/).fill("28.000");
  await page.getByRole("button", { name: /Næste/ }).click(); // udgifter
  await page.locator(".bx-list-edit-row input.num").first().fill("8.500");
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: /Næste/ }).click();
  await page.getByText("Rådighedsbeløb").first().waitFor();
  await page.screenshot({ path: `${OUT}/guide-end.png`, fullPage: true });
  await page.getByRole("button", { name: /Se dit budget/ }).click();
  await page.waitForURL(/\/app$/);
  await page.getByRole("heading", { name: "Majas budget" }).waitFor();
  check(true, "guide creates an own budget");
  check((await page.locator("select option", { hasText: "Anna og Jonas" }).count()) === 0, "TEST1 does not see KBJ's budget");

  // Back to KBJ: the example (with the edit from above) is still there, Maja's budget is not
  await page.goto(`${BASE}/login`);
  await page.getByLabel("E-mail eller initialer").fill("KBJ");
  await page.getByRole("button", { name: /Skift bruger|Log ind/ }).click();
  await page.waitForURL(/\/app$/);
  await page.getByRole("heading", { name: "Anna og Jonas’ budget" }).waitFor();
  check((await page.getByText("10.100 kr").count()) > 0, "KBJ keeps their own changes");
  check((await page.getByText("Majas budget").count()) === 0, "KBJ does not see TEST1's budget");

  // No horizontal scroll on mobile
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/login", "/app", "/app#lan", "/app#overforsler", "/app/start"]) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(600);
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
