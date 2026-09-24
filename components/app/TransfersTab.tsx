"use client";

import { accountBalances } from "@/lib/domain/calc";
import { kr } from "@/lib/domain/format";
import { computeTransfers, obsoleteTransfers, type Transfer } from "@/lib/domain/transfers";
import type { Budget, Month } from "@/lib/domain/types";
import { accountName } from "./helpers";

const COLORS = ["var(--pos)", "var(--blue)", "var(--warn)", "var(--slate)", "var(--neg)"];

export function TransfersTab({
  budget,
  now,
  update,
}: {
  budget: Budget;
  now: Month;
  update: (fn: (b: Budget) => Budget) => void;
}) {
  const transfers = computeTransfers(budget, now);
  const obsolete = obsoleteTransfers(budget, transfers);
  const pending = transfers.filter((t) => t.needsUpdate || t.registered === undefined);
  const balances = accountBalances(budget, now, transfers);

  const setRegistered = (list: { key: string; amount: number | undefined }[]) =>
    update((b) => {
      const reg = { ...b.registeredTransfers };
      for (const { key, amount } of list) {
        if (amount === undefined) delete reg[key];
        else reg[key] = amount;
      }
      return { ...b, registeredTransfers: reg };
    });

  if (transfers.length === 0 && obsolete.length === 0) {
    return (
      <div className="bx-empty">
        <b>Ingen faste overførsler</b>
        <span>
          Når udgifter betales fra en budgetkonto eller en opsparingskonto, regner budgetr ud, hvor meget der skal overføres fra
          lønkontoen hver måned.
        </span>
      </div>
    );
  }

  return (
    <>
      {pending.length > 0 ? (
        <div className="bx-note" style={{ marginBottom: 12 }} role="status">
          <span>
            {pending.length === 1 ? "1 fast overførsel skal" : `${pending.length} faste overførsler skal`} oprettes eller rettes i
            netbanken.
          </span>
          <button
            type="button"
            className="bx-btn"
            onClick={() => setRegistered(pending.map((t) => ({ key: t.key, amount: t.amount })))}
          >
            Markér alle som rettet
          </button>
        </div>
      ) : (
        <div className="bx-note is-pos" style={{ marginBottom: 12 }} role="status">
          Alle faste overførsler passer med budgettet.
        </div>
      )}

      <div className="bx-two">
        <section className="bx-card" aria-label="Pengestrømme mellem konti" style={{ maxWidth: 640 }}>
          <div className="bx-eyebrow" style={{ marginBottom: 10 }}>
            Faste overførsler
          </div>
          <FlowChart budget={budget} transfers={transfers} />
        </section>
        <section className="bx-card" aria-labelledby="h-saldo">
          <div className="bx-eyebrow" id="h-saldo" style={{ marginBottom: 10 }}>
            Konti pr. måned
          </div>
          {budget.accounts.map((a) => {
            const bal = balances.find((x) => x.accountId === a.id);
            return (
              <div key={a.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>
                <div className="bx-kv">
                  <span style={{ color: "var(--tx)" }}>
                    <b>{a.name}</b>
                  </span>
                  <span className={(bal?.net ?? 0) >= 0 ? "pos" : "neg"}>{kr(bal?.net ?? 0, { sign: true })}</span>
                </div>
                <div className="bx-kv">
                  <span className="muted">
                    Ind {kr(bal?.inflow ?? 0)} · Ud {kr(bal?.outflow ?? 0)}
                  </span>
                  <span />
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <section className="bx-card bx-section">
        <div className="bx-scroll-x">
          <table className="bx-table">
            <thead>
              <tr>
                <th>Fra → til</th>
                <th className="r">Budgettet kræver</th>
                <th className="r">I netbanken</th>
                <th>Status</th>
                <th aria-label="Handling" />
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.key}>
                  <td>
                    <b>
                      {accountName(budget, t.from)} → {accountName(budget, t.to)}
                    </b>
                    <div className="bx-muted">pr. måned · auto</div>
                  </td>
                  <td className="r">
                    <b>{kr(t.amount)}</b>
                  </td>
                  <td className="r">{t.registered === undefined ? <span className="muted">ikke oprettet</span> : kr(t.registered)}</td>
                  <td>
                    {t.registered === undefined ? (
                      <span className="bx-tag is-warn">Skal oprettes</span>
                    ) : t.needsUpdate ? (
                      <span className="bx-tag is-warn">
                        Skal rettes: {kr(t.registered)} → {kr(t.amount)}
                      </span>
                    ) : (
                      <span className="bx-tag">Passer</span>
                    )}
                  </td>
                  <td className="r">
                    {t.needsUpdate || t.registered === undefined ? (
                      <button type="button" className="bx-btn" onClick={() => setRegistered([{ key: t.key, amount: t.amount }])}>
                        Er rettet
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {obsolete.map((o) => (
                <tr key={o.key}>
                  <td>
                    <b>
                      {accountName(budget, o.from)} → {accountName(budget, o.to)}
                    </b>
                    <div className="bx-muted">bruges ikke længere</div>
                  </td>
                  <td className="r">0 kr</td>
                  <td className="r">{kr(o.amount)}</td>
                  <td>
                    <span className="bx-tag is-warn">Skal stoppes</span>
                  </td>
                  <td className="r">
                    <button type="button" className="bx-btn" onClick={() => setRegistered([{ key: o.key, amount: undefined }])}>
                      Er stoppet
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="bx-help" style={{ marginTop: 10 }}>
          Beløbene følger fordelingen og rundes op til hele hundreder. Når du ændrer budgettet, får du besked her, hvis en fast
          overførsel skal rettes i netbanken.
        </p>
      </section>
    </>
  );
}

function FlowChart({ budget, transfers }: { budget: Budget; transfers: Transfer[] }) {
  const froms = [...new Set(transfers.map((t) => t.from))];
  const tos = [...new Set(transfers.map((t) => t.to))];
  if (froms.length === 0) return <p className="bx-help">Ingen overførsler at vise.</p>;
  const W = 420;
  const BOX_W = 138;
  const BOX_H = 44;
  const GAP = 26;
  const rows = Math.max(froms.length, tos.length);
  const H = rows * BOX_H + (rows - 1) * GAP + 8;
  const max = Math.max(...transfers.map((t) => t.amount));
  const yOf = (i: number, n: number) => {
    const total = n * BOX_H + (n - 1) * GAP;
    return (H - total) / 2 + i * (BOX_H + GAP);
  };
  const outSum = (id: string) => transfers.filter((t) => t.from === id).reduce((a, t) => a + t.amount, 0);
  const inSum = (id: string) => transfers.filter((t) => t.to === id).reduce((a, t) => a + t.amount, 0);
  const box = { fill: "var(--card-2)", stroke: "var(--rule)" };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Faste overførsler mellem konti" style={{ display: "block" }}>
      {transfers.map((t, idx) => {
        const fi = froms.indexOf(t.from);
        const ti = tos.indexOf(t.to);
        const y1 = yOf(fi, froms.length) + BOX_H / 2;
        const y2 = yOf(ti, tos.length) + BOX_H / 2;
        const x1 = BOX_W + 2;
        const x2 = W - BOX_W - 2;
        const mx = (x1 + x2) / 2;
        return (
          <path
            key={idx}
            d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
            fill="none"
            style={{ stroke: COLORS[fi % COLORS.length] }}
            strokeOpacity={0.8}
            strokeWidth={Math.max(2.5, (t.amount / max) * 14)}
          >
            <title>
              {accountName(budget, t.from)} → {accountName(budget, t.to)}: {kr(t.amount)}
            </title>
          </path>
        );
      })}
      {froms.map((id, i) => (
        <g key={id}>
          <rect x={2} y={yOf(i, froms.length)} width={BOX_W} height={BOX_H} rx={8} style={box} />
          <text x={12} y={yOf(i, froms.length) + 19} fontSize={11} fontWeight={700} style={{ fill: "var(--tx)" }}>
            {trim(accountName(budget, id))}
          </text>
          <text x={12} y={yOf(i, froms.length) + 34} fontSize={10} style={{ fill: "var(--tx-2)" }}>
            Ud {kr(outSum(id))}
          </text>
        </g>
      ))}
      {tos.map((id, i) => (
        <g key={id}>
          <rect x={W - BOX_W - 2} y={yOf(i, tos.length)} width={BOX_W} height={BOX_H} rx={8} style={box} />
          <text x={W - BOX_W + 8} y={yOf(i, tos.length) + 19} fontSize={11} fontWeight={700} style={{ fill: "var(--tx)" }}>
            {trim(accountName(budget, id))}
          </text>
          <text x={W - BOX_W + 8} y={yOf(i, tos.length) + 34} fontSize={10} style={{ fill: "var(--tx-2)" }}>
            Ind {kr(inSum(id))}
          </text>
        </g>
      ))}
    </svg>
  );
}

const trim = (s: string) => (s.length > 20 ? `${s.slice(0, 19)}…` : s);
