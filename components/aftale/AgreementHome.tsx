"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Wordmark } from "@/components/Logo";
import type { AgreementView, GrantRow } from "@/lib/agreement-admins";

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
      return { tone: "err", text: "Der er ingen fri pladser lige nu. Kontakt budgetpro, hvis I har brug for flere." };
    case "limit":
      return { tone: "err", text: "Koden er sendt tre gange det seneste døgn. Prøv igen i morgen." };
    case "exists":
      return { tone: "err", text: "Den e-mail er allerede administrator." };
    case "max":
      return { tone: "err", text: `Der kan højst være ${max} administratorer.` };
    case "self":
      return { tone: "err", text: "Du kan ikke fjerne dig selv." };
    default:
      return { tone: "err", text: "Det lykkedes ikke lige nu. Prøv igen om lidt." };
  }
}

/**
 * /aftale for a logged-in kundeadmin: free seats, "give access" (an e-mail – nothing else), the list of e-mails with
 * send again / withdraw, the packs and the colleagues who are administrators too. No code is ever on this page.
 */
export function AgreementHome({ initial, orgs, give: initialGive = "" }: { initial: AgreementView; orgs: { id: string; name: string }[]; give?: string }) {
  const [view, setView] = useState(initial);
  const [note, setNote] = useState<{ tone: "pos" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // ?giv=… from a teacher's "Bed om adgang" mail fills in the e-mail.
  const [email, setEmail] = useState(initialGive);
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
    if (await act({ action: "give", email: to }, to)) setEmail("");
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
          <Wordmark fontSize={21} dark={theme === "dark"} />
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
              <span>Fri pladser</span>
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
            <button type="submit" className="bx-btn bx-btn-primary" disabled={busy || !email.trim() || !view.seats.free}>
              Send kode
            </button>
          </form>
          {note ? (
            <p className={note.tone === "pos" ? "bx-note is-pos" : "bx-error"} role={note.tone === "pos" ? "status" : "alert"}>
              <span>{note.text}</span>
            </p>
          ) : null}
          {!view.seats.free ? <p className="bx-muted">Der er ingen fri pladser lige nu. Kontakt budgetpro, hvis I har brug for flere.</p> : null}
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
                  </div>
                  {g.open ? (
                    <div className="af-grant-actions">
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
                  ) : null}
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
                    <small>{num(Math.max(0, p.count - p.sent))} fri</small>
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
