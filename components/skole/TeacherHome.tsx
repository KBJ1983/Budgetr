"use client";

import Link from "next/link";
import { useState } from "react";
import { DEFAULT_DAYS, dayMonthYear, LIFETIMES, MAX_PUPILS, TRIN, type ClassSummary } from "@/lib/skole";
import { skoleBase } from "@/lib/skole-host";
import { CodeSheet } from "./CodeSheet";
import { Shell } from "./Shell";
import s from "./skole.module.css";
import { useToast } from "./useToast";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The logged-in teacher's front page: make a class, and all live classes with their codes. */
export function TeacherHome({ name, school, initial }: { name: string; school: string; initial: ClassSummary[] }) {
  const [classes] = useState(initial);
  const [trin, setTrin] = useState(8);
  const [antal, setAntal] = useState(24);
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/skole/klasse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trin, antal, days }) });
      if (r.status === 401) return window.location.reload();
      if (!r.ok) throw new Error(String(r.status));
      const { id } = (await r.json()) as { id: string };
      window.location.href = `${skoleBase(window.location.host)}/klasse/${id}`;
    } catch {
      setErr("Klassen kunne ikke oprettes. Prøv igen om lidt.");
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/skole/auth/logout", { method: "POST" }).catch(() => {});
    window.location.reload();
  };

  return (
    <Shell right={<span className={s.teacherPill}>{name}</span>} toast={toast}>
      <div className={`${s.wrap} ${s.wrapNarrow}`}>
        <div className={`${s.titleRow} ${s.noPrint}`}>
          <h1 className={s.q}>Mine klasser</h1>
          <span className={s.note}>{school}</span>
          <button type="button" className={`${s.btn} ${s.btnSmall}`} style={{ marginLeft: "auto" }} onClick={() => void logout()}>
            Log ud
          </button>
        </div>

        <form
          className={`${s.card} ${s.createForm} ${s.noPrint}`}
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <span className={s.cardTitle}>Opret klasse</span>
          <div className={s.createRow}>
            <div className={s.field}>
              <span className={s.label} id="trin-label">
                Klassetrin
              </span>
              <div className={s.trinRow} role="group" aria-labelledby="trin-label">
                {TRIN.map((t) => (
                  <button key={t} type="button" className={s.trinBtn} aria-pressed={trin === t} onClick={() => setTrin(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className={s.field}>
              <span className={s.label}>Antal elever</span>
              <div className={s.stepper}>
                <button type="button" aria-label="Færre elever" onClick={() => setAntal((a) => Math.max(1, a - 1))}>
                  −
                </button>
                <span aria-live="polite">{antal}</span>
                <button type="button" aria-label="Flere elever" onClick={() => setAntal((a) => Math.min(MAX_PUPILS, a + 1))}>
                  +
                </button>
              </div>
            </div>
            <div className={s.field}>
              <span className={s.label} id="days-label">
                Koderne virker i
              </span>
              <div className={s.trinRow} role="group" aria-labelledby="days-label">
                {LIFETIMES.map((d) => (
                  <button key={d} type="button" className={`${s.trinBtn} ${s.daysBtn}`} aria-pressed={days === d} onClick={() => setDays(d)}>
                    {d} dage
                  </button>
                ))}
              </div>
            </div>
          </div>
          <span className={s.small} suppressHydrationWarning>
            Elevkoderne udløber den {dayMonthYear(new Date(Date.now() + days * DAY_MS))}. Så slettes klassen, koderne og elevernes svar. budgetpro gemmer ingen
            navne – skriv selv, hvem der har hvilken kode.
          </span>
          {err && (
            <span className={s.err} role="alert">
              {err}
            </span>
          )}
          <button className={`${s.btn} ${s.btnPrimary}`} disabled={busy} style={{ alignSelf: "flex-start" }}>
            Lav elevkoder
          </button>
        </form>

        {classes.length === 0 ? (
          <p className={`${s.info} ${s.noPrint}`}>Du har ingen klasser endnu. Når du opretter en, kommer den her med sine elevkoder.</p>
        ) : (
          <div className={s.stack} style={{ gap: 14 }}>
            {classes.map((c) => (
              <ClassCard key={c.id} c={c} onCopied={showToast} />
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function ClassCard({ c, onCopied }: { c: ClassSummary; onCopied: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const daysLeft = Math.max(0, Math.ceil((Date.parse(c.expires) - Date.now()) / DAY_MS));
  return (
    <section className={`${s.card} ${s.classCard}`} aria-label={`${c.trin}. klasse`} data-print={open || undefined}>
      <div className={`${s.classHead} ${s.noPrint}`}>
        <div className={s.titleBlock} style={{ gap: 2 }}>
          <span className={s.h2}>{c.trin}. klasse</span>
          <span className={s.small} suppressHydrationWarning>
            Oprettet {dayMonthYear(new Date(c.created))} · {c.codes.length} elevkoder · {c.started} i gang · {c.finished} færdige
          </span>
        </div>
        <Link className={`${s.btn} ${s.btnSmall} ${s.btnPrimary}`} href={`/skole/klasse/${c.id}`}>
          Åbn klasse
        </Link>
      </div>
      <p className={`${s.expirySmall} ${s.noPrint}`} suppressHydrationWarning>
        Udløber den {dayMonthYear(new Date(c.expires))} (om {daysLeft} {daysLeft === 1 ? "dag" : "dage"})
      </p>
      <button type="button" className={`${s.linkBtn} ${s.noPrint}`} aria-expanded={open} onClick={() => setOpen((o) => !o)} style={{ alignSelf: "flex-start" }}>
        {open ? "Skjul elevkoder" : "Vis elevkoder"}
      </button>
      {open && <CodeSheet trin={c.trin} codes={c.codes} expires={c.expires} onCopied={onCopied} />}
    </section>
  );
}
