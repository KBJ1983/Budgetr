import { kr, segments, signedKr, type Totals } from "@/lib/skole";
import s from "./skole.module.css";

const R = 80;
const C = 2 * Math.PI * R;

/** On the midnight meter the midnight part (Bolig) turns white, as in the design. */
const onDark = (color: string) => (color === "#0E1B2C" ? "#F7F7F2" : color);

/** The donut with "Tilbage" in the middle. Each part is its share of the income (or of the spending, if larger). */
export function Donut({ t, big = false, dark = false }: { t: Totals; big?: boolean; dark?: boolean }) {
  const total = Math.max(t.income, t.spend);
  let cum = 0;
  const parts = segments(t).map((seg) => {
    const len = total ? (seg.amt / total) * C : 0;
    const part = { ...seg, len, off: -cum };
    cum += len;
    return part;
  });
  return (
    <div className={`${s.donut} ${big ? s.donutBig : ""}`}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r={R} fill="none" stroke={dark ? "#1A2B42" : "#EEECE6"} strokeWidth="26" />
        {parts.map((p) => (
          <circle key={p.label} cx="100" cy="100" r={R} fill="none" stroke={dark ? onDark(p.color) : p.color} strokeWidth="26" strokeDasharray={`${p.len} ${C}`} strokeDashoffset={p.off} transform="rotate(-90 100 100)" />
        ))}
      </svg>
      <div className={s.donutMid}>
        <span className={s.donutLabel}>Tilbage</span>
        <span className={s.donutAmt} data-neg={t.left < 0 || undefined}>
          {kr(t.left)}
        </span>
      </div>
    </div>
  );
}

export function Legend({ t, dark = false }: { t: Totals; dark?: boolean }) {
  return (
    <div className={s.legend}>
      <div className={s.legendHead}>
        <span>Indtægt</span>
        <span>{kr(t.income)}</span>
      </div>
      {segments(t).map((seg) => (
        <div key={seg.label} className={s.legendRow}>
          <span className={s.swatch} style={{ background: dark ? onDark(seg.color) : seg.color }} />
          <span className={s.legendName}>{seg.label}</span>
          <span className={s.legendAmt}>{kr(seg.amt)}</span>
        </div>
      ))}
    </div>
  );
}

/** The flow's side panel. `diff` is shown on step 8 when a scenario is on (change against the plain budget). */
export function Meter({ t, diff }: { t: Totals; diff: number | null }) {
  return (
    <aside className={s.meter} aria-label="Månedens budget">
      <Donut t={t} dark />
      <div className={s.legend}>
        <Legend t={t} dark />
        {diff != null && (
          <div className={s.diff} data-neg={diff < 0 || undefined}>
            <span>Forskel</span>
            <span>{signedKr(diff)}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
