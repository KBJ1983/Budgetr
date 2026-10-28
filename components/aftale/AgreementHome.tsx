"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/Logo";
import type { AgreementView, GrantRow } from "@/lib/agreement-admins";
import { parseEmails } from "@/lib/email-list";

// Mirrors MAX_BATCH / MAX_NOTE in lib/agreements.ts (a server module, so not imported here).
const MAX_BATCH = 50;
const MAX_NOTE = 80;

const num = (n: number) => n.toLocaleString("da-DK");
const date = (iso?: string) => {
  if (!iso) return "–";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
};
const months = (n: number) => `${n} ${n === 1 ? "måned" : "måneder"}`;

const STATUS: Record<GrantRow["status"], (g: GrantRow) => string> = {
  sent: () => "Sendt, ikke brugt endnu",
  lapsed: () => "Ikke brugt, fristen er passeret",
  active: (g) => `I brug til ${date(g.until)}`,
  ended: (g) => `Udløbet ${date(g.until)}`,
};

/** What each answer from /api/aftale means to the kundeadmin. */
function message(result: string, email: string, max: number): { tone: "pos" | "err"; text: string } {
  switch (result) {
    case "sent":
      return { tone: "pos", text: `Koden er sendt til ${email}.` };
    case "again":
      return { tone: "pos", text: `Den samme kode er sendt igen til ${email}.` };
    case "released":
      return { tone: "pos", text: `${email} kan ikke længere oprette klasser, og pladsen er fri igen.` };
    case "withdrawn":
      return { tone: "pos", text: "Adgangen er trukket tilbage, og pladsen er fri igen." };
    case "adminAdded":
      return { tone: "pos", text: `${email} er nu administrator og har fået en mail om det.` };
    case "adminAddedNoMail":
      return { tone: "pos", text: `${email} er nu administrator. Vi kunne ikke sende en mail om det lige nu, så giv selv besked om at logge ind på budgetpro.dk/aftale.` };
    case "adminRemoved":
      return { tone: "pos", text: `${email} er ikke længere administrator.` };
    case "nomail":
      return { tone: "err", text: "Adgangen er gemt, men mailen kunne ikke sendes, fordi mail ikke er sat op endnu. Brug Send igen senere." };
    case "mail":
      return { tone: "err", text: "Mailen kunne ikke sendes lige nu. Adgangen er gemt – brug Send igen om lidt." };
    case "email":
      return { tone: "err", text: "Skriv en gyldig e-mail." };
    case "used":
      return { tone: "err", text: "Den e-mail har allerede brugt en plads fra aftalen." };
    case "full":
      return { tone: "err", text: "Der er ingen frie pladser lige nu. Kontakt budgetpro, hvis I har brug for flere." };
    case "limit":
      return { tone: "err", text: "Koden er sendt tre gange det seneste døgn. Prøv igen i morgen." };
    case "exists":
      return { tone: "err", text: "Den e-mail er allerede administrator." };
    case "max":
      return { tone: "err", text: `Der kan højst være ${max} administratorer.` };
    case "self":
      return { tone: "err", text: "Du kan ikke fjerne dig selv." };
    case "noted":
      return { tone: "pos", text: `Noten ved ${email} er gemt.` };
    case "noEmails":
      return { tone: "err", text: "Vi fandt ingen e-mails i listen." };
    default:
      return { tone: "err", text: "Det lykkedes ikke lige nu. Prøv igen om lidt." };
  }
}

/** How "Giv adgang til flere" went, per kind of result, in the order the kundeadmin cares about. */
const MANY: [string, (n: number) => string][] = [
  ["sent", (n) => `${n} har fået en kode på mail`],
  ["nomail", (n) => `${n} er gemt, men mailen kunne ikke sendes (mail er ikke sat op endnu – brug Send igen senere)`],
  ["mail", (n) => `${n} er gemt, men mailen fejlede – brug Send igen om lidt`],
  ["exists", (n) => `${n} havde allerede fået en kode og fik ikke en ny`],
  ["used", (n) => `${n} har allerede brugt en plads`],
  ["full", (n) => `${n} fik ingen plads, fordi der ikke var flere frie (højst ${MAX_BATCH} ad gangen)`],
  ["email", (n) => `${n} ${n === 1 ? "var ikke en gyldig e-mail" : "var ikke gyldige e-mails"}`],
];

/**
 * /aftale for a logged-in kundeadmin: free seats, "give access" (an e-mail – nothing else, or a whole list), the list
 * of e-mails with send again / withdraw and the kundeadmins' own note, the packs and the colleagues who are
 * administrators too. No code is ever on this page.
 */
export function AgreementHome({ initial, orgs, give: initialGive = "" }: { initial: AgreementView; orgs: { id: string; name: string }[]; give?: string }) {
  const [view, setView] = useState(initial);
  const [note, setNote] = useState<{ tone: "pos" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // ?giv=… from a teacher's "Bed om adgang" mail fills in the e-mail.
  const [email, setEmail] = useState(initialGive);
  const [giveNote, setGiveNote] = useState("");
  const [many, setMany] = useState(false);
  const [list, setList] = useState("");
  const [manyNote, setManyNote] = useState("");
  const [report, setReport] = useState<{ email: string; result: string }[] | null>(null);
  const [colleague, setColleague] = useState("");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const school = view.category === "skole";
  const who = school ? "lærer" : "kunde";

  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
  }, []);

  const act = async (body: Record<string, unknown>, about: string) => {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch("/api/aftale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ org: view.id, ...body }) });
      if (r.status === 401) {
        window.location.reload();
        return false;
      }
      const j = (await r.json().catch(() => ({}))) as { result?: string; view?: AgreementView };
      if (j.view) setView(j.view);
      const m = message(j.result ?? "", about, view.maxAdmins);
      setNote(m);
      return m.tone === "pos";
    } catch {
      setNote(message("", about, view.maxAdmins));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const give = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const to = email.trim();
    if (await act({ action: "give", email: to, note: giveNote }, to)) {
      setEmail("");
      setGiveNote("");
    }
  };
  const found = parseEmails(list);
  const giveMany = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    setReport(null);
    try {
      const r = await fetch("/api/aftale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org: view.id, action: "giveMany", emails: list, note: manyNote }),
      });
      if (r.status === 401) return window.location.reload();
      const j = (await r.json().catch(() => ({}))) as { result?: string; report?: { email: string; result: string }[]; view?: AgreementView };
      if (j.view) setView(j.view);
      if (j.report) {
        setReport(j.report);
        // What went fine leaves the list; the rest stays, so it can be fixed and sent again.
        const left = j.report.filter((x) => !["sent", "nomail", "mail", "exists", "used"].includes(x.result)).map((x) => x.email);
        setList(left.join("\n"));
      } else setNote(message(j.result ?? "", "", view.maxAdmins));
    } catch {
      setNote(message("", "", view.maxAdmins));
    } finally {
      setBusy(false);
    }
  };
  const readFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 1024 * 1024) return setNote({ tone: "err", text: "Filen er for stor. Brug en CSV- eller tekstfil på under 1 MB." });
    const text = await f.text();
    setList((l) => (l.trim() ? `${l.trim()}\n${text}` : text));
  };
  const editNote = (g: GrantRow) => {
    const next = window.prompt(`Note ved ${g.email} (kun for jer, fx et sagsnummer – kunden ser den ikke):`, g.note ?? "");
    if (next !== null) void act({ action: "note", grant: g.id, note: next.slice(0, MAX_NOTE) }, g.email);
  };
  const addColleague = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const to = colleague.trim();
    if (await act({ action: "addAdmin", email: to }, to)) setColleague("");
  };

  const q = query.trim().toLowerCase();
  const grants = view.grants.filter((g) => !q || g.email.includes(q));
  const waiting = view.grants.filter((g) => g.status === "sent").length;

  return (
    <div className="bx af" data-theme={theme}>
      <header className="bx-top">
        <div className="bx-wrap bx-top-row">
          <Logo fontSize={19} dark={theme === "dark"} bg={theme === "dark" ? "#0A1522" : "#FFFFFF"} />
          <div className="bx-top-right">
            <button
              type="button"
              className="bx-btn"
              onClick={async () => {
                await fetch("/api/aftale/auth/logout", { method: "POST" }).catch(() => {});
                window.location.reload();
              }}
            >
              Log ud
            </button>
          </div>
        </div>
      </header>

      <main className="bx-wrap bx-main">
        <section className="bx-section">
          <h1 className="af-title">{view.name}</h1>
          {orgs.length > 1 ? (
            <label className="af-org">
              <span className="bx-muted">Du er administrator af flere aftaler:</span>
              <select
                className="bx-select af-org-select"
                value={view.id}
                onChange={(e) => window.location.assign(`/aftale?org=${encodeURIComponent(e.target.value)}`)}
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <p className="bx-muted af-lead">
            Her giver du {school ? "lærere" : "jeres kunder"} adgang til budgetpro{school ? " Skole" : ""}. Du skriver kun en e-mail, så sender vi
            personen en kode. Ingen kan se koderne – heller ikke du.
          </p>
          <div className="bx-tiles">
            <div className={`bx-tile${view.seats.free ? " is-hi" : ""}`}>
              <span>Frie pladser</span>
              <b>{num(view.seats.free)}</b>
              <span>kan sendes nu</span>
            </div>
            <div className="bx-tile">
              <span>I brug</span>
              <b>{num(view.seats.used)}</b>
              <span>har brugt koden</span>
            </div>
            <div className="bx-tile">
              <span>Sendt</span>
              <b>{num(waiting)}</b>
              <span>venter på at blive brugt</span>
            </div>
            <div className="bx-tile">
              <span>Pladser i alt</span>
              <b>{num(view.seats.count)}</b>
              <span>{view.packs.length === 1 ? `${months(view.packs[0]!.months)} pr. plads` : `${num(view.packs.length)} pakker`}</span>
            </div>
          </div>
        </section>

        <section className="bx-section">
          <div className="bx-section-head">
            <h2>Giv en {who} adgang</h2>
          </div>
          <form className="bx-card af-give" onSubmit={give} noValidate>
            <label className="bx-field">
              <span>{school ? "Lærerens" : "Kundens"} e-mail</span>
              <input
                className="bx-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={school ? "navn@skole.dk" : "navn@eksempel.dk"}
                autoComplete="off"
              />
            </label>
            <label className="bx-field">
              <span>Note til jer selv (valgfri)</span>
              <input className="bx-input" value={giveNote} maxLength={MAX_NOTE} onChange={(e) => setGiveNote(e.target.value)} placeholder="fx sagsnummer" autoComplete="off" />
            </label>
            <button type="submit" className="bx-btn bx-btn-primary" disabled={busy || !email.trim() || !view.seats.free}>
              Giv adgang
            </button>
          </form>
          <button type="button" className="bx-btn af-many-toggle" aria-expanded={many} onClick={() => setMany((m) => !m)}>
            {many ? "Skjul" : `Giv adgang til flere ${school ? "lærere" : "kunder"} på én gang`}
          </button>
          {many ? (
            <form className="bx-card af-many" onSubmit={giveMany} noValidate>
              <label className="bx-field">
                <span>E-mails – én pr. linje, eller adskilt med komma</span>
                <textarea className="bx-input af-many-list" rows={6} value={list} onChange={(e) => setList(e.target.value)} placeholder={"navn@eksempel.dk\nanden@eksempel.dk"} />
              </label>
              <label className="bx-field">
                <span>Eller hent dem fra en fil (CSV eller tekst, fx et udtræk fra jeres system)</span>
                <input className="bx-input" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => void readFile(e.target.files?.[0]).then(() => (e.target.value = ""))} />
              </label>
              <label className="bx-field">
                <span>Note til jer selv ved alle (valgfri)</span>
                <input className="bx-input" value={manyNote} maxLength={MAX_NOTE} onChange={(e) => setManyNote(e.target.value)} placeholder="fx kampagne eller afdeling" autoComplete="off" />
              </label>
              <p className="bx-muted">
                {found.emails.length
                  ? `Fundet: ${num(found.emails.length)} ${found.emails.length === 1 ? "e-mail" : "e-mails"}${found.invalid.length ? ` og ${num(found.invalid.length)} ugyldige` : ""}. Der kan sendes ${num(Math.min(MAX_BATCH, view.seats.free))} nu.`
                  : `Vi finder e-mails i teksten, også i en CSV med flere kolonner. Højst ${MAX_BATCH} ad gangen. E-mails, der allerede har fået en kode, springes over.`}
              </p>
              <button type="submit" className="bx-btn bx-btn-primary" disabled={busy || !found.emails.length || !view.seats.free}>
                {busy ? "Sender …" : `Giv adgang til ${num(Math.min(found.emails.length, MAX_BATCH, view.seats.free))}`}
              </button>
            </form>
          ) : null}
          {report ? (
            <div className="bx-note is-pos af-report" role="status">
              <ul>
                {MANY.map(([k, t]) => {
                  const n = report.filter((x) => x.result === k).length;
                  return n ? <li key={k}>{t(n)}</li> : null;
                })}
              </ul>
              {report.some((x) => ["full", "email", "mail", "nomail"].includes(x.result)) ? (
                <details>
                  <summary>Se hvilke</summary>
                  <ul>
                    {report
                      .filter((x) => ["full", "email", "mail", "nomail"].includes(x.result))
                      .map((x) => (
                        <li key={x.email + x.result}>{x.email}</li>
                      ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}
          {note ? (
            <p className={note.tone === "pos" ? "bx-note is-pos" : "bx-error"} role={note.tone === "pos" ? "status" : "alert"}>
              <span>{note.text}</span>
            </p>
          ) : null}
          {!view.seats.free ? <p className="bx-muted">Der er ingen frie pladser lige nu. Kontakt budgetpro, hvis I har brug for flere.</p> : null}
        </section>

        <section className="bx-section">
          <div className="bx-section-head">
            <h2>Adgange</h2>
            {view.grants.length > 8 ? (
              <input className="bx-input af-search" type="search" placeholder="Søg på e-mail" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Søg på e-mail" />
            ) : null}
          </div>
          {grants.length ? (
            <div className="bx-card af-grants">
              {grants.map((g) => (
                <div key={g.id} className="af-grant">
                  <div className="af-grant-who">
                    <b>{g.email}</b>
                    <small>
                      {STATUS[g.status](g)} · sendt {date(g.lastSentAt)}
                    </small>
                    {g.note ? <small className="af-grant-note">Note: {g.note}</small> : null}
                  </div>
                  {g.open ? (
                    <div className="af-grant-actions">
                      <button type="button" className="bx-btn" disabled={busy} onClick={() => editNote(g)}>
                        Note
                      </button>
                      <button type="button" className="bx-btn" disabled={busy} onClick={() => void act({ action: "again", grant: g.id }, g.email)}>
                        Send igen
                      </button>
                      <button
                        type="button"
                        className="bx-btn"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Træk adgangen til ${g.email} tilbage? Koden holder op med at virke, og pladsen bliver fri igen.`))
                            void act({ action: "withdraw", grant: g.id }, g.email);
                        }}
                      >
                        Træk tilbage
                      </button>
                    </div>
                  ) : g.release ? (
                    <div className="af-grant-actions">
                      <button type="button" className="bx-btn" disabled={busy} onClick={() => editNote(g)}>
                        Note
                      </button>
                      <button
                        type="button"
                        className="bx-btn"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Fjern ${g.email} fra aftalen? Læreren kan ikke længere oprette klasser, og pladsen bliver fri til en anden lærer.`))
                            void act({ action: "release", grant: g.id }, g.email);
                        }}
                      >
                        Fjern lærer
                      </button>
                    </div>
                  ) : (
                    <div className="af-grant-actions">
                      <button type="button" className="bx-btn" disabled={busy} onClick={() => editNote(g)}>
                        Note
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bx-empty">{view.grants.length ? "Ingen e-mails passer på søgningen." : `Du har ikke givet nogen adgang endnu. Skriv en ${who}s e-mail ovenfor.`}</div>
          )}
        </section>

        <section className="bx-section af-two">
          <div>
            <div className="bx-section-head">
              <h2>Pladser</h2>
            </div>
            <div className="bx-card af-list">
              {view.packs.map((p) => (
                <div key={p.id} className="af-list-row">
                  <span>
                    <b>
                      {num(p.count)} pladser × {months(p.months)}
                    </b>
                    <small>{p.open ? `Kan sendes til og med ${date(p.sendBy)}` : `Kunne sendes til og med ${date(p.sendBy)}`}</small>
                  </span>
                  <span className="af-list-num">
                    {num(p.used)} i brug
                    <small>{num(Math.max(0, p.count - p.sent))} {p.count - p.sent === 1 ? "fri" : "frie"}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="bx-section-head">
              <h2>Administratorer</h2>
            </div>
            <div className="bx-card af-list">
              {view.admins.map((a) => (
                <div key={a} className="af-list-row">
                  <span>
                    <b>{a}</b>
                    {a === view.me ? <small>Dig</small> : null}
                  </span>
                  {a !== view.me ? (
                    <button
                      type="button"
                      className="bx-btn"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Skal ${a} ikke længere kunne give adgang?`)) void act({ action: "removeAdmin", email: a }, a);
                      }}
                    >
                      Fjern
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {view.admins.length < view.maxAdmins ? (
              <form className="af-give af-colleague" onSubmit={addColleague} noValidate>
                <label className="bx-field">
                  <span>Tilføj en kollega</span>
                  <input className="bx-input" type="email" value={colleague} onChange={(e) => setColleague(e.target.value)} placeholder="kollega@eksempel.dk" autoComplete="off" />
                </label>
                <button type="submit" className="bx-btn" disabled={busy || !colleague.trim()}>
                  Tilføj
                </button>
              </form>
            ) : (
              <p className="bx-muted">Der kan højst være {view.maxAdmins} administratorer.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
