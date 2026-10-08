import { addMonths, caseById, dayMonthYear, monthYear, steps, totals, type Flow } from "@/lib/skole";
import { Star } from "./Icons";
import { Donut, Legend } from "./Meter";
import s from "./skole.module.css";

interface Props {
  code: string;
  flow: Flow;
  refl: Record<number, string>;
  /** When the code stops working (ISO). */
  expires: string | null;
  onRefl: (step: number, text: string) => void;
  onBudget: () => void;
  onPdf: () => void;
  onRestart: () => void;
  /** Where "Prøv budgetpro" goes (the main site). */
  mainSite: string;
}

export function Summary({ code, flow, refl, expires, onRefl, onBudget, onPdf, onRestart, mainSite }: Props) {
  const c = caseById(flow.caseId);
  const t = totals(flow);
  const now = new Date();
  return (
    <div className={s.wrap}>
      <div className={s.titleBlock}>
        <h1 className={s.h1}>{c.gen} budget</h1>
        <span className={s.sub}>
          Elevkode <b>{code}</b> · {dayMonthYear(now)}
        </span>
        {expires && <span className={s.small}>Din kode udløber den {dayMonthYear(new Date(expires))}. Derefter bliver dine valg og svar slettet.</span>}
      </div>
      <div className={s.sumGrid}>
        <div className={`${s.card} ${s.sumCard}`}>
          <Donut t={t} big />
          <Legend t={t} />
          <div className={s.star}>
            <Star />
            <span>
              {c.dream} klar i {monthYear(addMonths(now, flow.months))}
            </span>
          </div>
        </div>
        <div className={s.stack}>
          <h2 className={s.h2}>Dine svar</h2>
          <p className={s.warn}>Din lærer kan se dine svar. Skriv ikke navne på dig selv eller andre.</p>
          {steps(c)
            .slice(1)
            .map((st, i) => (
              <label key={st.short} className={s.reflField}>
                <span className={s.reflQ}>
                  {i + 1}. {st.refl}
                </span>
                <textarea className={s.textarea} rows={2} maxLength={1000} placeholder="Skriv dit svar" value={refl[i + 2] ?? ""} onChange={(e) => onRefl(i + 2, e.target.value)} />
              </label>
            ))}
        </div>
      </div>
      <div className={s.actions}>
        <button type="button" className={`${s.btn} ${s.btnOutline}`} onClick={onBudget}>
          Lav dit eget budget med budgetposter
        </button>
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={onPdf}>
          Gem som PDF
        </button>
        <button type="button" className={s.btn} onClick={onRestart}>
          Start forfra
        </button>
      </div>
      <a href={mainSite} className={s.small}>
        Vil du lave et rigtigt budget derhjemme? Prøv budgetpro.
      </a>
    </div>
  );
}
