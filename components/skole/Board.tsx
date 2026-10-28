"use client";

import Link from "next/link";
import qrcode from "qrcode-generator";
import { useCallback, useEffect, useState } from "react";
import { boardQuestions, classLabel, type ClassView } from "@/lib/skole";
import { pupilAddress } from "@/lib/skole-host";
import { Shell } from "./Shell";
import s from "./skole.module.css";

const REFRESH_MS = 15_000;
const QUESTIONS = boardQuestions();

/**
 * The board for the projector (/skole/klasse/<id>/tavle): a QR code and the address to /elev, how many are under way,
 * and the class's answers to one reflection question – without codes, in random order, hidden until the teacher
 * presses "Vis svarene". `demo`: the made-up demo class (nothing stored).
 */
export function Board({ teacher, initial, demo }: { teacher: string; initial: ClassView; demo?: boolean }) {
  const [view, setView] = useState(initial);
  const [address, setAddress] = useState("");
  const [qr, setQr] = useState("");
  const [step, setStep] = useState(QUESTIONS[0]!.step);
  const [shown, setShown] = useState(false);
  const [answers, setAnswers] = useState<string[] | null>(null);
  const url = `/api/skole/klasse/${initial.id}`;

  // The address is read in an effect, so the server render and the first browser render match.
  useEffect(() => {
    const a = pupilAddress(window.location.host);
    setAddress(a);
    const code = qrcode(0, "M");
    code.addData(`${window.location.protocol}//${a}`);
    code.make();
    setQr(code.createSvgTag({ cellSize: 8, margin: 2, scalable: true }));
  }, []);

  const loadAnswers = useCallback(async () => {
    const r = await fetch(`${url}/svar?trin=${step}`, { cache: "no-store" });
    if (r.ok) setAnswers(((await r.json()) as { answers: string[] }).answers);
  }, [url, step]);

  useEffect(() => {
    if (shown) void loadAnswers().catch(() => {});
  }, [shown, loadAnswers]);

  // The numbers (and the shown answers) follow along while the pupils work; not while the tab is hidden.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        if (!demo) {
          const r = await fetch(url, { cache: "no-store" });
          if (r.ok) setView((await r.json()) as ClassView);
        }
        if (shown) await loadAnswers();
      } catch {}
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [url, demo, shown, loadAnswers]);

  const q = QUESTIONS.find((x) => x.step === step)!;
  const total = view.rows.length;

  return (
    <Shell right={<span className={s.teacherPill}>{teacher}</span>}>
      <div className={`${s.wrap} ${s.board}`}>
        <Link className={`${s.small} ${s.noPrint}`} href={`/skole/klasse/${initial.id}`}>
          ← {demo ? "Klasseoverblik" : classLabel(view)}
        </Link>
        <div className={s.boardTop}>
          <div className={`${s.card} ${s.boardJoin}`}>
            {qr ? <div className={s.boardQr} aria-hidden="true" dangerouslySetInnerHTML={{ __html: qr }} /> : <div className={s.boardQr} />}
            <div className={s.boardJoinText}>
              <span className={s.kicker}>Kom i gang</span>
              <b className={s.boardAddress}>{address}</b>
              <span>Scan koden, eller gå ind på adressen, og skriv din elevkode.</span>
            </div>
          </div>
          <div className={`${s.card} ${s.boardCount}`} aria-live="polite">
            <b>
              {view.stats.started} af {total}
            </b>
            <span>er i gang</span>
            <small>
              {view.stats.finished} {view.stats.finished === 1 ? "er færdig" : "er færdige"}
            </small>
          </div>
        </div>

        <section className={s.boardAnswers} aria-label="Klassens svar">
          <div className={s.boardPick} role="group" aria-label="Spørgsmål">
            {QUESTIONS.map((x) => (
              <button
                key={x.step}
                type="button"
                className={`${s.btn} ${s.btnSmall}`}
                aria-pressed={x.step === step}
                onClick={() => {
                  setStep(x.step);
                  setAnswers(null);
                }}
              >
                Trin {x.step} · {x.short}
              </button>
            ))}
          </div>
          <h2 className={s.boardQ}>{q.q}</h2>
          {!shown ? (
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShown(true)}>
              Vis svarene
            </button>
          ) : (
            <>
              <button type="button" className={`${s.btn} ${s.noPrint}`} onClick={() => setShown(false)}>
                Skjul svarene
              </button>
              {answers === null ? (
                <p className={s.note}>Henter …</p>
              ) : answers.length ? (
                <ul className={s.boardList}>
                  {answers.map((a, i) => (
                    <li key={i} className={s.boardAnswer}>
                      {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={s.note}>Ingen har svaret på spørgsmålet endnu.</p>
              )}
              <p className={s.small}>Svarene vises uden elevkoder og i tilfældig rækkefølge.</p>
            </>
          )}
        </section>
      </div>
    </Shell>
  );
}
