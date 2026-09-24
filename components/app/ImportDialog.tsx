"use client";

import { useState } from "react";
import { newId } from "@/lib/domain/example";
import { addMonths, INTERVAL_LABEL, kr } from "@/lib/domain/format";
import {
  analyzeImport,
  parseCsv,
  rowsToTransactions,
  type Cell,
  type ImportResult,
} from "@/lib/domain/importer";
import type { Budget, Month } from "@/lib/domain/types";
import { download } from "./helpers";
import { Dialog } from "./ui";

/** A made-up statement for the current budget, so the import can be tried without a real bank file. */
function sampleCsv(budget: Budget, now: Month): string {
  const lines = ["Dato;Tekst;Beløb;Saldo"];
  const fmt = (n: number) => n.toFixed(2).replace(".", ",");
  const bump: Record<number, number> = { 0: 1.08, 1: 1.04 };
  const monthly = budget.items.filter((i) => i.kind === "udgift" && i.interval === 1 && !i.bankExcluded);
  for (let back = 2; back >= 0; back--) {
    const m = addMonths(now, -back);
    const [y, mm] = m.split("-");
    monthly.forEach((i, idx) => {
      const factor = back === 0 ? (bump[idx % 7] ?? 1) : 1;
      const day = String(1 + (idx % 27)).padStart(2, "0");
      lines.push(`${day}-${mm}-${y};${i.agreementNo ?? i.name};-${fmt(Math.round(i.amount * factor))};0,00`);
    });
    lines.push(`05-${mm}-${y};Podimo abonnement ${7700 + back};-99,00;0,00`);
    lines.push(`12-${mm}-${y};Netto ${400 + back * 7};-${fmt(356.5 + back * 40)};0,00`);
  }
  return lines.join("\r\n");
}

export function ImportDialog({
  budget,
  now,
  update,
  onClose,
}: {
  budget: Budget;
  now: Month;
  update: (fn: (b: Budget) => Budget) => void;
  onClose: () => void;
}) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const [done, setDone] = useState("");
  const defaultAccount = budget.accounts.find((a) => a.kind === "budget")?.id ?? budget.accounts[0]?.id ?? "";
  const [targetAccount, setTargetAccount] = useState(defaultAccount);

  const onFile = async (file: File) => {
    setError("");
    setDone("");
    setFileName(file.name);
    try {
      let rows: Cell[][];
      if (/\.xlsx$/i.test(file.name)) {
        const { default: readXlsxFile } = await import("read-excel-file");
        rows = (await readXlsxFile(file)) as Cell[][];
      } else {
        const buf = await file.arrayBuffer();
        let text = new TextDecoder("utf-8").decode(buf);
        // Danish banks often export Windows-1252; fall back when UTF-8 decoding produced replacement chars.
        if (text.includes("�")) text = new TextDecoder("windows-1252").decode(buf);
        rows = parseCsv(text);
      }
      const txs = rowsToTransactions(rows);
      if (txs.length === 0) {
        setResult(null);
        return setError("Vi kunne ikke finde kolonner med dato, tekst og beløb i filen.");
      }
      const r = analyzeImport(budget.items, txs);
      setResult(r);
      setPicked(new Set(r.matches.filter((m) => m.diff !== 0).map((m) => m.itemId)));
      setPicks(new Set());
    } catch {
      setResult(null);
      setError("Filen kunne ikke læses. Brug CSV eller Excel (.xlsx) fra netbanken.");
    }
  };

  const apply = () => {
    if (!result) return;
    const today = new Date().toISOString().slice(0, 10);
    const chosen = result.matches.filter((m) => picked.has(m.itemId) && m.diff !== 0);
    const newOnes = result.suggestions.filter((s) => picks.has(s.key));
    update((b) => ({
      ...b,
      items: [
        ...b.items.map((i) => {
          const m = chosen.find((x) => x.itemId === i.id);
          return m ? { ...i, amount: m.newAmount, history: [...i.history, { date: today, from: i.amount, to: m.newAmount }] } : i;
        }),
        ...newOnes.map((s) => ({
          id: newId(),
          name: s.name,
          kind: "udgift" as const,
          amount: s.amount,
          interval: s.interval,
          ownerId: b.persons.length === 1 ? b.persons[0]!.id : null,
          accountId: targetAccount,
          category: "Andet",
          agreementNo: s.name,
          history: [],
        })),
      ],
    }));
    setDone(
      `${chosen.length} ${chosen.length === 1 ? "post er" : "poster er"} opdateret${
        newOnes.length ? `, og ${newOnes.length} ${newOnes.length === 1 ? "ny fast betaling er" : "nye faste betalinger er"} tilføjet` : ""
      }. De gamle beløb er gemt på posterne.`,
    );
    setResult(null);
    setFileName("");
  };

  const toggle = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  const changed = result?.matches.filter((m) => m.diff !== 0) ?? [];
  const unchanged = result?.matches.filter((m) => m.diff === 0) ?? [];

  return (
    <Dialog
      title="Importér kontoudskrift"
      wide
      onClose={onClose}
      footer={
        <>
          <div>
            <button
              type="button"
              className="bx-btn"
              onClick={() => download("eksempel-kontoudskrift.csv", "﻿" + sampleCsv(budget, now), "text/csv;charset=utf-8")}
            >
              Hent en eksempelfil
            </button>
          </div>
          <div>
            <button type="button" className="bx-btn" onClick={onClose}>
              {done ? "Luk" : "Annullér"}
            </button>
            {result ? (
              <button
                type="button"
                className="bx-btn bx-btn-primary"
                disabled={picked.size === 0 && picks.size === 0}
                onClick={apply}
              >
                Opdatér valgte
              </button>
            ) : null}
          </div>
        </>
      }
    >
      <p className="bx-help" style={{ fontSize: 13 }}>
        Hent en kontoudskrift som CSV eller Excel i netbanken og vælg den her. Filen læses kun i din browser og sendes ikke
        nogen steder hen. Posteringer genkendes på aftalenummer og tekst, og du vælger selv, hvad der opdateres.
      </p>
      <label className="bx-btn bx-btn-lg" style={{ alignSelf: "flex-start", cursor: "pointer" }}>
        {fileName ? `Valgt: ${fileName} – vælg en anden` : "Vælg fil (CSV eller Excel)"}
        <input
          type="file"
          accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
      </label>
      {error ? <p className="bx-error" role="alert">{error}</p> : null}
      {done ? (
        <div className="bx-note is-pos" role="status">
          {done}
        </div>
      ) : null}

      {result ? (
        <>
          <div className="bx-muted" style={{ fontSize: 13 }}>
            {result.count} posteringer · {result.matches.length} budgetposter genkendt
            {result.matches.some((m) => m.by === "aftalenr.")
              ? ` (${result.matches.filter((m) => m.by === "aftalenr.").length} på aftalenummer)`
              : ""}
          </div>
          {changed.length > 0 ? (
            <div className="bx-scroll-x">
              <table className="bx-table">
                <thead>
                  <tr>
                    <th aria-label="Vælg" />
                    <th>Budgetpost</th>
                    <th className="r">Før</th>
                    <th className="r">Nu</th>
                    <th className="r">Ændring</th>
                    <th className="bx-hide-sm">Seneste postering</th>
                  </tr>
                </thead>
                <tbody>
                  {changed.map((m) => (
                    <tr key={m.itemId}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Opdatér ${m.name}`}
                          checked={picked.has(m.itemId)}
                          onChange={() => toggle(picked, m.itemId, setPicked)}
                          style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
                        />
                      </td>
                      <td>{m.name}</td>
                      <td className="r muted">{kr(m.oldAmount)}</td>
                      <td className="r">
                        <b>{kr(m.newAmount)}</b>
                      </td>
                      <td className={`r ${m.diff > 0 ? "neg" : "pos"}`}>{kr(m.diff, { sign: true })}</td>
                      <td className="bx-hide-sm bx-muted">
                        {new Date(m.date).toLocaleDateString("da-DK")} · {m.text}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bx-note is-info">Ingen af de genkendte poster har ændret beløb.</div>
          )}
          {unchanged.length > 0 ? (
            <p className="bx-help">Uændret: {unchanged.map((m) => m.name).join(", ")}.</p>
          ) : null}

          {result.suggestions.length > 0 ? (
            <div>
              <div className="bx-section-head" style={{ marginBottom: 6 }}>
                <b style={{ fontSize: 13 }}>Nye faste betalinger, vi har fundet</b>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="bx-muted">Tilføj til</span>
                  <select
                    className="bx-select"
                    style={{ height: 36, width: "auto", fontSize: 13 }}
                    value={targetAccount}
                    onChange={(e) => setTargetAccount(e.target.value)}
                  >
                    {budget.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {result.suggestions.map((s) => (
                <label key={s.key} className="bx-check" style={{ padding: "6px 0", borderTop: "1px solid var(--rule)" }}>
                  <input type="checkbox" checked={picks.has(s.key)} onChange={() => toggle(picks, s.key, setPicks)} />
                  <span style={{ flex: 1, color: "var(--tx)" }}>
                    {s.name}
                    <span className="bx-muted"> · {s.occurrences} gange · {INTERVAL_LABEL[s.interval]}</span>
                  </span>
                  <b className="num">{kr(s.amount)}</b>
                </label>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </Dialog>
  );
}
