"use client";

import { useEffect, useState } from "react";
import { emptyFlow, isCode, normalizeCode, seedPosts, type Answers, type Flow } from "@/lib/skole";
import { FlowView } from "./FlowView";
import { MyBudget } from "./MyBudget";
import { budgetPdf, summaryPdf } from "./pdf";
import { Shell } from "./Shell";
import s from "./skole.module.css";
import { Start } from "./Start";
import { Summary } from "./Summary";
import { useToast } from "./useToast";

type Screen = "start" | "flow" | "sum" | "budget";

/**
 * The open code, kept in this tab only: a reload (or a phone that locked) opens it again, while closing the tab
 * leaves a shared Chromebook with an empty code field for the next pupil.
 */
const OPEN_KEY = "budgetpro-skole:kode";
const remember = (c: string | null) => {
  try {
    if (c) sessionStorage.setItem(OPEN_KEY, c);
    else sessionStorage.removeItem(OPEN_KEY);
  } catch {}
};

export type Update = (patch: Partial<Flow> | ((f: Flow) => Partial<Flow>)) => void;

export function StudentApp() {
  const [screen, setScreen] = useState<Screen>("start");
  const [code, setCode] = useState("");
  /** The code whose flow is loaded (null before the first start). */
  const [opened, setOpened] = useState<string | null>(null);
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [flow, setFlow] = useState<Flow>(emptyFlow);
  const [reveal, setReveal] = useState(0);
  /** The reflection answers; saved with the code, so the teacher can read them. */
  const [refl, setRefl] = useState<Answers>({});
  /** When the code stops working (ISO). */
  const [expires, setExpires] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();

  const update: Update = (patch) => setFlow((f) => ({ ...f, ...(typeof patch === "function" ? patch(f) : patch) }));

  // Step 2 shows the pay slip one line every half second.
  const revealing = screen === "flow" && flow.step === 2 && reveal < 3;
  useEffect(() => {
    if (!revealing) return;
    const timers = [1, 2, 3].map((i) => setTimeout(() => setReveal((r) => Math.max(r, i)), 500 * i));
    return () => timers.forEach(clearTimeout);
  }, [revealing]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen, flow.step]);

  // Save the choices and answers a moment after each change. keepalive lets the last save finish if the tab closes.
  // It also runs once right after the code is opened, which marks the pupil as started in the teacher's table.
  useEffect(() => {
    if (!opened) return;
    const timer = setTimeout(() => {
      const body = JSON.stringify({ code: opened, flow, answers: refl });
      fetch("/api/skole/elev", { method: "PUT", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [opened, flow, refl]);

  const open = (c: string, f: Flow, answers: Answers, until: string) => {
    remember(c);
    setCode(c);
    setOpened(c);
    setFlow(f);
    setReveal(f.maxStep > 2 ? 3 : 0);
    setRefl(answers);
    setExpires(until);
    setScreen(f.done ? "sum" : "flow");
  };

  const begin = async (typed = code) => {
    const c = normalizeCode(typed);
    if (!isCode(c)) return setCodeErr("Skriv den kode, du har fået af din lærer.");
    if (c === opened) return setScreen(flow.done ? "sum" : "flow");
    setBusy(true);
    try {
      const r = await fetch("/api/skole/elev", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c }) });
      if (r.status === 404) {
        remember(null);
        return setCodeErr("Den kode kender vi ikke, eller den er udløbet. Tjek, at den er skrevet rigtigt, ellers spørg din lærer om en ny.");
      }
      if (!r.ok) throw new Error(String(r.status));
      const saved = (await r.json()) as { flow: Flow | null; answers: Answers; expires: string };
      open(c, saved.flow ?? emptyFlow(), saved.answers ?? {}, saved.expires);
    } catch {
      setCodeErr("Der er ingen forbindelse lige nu. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  };

  // After a reload: open the code this tab had open, right where the pupil was.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(OPEN_KEY);
    } catch {}
    if (saved) {
      setCode(saved);
      void begin(saved);
    }
    // Only on the first render.
  }, []);

  const go = (n: number) => {
    update((f) => ({ step: n, maxStep: Math.max(f.maxStep, n) }));
    setScreen("flow");
  };

  const openBudget = () => {
    update((f) => ({ posts: f.posts ?? seedPosts(f) }));
    setScreen("budget");
  };

  const answer = (step: number, text: string) => setRefl((r) => ({ ...r, [step]: text }));

  const restart = () => {
    if (!window.confirm("Vil du starte forfra? Dine valg og svar bliver slettet.")) return;
    setFlow(emptyFlow());
    setReveal(0);
    setRefl({});
    setScreen("flow");
  };

  const right =
    screen === "start" ? null : (
      <span className={s.codeChip}>
        <span className={s.codeLabel}>Elevkode</span>
        <b>{code}</b>
      </span>
    );

  return (
    <Shell right={right} toast={toast}>
      {screen === "start" && (
        <Start
          code={code}
          error={codeErr}
          busy={busy}
          onCode={(v) => {
            setCode(v);
            setCodeErr(null);
          }}
          onStart={() => void begin()}
        />
      )}
      {screen === "flow" && (
        <FlowView
          flow={flow}
          update={update}
          go={go}
          reveal={reveal}
          onBack={() => (flow.step === 1 ? setScreen("start") : go(flow.step - 1))}
          onFinish={() => {
            update({ done: true });
            setScreen("sum");
          }}
          onBudget={openBudget}
        />
      )}
      {screen === "sum" && (
        <Summary
          code={code}
          flow={flow}
          refl={refl}
          expires={expires}
          onRefl={answer}
          onBudget={openBudget}
          onEdit={() => go(1)}
          onPdf={() => summaryPdf(code, flow, refl).catch(() => showToast("PDF’en kunne ikke laves. Prøv igen."))}
          onRestart={restart}
        />
      )}
      {screen === "budget" && (
        <MyBudget
          flow={flow}
          update={update}
          // Opened from step 1 (before the summary): back to the steps.
          back={flow.done ? "Tilbage til opsummering" : "Tilbage til trinene"}
          onBack={() => setScreen(flow.done ? "sum" : "flow")}
          onPdf={(posts) => budgetPdf(code, flow, posts).catch(() => showToast("PDF’en kunne ikke laves. Prøv igen."))}
        />
      )}
    </Shell>
  );
}
