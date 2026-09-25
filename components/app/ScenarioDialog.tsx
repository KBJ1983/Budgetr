"use client";

import { useState } from "react";
import { newId } from "@/lib/domain/example";
import { kr } from "@/lib/domain/format";
import type { Budget, ScenarioChange } from "@/lib/domain/types";
import { Dialog, Field } from "./ui";

function describe(b: Budget, c: ScenarioChange): string {
  const itemName = (id: string) => b.items.find((i) => i.id === id)?.name ?? "Ukendt post";
  if (c.kind === "setAmount") return `${itemName(c.itemId)}: ${kr(c.amount)}`;
  if (c.kind === "editItem") {
    const p = c.patch;
    const parts = [
      p.name ? `nyt navn “${p.name}”` : "",
      p.amount !== undefined ? kr(p.amount) : "",
      p.accountId ? `fra ${b.accounts.find((a) => a.id === p.accountId)?.name ?? "anden konto"}` : "",
      p.active === true ? "aktiv" : p.active === false ? "ikke aktiv" : "",
      p.bankExcluded === false ? "med i rådighed" : p.bankExcluded === true ? "ikke med i rådighed" : "",
    ].filter(Boolean);
    return `${itemName(c.itemId)}: ${parts.join(", ")}`;
  }
  if (c.kind === "removeItem") return `${itemName(c.itemId)} fjernet`;
  if (c.kind === "addItem") return `Ny: ${c.item.name} ${kr(c.item.amount)}`;
  return `Opsparing: ${b.goals.find((g) => g.id === c.goalId)?.name ?? "mål"} fjernet`;
}

export function ScenarioDialog({
  budget,
  id,
  update,
  onSaved,
  onClose,
}: {
  budget: Budget;
  id: string | null;
  update: (fn: (b: Budget) => Budget) => void;
  onSaved: (id: string | null) => void;
  onClose: () => void;
}) {
  const existing = id ? budget.scenarios.find((s) => s.id === id) : undefined;
  const [name, setName] = useState(existing?.name ?? "");
  const [changes, setChanges] = useState<ScenarioChange[]>(existing?.changes ?? []);
  const [error, setError] = useState("");
  const removableGoals = budget.goals.filter((g) => !changes.some((c) => c.kind === "removeGoal" && c.goalId === g.id));

  const save = () => {
    if (!name.trim()) return setError("Giv scenariet et navn, fx “Ny bolig” eller “Barsel”.");
    const sid = existing?.id ?? newId();
    update((b) => ({
      ...b,
      scenarios: existing
        ? b.scenarios.map((s) => (s.id === sid ? { ...s, name: name.trim(), changes } : s))
        : [...b.scenarios, { id: sid, name: name.trim(), changes: [] }],
    }));
    onSaved(sid);
    onClose();
  };

  const remove = () => {
    if (!existing || !window.confirm(`Slet scenariet “${existing.name}”?`)) return;
    update((b) => ({ ...b, scenarios: b.scenarios.filter((s) => s.id !== existing.id) }));
    onSaved(null);
    onClose();
  };

  return (
    <Dialog
      title={existing ? "Redigér scenarie" : "Nyt scenarie"}
      onClose={onClose}
      footer={
        <>
          <div>
            {existing ? (
              <button type="button" className="bx-btn bx-btn-danger" onClick={remove}>
                Slet scenarie
              </button>
            ) : null}
          </div>
          <div>
            <button type="button" className="bx-btn" onClick={onClose}>
              Annullér
            </button>
            <button type="button" className="bx-btn bx-btn-primary" onClick={save}>
              {existing ? "Gem" : "Opret og vis"}
            </button>
          </div>
        </>
      }
    >
      <Field label="Navn">
        <input className="bx-input" value={name} autoFocus placeholder="Fx Nyt hus fra 2027" onChange={(e) => setName(e.target.value)} />
      </Field>
      {!existing ? (
        <p className="bx-help">
          Et scenarie starter som en kopi af det nuværende budget. Klik derefter på posterne for at ændre, fjerne eller tilføje – det
          nuværende budget bliver ikke rørt.
        </p>
      ) : (
        <>
          <div>
            <b style={{ fontSize: 13 }}>Ændringer</b>
            {changes.length === 0 ? <p className="bx-help">Ingen ændringer endnu. Klik på en post på Budget-fanen for at ændre den.</p> : null}
            {changes.map((c, i) => (
              <div className="bx-kv" key={i} style={{ alignItems: "center" }}>
                <span>{describe(budget, c)}</span>
                <button type="button" className="bx-btn-link" onClick={() => setChanges(changes.filter((_, j) => j !== i))}>
                  Fortryd
                </button>
              </div>
            ))}
          </div>
          {removableGoals.length > 0 ? (
            <Field label="Fjern et opsparingsmål i scenariet">
              <select
                className="bx-select"
                value=""
                onChange={(e) => e.target.value && setChanges([...changes, { kind: "removeGoal", goalId: e.target.value }])}
              >
                <option value="">Vælg mål …</option>
                {removableGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </>
      )}
      {error ? <p className="bx-error" role="alert">{error}</p> : null}
    </Dialog>
  );
}
