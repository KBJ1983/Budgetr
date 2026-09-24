import { allItems, monthly } from "@/lib/domain/calc";
import { INTERVAL_LABEL } from "@/lib/domain/format";
import type { Budget, BudgetItem, Id, Month } from "@/lib/domain/types";

export const ownerName = (b: Budget, id: Id | null) =>
  id === null ? (b.persons.length > 1 ? "Fælles" : "") : (b.persons.find((p) => p.id === id)?.name ?? "Ukendt");

export const accountName = (b: Budget, id: Id) => b.accounts.find((a) => a.id === id)?.name ?? "Ukendt konto";

export function download(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function exportBackup(b: Budget) {
  download(`budgetr-${slug(b.name)}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(b, null, 2), "application/json");
}

const dk = (n: number) => n.toFixed(2).replace(".", ",");

/** Semicolon CSV with BOM so Excel opens it with æøå and Danish decimals. */
export function exportCsv(b: Budget, now: Month) {
  const head = ["Navn", "Type", "Beløb", "Interval", "Pr. måned", "Konto", "Ejer", "Kategori", "Aftalenr.", "Med i rådighed"];
  const rows = allItems(b, now).map((i: BudgetItem) => [
    i.name,
    i.kind,
    dk(i.amount),
    INTERVAL_LABEL[i.interval] ?? "",
    dk(monthly(i)),
    accountName(b, i.accountId),
    ownerName(b, i.ownerId) || "Mig",
    i.category,
    i.agreementNo ?? "",
    i.kind === "udgift" && !i.bankExcluded ? "ja" : "nej",
  ]);
  const esc = (c: string) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  const csv = [head, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  download(`budgetr-${slug(b.name)}.csv`, "﻿" + csv, "text/csv;charset=utf-8");
}

export function isBudget(x: unknown): x is Budget {
  const b = x as Budget;
  return (
    !!b &&
    typeof b.id === "string" &&
    typeof b.name === "string" &&
    Array.isArray(b.persons) &&
    Array.isArray(b.accounts) &&
    Array.isArray(b.items) &&
    Array.isArray(b.loans) &&
    Array.isArray(b.goals) &&
    Array.isArray(b.scenarios)
  );
}

export const CATEGORIES = [
  "Løn",
  "Offentlige ydelser",
  "Bolig",
  "Forsikring",
  "Bil",
  "Transport",
  "Børn",
  "Mad",
  "Abonnementer",
  "Fagforening og a-kasse",
  "Fritid",
  "Lån",
  "Gaver",
  "Opsparing",
  "Andet",
];
