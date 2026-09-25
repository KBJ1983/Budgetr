"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { monthOf } from "@/lib/domain/format";
import { applyScenario } from "@/lib/domain/scenario";
import type { Budget } from "@/lib/domain/types";
import { activeBudget, addBudget, logout, setActive, setTheme, updateBudget, useSession } from "@/lib/store";
import { BudgetTab } from "./BudgetTab";
import { GoalDialog } from "./GoalDialog";
import { GoalsTab } from "./GoalsTab";
import { exportBackup, exportCsv, isBudget } from "./helpers";
import { ImportDialog } from "./ImportDialog";
import { ItemDialog } from "./ItemDialog";
import { LoanDialog } from "./LoanDialog";
import { LoansTab } from "./LoansTab";
import { ScenarioDialog } from "./ScenarioDialog";
import { SettingsDialog } from "./SettingsDialog";
import { TransfersTab } from "./TransfersTab";
import { Menu } from "./ui";

export type DialogState =
  | { kind: "item"; id: string | null }
  | { kind: "goal"; id: string | null }
  | { kind: "loan"; id: string | null }
  | { kind: "scenario"; id: string | null }
  | { kind: "settings" }
  | { kind: "import" };

export type Open = (d: DialogState) => void;

const TABS = [
  { id: "budget", label: "Budget" },
  { id: "lan", label: "Overblik over lån" },
  { id: "overforsler", label: "Faste overførsler" },
  { id: "opsparing", label: "Opsparingsmål" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function BudgetApp() {
  const { user, state, ready } = useSession();
  const [tab, setTabState] = useState<TabId>("budget");
  // The tab lives in the URL hash so it survives reloads and can be linked to (/app#lan).
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1);
      if (TABS.some((t) => t.id === h)) setTabState(h as TabId);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const setTab = (t: TabId) => {
    setTabState(t);
    window.history.replaceState(null, "", t === "budget" ? window.location.pathname : `#${t}`);
  };
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const current = state ? activeBudget(state) : undefined;

  // Not logged in → login page. Logged in without a budget → the guide.
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login?next=/app");
    else if (!current) router.replace("/app/start");
  }, [ready, user, current, router]);

  if (!state || !user || !current) return <div className="bx" data-theme={state?.theme ?? "dark"} aria-busy="true" />;

  const budget = current;
  const now = monthOf(new Date());
  const scenario = budget.scenarios.find((s) => s.id === scenarioId);
  const view = applyScenario(budget, scenario);
  const update = (fn: (b: Budget) => Budget) => updateBudget(budget.id, fn);
  const isExample = budget.id === "eksempel";
  const shared = budget.persons.length > 1;

  const onBackup = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isBudget(parsed)) throw new Error("not a budget");
      const exists = state.budgets.some((b) => b.id === parsed.id);
      if (exists && !window.confirm(`Sikkerhedskopien erstatter budgettet “${parsed.name}”. Fortsæt?`)) return;
      addBudget(parsed);
      setScenarioId(null);
    } catch {
      window.alert("Filen kunne ikke læses som en sikkerhedskopi fra budgetr.");
    }
  };

  return (
    <div className="bx" data-theme={state.theme}>
      <header className="bx-top">
        <div className="bx-wrap">
          <div className="bx-top-row">
            <Link href="/" className="bx-brand" aria-label="budgetr – til forsiden">
              <LogoMark size={26} />
              <b style={{ fontSize: 19, letterSpacing: "-0.03em" }}>budgetr</b>
            </Link>
            <div className="bx-top-right">
              {state.budgets.length > 1 ? (
                <label className="bx-hide-sm" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="bx-muted">Budget</span>
                  <select
                    className="bx-select"
                    style={{ height: 36, fontSize: 13, width: "auto" }}
                    value={budget.id}
                    onChange={(e) => {
                      setActive(e.target.value);
                      setScenarioId(null);
                    }}
                  >
                    {state.budgets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                className="bx-btn"
                onClick={() => setTheme(state.theme === "dark" ? "light" : "dark")}
                aria-label={`Skift til ${state.theme === "dark" ? "lyst" : "mørkt"} tema`}
              >
                Tema: {state.theme === "dark" ? "Mørkt" : "Lyst"}
              </button>
              <button type="button" className="bx-btn" onClick={() => setDialog({ kind: "settings" })}>
                Indstillinger
              </button>
              <button
                type="button"
                className="bx-btn"
                title="Skift bruger"
                onClick={() => {
                  logout();
                  router.push("/login?next=/app");
                }}
              >
                <b style={{ color: "var(--tx)" }}>{user.name}</b> · Skift bruger
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bx-banner bx-no-print">
        <div className="bx-wrap" style={{ display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
          <span>
            {isExample
              ? "Du ser et eksempel med opdigtede tal. Ret gerne i det – eller lav dit eget budget."
              : `Testbruger ${user.name}. Budgettet gemmes kun i denne browser – tag en sikkerhedskopi under Eksportér.`}
          </span>
          {isExample ? (
            <Link href="/app/start" style={{ fontWeight: 700 }}>
              Opret dit eget budget →
            </Link>
          ) : null}
        </div>
      </div>

      <div className="bx-wrap">
        <div className="bx-budget-name">
          <h1>{budget.name}</h1>
          <span className="bx-muted">
            {user.name} · gemt i denne browser{shared ? ` · ${budget.persons.map((p) => p.name).join(" og ")}` : ""}
          </span>
        </div>

        <div className="bx-tabbar">
          <div className="bx-tabs" role="tablist" aria-label="Visninger">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="bx-panel"
                className="bx-tab"
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="bx-tools">
            <Menu label="Importér">
              <button type="button" role="menuitem" onClick={() => setDialog({ kind: "import" })}>
                Kontoudskrift (CSV eller Excel)
              </button>
              <button type="button" role="menuitem" onClick={() => backupInput.current?.click()}>
                Sikkerhedskopi (.json)
              </button>
            </Menu>
            <Menu label="Eksportér">
              <button type="button" role="menuitem" onClick={() => window.print()}>
                PDF (udskriv)
              </button>
              <button type="button" role="menuitem" onClick={() => exportCsv(budget, now)}>
                Excel (CSV)
              </button>
              <button type="button" role="menuitem" onClick={() => exportBackup(budget)}>
                Sikkerhedskopi (.json)
              </button>
            </Menu>
            <button type="button" className="bx-btn bx-btn-primary" onClick={() => setDialog({ kind: "item", id: null })}>
              + Ny budgetpost
            </button>
            <input
              ref={backupInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onBackup(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <main className="bx-main" id="bx-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === "budget" ? (
            <BudgetTab
              budget={budget}
              view={view}
              scenario={scenario}
              now={now}
              open={setDialog}
              onScenario={setScenarioId}
            />
          ) : null}
          {tab === "lan" ? <LoansTab budget={view} now={now} open={setDialog} /> : null}
          {tab === "overforsler" ? <TransfersTab budget={budget} now={now} update={update} /> : null}
          {tab === "opsparing" ? <GoalsTab budget={budget} now={now} open={setDialog} /> : null}
        </main>
      </div>

      {dialog?.kind === "item" ? (
        <ItemDialog budget={budget} scenario={scenario} id={dialog.id} update={update} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === "goal" ? (
        <GoalDialog budget={budget} id={dialog.id} now={now} update={update} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === "loan" ? (
        <LoanDialog budget={budget} id={dialog.id} now={now} update={update} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === "scenario" ? (
        <ScenarioDialog
          budget={budget}
          id={dialog.id}
          update={update}
          onSaved={(id) => setScenarioId(id)}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "settings" ? (
        <SettingsDialog budget={budget} update={update} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === "import" ? (
        <ImportDialog budget={budget} now={now} update={update} onClose={() => setDialog(null)} />
      ) : null}
    </div>
  );
}
