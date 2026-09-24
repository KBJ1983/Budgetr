"use client";

import { goalMonthly, goalProgress } from "@/lib/domain/calc";
import { kr, monthLabel, monthsBetween } from "@/lib/domain/format";
import type { Budget, Month } from "@/lib/domain/types";
import type { Open } from "./BudgetApp";
import { accountName, ownerName } from "./helpers";
import { Tile } from "./ui";

export function GoalsTab({ budget, now, open }: { budget: Budget; now: Month; open: Open }) {
  const total = budget.goals.reduce((a, g) => a + goalMonthly(g, now), 0);
  const saved = budget.goals.reduce((a, g) => a + g.saved, 0);

  return (
    <>
      <div className="bx-section-head">
        <span className="bx-eyebrow">Opsparingsmål</span>
        <button type="button" className="bx-btn bx-btn-primary" onClick={() => open({ kind: "goal", id: null })}>
          + Nyt opsparingsmål
        </button>
      </div>
      {budget.goals.length === 0 ? (
        <div className="bx-empty">
          <b>Ingen opsparingsmål endnu</b>
          <span>Spar op til et fast beløb inden en dato, eller læg et fast beløb til side hver måned.</span>
        </div>
      ) : (
        <>
          <div className="bx-tiles is-3" style={{ marginBottom: 16 }}>
            <Tile label="Opsparing pr. måned" value={kr(total)} sub="alle mål tilsammen" tone="hi" />
            <Tile label="Sparet op" value={kr(saved)} sub="indtil nu" />
            <Tile label="Om et år" value={kr(saved + total * 12)} sub="med de nuværende indbetalinger" tone="pos" />
          </div>
          <div className="bx-goals">
            {budget.goals.map((g) => {
              const m = goalMonthly(g, now);
              const p = goalProgress(g);
              const left = monthsBetween(now, g.deadline);
              const extras = g.extras.filter((e) => monthsBetween(now, e.month) >= 0);
              return (
                <button key={g.id} type="button" className="bx-goal" onClick={() => open({ kind: "goal", id: g.id })}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <b style={{ fontSize: 14 }}>
                      <span className="bx-dot" style={{ background: g.color }} />
                      {g.name}
                    </b>
                    <span className="bx-tag">{g.mode === "target" ? "Fast beløb" : "Pr. md."}</span>
                  </div>
                  <div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--pos)" }}>
                    {kr(m)} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--tx-2)", fontVariantNumeric: "normal" }}>pr. md.</span>
                  </div>
                  {g.mode === "target" ? (
                    <>
                      <div className="bx-progress">
                        <div style={{ width: `${p * 100}%`, background: g.color }} />
                      </div>
                      <span className="bx-muted">
                        {kr(g.saved)} af {kr(g.target)} · {Math.round(p * 100)} % ·{" "}
                        {left > 0 ? `${left} md. tilbage (${monthLabel(g.deadline)})` : `mål: ${monthLabel(g.deadline)}`}
                      </span>
                    </>
                  ) : (
                    <span className="bx-muted">
                      Løbende · sparet {kr(g.saved)} · om et år {kr(g.saved + m * 12)}
                    </span>
                  )}
                  {extras.length > 0 ? (
                    <span className="bx-muted">
                      Ekstra: {extras.map((e) => `${e.note || "Indbetaling"} ${kr(e.amount)} i ${monthLabel(e.month)}`).join(", ")}
                    </span>
                  ) : null}
                  <span className="bx-muted">
                    {accountName(budget, g.accountId)}
                    {ownerName(budget, g.ownerId) ? ` · ${ownerName(budget, g.ownerId)}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="bx-help" style={{ marginTop: 12 }}>
            Opsparingsmålene indgår i budgettet som opsparing på den valgte konto. Feriepenge og bonus kan lægges ind som ekstra
            indbetalinger og sænker den månedlige opsparing.
          </p>
        </>
      )}
    </>
  );
}
