"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { dayMonthYear, type ClassView, type PupilDetail } from "@/lib/skole";
import { Shell } from "./Shell";
import s from "./skole.module.css";

const REFRESH_MS = 15_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function ClassOverview({ token, initial }: { token: string; initial: ClassView }) {
  const [view, setView] = useState(initial);
  const [gone, setGone] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [pupil, setPupil] = useState<PupilDetail | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const url = `/api/skole/klasse/${encodeURIComponent(token)}`;

  const loadPupil = useCallback(
    async (code: string) => {
      const r = await fetch(`${url}/elev?kode=${encodeURIComponent(code)}`, { cache: "no-store" });
      if (r.ok) setPupil((await r.json()) as PupilDetail);
    },
    [url],
  );

  // Pupils work while the teacher watches: fetch the numbers (and the open pupil) again now and then, not while the
  // tab is hidden.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (r.status === 404) setGone(true);
        else if (r.ok) setView((await r.json()) as ClassView);
        if (open) await loadPupil(open);
      } catch {}
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [url, open, loadPupil]);

  const show = async (code: string) => {
    setOpen(code);
    setPupil(null);
    try {
      await loadPupil(code);
    } catch {}
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const remove = async () => {
    if (!window.confirm("Vil du slette klassen? Koderne og elevernes valg og svar bliver slettet, og det kan ikke fortrydes.")) return;
    const r = await fetch(url, { method: "DELETE" });
    if (r.ok || r.status === 404) setGone(true);
  };

  const right = <span className={s.teacherPill}>Lærer</span>;
  if (gone) {
    return (
      <Shell right={right}>
        <div className={`${s.wrap} ${s.wrapNarrow}`}>
          <div className={s.card}>
            <span className={s.cardTitle}>Klassen er slettet</span>
            <span className={s.note}>Koderne virker ikke længere, og elevernes valg og svar er væk.</span>
            <Link className={`${s.btn} ${s.btnPrimary}`} href="/skole/laerer" style={{ alignSelf: "flex-start" }}>
              Opret en ny klasse
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const st = view.stats;
  const stats = [
    { v: st.topBolig ? `${st.topBolig.pct} %` : "–", l: st.topBolig ? `valgte ${st.topBolig.label.toLowerCase()}` : "har endnu ikke valgt bolig" },
    { v: `${st.finishedOk} af ${st.finished}`, l: "færdige elever fik budgettet til at gå op" },
    { v: st.topCase ?? "–", l: st.topCase ? "var den mest valgte case" : "ingen har valgt case endnu" },
  ];
  const expires = new Date(view.expires);
  const daysLeft = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / DAY_MS));

  return (
    <Shell right={right}>
      <div className={s.wrap}>
        <div className={s.titleRow}>
          <h1 className={s.q}>Klasseoverblik</h1>
          <span className={s.note}>
            {view.trin}. klasse · {st.started} af {view.rows.length} elever i gang
          </span>
        </div>
        <p className={s.expiry} suppressHydrationWarning>
          Elevkoderne udløber den {dayMonthYear(expires)} (om {daysLeft} {daysLeft === 1 ? "dag" : "dage"}). Så slettes klassen, koderne og elevernes svar.
        </p>
        <div className={s.stats}>
          {stats.map((x) => (
            <div key={x.l} className={s.stat}>
              <b>{x.v}</b>
              <span>{x.l}</span>
            </div>
          ))}
        </div>
        <span className={s.small}>Klik på en elevkode for at se elevens valg og svar.</span>
        <div className={s.table} role="table" aria-label="Elever">
          <div className={`${s.tr} ${s.th}`} role="row">
            <span role="columnheader">Elevkode</span>
            <span role="columnheader">Trin nået</span>
            <span role="columnheader">Går budgettet op</span>
            <span role="columnheader">Valgt case</span>
          </div>
          {view.rows.map((r) => (
            <div key={r.code} className={s.tr} role="row" data-open={open === r.code || undefined}>
              <span role="cell">
                <button type="button" className={s.linkBtn} aria-expanded={open === r.code} onClick={() => void show(r.code)}>
                  {r.code}
                </button>
              </span>
              <span role="cell">{r.status}</span>
              <span role="cell" className={r.ok == null ? undefined : r.ok ? s.ok : s.notOk}>
                {r.ok == null ? "–" : r.ok ? "✓ Ja" : "✗ Nej"}
              </span>
              <span role="cell">{r.caseName ?? "–"}</span>
            </div>
          ))}
        </div>

        {open && (
          <section ref={detailRef} className={`${s.card} ${s.detail}`} aria-label={`Elev ${open}`}>
            <div className={s.detailHead}>
              <h2 className={s.h2}>{open}</h2>
              {pupil && <span className={s.note}>{pupil.status}</span>}
              <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => setOpen(null)}>
                Luk
              </button>
            </div>
            {!pupil && <span className={s.note}>Henter …</span>}
            {pupil && pupil.choices.length === 0 && <span className={s.note}>Eleven er ikke gået i gang endnu.</span>}
            {pupil && pupil.choices.length > 0 && (
              <>
                <h3 className={s.h3}>Valg</h3>
                <dl className={s.dl}>
                  {pupil.choices.map((c) => (
                    <div key={c.label}>
                      <dt>{c.label}</dt>
                      <dd>{c.value}</dd>
                    </div>
                  ))}
                </dl>
                <h3 className={s.h3}>Svar</h3>
                <ol className={s.answers}>
                  {pupil.answers.map((a) => (
                    <li key={a.q}>
                      <span className={s.reflQ}>{a.q}</span>
                      {a.a ? <p>{a.a}</p> : <p className={s.small}>Intet svar endnu</p>}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        )}

        <span className={s.small}>Opdateres af sig selv.</span>
        <div className={s.actions}>
          <Link className={s.btn} href="/skole/laerer">
            Opret en ny klasse
          </Link>
          <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => void remove()}>
            Slet klassen
          </button>
        </div>
      </div>
    </Shell>
  );
}
