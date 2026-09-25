"use client";

import { durationLabel, kr, monthLabel, monthsBetween, parseMonth } from "@/lib/domain/format";
import { loanSummary, loanTimeline } from "@/lib/domain/loans";
import type { Budget, Month } from "@/lib/domain/types";
import type { Open } from "./BudgetApp";
import { Tile } from "./ui";

export function LoansTab({ budget, now, open }: { budget: Budget; now: Month; open: Open }) {
  const sum = loanSummary(budget, now);
  const tl = loanTimeline(budget, now);

  if (budget.loans.length === 0) {
    return (
      <div className="bx-empty">
        <b>Ingen lån endnu</b>
        <span>Tilføj restgæld, rente og ydelse, så regner budgetr ud, hvornår lånet er betalt, og hvad der frigives.</span>
        <button type="button" className="bx-btn bx-btn-primary" onClick={() => open({ kind: "loan", id: null })}>
          + Tilføj lån
        </button>
      </div>
    );
  }

  const totalBalance = budget.loans.reduce((a, l) => a + l.balance, 0);
  const index = new Map(sum.steps.map((s) => [s.name + s.month, s.index]));

  return (
    <>
      <div className="bx-section-head">
        <span className="bx-eyebrow">Udløb og frigivne beløb</span>
        <button type="button" className="bx-btn bx-btn-primary" onClick={() => open({ kind: "loan", id: null })}>
          + Tilføj lån
        </button>
      </div>
      <div className="bx-tiles">
        <Tile
          label="Frigives inden for 12 md."
          value={kr(sum.freedWithin12)}
          sub={sum.freedWithin12Names.join(", ") || "Intet lån udløber"}
          tone={sum.freedWithin12 > 0 ? "pos" : undefined}
        />
        <Tile
          label="Næste udløb"
          value={sum.next?.endMonth ? monthLabel(sum.next.endMonth, true) : "–"}
          sub={sum.next ? `${sum.next.loan.name}, ${kr(sum.next.freed)}/md.` : ""}
        />
        <Tile label="Frigivet i alt" value={kr(sum.freedTotal)} sub="pr. md., når alle er betalt" tone="hi" />
        <Tile label="Renter pr. måned" value={kr(sum.interestPerMonth)} sub={`Restgæld i alt ${kr(totalBalance)}`} />
      </div>

      {sum.steps.length > 0 ? (
        <section className="bx-card bx-section" aria-label="Frigivet ydelse over tid">
          <StepChart steps={sum.steps} now={now} />
        </section>
      ) : null}

      <section className="bx-card bx-section">
        <div className="bx-scroll-x">
          <table className="bx-table">
            <thead>
              <tr>
                <th style={{ width: 30 }} aria-label="Nummer" />
                <th>Lån</th>
                <th>Udløb</th>
                <th className="r">Tilbage</th>
                <th className="r">Ydelse</th>
                <th className="r">Restgæld</th>
                <th className="r">Rente</th>
                <th className="r bx-hide-sm">Renter/md.</th>
                <th style={{ minWidth: 110 }} className="bx-hide-sm">
                  Betalt af lånet
                </th>
              </tr>
            </thead>
            <tbody>
              {tl.map((s) => {
                const n = s.endMonth ? index.get(s.loan.name + s.endMonth) : undefined;
                return (
                  <tr
                    key={s.loan.id}
                    className="clickable"
                    tabIndex={0}
                    onClick={() => open({ kind: "loan", id: s.loan.id })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        open({ kind: "loan", id: s.loan.id });
                      }
                    }}
                  >
                    <td>{n ? <span className="bx-num-badge">{n}</span> : null}</td>
                    <td>
                      {s.loan.name}
                      {s.loan.bank || s.loan.note ? (
                        <div className="bx-muted">{[s.loan.bank, s.loan.note].filter(Boolean).join(" · ")}</div>
                      ) : null}
                    </td>
                    <td className={s.endMonth || s.loan.paused ? "" : "neg"}>
                      {s.loan.paused ? (
                        <span className="bx-tag is-muted">På pause</span>
                      ) : s.endMonth ? (
                        monthLabel(s.endMonth)
                      ) : (
                        "Ydelsen dækker ikke renten"
                      )}
                      {s.loan.bankEnd ? <div className="bx-muted">Banken: {s.loan.bankEnd}</div> : null}
                    </td>
                    <td className="r muted">{s.loan.paused ? "–" : durationLabel(s.monthsLeft)}</td>
                    <td className="r">
                      <b>{kr(s.payment)}</b>
                      {Math.round(s.freed) !== Math.round(s.payment) ? (
                        <div className="bx-muted">i budgettet {kr(s.freed)}</div>
                      ) : null}
                    </td>
                    <td className="r">{kr(s.loan.balance)}</td>
                    <td className="r">{s.loan.ratePct.toLocaleString("da-DK")} %</td>
                    <td className="r bx-hide-sm">{kr(s.interestThisMonth)}</td>
                    <td className="bx-hide-sm">
                      <div className="bx-progress" title={`${Math.round(s.progress * 100)} %`}>
                        <div style={{ width: `${s.progress * 100}%`, background: "var(--pos)" }} />
                      </div>
                      <span className="bx-muted">{Math.round(s.progress * 100)} %</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="bx-help" style={{ marginTop: 10 }}>
          Slutdatoen er beregnet ud fra restgæld, rente og ydelse – bankens egen slutdato står under, hvis den er angivet.
          Frigivet er det beløb, lånet fylder i budgettet, og det regnes med i “Luft fra …” på Budget-fanen.
        </p>
      </section>
    </>
  );
}

function StepChart({ steps, now }: { steps: { month: Month; freed: number; index: number }[]; now: Month }) {
  const W = 1000;
  const H = 240;
  const L = 44;
  const R = 16;
  const T = 26;
  const B = 26;
  const last = steps[steps.length - 1]!;
  const span = Math.max(12, monthsBetween(now, last.month) + 6);
  const max = last.freed;
  const x = (m: Month) => L + (monthsBetween(now, m) / span) * (W - L - R);
  const y = (v: number) => H - B - (v / max) * (H - T - B);
  let d = `M${L},${y(0)}`;
  let prev = 0;
  for (const s of steps) {
    d += ` L${x(s.month)},${y(prev)} L${x(s.month)},${y(s.freed)}`;
    prev = s.freed;
  }
  d += ` L${W - R},${y(prev)}`;
  const startYear = parseMonth(now).y;
  const years: number[] = [];
  for (let yy = startYear + 1; monthsBetween(now, `${yy}-01`) <= span; yy++) years.push(yy);
  const yearStep = years.length > 10 ? Math.ceil(years.length / 8) : 1;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const grid = { stroke: "var(--rule)" };
  const label = { fill: "var(--tx-3)", fontSize: 10 };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Frigivet ydelse pr. måned over tid" style={{ display: "block" }}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} style={grid} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" style={label}>
            {v >= 1000 ? `${(v / 1000).toLocaleString("da-DK", { maximumFractionDigits: 1 })}k` : Math.round(v)}
          </text>
        </g>
      ))}
      {years
        .filter((_, i) => i % yearStep === 0)
        .map((yy) => (
          <text key={yy} x={x(`${yy}-01`)} y={H - 8} textAnchor="middle" style={{ ...label, fill: "var(--tx-2)" }}>
            {yy}
          </text>
        ))}
      <path d={d} fill="none" style={{ stroke: "var(--pos)" }} strokeWidth={2.2} strokeLinejoin="round" />
      {steps.map((s) => (
        <g key={s.index}>
          <circle cx={x(s.month)} cy={y(s.freed)} r={3.5} style={{ fill: "var(--pos)" }} />
          <circle cx={x(s.month)} cy={y(s.freed) - 15} r={9} style={{ fill: "var(--card)", stroke: "var(--pos)" }} strokeWidth={1.4} />
          <text x={x(s.month)} y={y(s.freed) - 11} textAnchor="middle" fontSize={10} fontWeight={700} style={{ fill: "var(--pos)" }}>
            {s.index}
          </text>
        </g>
      ))}
    </svg>
  );
}
