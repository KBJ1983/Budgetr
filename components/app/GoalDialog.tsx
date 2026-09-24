"use client";

import { useState } from "react";
import { goalMonthly } from "@/lib/domain/calc";
import { GOAL_COLORS, newId } from "@/lib/domain/example";
import { addMonths, kr } from "@/lib/domain/format";
import type { Budget, Month, SavingsGoal } from "@/lib/domain/types";
import { Dialog, Field, MoneyInput, Seg } from "./ui";

export function GoalDialog({
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
  const existing = id ? budget.goals.find((g) => g.id === id) : undefined;
  const defaultAccount =
    budget.accounts.find((a) => a.kind === "opsparing")?.id ?? budget.accounts[0]?.id ?? "";
  const [g, setG] = useState<SavingsGoal>(
    existing ?? {
      id: newId(),
      name: "",
      color: GOAL_COLORS[budget.goals.length % GOAL_COLORS.length]!,
      mode: "target",
      target: 0,
      deadline: addMonths(now, 12),
      monthly: 0,
      saved: 0,
      extras: [],
      ownerId: budget.persons.length === 1 ? budget.persons[0]!.id : null,
      accountId: defaultAccount,
    },
  );
  const [error, setError] = useState("");
  const set = <K extends keyof SavingsGoal>(k: K, v: SavingsGoal[K]) => setG((x) => ({ ...x, [k]: v }));

  const save = () => {
    if (!g.name.trim()) return setError("Giv målet et navn.");
    if (!g.accountId) return setError("Vælg en konto. Opret en under Indstillinger.");
    if (g.mode === "target" && g.target <= 0) return setError("Skriv hvor meget du vil spare op.");
    const goal = { ...g, name: g.name.trim() };
    update((b) => ({
      ...b,
      goals: b.goals.some((x) => x.id === goal.id) ? b.goals.map((x) => (x.id === goal.id ? goal : x)) : [...b.goals, goal],
    }));
    onClose();
  };

  const remove = () => {
    if (!existing || !window.confirm(`Slet opsparingsmålet “${existing.name}”?`)) return;
    update((b) => ({
      ...b,
      goals: b.goals.filter((x) => x.id !== existing.id),
      scenarios: b.scenarios.map((sc) => ({
        ...sc,
        changes: sc.changes.filter((c) => !(c.kind === "removeGoal" && c.goalId === existing.id)),
      })),
    }));
    onClose();
  };

  const monthly = goalMonthly(g, now);

  return (
    <Dialog
      title={existing ? "Ret opsparingsmål" : "Nyt opsparingsmål"}
      onClose={onClose}
      footer={
        <>
          <div>
            {existing ? (
              <button type="button" className="bx-btn bx-btn-danger" onClick={remove}>
                Slet mål
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
        <input className="bx-input" value={g.name} autoFocus placeholder="Fx Udbetaling til hus" onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Seg
        label="Type af mål"
        value={g.mode}
        onChange={(v) => set("mode", v)}
        options={[
          { value: "target", label: "Fast beløb til en dato" },
          { value: "monthly", label: "Fast månedlig indbetaling" },
        ]}
      />
      <div className="bx-grid-2">
        {g.mode === "target" ? (
          <>
            <Field label="Mål">
              <MoneyInput value={g.target} onChange={(n) => set("target", n)} />
            </Field>
            <Field label="Senest">
              <input className="bx-input" type="month" value={g.deadline} min={now} onChange={(e) => set("deadline", e.target.value || now)} />
            </Field>
          </>
        ) : (
          <Field label="Indbetaling pr. måned">
            <MoneyInput value={g.monthly} onChange={(n) => set("monthly", n)} />
          </Field>
        )}
        <Field label="Sparet op indtil nu">
          <MoneyInput value={g.saved} onChange={(n) => set("saved", n)} />
        </Field>
        <Field label="Konto">
          <select className="bx-select" value={g.accountId} onChange={(e) => set("accountId", e.target.value)}>
            {budget.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        {budget.persons.length > 1 ? (
          <Field label="Hvis er målet?">
            <select className="bx-select" value={g.ownerId ?? ""} onChange={(e) => set("ownerId", e.target.value || null)}>
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

      <div>
        <div className="bx-section-head" style={{ marginBottom: 6 }}>
          <b style={{ fontSize: 13 }}>Ekstra indbetalinger</b>
          <button
            type="button"
            className="bx-btn"
            onClick={() =>
              set("extras", [...g.extras, { id: newId(), month: addMonths(now, 1), amount: 0, note: "Feriepenge" }])
            }
          >
            + Tilføj
          </button>
        </div>
        {g.extras.length === 0 ? <p className="bx-help">Fx feriepenge i maj eller en bonus. De sænker den månedlige opsparing.</p> : null}
        <div className="bx-list-edit">
          {g.extras.map((e, idx) => (
            <div className="bx-list-edit-row" key={e.id}>
              <Field label="Tekst">
                <input
                  className="bx-input"
                  value={e.note}
                  onChange={(ev) => set("extras", g.extras.map((x, i) => (i === idx ? { ...x, note: ev.target.value } : x)))}
                />
              </Field>
              <Field label="Beløb">
                <MoneyInput value={e.amount} onChange={(n) => set("extras", g.extras.map((x, i) => (i === idx ? { ...x, amount: n } : x)))} />
              </Field>
              <Field label="Måned">
                <input
                  className="bx-input"
                  type="month"
                  value={e.month}
                  onChange={(ev) => set("extras", g.extras.map((x, i) => (i === idx ? { ...x, month: ev.target.value || x.month } : x)))}
                />
              </Field>
              <button
                type="button"
                className="bx-x"
                aria-label={`Fjern ${e.note || "indbetaling"}`}
                onClick={() => set("extras", g.extras.filter((_, i) => i !== idx))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bx-note is-pos">
        {g.mode === "target"
          ? monthly > 0
            ? `Læg ${kr(monthly)} til side om måneden for at nå målet.`
            : "Målet er nået med det, der er sparet op og de ekstra indbetalinger."
          : `${kr(monthly)} om måneden – ${kr(g.saved + monthly * 12)} om et år.`}
      </div>
      <div>
        <span className="bx-help">Farve</span>
        <div className="bx-chips" style={{ marginTop: 6 }}>
          {GOAL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Farve ${c}`}
              aria-pressed={g.color === c}
              onClick={() => set("color", c)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: c,
                border: g.color === c ? "2px solid var(--tx)" : "2px solid transparent",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      </div>
      {error ? <p className="bx-error" role="alert">{error}</p> : null}
    </Dialog>
  );
}
