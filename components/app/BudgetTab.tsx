"use client";

import { accountBalances, allItems, monthly, summarize } from "@/lib/domain/calc";
import { INTERVAL_LABEL, kr, monthLabel } from "@/lib/domain/format";
import { compareScenario } from "@/lib/domain/scenario";
import { computeTransfers } from "@/lib/domain/transfers";
import type { Budget, BudgetItem, Month, Scenario } from "@/lib/domain/types";
import type { Open } from "./BudgetApp";
import { ownerName } from "./helpers";
import { Tile } from "./ui";

const tone = (n: number) => (n >= 0 ? "pos" : "neg");

export function BudgetTab({
  budget,
  view,
  scenario,
  now,
  open,
  onScenario,
}: {
  budget: Budget;
  view: Budget;
  scenario: Scenario | undefined;
  now: Month;
  open: Open;
  onScenario: (id: string | null) => void;
}) {
  const s = summarize(view, now);
  const shared = view.persons.length > 1;
  const transfers = computeTransfers(view, now).map((t) => ({ from: t.from, to: t.to, amount: t.amount }));
  const balances = accountBalances(view, now, transfers);
  const items = allItems(view, now);
  const comparison = scenario ? compareScenario(budget, scenario, now) : null;
  const changedIds = new Set(
    (scenario?.changes ?? []).flatMap((c) => (c.kind === "setAmount" ? [c.itemId] : c.kind === "addItem" ? [c.item.id] : [])),
  );
  const incomeCats = [...new Set(view.items.filter((i) => i.kind === "indtægt").map((i) => i.category))].map((c, idx) =>
    idx === 0 ? c : c.toLowerCase(),
  );

  if (view.items.length === 0 && view.goals.length === 0) {
    return (
      <div className="bx-empty">
        <b>Budgettet er tomt</b>
        <span>Tilføj din løn og dine faste udgifter, eller importér en kontoudskrift.</span>
        <button type="button" className="bx-btn bx-btn-primary" onClick={() => open({ kind: "item", id: null })}>
          + Ny budgetpost
        </button>
      </div>
    );
  }

  const openItem = (i: BudgetItem) => {
    if (i.id.startsWith("goal:")) open({ kind: "goal", id: i.id.slice(5) });
    else open({ kind: "item", id: i.id });
  };

  return (
    <>
      <div className="bx-chips" aria-label="Scenarier">
        <button type="button" className="bx-chip" aria-pressed={!scenario} onClick={() => onScenario(null)}>
          Nuværende
        </button>
        {budget.scenarios.map((sc) => (
          <button
            key={sc.id}
            type="button"
            className="bx-chip is-scenario"
            aria-pressed={scenario?.id === sc.id}
            onClick={() => onScenario(sc.id)}
          >
            {sc.name}
          </button>
        ))}
        <button type="button" className="bx-chip" onClick={() => open({ kind: "scenario", id: null })}>
          + Nyt scenarie
        </button>
      </div>

      {scenario && comparison ? (
        <div className="bx-card bx-section" style={{ marginTop: 14, background: "var(--slate-bg)", borderColor: "var(--slate-rule)" }}>
          <div className="bx-section-head" style={{ marginBottom: 8 }}>
            <b style={{ color: "var(--slate)", fontSize: 13 }}>
              ● {scenario.name} · holdt op mod nuværende budget · {scenario.changes.length}{" "}
              {scenario.changes.length === 1 ? "ændring" : "ændringer"}
            </b>
            <button type="button" className="bx-btn" onClick={() => open({ kind: "scenario", id: scenario.id })}>
              Redigér scenarie
            </button>
          </div>
          <div className="bx-chips">
            <Delta label="Indtægter" value={comparison.income} goodWhenUp />
            <Delta label="Faste udgifter" value={comparison.expenses} />
            <Delta label="Opsparing" value={comparison.savings} neutral />
            <Delta label="Tilbage efter opsparing" value={comparison.leftAfterSavings} goodWhenUp />
            <Delta label="Rådighedsbeløb" value={comparison.disposable} goodWhenUp />
          </div>
          {comparison.lines.length > 0 ? (
            <div style={{ marginTop: 12, maxWidth: 520 }}>
              {comparison.lines.map((l, idx) => (
                <div className="bx-kv" key={idx}>
                  <span>{l.label}</span>
                  <span className={l.delta === null ? "muted" : l.delta > 0 ? "neg" : "pos"}>
                    {l.delta === null ? "fjernet" : l.removed ? `fjernet (${kr(l.delta, { sign: true })})` : kr(l.delta, { sign: true })}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <p className="bx-help" style={{ marginTop: 10 }}>
            Klik på en post for at ændre den i scenariet. Det nuværende budget bliver ikke rørt.
          </p>
        </div>
      ) : null}

      <p className="bx-lead">
        {shared ? "Husstanden har" : "Du har"} <b className="num">{kr(s.income)}</b> i indtægter og{" "}
        <b className="num">{kr(s.expenses)}</b> i faste udgifter. Tilbage pr. måned:{" "}
        <b className={`num ${tone(s.left)}`}>{kr(s.left)}</b>.
        {s.savings > 0 ? (
          <>
            {" "}
            Efter opsparing på <span className="num">{kr(s.savings)}</span> er der{" "}
            <b className={`num ${tone(s.leftAfterSavings)}`}>{kr(s.leftAfterSavings)}</b> tilbage.
          </>
        ) : null}
      </p>
      <p className="bx-muted" style={{ margin: "0 0 16px" }}>
        {s.risingItems.length > 0
          ? `${s.risingItems.length} ${s.risingItems.length === 1 ? "udgift er" : "udgifter er"} steget mindst 10 % det seneste år: ${s.risingItems.map((i) => i.name).join(", ")}.`
          : "Ingen udgifter er steget mindst 10 % det seneste år."}
      </p>

      <div className="bx-tiles">
        <Tile label="Nettoindtægt" value={kr(s.income)} sub={incomeCats.join(" og ") || "pr. måned"} />
        <Tile label="Rådighedsbeløb" value={kr(s.disposable)} sub="pr. måned" tone="hi" />
        <Tile
          label={s.overRequirement >= 0 ? "Luft over kravet" : "Under kravet"}
          value={kr(Math.abs(s.overRequirement))}
          sub="pr. måned"
          tone={s.overRequirement >= 0 ? "pos" : "neg"}
        />
        {s.nextFreed ? (
          <Tile
            label={`Luft fra ${monthLabel(s.nextFreed.month)}`}
            value={kr(s.nextFreed.overRequirement)}
            sub={`+${kr(s.nextFreed.amount)} frigives: ${s.nextFreed.name}`}
            tone={s.nextFreed.overRequirement >= 0 ? "pos" : "neg"}
          />
        ) : (
          <Tile label="Opsparing" value={kr(s.savings)} sub="pr. måned" />
        )}
      </div>

      <section className="bx-section" aria-labelledby="h-konti">
        <div className="bx-section-head">
          <h2 id="h-konti">Konti og budgetposter</h2>
          <span className="bx-muted">Klik på en post for at rette den</span>
        </div>
        <div className="bx-accounts">
          {view.accounts.map((acc, idx) => {
            const accItems = items
              .filter((i) => i.accountId === acc.id)
              .sort((a, b) => kindOrder(a) - kindOrder(b) || monthly(b) - monthly(a));
            const bal = balances.find((x) => x.accountId === acc.id);
            const net = bal?.net ?? 0;
            const status =
              acc.kind === "løn"
                ? { text: `Tilbage ${kr(net)}`, cls: tone(net) }
                : net >= 0
                  ? { text: net < 1 ? "Dækket" : `Dækket, overskud ${kr(net)}`, cls: "pos" }
                  : { text: `Mangler ${kr(-net)}`, cls: "neg" };
            return (
              <details className="bx-acc" key={acc.id} open={idx === 0}>
                <summary>
                  <span className="bx-acc-title">
                    <span className="chev" aria-hidden="true">
                      ›
                    </span>
                    <b>{acc.name}</b>
                    <span className="bx-muted">
                      {acc.ownerId ? `Tilhører ${ownerName(view, acc.ownerId)}` : shared ? "Fælles konto" : "Konto"} ·{" "}
                      {accItems.length} {accItems.length === 1 ? "post" : "poster"}
                    </span>
                  </span>
                  <span className={`num ${status.cls}`}>{status.text}</span>
                </summary>
                <div className="bx-rows">
                  {accItems.length === 0 ? (
                    <div className="bx-row" style={{ cursor: "default" }}>
                      <span className="muted">Ingen poster på kontoen endnu.</span>
                    </div>
                  ) : null}
                  {transfers
                    .filter((t) => t.to === acc.id)
                    .map((t) => (
                      <div key={`t-${t.from}`} className="bx-row" style={{ cursor: "default" }}>
                        <span className="bx-row-name">
                          <span>Overførsel fra {view.accounts.find((a) => a.id === t.from)?.name}</span>
                          <small>Fast overførsel · følger fordelingen</small>
                        </span>
                        <span className="bx-hide-sm" />
                        <span className="bx-row-amt blue">+{kr(t.amount)}</span>
                      </div>
                    ))}
                  {accItems.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      className={`bx-row${changedIds.has(i.id) ? " is-changed" : ""}`}
                      onClick={() => openItem(i)}
                    >
                      <span className="bx-row-name">
                        <span>{i.name}</span>
                        <small>
                          {[
                            i.category,
                            ownerName(view, i.ownerId),
                            i.bankExcluded ? "ikke med i rådighed" : "",
                            i.agreementNo ? `aftalenr. ${i.agreementNo}` : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </span>
                      <span className="bx-hide-sm">
                        {i.history.length > 0 ? (
                          <span className="bx-tag is-muted" title="Tidligere beløb er gemt">
                            før {kr(i.history[i.history.length - 1]!.from)}
                          </span>
                        ) : null}
                      </span>
                      <span className={`bx-row-amt ${i.kind === "indtægt" ? "pos" : ""}`}>
                        {i.kind === "indtægt" ? "+" : "−"}
                        {kr(i.amount)}
                        {i.interval > 1 ? <small>{INTERVAL_LABEL[i.interval]} · {kr(monthly(i))}/md.</small> : null}
                      </span>
                    </button>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
        {view.accounts.length === 0 ? (
          <p className="bx-help">Opret en konto under Indstillinger for at fordele posterne.</p>
        ) : null}
      </section>

      <div className="bx-two bx-section">
        <section className="bx-card" aria-labelledby="h-bank">
          <div className="bx-section-head">
            <h2 id="h-bank">Rådighedsbeløb som banken regner det</h2>
            <span className="bx-muted">
              Tommelfingerregel for {view.persons.length || 1} {view.persons.length === 1 ? "voksen" : "voksne"}
              {view.children > 0 ? ` + ${view.children} ${view.children === 1 ? "barn" : "børn"}` : ""}
            </span>
          </div>
          <div className="bx-tiles is-3">
            <Tile label="Nettoindtægt" value={kr(s.income)} sub="uden ekstra indtjening" />
            <Tile
              label="Faste udgifter"
              value={kr(s.bankExpenses)}
              sub={`${kr(s.bankExcluded.reduce((a, x) => a + x.amount, 0))} er ikke medregnet`}
            />
            <Tile label="Rådighedsbeløb" value={kr(s.disposable)} sub="pr. måned" tone="hi" />
            <Tile label="Vejledende krav" value={kr(s.requirement)} sub="ikke bankens egne satser" />
            <Tile
              label={s.overRequirement >= 0 ? "Luft over kravet" : "Under kravet"}
              value={kr(Math.abs(s.overRequirement))}
              sub="pr. måned"
              tone={s.overRequirement >= 0 ? "pos" : "neg"}
            />
            {s.nextFreed ? (
              <Tile
                label={`Luft fra ${monthLabel(s.nextFreed.month)}`}
                value={kr(s.nextFreed.overRequirement)}
                sub={`+${kr(s.nextFreed.amount)} frigives: ${s.nextFreed.name}`}
                tone={s.nextFreed.overRequirement >= 0 ? "pos" : "neg"}
              />
            ) : (
              <Tile label="Lån" value="Ingen" sub="der udløber" />
            )}
          </div>
          {s.bankExcluded.length > 0 ? (
            <>
              <div style={{ marginTop: 14, fontSize: 12, color: "var(--tx-2)" }}>Ikke medregnet som faste udgifter</div>
              <div style={{ marginTop: 6 }}>
                {s.bankExcluded.map((x) => (
                  <div className="bx-kv" key={x.id}>
                    <span>{x.name}</span>
                    <span>{kr(x.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          <p className="bx-help" style={{ marginTop: 10 }}>
            Mad, opsparing og gaver holdes ude, som banken gør, når I søger lån. Kravet er en tommelfingerregel på{" "}
            {kr(view.bankRule.perAdult)} pr. voksen og {kr(view.bankRule.perChild)} pr. barn og kan ændres under Indstillinger.
          </p>
        </section>

        {shared ? (
          <section className="bx-card" aria-labelledby="h-hvem">
            <div className="bx-eyebrow" id="h-hvem" style={{ marginBottom: 10 }}>
              Hvem betaler hvad
            </div>
            <div className="bx-kv" style={{ fontSize: 12 }}>
              <span>
                Fælles udgifter fordeles{" "}
                {view.split.mode === "income" ? "efter fast indkomst" : view.split.mode === "equal" ? "ligeligt" : "med fast procent"}
              </span>
              <span>{s.persons.map((p) => `${p.name} ${Math.round(p.share * 100)} %`).join(" · ")}</span>
            </div>
            <div className="bx-split-bar" style={{ margin: "6px 0 14px" }}>
              {s.persons.map((p, i) => (
                <div key={p.personId} style={{ width: `${p.share * 100}%`, background: i % 2 ? "var(--blue)" : "var(--pos)" }} />
              ))}
            </div>
            <div className="bx-persons">
              {s.persons.map((p) => {
                const toShared = transfers
                  .filter((t) => view.accounts.find((a) => a.id === t.from)?.ownerId === p.personId)
                  .filter((t) => view.accounts.find((a) => a.id === t.to)?.ownerId === null);
                return (
                  <div key={p.personId} className="bx-card" style={{ background: "var(--card-2)" }}>
                    <b style={{ fontSize: 15 }}>{p.name}</b>
                    <div style={{ marginTop: 8 }}>
                      <div className="bx-kv">
                        <span>Faste indtægter</span>
                        <span>{kr(p.income)}</span>
                      </div>
                      <div className="bx-kv">
                        <span>Egne faste udgifter</span>
                        <span>{kr(p.ownExpenses)}</span>
                      </div>
                      <div className="bx-kv">
                        <span>Andel af fælles udgifter ({Math.round(p.share * 100)} %)</span>
                        <span>{kr(p.sharedExpenseShare)}</span>
                      </div>
                      {toShared.map((t) => (
                        <div className="bx-kv" key={t.to}>
                          <span>Overføres til {view.accounts.find((a) => a.id === t.to)?.name}</span>
                          <span className="blue">{kr(t.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className={`bx-big ${tone(p.disposable)}`}>{kr(p.disposable)}</div>
                    <div className="bx-muted">til rådighed pr. måned</div>
                    <div className="bx-hr" />
                    <div className="bx-kv">
                      <span>Opsparing i alt</span>
                      <span>{kr(p.ownSavings + p.sharedSavingsShare)}</span>
                    </div>
                    <div className="bx-kv">
                      <span>Tilbage efter opsparing</span>
                      <span className={tone(p.leftAfterSavings)}>{kr(p.leftAfterSavings)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="bx-card">
            <div className="bx-eyebrow" style={{ marginBottom: 10 }}>
              Deler du økonomi?
            </div>
            <p style={{ margin: 0, color: "var(--tx-2)", lineHeight: 1.55 }}>
              Bor du alene, springer du det her over. Tilføjer du en person under Indstillinger, fordeles fælles udgifter efter
              indkomst, ligeligt eller med en fast procent.
            </p>
          </section>
        )}
      </div>
    </>
  );
}

const kindOrder = (i: BudgetItem) => (i.kind === "indtægt" ? 0 : i.kind === "udgift" ? 1 : 2);

function Delta({ label, value, goodWhenUp, neutral }: { label: string; value: number; goodWhenUp?: boolean; neutral?: boolean }) {
  const cls = neutral || Math.round(value) === 0 ? "" : (value > 0) === !!goodWhenUp ? "pos" : "neg";
  return (
    <span className="bx-pill">
      {label} <b className={`num ${cls}`}>{kr(value, { sign: true })}</b>
    </span>
  );
}
