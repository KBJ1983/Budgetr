import { useState } from "react";
import {
  addMonths, boligLevel, budgetNumbers, caseById, CATS, FREQS, kr, MAX_POSTS, monthly, monthYear, opsLevel, seedPosts, signedKr,
  type Cat, type Flow, type Freq, type Post,
} from "@/lib/skole";
import s from "./skole.module.css";
import type { Update } from "./StudentApp";

const toAmount = (v: string) => Math.max(0, Math.min(1_000_000, Number(v) || 0));
const newId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function MyBudget({ flow, update, onBack }: { flow: Flow; update: Update; onBack: () => void }) {
  const c = caseById(flow.caseId);
  const posts = flow.posts ?? seedPosts(flow);
  const setPosts = (fn: (ps: Post[]) => Post[]) => update((f) => ({ posts: fn(f.posts ?? seedPosts(f)) }));
  const n = budgetNumbers(posts, c);
  const [nf, setNf] = useState<{ name: string; cat: Cat; amt: string; freq: Freq }>({ name: "", cat: "hverdag", amt: "", freq: "md" });
  const canAdd = nf.name.trim() !== "" && Number(nf.amt) > 0 && posts.length < MAX_POSTS;
  const bl = boligLevel(n.boligPct);
  const ol = opsLevel(n.opsPct);
  const dreamDate = n.monthsToDream ? monthYear(addMonths(new Date(), n.monthsToDream)) : null;
  const spend = n.byCat.bolig + n.byCat.faste + n.byCat.hverdag + n.byCat.ops;
  const scale = Math.max(n.income, spend) || 1;

  const kpis: { l: string; v: string; note: string; tone?: "pos" | "neg"; lvl?: number; pill?: string }[] = [
    { l: "Tilbage pr. måned", v: signedKr(n.left), tone: n.left < 0 ? "neg" : "pos", lvl: n.left < 0 ? 2 : 0, pill: n.left < 0 ? "Går ikke op" : "Går op", note: "Indtægt minus alle udgifter og opsparing." },
    { l: "Rådighed pr. dag", v: kr(n.raad / 30), note: `Rådighedsbeløb ${kr(n.raad)}/md. efter bolig og faste udgifter.` },
    { l: "Boligandel", v: `${n.boligPct} %`, lvl: bl, pill: ["Fint", "Hold øje", "For højt"][bl], note: "Tommelfingerregel: højst 30 % af indtægten." },
    { l: "Opsparingsrate", v: `${n.opsPct} %`, lvl: ol, pill: ["Fint", "Lidt lavt", "For lavt"][ol], note: "Tommelfingerregel: mindst 10 % af indtægten." },
    {
      l: `${c.dream} klar om`,
      v: n.monthsToDream ? `${n.monthsToDream} mdr.` : "–",
      note: dreamDate ? `${kr(c.dreamAmt)} · klar i ${dreamDate}` : `Tilføj en opsparingspost, der hedder "${c.dream}".`,
    },
  ];

  const addPost = () => {
    if (!canAdd) return;
    setPosts((ps) => [...ps, { id: newId(), cat: nf.cat, name: nf.name.trim().slice(0, 40), amt: toAmount(nf.amt), freq: nf.freq }]);
    setNf((x) => ({ ...x, name: "", amt: "" }));
  };

  return (
    <div className={`${s.wrap} ${s.wrapWide}`}>
      <div className={s.titleBlock}>
        <h1 className={s.q}>{c.gen} budget</h1>
        <span className={s.note}>Tilføj, ret og slet budgetposter. Nøgletallene regnes med det samme.</span>
      </div>

      <div className={s.kpis}>
        {kpis.map((k) => (
          <div key={k.l} className={`${s.card} ${s.kpi}`}>
            <span className={s.kpiL}>{k.l}</span>
            <span className={s.kpiV} data-tone={k.tone}>
              {k.v}
            </span>
            {k.lvl != null && (
              <span className={s.lvl} data-l={k.lvl}>
                {k.pill}
              </span>
            )}
            <span className={s.kpiNote}>{k.note}</span>
          </div>
        ))}
      </div>

      <div className={s.bGrid}>
        <div className={s.stack}>
          {CATS.map((cat) => (
            <section key={cat.key} className={s.card} aria-label={cat.label}>
              <div className={s.groupTitle}>
                <span className={s.swatch} style={{ background: cat.color }} />
                <span>{cat.label}</span>
                <span>{kr(n.byCat[cat.key])}/md.</span>
              </div>
              {posts
                .filter((p) => p.cat === cat.key)
                .map((p) => (
                  <div key={p.id} className={s.postRow}>
                    <div className={s.postMain}>
                      <input
                        className={s.postName}
                        value={p.name}
                        maxLength={40}
                        aria-label="Navn på post"
                        onChange={(e) => {
                          const v = e.target.value;
                          setPosts((ps) => ps.map((x) => (x.id === p.id ? { ...x, name: v } : x)));
                        }}
                      />
                      {p.freq !== "md" && (
                        <span className={s.postFreq}>
                          {kr(p.amt)} {FREQS[p.freq].long} · {kr(monthly(p))}/md.
                        </span>
                      )}
                    </div>
                    <div className={s.amtBox}>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={p.amt || ""}
                        aria-label={`Beløb for ${p.name}`}
                        onChange={(e) => {
                          const v = toAmount(e.target.value);
                          setPosts((ps) => ps.map((x) => (x.id === p.id ? { ...x, amt: v } : x)));
                        }}
                      />
                      <span>kr.</span>
                    </div>
                    <button type="button" className={s.del} aria-label={`Slet ${p.name}`} onClick={() => setPosts((ps) => ps.filter((x) => x.id !== p.id))}>
                      ×
                    </button>
                  </div>
                ))}
            </section>
          ))}
        </div>

        <div className={s.side}>
          <form
            className={s.card}
            onSubmit={(e) => {
              e.preventDefault();
              addPost();
            }}
          >
            <span className={s.cardTitle}>Ny budgetpost</span>
            <input className={s.input} value={nf.name} maxLength={40} onChange={(e) => setNf((x) => ({ ...x, name: e.target.value }))} placeholder="Fx Fitness, Gave, Telefon" aria-label="Navn på ny post" />
            <div className={s.chips} role="group" aria-label="Kategori">
              {CATS.map((cat) => (
                <button key={cat.key} type="button" className={s.chip} aria-pressed={nf.cat === cat.key} onClick={() => setNf((x) => ({ ...x, cat: cat.key }))}>
                  <span className={s.swatch} style={{ background: cat.color }} />
                  {cat.label}
                </button>
              ))}
            </div>
            <div className={s.newAmt}>
              <div className={s.amtBox}>
                <input type="number" inputMode="decimal" min={0} value={nf.amt} onChange={(e) => setNf((x) => ({ ...x, amt: e.target.value }))} placeholder="Beløb" aria-label="Beløb" />
                <span>kr.</span>
              </div>
              <div className={s.seg} role="group" aria-label="Hvor tit">
                {(Object.keys(FREQS) as Freq[]).map((k) => (
                  <button key={k} type="button" aria-pressed={nf.freq === k} onClick={() => setNf((x) => ({ ...x, freq: k }))}>
                    {FREQS[k].short}
                  </button>
                ))}
              </div>
            </div>
            <button className={`${s.btn} ${s.btnPrimary}`} disabled={!canAdd}>
              Tilføj post
            </button>
          </form>

          <div className={s.card}>
            <div className={s.sumLine} style={{ fontSize: 17, padding: 0 }}>
              <span>Hvor går pengene hen?</span>
              <span>{kr(n.income)}/md.</span>
            </div>
            <div className={s.bar}>
              {CATS.slice(1).map((cat) => (
                <div key={cat.key} style={{ width: `${(n.byCat[cat.key] / scale) * 100}%`, background: cat.color }} />
              ))}
            </div>
            {CATS.slice(1).map((cat) => (
              <div key={cat.key} className={s.legendRow}>
                <span className={s.swatch} style={{ background: cat.color }} />
                <span className={s.legendName}>{cat.label}</span>
                <span className={s.legendAmt}>{n.income > 0 ? Math.round((n.byCat[cat.key] / n.income) * 100) : 0} %</span>
              </div>
            ))}
            <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => update({ posts: seedPosts(flow) })}>
              Hent mine valg fra trinene igen
            </button>
          </div>

          <button type="button" className={s.btn} onClick={onBack}>
            Tilbage til opsummering
          </button>
        </div>
      </div>
    </div>
  );
}
