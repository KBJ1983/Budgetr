"use client";

import { useEffect, useState } from "react";
import { PACK_COUNTS, PACK_MONTHS } from "@/lib/erhverv-packs";
import { PRICES } from "@/lib/owner";
import { DEFAULT_CALC, calc, dealYear, toCalcInput, type CalcInput, type DealLine } from "@/lib/sales-calc";
import { SCHOOL_PACKS } from "@/lib/skole-packs";

// "Hvad skal jeg sælge?" on /admin → Salg: a folded calculator (lib/sales-calc.ts). What the owner types is kept in
// this browser only (localStorage), as a convenience.

const KEY = "budgetr:salgsberegner";
const kr = (n: number) => `${n.toLocaleString("da-DK", { maximumFractionDigits: 2 })} kr`;
const num = (n: number) => n.toLocaleString("da-DK");

function NumField({ label, value, onChange, help }: { label: string; value: number; onChange: (n: number) => void; help?: string }) {
  return (
    <label className="bx-field">
      <span>{label}</span>
      <input
        className="bx-input"
        inputMode="numeric"
        value={value ? num(value) : ""}
        placeholder="0"
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
      />
      {help ? <small className="bx-muted">{help}</small> : null}
    </label>
  );
}

function DealFields({ title, line, onChange, pool }: { title: string; line: DealLine; onChange: (l: DealLine) => void; pool?: string }) {
  return (
    <fieldset className="calc-group">
      <legend>{title}</legend>
      <div className="crm-row">
        <NumField label="Aftaler" value={line.deals} onChange={(deals) => onChange({ ...line, deals })} help={pool} />
        <label className="bx-field">
          <span>Koder pr. aftale</span>
          <select className="bx-input" value={line.count} onChange={(e) => onChange({ ...line, count: Number(e.target.value) as DealLine["count"] })}>
            {PACK_COUNTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="bx-field">
          <span>Pakke</span>
          <select className="bx-input" value={line.months} onChange={(e) => onChange({ ...line, months: Number(e.target.value) as DealLine["months"] })}>
            {PACK_MONTHS.map((m) => (
              <option key={m} value={m}>
                {m} måneder
              </option>
            ))}
          </select>
        </label>
      </div>
      <small className="bx-muted">Én aftale giver {kr(dealYear(line))} om året.</small>
    </fieldset>
  );
}

export function SalesCalc({ pool }: { pool: { bank: number; maegler: number; skole: number } }) {
  const [input, setInput] = useState<CalcInput>(DEFAULT_CALC);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setInput(toCalcInput(JSON.parse(saved)));
    } catch {
      // Nothing saved, or storage blocked: start from the defaults.
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(input));
    } catch {
      // Storage blocked; the calculator still works.
    }
  }, [input, loaded]);

  const set = (p: Partial<CalcInput>) => setInput((x) => ({ ...x, ...p }));
  const r = calc(input);
  const reached = input.target > 0 && r.gap === 0;

  return (
    <details className="bx-card crm-calc">
      <summary>
        <span>
          <b>Hvad skal jeg sælge?</b>
          <span className="bx-muted"> Leg med aftaler, skolepakker og privatkunder</span>
        </span>
        <span className="calc-sum">{kr(r.year)} om året</span>
      </summary>

      <div className="calc-body">
        <div className="calc-inputs">
          <NumField label="Mål for omsætning pr. år (kr inkl. moms)" value={input.target} onChange={(target) => set({ target })} />
          <DealFields title="Banker" line={input.bank} onChange={(bank) => set({ bank })} pool={`${num(pool.bank)} banker i listen`} />
          <DealFields title="Ejendomsmæglere" line={input.maegler} onChange={(maegler) => set({ maegler })} pool={`${num(pool.maegler)} kæder og mæglere i listen`} />
          <fieldset className="calc-group">
            <legend>Skoler</legend>
            <div className="crm-row">
              <NumField
                label={`${SCHOOL_PACKS.lille.label} (${SCHOOL_PACKS.lille.classes} klasser)`}
                value={input.schoolSmall}
                onChange={(schoolSmall) => set({ schoolSmall })}
                help={`${kr(SCHOOL_PACKS.lille.price)} pr. skoleår`}
              />
              <NumField
                label={`${SCHOOL_PACKS.stor.label} (${SCHOOL_PACKS.stor.classes} klasser)`}
                value={input.schoolBig}
                onChange={(schoolBig) => set({ schoolBig })}
                help={`${kr(SCHOOL_PACKS.stor.price)} pr. skoleår`}
              />
            </div>
            <small className="bx-muted">{num(pool.skole)} skoler med 7.–9. klasse i listen.</small>
          </fieldset>
          <fieldset className="calc-group">
            <legend>Privatkunder</legend>
            <div className="crm-row">
              <NumField label={`På månedspris (${kr(PRICES.monthly.base)})`} value={input.privateMonthly} onChange={(privateMonthly) => set({ privateMonthly })} />
              <NumField label={`På årspris (${kr(PRICES.yearly.base)})`} value={input.privateYearly} onChange={(privateYearly) => set({ privateYearly })} />
            </div>
          </fieldset>
          <button type="button" className="bx-btn-link calc-reset" onClick={() => setInput(DEFAULT_CALC)}>
            Start forfra
          </button>
        </div>

        <div className="calc-out" aria-live="polite">
          <div className="bx-tile">
            <span>Omsætning pr. år</span>
            <b>{kr(r.year)}</b>
            <span>{kr(r.year / 12)} pr. måned i snit</span>
          </div>
          <table className="bx-table calc-table">
            <tbody>
              {r.lines.map((l) => (
                <tr key={l.id}>
                  <td>
                    <b>{l.label}</b>
                    <small className="bx-muted">{l.detail}</small>
                  </td>
                  <td className="r">
                    {kr(l.year)}
                    <small className="bx-muted">{r.year ? `${num(Math.round((l.year / r.year) * 1000) / 10)} %` : "–"}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {input.target > 0 ? (
            reached ? (
              <p className="calc-goal is-ok">
                Målet på {kr(input.target)} er nået med {kr(r.year - input.target)} til overs.
              </p>
            ) : (
              <div className="calc-goal">
                <p>
                  Der mangler <b>{kr(r.gap)}</b> om året for at nå {kr(input.target)}. Det svarer til én af disse:
                </p>
                <ul>
                  {r.toClose.map((x) => (
                    <li key={x.label}>
                      <b>{num(x.n)}</b> {x.label} mere
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : null}
          <p className="bx-muted calc-note">
            Alle priser er inkl. moms og fra prislisterne. Erhvervspakker er regnet, som om de købes igen, når de udløber: pakkens
            månedspris × 12. Tallene gemmes kun i denne browser.
          </p>
        </div>
      </div>
    </details>
  );
}
