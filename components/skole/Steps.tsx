import { useState } from "react";
import {
  addMonths, BOLIG, BUFFER_MAX, CASES, caseById, dreamMonthly, FASTE, HVERDAG, kr, LEVELS, MAX_OWN, monthYear, MONTHS_MAX, MONTHS_MIN, scenarios, signedKr,
  type Case, type Flow, type Own, type Totals,
} from "@/lib/skole";
import { Avatar } from "./Avatar";
import { Check, Icon } from "./Icons";
import s from "./skole.module.css";
import type { Update } from "./StudentApp";

interface Props {
  flow: Flow;
  update: Update;
  go: (step: number) => void;
  reveal: number;
  t: Totals;
}

/** The body of the step on screen. */
export function StepBody({ flow, update, go, reveal, t }: Props) {
  const c = caseById(flow.caseId);
  switch (flow.step) {
    case 1:
      return <CasePick flow={flow} update={update} />;
    case 2:
      return <Pay c={c} reveal={reveal} />;
    case 3:
      return <Bolig flow={flow} update={update} />;
    case 4:
      return (
        <>
          <Faste flow={flow} update={update} t={t} />
          <OwnList title="Egne faste udgifter" placeholder="Fx Fitness" list={flow.cFaste} onChange={(cFaste) => update({ cFaste })} />
        </>
      );
    case 5:
      return <Hverdag flow={flow} update={update} />;
    case 6:
      return (
        <>
          <Savings c={c} flow={flow} update={update} />
          <OwnList title="Anden opsparing" placeholder="Fx Ferie, Gaver, Pension" list={flow.cOps} onChange={(cOps) => update({ cOps })} />
        </>
      );
    case 7:
      return <Result c={c} t={t} go={go} />;
    default:
      return <Scenarios c={c} flow={flow} update={update} />;
  }
}

function CasePick({ flow, update }: { flow: Flow; update: Update }) {
  return (
    <div className={s.caseGrid}>
      {CASES.map((x) => {
        const on = flow.caseId === x.id;
        return (
          <button key={x.id} type="button" className={`${s.choice} ${s.caseCard}`} aria-pressed={on} onClick={() => update({ caseId: x.id })}>
            {on && (
              <span className={s.badge}>
                <Check size={16} />
              </span>
            )}
            <Avatar c={x} size={84} />
            <span className={s.caseName}>
              {x.name}, {x.age}
            </span>
            <span className={s.caseJob}>{x.job}</span>
            <span className={s.caseNet}>
              {kr(x.net)} <span>udbetalt/md.</span>
            </span>
            <span className={s.dream}>
              Drøm: {x.dream}, {kr(x.dreamAmt)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Pay({ c, reveal }: { c: Case; reveal: number }) {
  const rows = [
    { label: "Løn før skat", amt: kr(c.gross), kind: undefined },
    { label: "Skat og AM-bidrag", amt: kr(-c.tax), kind: "neg" },
    { label: "Udbetalt", amt: kr(c.net), kind: "net" },
  ];
  return (
    <div className={s.stack} aria-live="polite">
      {rows.map((r, i) => (
        <div key={r.label} className={s.payRow} data-kind={r.kind} data-shown={reveal > i || undefined}>
          <span className={s.payLabel}>{r.label}</span>
          <span className={s.payAmt}>{r.amt}</span>
        </div>
      ))}
      {reveal >= 3 && (
        <span className={s.note}>
          <b>AM-bidrag</b> er 8 % af lønnen og går til staten. Skatten afhænger af, hvor meget man tjener.
        </span>
      )}
    </div>
  );
}

function Bolig({ flow, update }: { flow: Flow; update: Update }) {
  return (
    <div className={s.stack} role="radiogroup" aria-label="Bolig">
      {BOLIG.map((b) => {
        const on = flow.bolig === b.amt;
        return (
          <button key={b.amt} type="button" role="radio" aria-checked={on} className={`${s.choice} ${s.boligOpt}`} onClick={() => update({ bolig: b.amt })}>
            <span className={s.iconBox}>
              <Icon name="house" size={24} color="#1F5C4A" width={2} />
            </span>
            <span className={s.optText}>
              <span className={s.optTitle}>{b.label}</span>
              <span className={s.optSub}>{b.sub}</span>
            </span>
            <span className={s.optAmt}>{kr(b.amt)}</span>
            <span className={s.tick}>
              <Check />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Faste({ flow, update, t }: { flow: Flow; update: Update; t: Totals }) {
  return (
    <div className={s.stack}>
      <div className={s.twoCols}>
        {FASTE.map((f) => {
          const on = flow.faste[f.key];
          return (
            <button
              key={f.key}
              type="button"
              role="checkbox"
              aria-checked={on}
              className={`${s.choice} ${s.fasteOpt}`}
              onClick={() => update((x) => ({ faste: { ...x.faste, [f.key]: !x.faste[f.key] } }))}
            >
              <span className={`${s.tick} ${s.tickSquare}`}>
                <Check />
              </span>
              <Icon name={f.icon} color="#46534E" />
              <span className={s.fasteLabel}>{f.label}</span>
              <span className={s.fasteAmt}>{kr(f.amt)}</span>
            </button>
          );
        })}
      </div>
      <div className={s.sumLine}>
        <span>Faste udgifter i alt</span>
        <span>{kr(t.fasteBase)}/md.</span>
      </div>
    </div>
  );
}

/** "Egne faste udgifter" / "Anden opsparing": the pupil's own monthly lines. */
function OwnList({ title, placeholder, list, onChange }: { title: string; placeholder: string; list: Own[]; onChange: (l: Own[]) => void }) {
  const [name, setName] = useState("");
  const [amt, setAmt] = useState("");
  const ok = name.trim() !== "" && Number(amt) > 0;
  const add = () => {
    if (!ok) return;
    onChange([...list, { name: name.trim().slice(0, 40), amt: Math.min(Math.round(Number(amt)), 100000) }]);
    setName("");
    setAmt("");
  };
  return (
    <div className={s.card}>
      <span className={s.cardTitle}>{title}</span>
      {list.map((p, i) => (
        <div key={`${i}-${p.name}`} className={s.ownRow}>
          <span className={s.ownName}>{p.name}</span>
          <span className={s.ownAmt}>{kr(p.amt)}/md.</span>
          <button type="button" className={s.del} aria-label={`Slet ${p.name}`} onClick={() => onChange(list.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      {list.length < MAX_OWN && (
        <form
          className={s.addRow}
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input className={`${s.input} ${s.inputName}`} value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} aria-label={`${title}: navn`} maxLength={40} />
          <input className={`${s.input} ${s.inputAmt}`} type="number" inputMode="numeric" min={0} value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="kr./md." aria-label={`${title}: beløb pr. måned`} />
          <button className={`${s.btn} ${s.btnPrimary} ${s.btnSmall}`} disabled={!ok}>
            Tilføj
          </button>
        </form>
      )}
    </div>
  );
}

function Hverdag({ flow, update }: { flow: Flow; update: Update }) {
  return (
    <div className={s.groups}>
      {HVERDAG.map((g) => (
        <div key={g.key} className={s.stack} role="radiogroup" aria-label={g.title}>
          <div className={s.groupHead}>
            <Icon name={g.icon} color="#1F5C4A" />
            <span>{g.title}</span>
          </div>
          <div className={s.threeCols}>
            {g.vals.map((v, i) => {
              const on = flow[g.key] === v;
              return (
                <button key={v} type="button" role="radio" aria-checked={on} className={`${s.choice} ${s.levelOpt}`} onClick={() => update(g.key === "mad" ? { mad: v } : { toj: v })}>
                  <span className={s.levelLabel}>{LEVELS[i]}</span>
                  <span className={s.levelAmt}>{kr(v)}</span>
                  {on && (
                    <span className={s.badge}>
                      <Check size={13} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Savings({ c, flow, update }: { c: Case; flow: Flow; update: Update }) {
  const dm = dreamMonthly(c, flow.months);
  const ready = monthYear(addMonths(new Date(), flow.months));
  return (
    <div className={s.stack}>
      <div className={s.card}>
        <label className={s.sliderHead} htmlFor="buffer">
          <span>Buffer til uforudsete udgifter</span>
          <b>{kr(flow.buffer)}/md.</b>
        </label>
        <input id="buffer" type="range" min={0} max={BUFFER_MAX} step={100} value={flow.buffer} onChange={(e) => update({ buffer: Number(e.target.value) })} />
      </div>
      <div className={s.card}>
        <div className={s.sliderHead}>
          <span>Mål: {c.dream}</span>
          <b>{kr(c.dreamAmt)}</b>
        </div>
        <label className={s.sliderSub} htmlFor="months">
          <span>Hvornår skal drømmen være klar?</span>
          <span>om {flow.months} mdr.</span>
        </label>
        <input id="months" type="range" min={MONTHS_MIN} max={MONTHS_MAX} step={1} value={flow.months} onChange={(e) => update({ months: Number(e.target.value) })} />
        <div className={s.goalBox}>
          <b>
            Spar {kr(dm)}/md. → klar om {flow.months} mdr.
          </b>
          <span>Klar i {ready}</span>
        </div>
      </div>
    </div>
  );
}

function Result({ c, t, go }: { c: Case; t: Totals; go: (step: number) => void }) {
  const neg = t.left < 0;
  return (
    <div className={s.result} data-neg={neg || undefined}>
      <span className={s.resultLabel}>Tilbage hver måned</span>
      <span className={s.resultAmt}>{signedKr(t.left)}</span>
      <span className={s.note}>
        {neg
          ? `${c.name} bruger flere penge, end der kommer ind. Gå tilbage og vælg en billigere bolig eller en strammere hverdag.`
          : `Budgettet går op. ${c.name} har penge tilbage, når alt er betalt og der er sparet op.`}
      </span>
      {neg && (
        <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => go(3)}>
          Gå tilbage og ændr
        </button>
      )}
    </div>
  );
}

function Scenarios({ c, flow, update }: { c: Case; flow: Flow; update: Update }) {
  return (
    <div className={s.stack} style={{ alignItems: "flex-start" }}>
      <div className={s.twoCols} style={{ width: "100%" }}>
        {scenarios(c, flow.bolig ?? 0).map((x) => {
          const on = !!flow.scen[x.key];
          return (
            <button
              key={x.key}
              type="button"
              role="switch"
              aria-checked={on}
              className={`${s.choice} ${s.scenOpt}`}
              onClick={() => update((f) => ({ scen: { ...f.scen, [x.key]: !f.scen[x.key] } }))}
            >
              <span className={s.scenLabel}>{x.label}</span>
              <span className={s.scenFoot}>
                <span className={s.delta} data-neg={x.delta < 0 || undefined}>
                  {signedKr(x.delta)}
                </span>
                <span className={s.toggle} />
              </span>
            </button>
          );
        })}
      </div>
      <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => update({ scen: {} })}>
        Nulstil
      </button>
    </div>
  );
}
