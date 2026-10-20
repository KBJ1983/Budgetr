"use client";

import { useEffect, useState } from "react";
import { addDays } from "@/lib/owner";
import { GOALS, SITES, UNKNOWN, change, type Counts, type Goal, type TrafficReport } from "@/lib/traffic";
import type { Site } from "@/lib/site-host";
import { TrafficMap } from "./TrafficMap";

const num = (n: number) => n.toLocaleString("da-DK");
const kr = (n: number) => `${n.toLocaleString("da-DK", { maximumFractionDigits: 2 })} kr`;
const pct = (part: number, whole: number) => (whole ? `${(Math.round((part / whole) * 1000) / 10).toLocaleString("da-DK")} %` : "–");
const date = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};
const goalsOf = (c: Counts, ids: readonly Goal[]) => ids.reduce((s, g) => s + c.goals[g], 0);
const siteLabel = (s: Site) => SITES.find((x) => x.id === s)?.label ?? s;

type Preset = "7" | "30" | "90" | "365" | "aar" | "egen";
const PRESETS: { id: Preset; label: string }[] = [
  { id: "7", label: "7 dage" },
  { id: "30", label: "30 dage" },
  { id: "90", label: "90 dage" },
  { id: "365", label: "12 måneder" },
  { id: "aar", label: "I år" },
  { id: "egen", label: "Egen periode" },
];
function rangeOf(p: Preset, today: string, own: { from: string; to: string }) {
  if (p === "egen") return own;
  if (p === "aar") return { from: `${today.slice(0, 4)}-01-01`, to: today };
  return { from: addDays(today, -(Number(p) - 1)), to: today };
}

type Metric = "visitors" | "pageviews" | "goals";
const METRICS: { id: Metric; label: string }[] = [
  { id: "visitors", label: "Besøgende" },
  { id: "pageviews", label: "Sidevisninger" },
  { id: "goals", label: "Formularer" },
];

/** "+12 %" against the period before, coloured up/down; nothing when there is nothing to compare with. */
function Delta({ now, before }: { now: number; before: number }) {
  const d = change(now, before);
  if (d === null) return <span className="bx-muted">Intet at sammenligne med</span>;
  return (
    <span className={d > 0 ? "pos" : d < 0 ? "neg" : "bx-muted"}>
      {d > 0 ? "+" : ""}
      {num(d)} % mod perioden før
    </span>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="bx-tile">
      <span>{label}</span>
      <b>{value}</b>
      <span>{sub}</span>
    </div>
  );
}

/** One measure per bucket as bars (one series, one scale), with the numbers on hover and in a table below. */
function Trend({ r, metric, goals }: { r: TrafficReport; metric: Metric; goals: readonly Goal[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const value = (c: Counts) => (metric === "goals" ? goalsOf(c, goals) : c[metric]);
  const values = r.series.map(value);
  const max = Math.max(1, ...values);
  // Few labels under the bars: at most about six.
  const every = Math.max(1, Math.ceil(r.series.length / 6));
  const shown = hover !== null ? r.series[hover] : undefined;
  const unit = r.bucket === "dag" ? "Dag" : r.bucket === "uge" ? "Uge fra" : "Måned";
  return (
    <div className="tr-trend">
      <div className="tr-tip" aria-live="polite">
        {shown ? (
          <>
            <b>
              {unit} {shown.label}
            </b>
            <span>{num(shown.visitors)} besøgende</span>
            <span>{num(shown.pageviews)} sidevisninger</span>
            <span>{num(goalsOf(shown, goals))} formularer</span>
          </>
        ) : (
          <span className="bx-muted">Hold musen over en søjle for at se tallene.</span>
        )}
      </div>
      <div className="tr-plot">
        <span className="tr-max">{num(max)}</span>
        <div className="tr-bars" onMouseLeave={() => setHover(null)}>
          {r.series.map((s, i) => (
            <button
              type="button"
              key={s.from}
              className={`tr-col${hover === i ? " is-on" : ""}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${s.label}: ${num(values[i] ?? 0)}`}
            >
              <i style={{ height: `${((values[i] ?? 0) / max) * 100}%` }} />
            </button>
          ))}
        </div>
      </div>
      <div className="tr-axis" aria-hidden="true">
        {r.series.map((s, i) => (
          <span key={s.from}>{i % every === 0 ? s.label : ""}</span>
        ))}
      </div>
    </div>
  );
}

export function TrafficPanel() {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Copenhagen" });
  const [preset, setPreset] = useState<Preset>("30");
  const [own, setOwn] = useState({ from: addDays(today, -29), to: today });
  const [site, setSite] = useState<Site | "alle">("alle");
  const [metric, setMetric] = useState<Metric>("visitors");
  const [r, setR] = useState<TrafficReport | null>(null);
  const [error, setError] = useState(false);
  const range = rangeOf(preset, today, own);

  useEffect(() => {
    let live = true;
    setError(false);
    const q = new URLSearchParams({ from: range.from, to: range.to, site });
    fetch(`/api/owner/trafik?${q}`, { cache: "no-store" })
      .then((x) => (x.ok ? (x.json() as Promise<TrafficReport>) : Promise.reject(new Error(String(x.status)))))
      .then((x) => live && setR(x))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [range.from, range.to, site]);

  const goals = GOALS.filter((g) => site === "alle" || g.site === site);
  const ids = goals.map((g) => g.id);
  const forms = r ? goalsOf(r.total, ids) : 0;

  return (
    <>
      <section className="bx-section">
        <div className="tr-bar">
          <div className="tr-presets" role="group" aria-label="Periode">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" className="bx-btn" aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <select className="bx-select tr-site" value={site} onChange={(e) => setSite(e.target.value as Site | "alle")} aria-label="Site">
            <option value="alle">Alle sites</option>
            {SITES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        {preset === "egen" ? (
          <div className="tr-own">
            <label>
              Fra
              <input className="bx-input" type="date" value={own.from} max={own.to} onChange={(e) => e.target.value && setOwn({ ...own, from: e.target.value })} />
            </label>
            <label>
              Til
              <input className="bx-input" type="date" value={own.to} min={own.from} max={today} onChange={(e) => e.target.value && setOwn({ ...own, to: e.target.value })} />
            </label>
          </div>
        ) : null}
        <p className="bx-muted tr-period">
          {r ? (
            <>
              {date(r.from)} – {date(r.to)}, sammenlignet med {date(r.prev.from)} – {date(r.prev.to)}.
            </>
          ) : error ? (
            "Tallene kunne ikke hentes lige nu. Prøv igen om lidt."
          ) : (
            "Henter tal …"
          )}
        </p>
      </section>

      {r ? (
        <>
          <section className="bx-section">
            <div className="bx-tiles">
              <Tile label="Besøgende" value={num(r.total.visitors)} sub={<Delta now={r.total.visitors} before={r.prevTotal.visitors} />} />
              <Tile label="Sidevisninger" value={num(r.total.pageviews)} sub={<Delta now={r.total.pageviews} before={r.prevTotal.pageviews} />} />
              <Tile label="Formularer sendt" value={num(forms)} sub={<Delta now={forms} before={goalsOf(r.prevTotal, ids)} />} />
              <Tile label="Konvertering" value={pct(forms, r.total.visitors)} sub={`Formularer pr. besøgende · før ${pct(goalsOf(r.prevTotal, ids), r.prevTotal.visitors)}`} />
            </div>
          </section>

          <TrafficMap periodPlaces={r.places} />

          <section className="bx-section">
            <div className="bx-section-head">
              <h2>Udvikling</h2>
              <span className="bx-muted">Pr. {r.bucket === "dag" ? "dag" : r.bucket === "uge" ? "uge" : "måned"}.</span>
            </div>
            <div className="bx-card tr-card">
              <div className="tr-presets" role="group" aria-label="Vis">
                {METRICS.map((m) => (
                  <button key={m.id} type="button" className="bx-btn" aria-pressed={metric === m.id} onClick={() => setMetric(m.id)}>
                    {m.label}
                  </button>
                ))}
              </div>
              <Trend r={r} metric={metric} goals={ids} />
            </div>
          </section>

          {site === "alle" ? (
            <section className="bx-section">
              <div className="bx-section-head">
                <h2>Pr. site</h2>
              </div>
              <div className="bx-card bx-scroll-x">
                <table className="bx-table">
                  <thead>
                    <tr>
                      <th>Site</th>
                      <th className="r">Besøgende</th>
                      <th className="r">Sidevisninger</th>
                      <th className="r">Formularer</th>
                      <th className="r">Konvertering</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.sites.map((s) => {
                      const f = goalsOf(s, GOALS.filter((g) => g.site === s.site).map((g) => g.id));
                      return (
                        <tr key={s.site}>
                          <td>
                            <b>{siteLabel(s.site)}</b>
                          </td>
                          <td className="r">{num(s.visitors)}</td>
                          <td className="r">{num(s.pageviews)}</td>
                          <td className="r">{num(f)}</td>
                          <td className="r">{pct(f, s.visitors)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="bx-section">
            <div className="bx-section-head">
              <h2>Kilder</h2>
              <span className="bx-muted">Hvor besøgende kom fra, og hvilke formularer de sendte.</span>
            </div>
            {r.sources.length ? (
              <div className="bx-card bx-scroll-x">
                <table className="bx-table">
                  <thead>
                    <tr>
                      <th>Kilde</th>
                      <th className="r">Besøgende</th>
                      <th className="r">Før</th>
                      {goals.map((g) => (
                        <th key={g.id} className="r">
                          {g.label}
                        </th>
                      ))}
                      <th className="r">Konvertering</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.sources.map((s) => {
                      const f = goalsOf({ visitors: 0, pageviews: 0, goals: s.goals }, ids);
                      return (
                        <tr key={s.source}>
                          <td>
                            <b>{s.source}</b>
                          </td>
                          <td className="r">{num(s.visitors)}</td>
                          <td className="r bx-muted">{num(s.prevVisitors)}</td>
                          {goals.map((g) => (
                            <td key={g.id} className="r">
                              {s.goals[g.id] ? num(s.goals[g.id]) : "–"}
                            </td>
                          ))}
                          <td className="r">{s.visitors ? pct(f, s.visitors) : "–"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bx-empty">Ingen besøg i perioden endnu.</div>
            )}
          </section>

          <section className="bx-section">
            <div className="bx-section-head">
              <h2>Fra kilde til kunde</h2>
              <span className="bx-muted">Konti og prisforespørgsler fra perioden, og hvad de er i dag. Alle sites.</span>
            </div>
            {r.conversions.length ? (
              <div className="bx-card bx-scroll-x">
                <table className="bx-table">
                  <thead>
                    <tr>
                      <th>Kilde</th>
                      <th className="r">Oprettet</th>
                      <th className="r">Bekræftet</th>
                      <th className="r">I prøveperiode</th>
                      <th className="r">Betalende</th>
                      <th className="r">MRR</th>
                      <th className="r">Prisforespørgsler</th>
                      <th className="r">Blev aftale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.conversions.map((c) => (
                      <tr key={c.source}>
                        <td>
                          <b>{c.source}</b>
                        </td>
                        <td className="r">{num(c.signups)}</td>
                        <td className="r">{num(c.confirmed)}</td>
                        <td className="r">{num(c.trial)}</td>
                        <td className="r">
                          {num(c.paying)}
                          {c.confirmed ? <small className="bx-muted"> · {pct(c.paying, c.confirmed)}</small> : null}
                        </td>
                        <td className="r">{c.mrr ? kr(c.mrr) : "–"}</td>
                        <td className="r">{num(c.inquiries)}</td>
                        <td className="r">{num(c.agreements)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bx-empty">Ingen nye konti eller prisforespørgsler i perioden.</div>
            )}
            {r.conversions.some((c) => c.source === UNKNOWN) ? (
              <p className="bx-muted tr-note">
                Ukendt er konti og forespørgsler fra før målingen begyndte, eller fra browsere der har bedt om ikke at blive talt.
              </p>
            ) : null}
          </section>

          <div className="tr-grid">
            <section className="bx-section">
              <div className="bx-section-head">
                <h2>Mest sete sider</h2>
              </div>
              {r.pages.length ? (
                <div className="bx-card bx-scroll-x">
                  <table className="bx-table">
                    <tbody>
                      {r.pages.map((p) => (
                        <tr key={`${p.site}${p.path}`}>
                          <td>
                            {p.path}
                            {site === "alle" ? <small className="bx-muted"> · {siteLabel(p.site)}</small> : null}
                          </td>
                          <td className="r">{num(p.views)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bx-empty">Ingen sidevisninger endnu.</div>
              )}
            </section>
            <section className="bx-section">
              <div className="bx-section-head">
                <h2>Enhed og kampagner</h2>
              </div>
              <div className="bx-card bx-scroll-x">
                <table className="bx-table">
                  <tbody>
                    <tr>
                      <td>Mobil</td>
                      <td className="r">
                        {num(r.devices.mobil)} <small className="bx-muted">· {pct(r.devices.mobil, r.devices.mobil + r.devices.computer)}</small>
                      </td>
                    </tr>
                    <tr>
                      <td>Computer</td>
                      <td className="r">
                        {num(r.devices.computer)} <small className="bx-muted">· {pct(r.devices.computer, r.devices.mobil + r.devices.computer)}</small>
                      </td>
                    </tr>
                    {r.campaigns.map((c) => (
                      <tr key={c.name}>
                        <td>
                          Kampagne <b>{c.name}</b>
                        </td>
                        <td className="r">{num(c.visitors)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!r.campaigns.length ? (
                <p className="bx-muted tr-note">
                  Kampagner vises, når et link har utm_campaign, fx <code>?utm_source=linkedin&amp;utm_campaign=banker-q4</code>.
                </p>
              ) : null}
            </section>
          </div>

          <p className="bx-muted tr-note">
            Målingen bruger ingen cookies og gemmer ingen IP-adresser. En besøgende er én browser på én dag, så den samme person
            to dage tæller to gange. Robotter, admin-, aftale- og klassesider tælles ikke, og browsere der beder om ikke at blive
            fulgt, sendes ikke med.
          </p>
        </>
      ) : null}
    </>
  );
}
