"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { canExtend, classLabel, dayMonthYear, EXTEND_DAYS, LESSON_STEPS, MAX_CLASS_DAYS, MAX_CLASS_NAME, seenAgo, type ClassView, type PupilDetail } from "@/lib/skole";
import { CodeSheet } from "./CodeSheet";
import { Shell } from "./Shell";
import s from "./skole.module.css";
import { useToast } from "./useToast";

const REFRESH_MS = 15_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * `demo` = the made-up demo class (lib/skole-demo.ts) with its pupils: shown read-only, nothing is fetched.
 * `mayExtend`: the teacher has a seat, so the class can get EXTEND_DAYS more (not the free class).
 */
export function ClassOverview({ teacher, initial, demo, mayExtend }: { teacher: string; initial: ClassView; demo?: Record<string, PupilDetail>; mayExtend?: boolean }) {
  const [view, setView] = useState(initial);
  const [gone, setGone] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [pupil, setPupil] = useState<PupilDetail | null>(null);
  const [toast, showToast] = useToast();
  const detailRef = useRef<HTMLElement>(null);
  const url = `/api/skole/klasse/${initial.id}`;

  const loadPupil = useCallback(
    async (code: string) => {
      if (demo) return setPupil(demo[code] ?? null);
      const r = await fetch(`${url}/elev?kode=${encodeURIComponent(code)}`, { cache: "no-store" });
      if (r.ok) setPupil((await r.json()) as PupilDetail);
    },
    [url, demo],
  );

  // Pupils work while the teacher watches: fetch the numbers (and the open pupil) again now and then, not while the
  // tab is hidden.
  useEffect(() => {
    if (demo) return;
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
  }, [url, open, loadPupil, demo]);

  const show = async (code: string) => {
    setOpen(code);
    setPupil(null);
    try {
      await loadPupil(code);
    } catch {}
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const rename = async () => {
    const typed = window.prompt(`Klassens navn, fx ${view.trin}.A. Tomt felt giver "${view.trin}. klasse".`, view.name ?? "");
    if (typed === null) return;
    const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: typed.slice(0, MAX_CLASS_NAME) }) });
    if (r.ok) setView((await r.json()) as ClassView);
    else showToast("Navnet kunne ikke gemmes. Prøv igen.");
  };

  const extend = async () => {
    const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ extend: true }) });
    if (r.ok) {
      setView((await r.json()) as ClassView);
      showToast(`Klassen er forlænget med ${EXTEND_DAYS} dage.`);
    } else showToast(r.status === 409 ? `En klasse kan højst leve ${MAX_CLASS_DAYS} dage.` : "Klassen kunne ikke forlænges. Prøv igen.");
  };

  const setLesson = async (openTo: number | null) => {
    const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ openTo }) });
    if (r.ok) {
      setView((await r.json()) as ClassView);
      showToast(openTo ? `Eleverne kan nu gå til og med trin ${openTo}.` : "Alle trin er åbne.");
    } else showToast("Det kunne ikke gemmes. Prøv igen.");
  };

  const remove = async () => {
    if (!window.confirm("Vil du slette klassen? Koderne og elevernes valg og svar bliver slettet, og det kan ikke fortrydes.")) return;
    const r = await fetch(url, { method: "DELETE" });
    if (r.ok || r.status === 404) setGone(true);
  };

  const right = <span className={s.teacherPill}>{teacher}</span>;
  if (gone) {
    return (
      <Shell right={right}>
        <div className={`${s.wrap} ${s.wrapNarrow}`}>
          <div className={s.card}>
            <span className={s.cardTitle}>Klassen er slettet</span>
            <span className={s.note}>Koderne virker ikke længere, og elevernes valg og svar er væk.</span>
            <Link className={`${s.btn} ${s.btnPrimary}`} href="/skole/laerer" style={{ alignSelf: "flex-start" }}>
              Til mine klasser
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const st = view.stats;
  const stats = [
    {
      v: st.topBolig ? `${st.topBolig.pct} %` : "–",
      l: st.topBolig
        ? `af ${st.topBolig.of} ${st.topBolig.of === 1 ? "elev" : "elever"} valgte ${st.topBolig.label.toLowerCase()}`
        : "har endnu ikke valgt bolig",
    },
    { v: `${st.finishedOk} af ${st.finished}`, l: "færdige elever fik budgettet til at gå op" },
    { v: st.topCase ?? "–", l: st.topCase ? "var den mest valgte case" : "ingen har valgt case endnu" },
  ];
  const expires = new Date(view.expires);
  const daysLeft = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / DAY_MS));

  return (
    <Shell right={right} toast={toast}>
      <div className={s.wrap}>
        <Link className={`${s.small} ${s.noPrint}`} href="/skole/laerer">
          ← Mine klasser
        </Link>
        <div className={`${s.titleRow} ${s.noPrint}`}>
          <h1 className={s.q}>{demo ? "Klasseoverblik" : classLabel(view)}</h1>
          <span className={s.note}>
            {view.name || demo ? `${view.trin}. klasse · ` : ""}
            {st.started} af {view.rows.length} elever i gang
          </span>
          {!demo && (
            <button type="button" className={s.linkBtn} onClick={() => void rename()}>
              {view.name ? "Omdøb" : "Giv klassen et navn"}
            </button>
          )}
        </div>
        {demo && (
          <p className={`${s.agreeNote} ${s.noPrint}`}>
            Det her er en demoklasse med opdigtede elever, så du kan se, hvad du får at se, når dine elever arbejder. Klik på en elevkode for at se
            elevens valg og svar.
          </p>
        )}
        <p className={`${s.expiry} ${s.noPrint}`} suppressHydrationWarning hidden={!!demo}>
          Elevkoderne udløber den {dayMonthYear(expires)} (om {daysLeft} {daysLeft === 1 ? "dag" : "dage"}). Så slettes klassen, koderne og elevernes svar.
          {mayExtend && canExtend(view.days) ? (
            <>
              {" "}
              <button type="button" className={s.linkBtn} onClick={() => void extend()}>
                Forlæng med {EXTEND_DAYS} dage
              </button>
            </>
          ) : null}
        </p>
        {!demo && (
          <label className={`${s.lessonPick} ${s.noPrint}`}>
            <span>Åbne trin for eleverne</span>
            <select className={s.input} value={view.openTo ?? ""} onChange={(e) => void setLesson(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Alle trin (eleverne arbejder i deres eget tempo)</option>
              {LESSON_STEPS.map((l) => (
                <option key={l.to} value={l.to}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className={`${s.stats} ${s.noPrint}`}>
          {stats.map((x) => (
            <div key={x.l} className={s.stat}>
              <b>{x.v}</b>
              <span>{x.l}</span>
            </div>
          ))}
        </div>
        <span className={`${s.small} ${s.noPrint}`}>Klik på en elevkode for at se elevens valg og svar.</span>
        <div className={`${s.table} ${s.noPrint}`} role="table" aria-label="Elever">
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
              <span role="cell">
                {r.status}
                {r.seen && (
                  <span className={s.small} style={{ display: "block" }} suppressHydrationWarning>
                    {seenAgo(r.seen)}
                  </span>
                )}
              </span>
              <span role="cell" className={r.ok == null ? undefined : r.ok ? s.ok : s.notOk}>
                {r.ok == null ? "–" : r.ok ? "✓ Ja" : "✗ Nej"}
              </span>
              <span role="cell">{r.caseName ?? "–"}</span>
            </div>
          ))}
        </div>

        {open && (
          <section ref={detailRef} className={`${s.card} ${s.detail} ${s.noPrint}`} aria-label={`Elev ${open}`}>
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

        {!demo && (
          <>
            <div className={`${s.card} ${s.classCard}`}>
              <CodeSheet label={classLabel(view)} codes={view.codes} expires={view.expires} onCopied={showToast} printOnly />
            </div>
            <span className={`${s.small} ${s.noPrint}`}>Opdateres af sig selv.</span>
          </>
        )}
        <div className={`${s.actions} ${s.noPrint}`}>
          <Link className={`${s.btn} ${s.btnPrimary}`} href={`/skole/klasse/${initial.id}/tavle`}>
            Vis på tavlen
          </Link>
          <Link className={s.btn} href={`/skole/klasse/${initial.id}/materiale`}>
            Undervisningsmateriale
          </Link>
          <Link className={s.btn} href="/skole/laerer">
            Til mine klasser
          </Link>
          {!demo && (
            <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => void remove()}>
              Slet klassen
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}
