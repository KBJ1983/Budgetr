"use client";

import { useState } from "react";
import { newId } from "@/lib/domain/example";
import { addMonths, durationLabel, kr, monthLabel } from "@/lib/domain/format";
import { monthsToPayOff } from "@/lib/domain/loans";
import type { Budget, Month } from "@/lib/domain/types";
import { Dialog, Field, MoneyInput } from "./ui";

export function LoanDialog({
  budget,
  id,
  now,
  update,
  onClose,
}: {
  budget: Budget;
  id: string | null;
  now: Month;
  update: (fn: (b: Budget) => Budget) => void;
  onClose: () => void;
}) {
  const loan = id ? budget.loans.find((l) => l.id === id) : undefined;
  const item = loan ? budget.items.find((i) => i.id === loan.itemId) : undefined;
  const [name, setName] = useState(loan?.name ?? "");
  const [balance, setBalance] = useState(loan?.balance ?? 0);
  const [principal, setPrincipal] = useState(loan?.principal ?? 0);
  const [rate, setRate] = useState(loan ? String(loan.ratePct).replace(".", ",") : "");
  const [payment, setPayment] = useState(item ? item.amount / item.interval : 0);
  const [accountId, setAccountId] = useState(
    item?.accountId ?? budget.accounts.find((a) => a.kind === "budget")?.id ?? budget.accounts[0]?.id ?? "",
  );
  const [ownerId, setOwnerId] = useState<string | null>(
    item ? item.ownerId : budget.persons.length === 1 ? budget.persons[0]!.id : null,
  );
  const [bank, setBank] = useState(loan?.bank ?? "");
  const [bankPayment, setBankPayment] = useState(loan?.payment ?? 0);
  const [paused, setPaused] = useState(!!loan?.paused);
  const [note, setNote] = useState(loan?.note ?? "");
  const [error, setError] = useState("");

  const ratePct = Number(rate.replace(",", ".")) || 0;
  const months = paused ? Infinity : monthsToPayOff(balance, ratePct, bankPayment || payment);
  const extra = {
    bank: bank.trim() || undefined,
    payment: bankPayment > 0 ? bankPayment : undefined,
    paused: paused || undefined,
    note: note.trim() || undefined,
  };

  const save = () => {
    if (!name.trim()) return setError("Giv lånet et navn.");
    if (!accountId) return setError("Vælg en konto. Opret en under Indstillinger.");
    if (payment <= 0 && !paused) return setError("Skriv den månedlige ydelse.");
    update((b) => {
      if (loan && item) {
        // Only rewrite the budget line's amount when the payment was actually changed,
        // so a quarterly line (e.g. 8.927 kr hvert kvartal) stays quarterly.
        const changed = Math.round(payment) !== Math.round(item.amount / item.interval);
        const history = changed
          ? [...item.history, { date: new Date().toISOString().slice(0, 10), from: item.amount, to: payment }]
          : item.history;
        return {
          ...b,
          loans: b.loans.map((l) =>
            l.id === loan.id
              ? { ...l, ...extra, name: name.trim(), balance, ratePct, principal: Math.max(principal, balance) }
              : l,
          ),
          items: b.items.map((i) =>
            i.id === item.id
              ? { ...i, name: name.trim(), accountId, ownerId, history, ...(changed ? { amount: payment, interval: 1 as const } : {}) }
              : i,
          ),
        };
      }
      const loanId = newId();
      const itemId = newId();
      return {
        ...b,
        loans: [
          ...b.loans,
          { id: loanId, name: name.trim(), balance, ratePct, principal: Math.max(principal, balance), itemId, ...extra },
        ],
        items: [
          ...b.items,
          {
            id: itemId,
            name: name.trim(),
            kind: "udgift",
            amount: payment,
            interval: 1,
            ownerId,
            accountId,
            category: "Lån",
            loanId,
            history: [],
          },
        ],
      };
    });
    onClose();
  };

  const remove = () => {
    if (!loan || !window.confirm(`Slet lånet “${loan.name}” og dets ydelse i budgettet?`)) return;
    update((b) => ({
      ...b,
      loans: b.loans.filter((l) => l.id !== loan.id),
      items: b.items.filter((i) => i.id !== loan.itemId),
    }));
    onClose();
  };

  return (
    <Dialog
      title={loan ? "Ret lån" : "Tilføj lån"}
      onClose={onClose}
      footer={
        <>
          <div>
            {loan ? (
              <button type="button" className="bx-btn bx-btn-danger" onClick={remove}>
                Slet lån
              </button>
            ) : null}
          </div>
          <div>
            <button type="button" className="bx-btn" onClick={onClose}>
              Annullér
            </button>
            <button type="button" className="bx-btn bx-btn-primary" onClick={save}>
              Gem
            </button>
          </div>
        </>
      }
    >
      <Field label="Navn">
        <input className="bx-input" value={name} autoFocus placeholder="Fx Billån" onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="bx-grid-2">
        <Field label="Restgæld i dag">
          <MoneyInput value={balance} onChange={setBalance} />
        </Field>
        <Field label="Rente pr. år (%)">
          <input className="bx-input num" inputMode="decimal" value={rate} placeholder="Fx 4,9" onChange={(e) => setRate(e.target.value)} />
        </Field>
        <Field label="Ydelse pr. måned i budgettet">
          <MoneyInput value={payment} onChange={setPayment} />
        </Field>
        <Field label="Ydelse ifølge banken (valgfrit)" help="Bruges til slutdatoen, hvis den afviger fra budgettet.">
          <MoneyInput value={bankPayment} onChange={setBankPayment} />
        </Field>
        <Field label="Bank eller långiver">
          <input className="bx-input" value={bank} onChange={(e) => setBank(e.target.value)} />
        </Field>
        <Field label="Oprindeligt lånebeløb" help="Bruges til at vise, hvor langt I er nået.">
          <MoneyInput value={principal} onChange={setPrincipal} />
        </Field>
        <Field label="Betales fra konto">
          <select className="bx-select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {budget.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        {budget.persons.length > 1 ? (
          <Field label="Hvis er lånet?">
            <select className="bx-select" value={ownerId ?? ""} onChange={(e) => setOwnerId(e.target.value || null)}>
              <option value="">Fælles</option>
              {budget.persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>
      <label className="bx-check">
        <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
        <span>Lånet er på pause (fx SU-lån) – der beregnes ingen slutdato</span>
      </label>
      <Field label="Note (valgfrit)">
        <input className="bx-input" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {loan?.bankEnd ? <p className="bx-help">Bankens slutdato: {loan.bankEnd}</p> : null}
      {paused ? null : balance > 0 && (bankPayment || payment) > 0 ? (
        <div className={`bx-note ${Number.isFinite(months) ? "is-pos" : ""}`}>
          {Number.isFinite(months)
            ? `Betalt ud i ${monthLabel(addMonths(now, months))} – om ${durationLabel(months)}. Derefter frigives ${kr(payment)} om måneden.`
            : "Ydelsen dækker ikke renten, så lånet bliver aldrig betalt ud."}
        </div>
      ) : null}
      {error ? <p className="bx-error" role="alert">{error}</p> : null}
    </Dialog>
  );
}
