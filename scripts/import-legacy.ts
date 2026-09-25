// Converts the first prototype ("Budget2027.html") into a private seed for a test user.
//   pnpm import:legacy <path-to-Budget2027.html> [userId]
// Writes public/private/<userId>.json, which is git-ignored: real budget data never goes into the repo.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { summarize } from "../lib/domain/calc";
import { monthOf } from "../lib/domain/format";
import { extractLegacySeed, fromLegacy } from "../lib/domain/legacy";

const [src, userId = "kbj"] = process.argv.slice(2);
if (!src) {
  console.error("Usage: pnpm import:legacy <path-to-Budget2027.html> [userId]");
  process.exit(1);
}

const budget = fromLegacy(extractLegacySeed(readFileSync(src, "utf8")), { id: `${userId}-budget` });
const out = resolve("public/private", `${userId}.json`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(budget, null, 2));

const s = summarize(budget, monthOf(new Date()));
console.log(`Wrote ${out}`);
console.log(
  `${budget.name}: ${budget.items.length} poster, ${budget.accounts.length} konti, ${budget.loans.length} lån, ` +
    `${budget.goals.length} mål, ${budget.scenarios.length} scenarier`,
);
console.log(`Indtægter ${Math.round(s.income)} · faste udgifter ${Math.round(s.expenses)} · rådighed ${Math.round(s.disposable)}`);
