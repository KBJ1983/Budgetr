import type { BudgetItem, Interval } from "./types";

export interface Transaction {
  /** "YYYY-MM-DD" */
  date: string;
  text: string;
  /** Signed amount: negative = money out. */
  amount: number;
}

export type Cell = string | number | boolean | Date | null | undefined;

// ---------- parsing ----------

/** Splits CSV text into rows; handles quotes and detects ; , or tab as delimiter. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const sample = clean.split(/\r?\n/).slice(0, 10).join("\n");
  const counts = [";", "\t", ","].map((d) => ({ d, n: sample.split(d).length }));
  const delim = counts.sort((a, b) => b.n - a.n)[0]!.d;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]!;
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/** "−1.234,56 kr" → -1234.56. Returns NaN when the cell is not a number. */
export function parseAmount(raw: Cell): number {
  if (typeof raw === "number") return raw;
  if (raw === null || raw === undefined || typeof raw !== "string") return NaN;
  let s = raw.replace(/−/g, "-").replace(/kr\.?|dkk/gi, "").replace(/[\s ]/g, "");
  if (!/^[-+]?[\d.,]+$/.test(s)) return NaN;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    s = s.replace(/\.(?=\d{3})/g, "").replace(",", ".");
  } else if (/^[-+]?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Accepts dd-mm-yyyy, dd.mm.yyyy, dd/mm/yyyy, yyyy-mm-dd and Date. Returns "YYYY-MM-DD" or null. */
export function parseDate(raw: Cell): string | null {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${pad(raw.getMonth() + 1)}-${pad(raw.getDate())}`;
  }
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s);
  if (m) {
    const y = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return `${y}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
  }
  return null;
}

const cellText = (c: Cell) => (c instanceof Date ? c.toISOString() : c === null || c === undefined ? "" : String(c)).trim();

/** Turns spreadsheet-like rows into transactions. Finds the columns by header name, else by content. */
export function rowsToTransactions(rows: Cell[][]): Transaction[] {
  if (rows.length === 0) return [];
  const headerIdx = rows.findIndex((r) => r.some((c) => /dato|date|bogf/i.test(cellText(c))));
  let dateCol = -1;
  let textCol = -1;
  let amountCol = -1;
  let start = 0;
  if (headerIdx >= 0 && headerIdx < 5) {
    const h = rows[headerIdx]!.map((c) => cellText(c).toLowerCase());
    dateCol = h.findIndex((x) => /dato|date|bogf/.test(x));
    textCol = h.findIndex((x) => /tekst|beskrivelse|modtager|text|description|posteringstekst/.test(x));
    amountCol = h.findIndex((x) => /beløb|belob|amount|beløb/.test(x) && !/saldo|balance/.test(x));
    start = headerIdx + 1;
  }
  const body = rows.slice(start);
  const probe = body.slice(0, 20);
  const width = Math.max(...probe.map((r) => r.length), 0);
  const score = (col: number, test: (c: Cell) => boolean) => probe.filter((r) => test(r[col])).length;
  if (dateCol < 0) {
    for (let c = 0; c < width; c++) if (score(c, (x) => parseDate(x) !== null) > probe.length / 2) { dateCol = c; break; }
  }
  if (amountCol < 0) {
    for (let c = 0; c < width; c++) {
      if (c === dateCol) continue;
      if (score(c, (x) => !Number.isNaN(parseAmount(x))) > probe.length / 2) { amountCol = c; break; }
    }
  }
  if (textCol < 0) {
    let best = -1;
    for (let c = 0; c < width; c++) {
      if (c === dateCol || c === amountCol) continue;
      const len = probe.reduce((a, r) => a + cellText(r[c]).length, 0);
      if (len > best) { best = len; textCol = c; }
    }
  }
  if (dateCol < 0 || amountCol < 0 || textCol < 0) return [];
  const out: Transaction[] = [];
  for (const r of body) {
    const date = parseDate(r[dateCol]);
    const amount = parseAmount(r[amountCol]);
    const text = cellText(r[textCol]);
    if (date && !Number.isNaN(amount) && text) out.push({ date, text, amount });
  }
  return out;
}

// ---------- matching ----------

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[–—\-_/.,:;()*#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP = new Set(["opsparing", "fælles", "faelles", "konto", "betaling", "overførsel"]);

function nameTokens(name: string): string[] {
  return norm(name)
    .split(" ")
    .filter((t) => t.length >= 4 && !STOP.has(t));
}

export interface ImportMatch {
  itemId: string;
  name: string;
  oldAmount: number;
  newAmount: number;
  diff: number;
  date: string;
  text: string;
  by: "aftalenr." | "tekst";
}

export interface Suggestion {
  key: string;
  name: string;
  amount: number;
  interval: Interval;
  occurrences: number;
  lastDate: string;
}

export interface ImportResult {
  count: number;
  matches: ImportMatch[];
  suggestions: Suggestion[];
}

function matchItem(item: BudgetItem, txs: Transaction[]): { tx: Transaction; by: ImportMatch["by"] } | null {
  const wantsOut = item.kind !== "indtægt";
  const pool = txs.filter((t) => (wantsOut ? t.amount < 0 : t.amount > 0));
  const latest = (list: Transaction[]) => list.sort((a, b) => b.date.localeCompare(a.date))[0];
  if (item.agreementNo) {
    const key = norm(item.agreementNo);
    const hit = latest(pool.filter((t) => norm(t.text).includes(key)));
    if (hit) return { tx: hit, by: "aftalenr." };
  }
  const tokens = nameTokens(item.name);
  if (tokens.length === 0) return null;
  const hit = latest(pool.filter((t) => tokens.every((tok) => norm(t.text).includes(tok))));
  return hit ? { tx: hit, by: "tekst" } : null;
}

const groupKey = (text: string) =>
  norm(text)
    .replace(/\d+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ");

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/** Matches statement lines to budget items and proposes new fixed payments from repeating lines. */
export function analyzeImport(items: BudgetItem[], txs: Transaction[]): ImportResult {
  const used = new Set<Transaction>();
  const matches: ImportMatch[] = [];
  for (const item of items) {
    if (item.bankExcluded || item.active === false || item.id.startsWith("goal:")) continue;
    const m = matchItem(item, txs);
    if (!m) continue;
    const key = item.agreementNo ? norm(item.agreementNo) : null;
    for (const t of txs) {
      const n = norm(t.text);
      if ((key && n.includes(key)) || (!key && nameTokens(item.name).every((tok) => n.includes(tok)))) used.add(t);
    }
    used.add(m.tx);
    const newAmount = Math.round(Math.abs(m.tx.amount));
    matches.push({
      itemId: item.id,
      name: item.name,
      oldAmount: item.amount,
      newAmount,
      diff: newAmount - item.amount,
      date: m.tx.date,
      text: m.tx.text,
      by: m.by,
    });
  }

  const groups = new Map<string, Transaction[]>();
  for (const t of txs) {
    if (used.has(t) || t.amount >= 0) continue;
    const k = groupKey(t.text);
    if (k.length < 3) continue;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  const suggestions: Suggestion[] = [];
  for (const [key, list] of groups) {
    const months = [...new Set(list.map((t) => t.date.slice(0, 7)))].sort();
    if (months.length < 2) continue;
    const amounts = list.map((t) => Math.abs(t.amount));
    const med = median(amounts);
    // Fixed payments repeat with (almost) the same amount; groceries etc. vary more.
    if (amounts.some((a) => Math.abs(a - med) / med > 0.05)) continue;
    const gaps = months.slice(1).map((m, i) => {
      const [y1, m1] = months[i]!.split("-").map(Number);
      const [y2, m2] = m.split("-").map(Number);
      return (y2! - y1!) * 12 + (m2! - m1!);
    });
    const gap = median(gaps);
    const interval: Interval | null = gap <= 1.5 && months.length >= 3 ? 1 : gap >= 2.5 && gap <= 3.5 ? 3 : gap >= 5.5 && gap <= 6.5 ? 6 : null;
    if (!interval) continue;
    const last = list.sort((a, b) => b.date.localeCompare(a.date))[0]!;
    suggestions.push({
      key,
      name: last.text.replace(/\s+/g, " ").trim(),
      amount: Math.round(Math.abs(last.amount)),
      interval,
      occurrences: list.length,
      lastDate: last.date,
    });
  }
  suggestions.sort((a, b) => b.amount / b.interval - a.amount / a.interval);
  return { count: txs.length, matches, suggestions };
}
