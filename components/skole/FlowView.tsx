import { useState } from "react";
import { canNext, caseById, STEP_COUNT, steps, totals, type Flow } from "@/lib/skole";
import { Check, Icon } from "./Icons";
import { Meter } from "./Meter";
import s from "./skole.module.css";
import { StepBody } from "./Steps";
import type { Update } from "./StudentApp";

interface Props {
  flow: Flow;
  update: Update;
  go: (step: number) => void;
  /** How many lines of step 2's pay slip are shown (0–3). */
  reveal: number;
  /** The reflection answers by step; each step's question is answered right there. */
  refl: Record<number, string>;
  onRefl: (step: number, text: string) => void;
  onBack: () => void;
  onFinish: () => void;
  onBudget: () => void;
}

export function FlowView({ flow, update, go, reveal, refl, onRefl, onBack, onFinish, onBudget }: Props) {
  const [closed, setClosed] = useState<Record<number, boolean>>({});
  const all = steps(caseById(flow.caseId));
  const cur = all[flow.step - 1]!;
  const t = totals(flow);
  const ok = canNext(flow, reveal >= 3);
  const last = flow.step === STEP_COUNT;
  const anyScen = Object.values(flow.scen).some(Boolean);
  const factOpen = !closed[flow.step];

  return (
    <div className={s.flow}>
      <nav className={s.progress} aria-label="Trin">
        <div className={s.dots}>
          {all.map((st, i) => {
            const n = i + 1;
            const isCur = n === flow.step;
            const done = n < flow.step && n <= flow.maxStep;
            return (
              <button
                key={n}
                type="button"
                className={s.dotBtn}
                disabled={n > flow.maxStep}
                aria-current={isCur ? "step" : undefined}
                aria-label={`Trin ${n}: ${st.short}`}
                onClick={() => go(n)}
              >
                {n > 1 && <span className={s.dotLine} data-on={n <= flow.maxStep || undefined} />}
                <span className={s.dot} data-state={isCur ? "cur" : done ? "done" : n <= flow.maxStep ? "seen" : undefined}>
                  {done ? <Check size={14} color="#0E1B2C" /> : n}
                </span>
                <span className={s.dotLabel} data-cur={isCur || undefined}>
                  {st.short}
                </span>
              </button>
            );
          })}
        </div>
        <span className={s.stepOf}>
          Trin {flow.step} af {STEP_COUNT} · {cur.short}
        </span>
      </nav>

      <div className={s.flowGrid} data-wide={flow.step === 1 || undefined}>
        <div className={s.col}>
          <div className={s.titleBlock}>
            <span className={s.kicker}>
              Trin {flow.step} · {cur.short}
            </span>
            <h1 className={s.q}>{cur.q}</h1>
          </div>

          <StepBody flow={flow} update={update} go={go} reveal={reveal} t={t} onBudget={onBudget} />

          {cur.fact && (
            <>
              <div className={s.fact}>
                <button type="button" className={s.factHead} aria-expanded={factOpen} onClick={() => setClosed((c) => ({ ...c, [flow.step]: factOpen }))}>
                  <span className={s.factQ}>?</span>
                  <span className={s.factTitle}>Hvorfor?</span>
                  <span className={s.factToggle}>{factOpen ? "Skjul" : "Vis"}</span>
                </button>
                {factOpen && <p className={s.factText}>{cur.fact}</p>}
              </div>
              <label className={s.refl}>
                <Icon name="chat" color="#5A6577" />
                <span className={s.reflBody}>
                  <b>{cur.refl}</b>
                  {cur.help && <span className={s.reflHelp}>{cur.help}</span>}
                  <textarea
                    className={s.textarea}
                    rows={3}
                    maxLength={1000}
                    placeholder="Skriv dit svar"
                    value={refl[flow.step] ?? ""}
                    onChange={(e) => onRefl(flow.step, e.target.value)}
                  />
                  <span className={s.reflNote}>Din lærer kan læse dit svar. Skriv ikke navne på dig selv eller andre.</span>
                </span>
              </label>
            </>
          )}

          <div className={s.nav}>
            <button type="button" className={s.btn} onClick={onBack}>
              Tilbage
            </button>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={!ok} onClick={() => (last ? onFinish() : go(flow.step + 1))}>
              {last ? "Se opsummering" : "Næste"}
            </button>
          </div>
        </div>

        {flow.step > 1 && <Meter t={t} diff={last && anyScen ? t.left - t.leftBase : null} />}
      </div>
    </div>
  );
}
