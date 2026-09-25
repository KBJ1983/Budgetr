"use client";

import Link from "next/link";
import { useState } from "react";
import { newId } from "@/lib/domain/example";
import type { Account, AccountKind, Budget, Person, SplitMode } from "@/lib/domain/types";
import { deleteBudget, resetExample, useSession } from "@/lib/store";
import { Dialog, Field, MoneyInput, Seg } from "./ui";

const KINDS: { value: AccountKind; label: string }[] = [
  { value: "løn", label: "Lønkonto" },
  { value: "budget", label: "Budgetkonto" },
  { value: "opsparing", label: "Opsparing" },
  { value: "anden", label: "Anden" },
];

export function SettingsDialog({
  budget,
  update,
  onClose,
}: {
  budget: Budget;
  update: (fn: (b: Budget) => Budget) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(budget.name);
  const [persons, setPersons] = useState<Person[]>(budget.persons);
  const [children, setChildren] = useState(budget.children);
  const [accounts, setAccounts] = useState<Account[]>(budget.accounts);
  const [mode, setMode] = useState<SplitMode>(budget.split.mode);
  const [fixed, setFixed] = useState<Record<string, number>>(budget.split.fixedPct);
  const [rule, setRule] = useState(budget.bankRule);
  const [error, setError] = useState("");
  const hasExample = !!useSession().state?.budgets.some((b) => b.id === "eksempel");

  const used = (accId: string) =>
    budget.items.some((i) => i.accountId === accId) || budget.goals.some((g) => g.accountId === accId);

  const save = () => {
    if (!name.trim()) return setError("Giv budgettet et navn.");
    if (persons.some((p) => !p.name.trim())) return setError("Alle personer skal have et navn.");
    if (accounts.some((a) => !a.name.trim())) return setError("Alle konti skal have et navn.");
    const personIds = new Set(persons.map((p) => p.id));
    const fixOwner = <T extends { ownerId: string | null }>(x: T): T =>
      x.ownerId && !personIds.has(x.ownerId) ? { ...x, ownerId: null } : x;
    update((b) => ({
      ...b,
      name: name.trim(),
      persons: persons.map((p) => ({ ...p, name: p.name.trim() })),
      children,
      accounts: accounts.map((a) => fixOwner({ ...a, name: a.name.trim() })),
      items: b.items.map(fixOwner),
      goals: b.goals.map(fixOwner),
      split: { mode, fixedPct: fixed },
      bankRule: rule,
    }));
    onClose();
  };

  return (
    <Dialog
      title="Indstillinger"
      wide
      onClose={onClose}
      footer={
        <>
          <div>
            {budget.id === "eksempel" ? (
              <button
                type="button"
                className="bx-btn"
                onClick={() => {
                  if (window.confirm("Nulstil eksemplet? Dine ændringer i eksemplet forsvinder.")) {
                    resetExample();
                    onClose();
                  }
                }}
              >
                Nulstil eksemplet
              </button>
            ) : (
              <button
                type="button"
                className="bx-btn bx-btn-danger"
                onClick={() => {
                  if (window.confirm(`Slet budgettet “${budget.name}”? Det kan ikke fortrydes. Tag evt. en sikkerhedskopi først.`)) {
                    deleteBudget(budget.id);
                    onClose();
                  }
                }}
              >
                Slet budget
              </button>
            )}
            <Link href="/app/start" className="bx-btn">
              Nyt budget
            </Link>
            {!hasExample ? (
              <button
                type="button"
                className="bx-btn"
                onClick={() => {
                  resetExample();
                  onClose();
                }}
              >
                Hent eksemplet
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
      <Field label="Budgettets navn">
        <input className="bx-input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <div>
        <div className="bx-section-head" style={{ marginBottom: 6 }}>
          <b style={{ fontSize: 14 }}>Dig og dem, du deler økonomi med</b>
          <button type="button" className="bx-btn" onClick={() => setPersons([...persons, { id: newId(), name: "" }])}>
            + Person
          </button>
        </div>
        <div className="bx-list-edit">
          {persons.map((p, idx) => (
            <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "end" }}>
              <div style={{ flex: 1 }}>
                <Field label={`Person ${idx + 1}`}>
                  <input
                    className="bx-input"
                    value={p.name}
                    onChange={(e) => setPersons(persons.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
                  />
                </Field>
              </div>
              {persons.length > 1 ? (
                <button
                  type="button"
                  className="bx-x"
                  aria-label={`Fjern ${p.name || "person"}`}
                  onClick={() => {
                    if (window.confirm(`Fjern ${p.name || "personen"}? Personens poster bliver fælles.`))
                      setPersons(persons.filter((x) => x.id !== p.id));
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <div className="bx-grid-2" style={{ marginTop: 10 }}>
          <Field label="Antal børn i husstanden">
            <input
              className="bx-input num"
              type="number"
              min={0}
              max={12}
              value={children}
              onChange={(e) => setChildren(Math.max(0, Math.min(12, Number(e.target.value) || 0)))}
            />
          </Field>
        </div>
      </div>

      {persons.length > 1 ? (
        <div>
          <b style={{ fontSize: 14 }}>Fordeling af fælles udgifter</b>
          <div style={{ marginTop: 8 }}>
            <Seg
              label="Fordeling"
              value={mode}
              onChange={setMode}
              options={[
                { value: "income", label: "Efter indkomst" },
                { value: "equal", label: "Ligeligt" },
                { value: "fixed", label: "Fast procent" },
              ]}
            />
          </div>
          {mode === "fixed" ? (
            <div className="bx-grid-2" style={{ marginTop: 10 }}>
              {persons.map((p) => (
                <Field key={p.id} label={`${p.name || "Person"} (%)`}>
                  <input
                    className="bx-input num"
                    type="number"
                    min={0}
                    max={100}
                    value={fixed[p.id] ?? Math.round(100 / persons.length)}
                    onChange={(e) => setFixed({ ...fixed, [p.id]: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </Field>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <div className="bx-section-head" style={{ marginBottom: 6 }}>
          <b style={{ fontSize: 14 }}>Konti</b>
          <button
            type="button"
            className="bx-btn"
            onClick={() => setAccounts([...accounts, { id: newId(), name: "", ownerId: null, kind: "anden" }])}
          >
            + Konto
          </button>
        </div>
        <div className="bx-list-edit">
          {accounts.map((a) => (
            <div className="bx-list-edit-row" key={a.id}>
              <Field label="Navn">
                <input
                  className="bx-input"
                  value={a.name}
                  onChange={(e) => setAccounts(accounts.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x)))}
                />
              </Field>
              <Field label="Type">
                <select
                  className="bx-select"
                  value={a.kind}
                  onChange={(e) =>
                    setAccounts(accounts.map((x) => (x.id === a.id ? { ...x, kind: e.target.value as AccountKind } : x)))
                  }
                >
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tilhører">
                <select
                  className="bx-select"
                  value={a.ownerId ?? ""}
                  onChange={(e) =>
                    setAccounts(accounts.map((x) => (x.id === a.id ? { ...x, ownerId: e.target.value || null } : x)))
                  }
                >
                  <option value="">{persons.length > 1 ? "Fælles" : "–"}</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || "Person"}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                className="bx-x"
                aria-label={`Fjern ${a.name || "konto"}`}
                disabled={used(a.id)}
                title={used(a.id) ? "Kontoen bruges af budgetposter" : undefined}
                style={used(a.id) ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                onClick={() => setAccounts(accounts.filter((x) => x.id !== a.id))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <p className="bx-help" style={{ marginTop: 6 }}>
          Faste overførsler regnes fra hver persons lønkonto til de konti, der betaler fælles eller egne udgifter.
        </p>
      </div>

      <div>
        <b style={{ fontSize: 14 }}>Vejledende krav til rådighedsbeløb</b>
        <div className="bx-grid-2" style={{ marginTop: 8 }}>
          <Field label="Pr. voksen pr. måned">
            <MoneyInput value={rule.perAdult} onChange={(n) => setRule({ ...rule, perAdult: n })} />
          </Field>
          <Field label="Pr. barn pr. måned">
            <MoneyInput value={rule.perChild} onChange={(n) => setRule({ ...rule, perChild: n })} />
          </Field>
        </div>
        <p className="bx-help" style={{ marginTop: 6 }}>
          En tommelfingerregel, ikke bankens egne satser. Spørg din bank, hvad de kræver.
        </p>
      </div>
      {error ? <p className="bx-error" role="alert">{error}</p> : null}
    </Dialog>
  );
}
