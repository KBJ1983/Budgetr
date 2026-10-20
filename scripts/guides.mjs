// "Kom godt i gang" guides for kundeadmins: guides/<name>.html (A4, fictional example data) printed to
// public/guides/budgetpro-kom-godt-i-gang-<name>.pdf with Chrome. No dev server needed – the pages are opened from disk.
// `pnpm guides` makes both; `pnpm guides skole` only one. `--png` also writes a PNG of every page next to the PDF's source.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ALL = ["erhverv", "skole"];
const args = process.argv.slice(2);
const png = args.includes("--png");
const names = args.filter((a) => !a.startsWith("--"));
const pick = names.length ? names : ALL;
for (const n of pick) if (!ALL.includes(n)) throw new Error(`Unknown guide "${n}" (${ALL.join(", ")})`);

const OUT = "public/guides";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
for (const name of pick) {
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(resolve(`guides/kom-godt-i-gang-${name}.html`)).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  // A page whose content runs past its bottom edge pushes the foot out of sight: say so.
  const over = await page.evaluate(() =>
    [...document.querySelectorAll(".page")].flatMap((p, i) => (p.scrollHeight > p.clientHeight + 1 ? [i + 1] : [])),
  );
  if (over.length) console.warn(`! ${name}: page ${over.join(", ")} runs over`);
  const out = `${OUT}/budgetpro-kom-godt-i-gang-${name}.pdf`;
  await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
  console.log(`✓ ${out}`);
  if (png) {
    await page.emulateMedia({ media: "print" });
    const pages = page.locator(".page");
    for (let i = 0; i < (await pages.count()); i++) {
      const file = `node_modules/.cache/guides/${name}-${i + 1}.png`;
      mkdirSync("node_modules/.cache/guides", { recursive: true });
      await pages.nth(i).screenshot({ path: file });
      console.log(`  ${file}`);
    }
  }
  await page.close();
}
await browser.close();
