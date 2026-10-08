"use client";

import { useEffect, useState } from "react";
import { emptyFlow, isCode, normalizeCode, seedPosts, type Flow } from "@/lib/skole";
import { mainSiteUrl } from "@/lib/skole-host";
import { FlowView } from "./FlowView";
import { MyBudget } from "./MyBudget";
import { summaryPdf } from "./pdf";
import { Shell } from "./Shell";
import s from "./skole.module.css";
import { Start } from "./Start";
import { Summary } from "./Summary";
import { useToast } from "./useToast";

type Screen = "start" | "flow" | "sum" | "budget";
export type Update = (patch: Partial<Flow> | ((f: Flow) => Partial<Flow>)) => void;

// The reflection answers stay in this browser only (free text may hold names).
const answersKey = (code: string) => `budgetpro-skole:svar:${code}`;
function loadAnswers(code: string): Record<number, string> {
  try {
    return JSON.parse(localStorage.getItem(answersKey(code)) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export function StudentApp() {
  const [screen, setScreen] = useState<Screen>("start");
  const [code, setCode] = useState("");
  /** The code whose flow is loaded (null before the first start). */
  const [opened, setOpened] = useState<string | null>(null);
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [flow, setFlow] = useState<Flow>(emptyFlow);
  const [reveal, setReveal] = useState(0);
  const [refl, setRefl] = useState<Record<number, string>>({});
  const [toast, showToast] = useToast();
  // Read in an effect so the server render and the first browser render match.
  const [mainSite, setMainSite] = useState("/");
  useEffect(() => {
    setMainSite(mainSiteUrl(window.location));
  }, []);

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

  const open = (c: string, f: Flow) => {
    setCode(c);
    setOpened(c);
    setFlow(f);
    setReveal(f.maxStep > 2 ? 3 : 0);
    setRefl(loadAnswers(c));
    setScreen(f.done ? "sum" : "flow");
  };

  const begin = () => {
    const c = normalizeCode(code);
    if (!isCode(c)) return setCodeErr("Skriv den kode, du har fået af din lærer.");
    if (c === opened) return setScreen("flow");
    open(c, emptyFlow());
  };

  const go = (n: number) => {
    update((f) => ({ step: n, maxStep: Math.max(f.maxStep, n) }));
    setScreen("flow");
  };

  const answer = (step: number, text: string) =>
    setRefl((r) => {
      const next = { ...r, [step]: text };
      try {
        localStorage.setItem(answersKey(code), JSON.stringify(next));
      } catch {}
      return next;
    });

  const restart = () => {
    if (!window.confirm("Vil du starte forfra? Dine valg og svar bliver slettet.")) return;
    try {
      localStorage.removeItem(answersKey(code));
    } catch {}
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
          busy={false}
          onCode={(v) => {
            setCode(v);
            setCodeErr(null);
          }}
          onStart={begin}
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
        />
      )}
      {screen === "sum" && (
        <Summary
          code={code}
          flow={flow}
          refl={refl}
          onRefl={answer}
          onBudget={() => {
            update((f) => ({ posts: f.posts ?? seedPosts(f) }));
            setScreen("budget");
          }}
          onPdf={() => summaryPdf(code, flow, refl).catch(() => showToast("PDF’en kunne ikke laves. Prøv igen."))}
          onRestart={restart}
          mainSite={mainSite}
        />
      )}
      {screen === "budget" && <MyBudget flow={flow} update={update} onBack={() => setScreen("sum")} />}
    </Shell>
  );
}
