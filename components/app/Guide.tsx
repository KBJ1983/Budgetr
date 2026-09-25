"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { summarize } from "@/lib/domain/calc";
import { emptyBudget, GOAL_COLORS, newId } from "@/lib/domain/example";
import { addMonths, INTERVAL_LABEL, kr, monthOf } from "@/lib/domain/format";
import { INTERVALS, type Account, type Budget, type BudgetItem, type Interval, type SplitMode } from "@/lib/domain/types";
import { addBudget, resetExample, useSession } from "@/lib/store";
import { Field, MoneyInput, Seg } from "./ui";

interface Row {
  id: string;
  name: string;
  amount: number;
  interval: Interval;
  excluded?: boolean;
}
interface LoanRow {
  id: string;
  name: string;
  balance: number;
  rate: string;
  payment: number;
}
interface GoalRow {
  id: string;
  name: string;
  mode: "target" | "monthly";
  target: number;
  deadline: string;
  monthly: number;
  saved: number;
}

const EXPENSE_PRESETS: [string, string, boolean?][] = [
  ["Husleje eller boliglån", "Bolig"],
  ["El", "Bolig"],
  ["Varme", "Bolig"],
  ["Vand", "Bolig"],
  ["Internet", "Bolig"],
  ["Forsikringer", "Forsikring"],
  ["Bil og transport", "Transport"],
  ["Børnepasning", "Børn"],
  ["Abonnementer", "Abonnementer"],
  ["Fagforening og a-kasse", "Fagforening og a-kasse"],
  ["Mad og husholdning", "Mad", true],
];

const STEPS = [
  "Dig og dem, du deler økonomi med",
  "Konti",
  "Indtægter",
  "Faste udgifter",
  "Lån",
  "Opsparingsmål",
  "Fordeling og overblik",
];

export function Guide({ email }: { email?: string }) {
  const router = useRouter();
  const { state, user, ready } = useSession();
  const now = monthOf(new Date());
  useEffect(() => {
    if (ready && !user) {
      router.replace(`/login?next=/app/start${email ? `&email=${encodeURIComponent(email)}` : ""}`);
    }
  }, [ready, user, email, router]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  const [names, setNames] = useState<{ id: string; name: string }[]>([{ id: newId(), name: "" }]);
  const [children, setChildren] = useState(0);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [incomes, setIncomes] = useState<Record<string, number>>({});
  const [extraIncome, setExtraIncome] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>(
    EXPENSE_PRESETS.map(([name, , excluded]) => ({ id: newId(), name, amount: 0, interval: 1, excluded })),
  );
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [split, setSplit] = useState<SplitMode>("income");

  const persons = names.filter((p) => p.name.trim());
  const shared = persons.length > 1;
  // Danish genitive: "Annas", but "Jonas’".
  const genitive = (s: string) => (/[sxz]$/i.test(s) ? `${s}’` : `${s}s`);
  const budgetName =
    persons.length === 0 ? "Mit budget" : `${genitive(persons.map((p) => p.name.trim()).join(" og "))} budget`;

  const suggestedAccounts = (): Account[] => [
    ...persons.map((p) => ({ id: `lon-${p.id}`, name: `${p.name.trim()} – lønkonto`, ownerId: p.id, kind: "løn" as const })),
    { id: "budget", name: "Budgetkonto", ownerId: null, kind: "budget" },
    { id: "opsparing", name: shared ? "Fælles opsparing" : "Opsparing", ownerId: null, kind: "opsparing" },
  ];
  const accs = accounts ?? suggestedAccounts();
  const budgetAcc = accs.find((a) => a.kind === "budget")?.id ?? accs[0]?.id ?? "";
  const savingsAcc = accs.find((a) => a.kind === "opsparing")?.id ?? budgetAcc;

  const build = (): Budget => {
    const b = emptyBudget(budgetName);
    b.persons = persons.map((p) => ({ id: p.id, name: p.name.trim() }));
    b.children = children;
    b.accounts = accs.filter((a) => a.name.trim());
    const owner = shared ? null : (b.persons[0]?.id ?? null);
    const salaryAcc = (pid: string) => b.accounts.find((a) => a.kind === "løn" && a.ownerId === pid)?.id ?? budgetAcc;
    const items: BudgetItem[] = [];
    for (const p of b.persons) {
      const amt = incomes[p.id] ?? 0;
      if (amt > 0)
        items.push({ id: newId(), name: `Løn ${p.name}`, kind: "indtægt", amount: amt, interval: 1, ownerId: p.id, accountId: salaryAcc(p.id), category: "Løn", history: [] });
    }
    for (const r of extraIncome.filter((r) => r.name.trim() && r.amount > 0))
      items.push({ id: newId(), name: r.name.trim(), kind: "indtægt", amount: r.amount, interval: r.interval, ownerId: owner, accountId: budgetAcc, category: "Offentlige ydelser", history: [] });
    for (const r of expenses.filter((r) => r.name.trim() && r.amount > 0)) {
      const preset = EXPENSE_PRESETS.find(([n]) => n === r.name);
      items.push({
        id: newId(),
        name: r.name.trim(),
        kind: "udgift",
        amount: r.amount,
        interval: r.interval,
        ownerId: owner,
        accountId: budgetAcc,
        category: preset?.[1] ?? "Andet",
        bankExcluded: r.excluded,
        history: [],
      });
    }
    for (const l of loans.filter((l) => l.name.trim() && l.payment > 0)) {
      const itemId = newId();
      const loanId = newId();
      items.push({ id: itemId, name: l.name.trim(), kind: "udgift", amount: l.payment, interval: 1, ownerId: owner, accountId: budgetAcc, category: "Lån", loanId, history: [] });
      b.loans.push({ id: loanId, name: l.name.trim(), balance: l.balance, ratePct: Number(l.rate.replace(",", ".")) || 0, principal: l.balance, itemId });
    }
    b.items = items;
    b.goals = goals
      .filter((g) => g.name.trim() && (g.mode === "monthly" ? g.monthly > 0 : g.target > 0))
      .map((g, i) => ({
        id: g.id,
        name: g.name.trim(),
        color: GOAL_COLORS[i % GOAL_COLORS.length]!,
        mode: g.mode,
        target: g.target,
        deadline: g.deadline,
        monthly: g.monthly,
        saved: g.saved,
        extras: [],
        ownerId: owner,
        accountId: savingsAcc,
      }));
    b.split = { mode: split, fixedPct: {} };
    return b;
  };

  const next = () => {
    setError("");
    if (step === 0 && persons.length === 0) return setError("Skriv dit navn for at fortsætte.");
    if (step === STEPS.length - 1) {
      const b = build();
      addBudget(b);
      router.push("/app");
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0 });
  };
  const back = () => {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  };

  const preview = step === STEPS.length - 1 ? summarize(build(), now) : null;

  return (
    <div className="bx" data-theme={state?.theme ?? "dark"}>
      <header className="bx-top">
        <div className="bx-wrap bx-top-row">
          <Link href="/" className="bx-brand" aria-label="budgetr – til forsiden">
            <LogoMark size={26} />
            <b style={{ fontSize: 19, letterSpacing: "-0.03em" }}>budgetr</b>
          </Link>
          <button
            type="button"
            className="bx-btn"
            onClick={() => {
              if (!state?.budgets.some((b) => b.id === "eksempel")) resetExample();
              router.push("/app");
            }}
          >
            Se eksemplet i stedet
          </button>
        </div>
      </header>
      <main className="bx-guide">
        <div className="bx-steps" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={i <= step ? "done" : ""} />
          ))}
        </div>
        <div className="bx-eyebrow">
          Trin {step + 1} af {STEPS.length}
        </div>
        <h1>{STEPS[step]}</h1>

        {step === 0 ? (
          <>
            <p className="bx-guide-lead">
              Korte svar, som kan rettes bagefter. Bor I flere sammen, kan I dele budgettet og fordele udgifterne fair.
              {user ? (
                <>
                  {" "}
                  Budgettet gemmes hos testbruger <b>{user.name}</b> i denne browser.
                </>
              ) : null}
            </p>
            <div className="bx-list-edit">
              {names.map((p, idx) => (
                <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "end" }}>
                  <div style={{ flex: 1 }}>
                    <Field label={idx === 0 ? "Dit navn" : `Person ${idx + 1}`}>
                      <input
                        className="bx-input"
                        value={p.name}
                        autoFocus={idx === 0}
                        onChange={(e) => {
                          setNames(names.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)));
                          setAccounts(null);
                        }}
                      />
                    </Field>
                  </div>
                  {idx > 0 ? (
                    <button type="button" className="bx-x" aria-label="Fjern person" onClick={() => setNames(names.filter((x) => x.id !== p.id))}>
                      ×
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <button type="button" className="bx-btn" style={{ alignSelf: "flex-start", marginTop: 10 }} onClick={() => setNames([...names, { id: newId(), name: "" }])}>
              + Jeg deler økonomi med en til
            </button>
            <div className="bx-grid-2" style={{ marginTop: 16 }}>
              <Field label="Antal børn i husstanden">
                <input className="bx-input num" type="number" min={0} max={12} value={children} onChange={(e) => setChildren(Math.max(0, Math.min(12, Number(e.target.value) || 0)))} />
              </Field>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <p className="bx-guide-lead">
              Vi har foreslået konti ud fra, hvordan de fleste gør. Faste udgifter betales fra budgetkontoen, og overførslerne fra
              lønkontoen regnes ud for dig.
            </p>
            <div className="bx-list-edit">
              {accs.map((a) => (
                <div key={a.id} style={{ display: "flex", gap: 8, alignItems: "end" }}>
                  <div style={{ flex: 1 }}>
                    <Field label={a.kind === "løn" ? "Lønkonto" : a.kind === "budget" ? "Budgetkonto" : a.kind === "opsparing" ? "Opsparing" : "Konto"}>
                      <input className="bx-input" value={a.name} onChange={(e) => setAccounts(accs.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x)))} />
                    </Field>
                  </div>
                  {a.kind !== "løn" ? (
                    <button type="button" className="bx-x" aria-label={`Fjern ${a.name}`} onClick={() => setAccounts(accs.filter((x) => x.id !== a.id))}>
                      ×
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className="bx-guide-lead">Skriv lønnen efter skat – det beløb, der kommer ind på kontoen hver måned.</p>
            <div className="bx-grid-2">
              {persons.map((p) => (
                <Field key={p.id} label={`Løn ${p.name.trim()} (efter skat)`}>
                  <MoneyInput value={incomes[p.id] ?? 0} onChange={(n) => setIncomes({ ...incomes, [p.id]: n })} />
                </Field>
              ))}
            </div>
            <RowsEditor
              title="Andre indtægter"
              hint="Fx børne- og ungeydelse (betales hvert kvartal), SU eller pension."
              rows={extraIncome}
              setRows={setExtraIncome}
              addLabel="+ Anden indtægt"
            />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <p className="bx-guide-lead">
              Skriv det, du ved. Tomme felter springes over, og du kan importere en kontoudskrift bagefter for at finde resten.
            </p>
            <RowsEditor rows={expenses} setRows={setExpenses} addLabel="+ Anden fast udgift" showExcluded />
          </>
        ) : null}

        {step === 4 ? (
          <>
            <p className="bx-guide-lead">
              Med restgæld, rente og ydelse regner vi ud, hvornår lånet er betalt, og hvad der frigives. Har du ingen lån, så spring
              videre.
            </p>
            <div className="bx-list-edit">
              {loans.map((l) => (
                <div className="bx-card" key={l.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                    <div style={{ flex: 1 }}>
                      <Field label="Lån">
                        <input className="bx-input" value={l.name} placeholder="Fx Billån" onChange={(e) => setLoans(loans.map((x) => (x.id === l.id ? { ...x, name: e.target.value } : x)))} />
                      </Field>
                    </div>
                    <button type="button" className="bx-x" aria-label="Fjern lån" onClick={() => setLoans(loans.filter((x) => x.id !== l.id))}>
                      ×
                    </button>
                  </div>
                  <div className="bx-grid-2">
                    <Field label="Restgæld">
                      <MoneyInput value={l.balance} onChange={(n) => setLoans(loans.map((x) => (x.id === l.id ? { ...x, balance: n } : x)))} />
                    </Field>
                    <Field label="Rente pr. år (%)">
                      <input className="bx-input num" inputMode="decimal" value={l.rate} placeholder="Fx 4,9" onChange={(e) => setLoans(loans.map((x) => (x.id === l.id ? { ...x, rate: e.target.value } : x)))} />
                    </Field>
                    <Field label="Ydelse pr. måned">
                      <MoneyInput value={l.payment} onChange={(n) => setLoans(loans.map((x) => (x.id === l.id ? { ...x, payment: n } : x)))} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="bx-btn" style={{ marginTop: 10 }} onClick={() => setLoans([...loans, { id: newId(), name: "", balance: 0, rate: "", payment: 0 }])}>
              + Tilføj lån
            </button>
          </>
        ) : null}

        {step === 5 ? (
          <>
            <p className="bx-guide-lead">Et fast beløb til en dato, eller en fast månedlig indbetaling. Du kan altid tilføje flere.</p>
            <div className="bx-list-edit">
              {goals.map((g) => {
                const set = (patch: Partial<GoalRow>) => setGoals(goals.map((x) => (x.id === g.id ? { ...x, ...patch } : x)));
                return (
                  <div className="bx-card" key={g.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                      <div style={{ flex: 1 }}>
                        <Field label="Mål">
                          <input className="bx-input" value={g.name} placeholder="Fx Udbetaling til bolig" onChange={(e) => set({ name: e.target.value })} />
                        </Field>
                      </div>
                      <button type="button" className="bx-x" aria-label="Fjern mål" onClick={() => setGoals(goals.filter((x) => x.id !== g.id))}>
                        ×
                      </button>
                    </div>
                    <Seg
                      label="Type"
                      value={g.mode}
                      onChange={(mode) => set({ mode })}
                      options={[
                        { value: "target", label: "Fast beløb til en dato" },
                        { value: "monthly", label: "Fast pr. måned" },
                      ]}
                    />
                    <div className="bx-grid-2">
                      {g.mode === "target" ? (
                        <>
                          <Field label="Beløb">
                            <MoneyInput value={g.target} onChange={(n) => set({ target: n })} />
                          </Field>
                          <Field label="Senest">
                            <input className="bx-input" type="month" min={now} value={g.deadline} onChange={(e) => set({ deadline: e.target.value || g.deadline })} />
                          </Field>
                        </>
                      ) : (
                        <Field label="Pr. måned">
                          <MoneyInput value={g.monthly} onChange={(n) => set({ monthly: n })} />
                        </Field>
                      )}
                      <Field label="Sparet op indtil nu">
                        <MoneyInput value={g.saved} onChange={(n) => set({ saved: n })} />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button
                type="button"
                className="bx-btn"
                onClick={() => setGoals([...goals, { id: newId(), name: "", mode: "target", target: 0, deadline: addMonths(now, 24), monthly: 0, saved: 0 }])}
              >
                + Opsparingsmål
              </button>
              {!goals.some((g) => g.name === "Buffer") ? (
                <button
                  type="button"
                  className="bx-btn"
                  onClick={() => setGoals([...goals, { id: newId(), name: "Buffer", mode: "monthly", target: 0, deadline: now, monthly: 1000, saved: 0 }])}
                >
                  + Buffer (1.000 kr/md.)
                </button>
              ) : null}
            </div>
          </>
        ) : null}

        {step === 6 && preview ? (
          <>
            {shared ? (
              <>
                <p className="bx-guide-lead">Hvordan skal fælles udgifter fordeles? Det kan ændres under Indstillinger.</p>
                <Seg
                  label="Fordeling"
                  value={split}
                  onChange={setSplit}
                  options={[
                    { value: "income", label: "Efter indkomst" },
                    { value: "equal", label: "Ligeligt" },
                    { value: "fixed", label: "Fast procent (vælges bagefter)" },
                  ]}
                />
              </>
            ) : (
              <p className="bx-guide-lead">Sådan ser dit budget ud. Alt kan rettes bagefter.</p>
            )}
            <div className="bx-tiles" style={{ marginTop: 18 }}>
              <div className="bx-tile">
                <span>Nettoindtægt</span>
                <b>{kr(preview.income)}</b>
                <span>pr. måned</span>
              </div>
              <div className="bx-tile">
                <span>Faste udgifter</span>
                <b>{kr(preview.expenses)}</b>
                <span>pr. måned</span>
              </div>
              <div className="bx-tile is-hi">
                <span>Rådighedsbeløb</span>
                <b>{kr(preview.disposable)}</b>
                <span>som banken regner det</span>
              </div>
              <div className={`bx-tile ${preview.leftAfterSavings >= 0 ? "is-pos" : "is-neg"}`}>
                <span>Tilbage efter opsparing</span>
                <b>{kr(preview.leftAfterSavings)}</b>
                <span>pr. måned</span>
              </div>
            </div>
            {shared ? (
              <div className="bx-persons" style={{ marginTop: 12 }}>
                {preview.persons.map((p) => (
                  <div key={p.personId} className="bx-card">
                    <b>{p.name}</b> <span className="bx-muted">betaler {Math.round(p.share * 100)} % af de fælles udgifter</span>
                    <div className="bx-big pos">{kr(p.disposable)}</div>
                    <div className="bx-muted">til rådighed pr. måned</div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {error ? (
          <p className="bx-error" role="alert" style={{ marginTop: 12 }}>
            {error}
          </p>
        ) : null}
        <div className="bx-guide-foot">
          {step > 0 ? (
            <button type="button" className="bx-btn bx-btn-lg" onClick={back}>
              ← Tilbage
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="bx-btn bx-btn-primary bx-btn-lg" onClick={next}>
            {step === STEPS.length - 1 ? "Se dit budget →" : step >= 4 ? "Næste (kan springes over) →" : "Næste →"}
          </button>
        </div>
      </main>
    </div>
  );
}

function RowsEditor({
  title,
  hint,
  rows,
  setRows,
  addLabel,
  showExcluded,
}: {
  title?: string;
  hint?: string;
  rows: Row[];
  setRows: (r: Row[]) => void;
  addLabel: string;
  showExcluded?: boolean;
}) {
  const set = (id: string, patch: Partial<Row>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <div style={{ marginTop: title ? 20 : 0 }}>
      {title ? <b style={{ fontSize: 15 }}>{title}</b> : null}
      {hint ? <p className="bx-help" style={{ margin: "4px 0 10px" }}>{hint}</p> : null}
      <div className="bx-list-edit">
        {rows.map((r) => (
          <div key={r.id}>
            <div className="bx-list-edit-row">
              <Field label="Navn">
                <input className="bx-input" value={r.name} onChange={(e) => set(r.id, { name: e.target.value })} />
              </Field>
              <Field label="Beløb">
                <MoneyInput value={r.amount} onChange={(n) => set(r.id, { amount: n })} />
              </Field>
              <Field label="Betales">
                <select className="bx-select" value={r.interval} onChange={(e) => set(r.id, { interval: Number(e.target.value) as Interval })}>
                  {INTERVALS.map((n) => (
                    <option key={n} value={n}>
                      {INTERVAL_LABEL[n]}
                    </option>
                  ))}
                </select>
              </Field>
              <button type="button" className="bx-x" aria-label={`Fjern ${r.name || "række"}`} onClick={() => setRows(rows.filter((x) => x.id !== r.id))}>
                ×
              </button>
            </div>
            {showExcluded && r.excluded ? (
              <p className="bx-help" style={{ marginTop: 4 }}>
                Holdes ude af rådighedsbeløbet, som banken gør.
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="bx-btn"
        style={{ marginTop: 10 }}
        onClick={() => setRows([...rows, { id: newId(), name: "", amount: 0, interval: 1 }])}
      >
        {addLabel}
      </button>
    </div>
  );
}
