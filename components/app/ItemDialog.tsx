"use client";

import { useState } from "react";
import { newId } from "@/lib/domain/example";
import { INTERVAL_LABEL, kr } from "@/lib/domain/format";
import type { Budget, BudgetItem, Interval, ItemKind, Scenario, ScenarioChange } from "@/lib/domain/types";
import { CATEGORIES } from "./helpers";
import { Dialog, Field, MoneyInput } from "./ui";

export function ItemDialog({
  budget,
  scenario,
  id,
  update,
  onClose,
}: {
  budget: Budget;
  scenario: Scenario | undefined;
  id: string | null;
  update: (fn: (b: Budget) => Budget) => void;
  onClose: () => void;
}) {
  const baseItem = id ? budget.items.find((i) => i.id === id) : undefined;
  const addedChange = scenario?.changes.find(
    (c): c is Extract<ScenarioChange, { kind: "addItem" }> => c.kind === "addItem" && c.item.id === id,
  );
  const existing = baseItem ?? addedChange?.item;
  const scenarioEditOfBase = !!scenario && !!baseItem;
  const scenarioAmount = scenario?.changes.find(
    (c): c is Extract<ScenarioChange, { kind: "setAmount" }> => c.kind === "setAmount" && c.itemId === id,
  )?.amount;
  const scenarioRemoved = !!scenario?.changes.some((c) => c.kind === "removeItem" && c.itemId === id);

  const defaultAccount =
    budget.accounts.find((a) => a.kind === "budget")?.id ?? budget.accounts[0]?.id ?? "";
  const [draft, setDraft] = useState<BudgetItem>(
    existing ?? {
      id: newId(),
      name: "",
      kind: "udgift",
      amount: 0,
      interval: 1,
      ownerId: budget.persons.length === 1 ? budget.persons[0]!.id : null,
      accountId: defaultAccount,
      category: "Andet",
      history: [],
    },
  );
  const [amount, setAmount] = useState(scenarioAmount ?? existing?.amount ?? 0);
  const [removed, setRemoved] = useState(scenarioRemoved);
  const [error, setError] = useState("");
  const set = <K extends keyof BudgetItem>(k: K, v: BudgetItem[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const title = scenario
    ? existing
      ? `${existing.name} i “${scenario.name}”`
      : `Ny post i “${scenario.name}”`
    : existing
      ? "Ret budgetpost"
      : "Ny budgetpost";

  const save = () => {
    if (!scenarioEditOfBase && !draft.name.trim()) return setError("Giv posten et navn.");
    if (!draft.accountId && !scenarioEditOfBase) return setError("Vælg en konto. Opret en under Indstillinger.");
    const item: BudgetItem = { ...draft, name: draft.name.trim(), amount };

    if (scenario) {
      update((b) => ({
        ...b,
        scenarios: b.scenarios.map((sc) => {
          if (sc.id !== scenario.id) return sc;
          if (scenarioEditOfBase) {
            const rest = sc.changes.filter(
              (c) => !((c.kind === "setAmount" || c.kind === "removeItem") && c.itemId === item.id),
            );
            if (removed) return { ...sc, changes: [...rest, { kind: "removeItem", itemId: item.id }] };
            if (amount !== baseItem!.amount) return { ...sc, changes: [...rest, { kind: "setAmount", itemId: item.id, amount }] };
            return { ...sc, changes: rest };
          }
          const rest = sc.changes.filter((c) => !(c.kind === "addItem" && c.item.id === item.id));
          return { ...sc, changes: [...rest, { kind: "addItem", item }] };
        }),
      }));
      return onClose();
    }

    update((b) => {
      const prev = b.items.find((i) => i.id === item.id);
      if (!prev) return { ...b, items: [...b.items, item] };
      const history =
        prev.amount !== item.amount
          ? [...prev.history, { date: new Date().toISOString().slice(0, 10), from: prev.amount, to: item.amount }]
          : prev.history;
      return { ...b, items: b.items.map((i) => (i.id === item.id ? { ...item, history } : i)) };
    });
    onClose();
  };

  const remove = () => {
    if (!existing) return;
    if (scenario && addedChange) {
      update((b) => ({
        ...b,
        scenarios: b.scenarios.map((sc) =>
          sc.id === scenario.id ? { ...sc, changes: sc.changes.filter((c) => c !== addedChange) } : sc,
        ),
      }));
      return onClose();
    }
    if (!window.confirm(`Slet “${existing.name}”?${existing.loanId ? " Lånet slettes også." : ""}`)) return;
    update((b) => ({
      ...b,
      items: b.items.filter((i) => i.id !== existing.id),
      loans: b.loans.filter((l) => l.itemId !== existing.id),
      scenarios: b.scenarios.map((sc) => ({
        ...sc,
        changes: sc.changes.filter((c) => !("itemId" in c && c.itemId === existing.id)),
      })),
    }));
    onClose();
  };

  const footer = (
    <>
      <div>
        {existing && !scenarioEditOfBase ? (
          <button type="button" className="bx-btn bx-btn-danger" onClick={remove}>
            {scenario ? "Fjern fra scenariet" : "Slet post"}
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
  );

  if (scenarioEditOfBase && baseItem) {
    return (
      <Dialog title={title} onClose={onClose} footer={footer}>
        <p className="bx-help">
          Nuværende beløb: {kr(baseItem.amount)} {INTERVAL_LABEL[baseItem.interval]}. Ændringen gælder kun i scenariet.
        </p>
        <Field label="Beløb i scenariet">
          <MoneyInput value={amount} onChange={setAmount} />
        </Field>
        <label className="bx-check">
          <input type="checkbox" checked={removed} onChange={(e) => setRemoved(e.target.checked)} />
          <span>Posten findes ikke i scenariet (fx husleje, når I køber hus)</span>
        </label>
      </Dialog>
    );
  }

  return (
    <Dialog title={title} onClose={onClose} footer={footer}>
      <Field label="Navn">
        <input
          className="bx-input"
          value={draft.name}
          autoFocus
          placeholder="Fx Husleje"
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>
      <div className="bx-grid-2">
        <Field label="Type">
          <select
            className="bx-select"
            value={draft.kind}
            onChange={(e) => {
              const kind = e.target.value as ItemKind;
              setDraft((d) => ({ ...d, kind, category: kind === "indtægt" ? "Løn" : kind === "opsparing" ? "Opsparing" : d.category }));
            }}
          >
            <option value="udgift">Fast udgift</option>
            <option value="indtægt">Indtægt</option>
            <option value="opsparing">Opsparing</option>
          </select>
        </Field>
        <Field label="Kategori">
          <select className="bx-select" value={draft.category} onChange={(e) => set("category", e.target.value)}>
            {[...new Set([...CATEGORIES, draft.category])].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Beløb pr. betaling">
          <MoneyInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="Betales">
          <select className="bx-select" value={draft.interval} onChange={(e) => set("interval", Number(e.target.value) as Interval)}>
            {[1, 3, 6, 12].map((n) => (
              <option key={n} value={n}>
                {INTERVAL_LABEL[n]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={draft.kind === "indtægt" ? "Går ind på konto" : "Betales fra konto"}>
          <select className="bx-select" value={draft.accountId} onChange={(e) => set("accountId", e.target.value)}>
            {budget.accounts.length === 0 ? <option value="">Ingen konti endnu</option> : null}
            {budget.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        {budget.persons.length > 1 ? (
          <Field label="Hvis er den?">
            <select
              className="bx-select"
              value={draft.ownerId ?? ""}
              onChange={(e) => set("ownerId", e.target.value || null)}
            >
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
      {draft.interval > 1 && amount > 0 ? (
        <p className="bx-help">Svarer til {kr(amount / draft.interval)} pr. måned.</p>
      ) : null}
      {draft.kind === "udgift" ? (
        <label className="bx-check">
          <input type="checkbox" checked={!draft.bankExcluded} onChange={(e) => set("bankExcluded", !e.target.checked)} />
          <span>Tæller med som fast udgift, når rådighedsbeløbet regnes som banken gør (slå fra for mad, gaver o.l.)</span>
        </label>
      ) : null}
      <Field label="Aftalenummer eller tekst på kontoudskriften (valgfrit)" help="Bruges til at genkende posten, når du importerer en kontoudskrift.">
        <input
          className="bx-input"
          value={draft.agreementNo ?? ""}
          placeholder="Fx NORLYS 88213"
          onChange={(e) => set("agreementNo", e.target.value || undefined)}
        />
      </Field>
      {existing && existing.history.length > 0 ? (
        <div>
          <div className="bx-help" style={{ marginBottom: 4 }}>
            Tidligere beløb
          </div>
          {[...existing.history].reverse().map((h, i) => (
            <div className="bx-kv" key={i}>
              <span>{new Date(h.date).toLocaleDateString("da-DK")}</span>
              <span>
                {kr(h.from)} → {kr(h.to)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p className="bx-error" role="alert">{error}</p> : null}
    </Dialog>
  );
}
