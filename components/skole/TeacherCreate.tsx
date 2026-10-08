"use client";

import { useState } from "react";
import { isEmail, normalizeEmail } from "@/lib/signup";
import { DEFAULT_DAYS, dayMonthYear, LIFETIMES, MAX_PUPILS, TRIN } from "@/lib/skole";
import { pupilAddress, skoleBase } from "@/lib/skole-host";
import { Shell } from "./Shell";
import s from "./skole.module.css";
import { useToast } from "./useToast";

interface Made {
  token: string;
  trin: number;
  codes: string[];
  expires: string;
  mailed: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function TeacherCreate() {
  const [trin, setTrin] = useState(8);
  const [antal, setAntal] = useState(24);
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState(false);
  const [made, setMade] = useState<Made | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  const create = async () => {
    if (!isEmail(normalizeEmail(email))) return setEmailErr(true);
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/skole/klasse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trin, antal, days, email }) });
      if (!r.ok) throw new Error(String(r.status));
      setMade((await r.json()) as Made);
    } catch {
      setErr("Klassen kunne ikke oprettes. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(done);
    } catch {
      showToast("Kunne ikke kopiere. Markér teksten, og kopiér den selv.");
    }
  };

  // On the subdomain the addresses have no /skole (lib/skole-host.ts). `made` is only set in the browser.
  const overviewPath = made ? `${skoleBase(window.location.host)}/klasse/${made.token}` : "";
  const link = made ? `${window.location.origin}${overviewPath}` : "";
  const address = made ? pupilAddress(window.location.host) : "";
  const until = made ? dayMonthYear(new Date(made.expires)) : "";

  return (
    <Shell right={<span className={s.teacherPill}>Lærer</span>} toast={toast}>
      <div className={`${s.wrap} ${s.wrapNarrow}`}>
        <h1 className={`${s.q} ${s.noPrint}`}>Opret klasse</h1>

        {!made && (
          <>
            <form
              className={`${s.card} ${s.createForm}`}
              onSubmit={(e) => {
                e.preventDefault();
                void create();
              }}
            >
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
                Elevkoderne udløber den {dayMonthYear(new Date(Date.now() + days * DAY_MS))}. Så slettes klassen, koderne og elevernes svar.
              </span>
              <div className={s.field}>
                <label className={s.label} htmlFor="laerer-mail">
                  Din e-mail
                </label>
                <input
                  id="laerer-mail"
                  className={s.input}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailErr(false);
                  }}
                  placeholder="navn@skole.dk"
                  aria-invalid={emailErr}
                  aria-describedby="laerer-mail-hint"
                />
                {emailErr && (
                  <span className={s.err} role="alert">
                    Skriv en gyldig e-mail, fx navn@skole.dk.
                  </span>
                )}
                <span id="laerer-mail-hint" className={s.hint}>
                  Vi sender linket til klassen hertil, så du ikke selv skal gemme det. Vi gemmer ikke din e-mail i klar tekst.
                </span>
              </div>
              <button className={`${s.btn} ${s.btnPrimary}`} disabled={busy} style={{ alignSelf: "flex-start" }}>
                Lav elevkoder
              </button>
            </form>
            <p className={s.info}>budgetpro gemmer ingen navne. Skriv selv, hvem der har hvilken kode.</p>
            {err && (
              <span className={s.err} role="alert">
                {err}
              </span>
            )}
            <LostLink />
          </>
        )}

        {made && (
          <>
            <div className={`${s.card} ${s.noPrint}`}>
              <span className={s.cardTitle}>Linket til klassen</span>
              {made.mailed ? (
                <p className={s.info}>Vi har sendt linket og koderne til {normalizeEmail(email)}. Kan du ikke finde mailen, så kig i spam, eller gem linket her.</p>
              ) : (
                <p className={s.warn}>Mailen kunne ikke sendes lige nu. Gem linket her, fx som bogmærke – det er vejen tilbage til klassen.</p>
              )}
              <div className={s.linkBox}>
                <input className={s.input} readOnly value={link} aria-label="Lærerlink" onFocus={(e) => e.target.select()} />
                <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => void copy(link, "Linket er kopieret.")}>
                  Kopiér link
                </button>
                <a className={`${s.btn} ${s.btnSmall} ${s.btnPrimary}`} href={overviewPath}>
                  Gå til klasseoverblik
                </a>
              </div>
              <span className={s.small}>Del ikke linket med eleverne. Det viser alle elevernes svar.</span>
            </div>

            <p className={`${s.expiry} ${s.noPrint}`}>Elevkoderne udløber den {until}. Så slettes klassen, koderne og elevernes svar.</p>

            <div className={s.stack}>
              <div className={`${s.codesHead} ${s.noPrint}`}>
                <h2 className={s.h2}>
                  {made.codes.length} elevkoder · {made.trin}. klasse
                </h2>
                <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => void copy(made.codes.join("\n"), `${made.codes.length} koder kopieret.`)}>
                  Kopiér
                </button>
                <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => window.print()}>
                  Print
                </button>
              </div>
              <div className={s.printOnly}>
                <h1 className={s.h2}>budgetpro Skole · {made.trin}. klasse</h1>
                <p className={s.note}>
                  Gå ind på {address}, og skriv din kode. Koden virker til den {until}. Klip langs de stiplede linjer.
                </p>
              </div>
              <div className={s.codes}>
                {made.codes.map((code, i) => (
                  <div key={code} className={s.codeCell}>
                    <span className={s.codeNo}>{i + 1}</span>
                    <span className={s.codeText} data-code>
                      {code}
                    </span>
                    <span className={`${s.codeUntil} ${s.printOnly}`}>til {until}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

/** "Har du mistet linket?": mails new links to every class made with the e-mail. */
function LostLink() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "bad" | "error">("idle");
  const send = async () => {
    if (!isEmail(normalizeEmail(email))) return setState("bad");
    setState("busy");
    try {
      const r = await fetch("/api/skole/laerer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      setState(r.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  };
  return (
    <form
      id="mistet"
      className={s.card}
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <span className={s.cardTitle}>Har du mistet linket til en klasse?</span>
      <span className={s.note}>Skriv den e-mail, du oprettede klassen med. Så sender vi nye links til alle dine klasser. De gamle links holder op med at virke.</span>
      <div className={s.linkBox}>
        <input
          className={s.input}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "busy") setState("idle");
          }}
          placeholder="navn@skole.dk"
          aria-label="E-mail til nye links"
        />
        <button className={`${s.btn} ${s.btnSmall}`} disabled={state === "busy"}>
          Send nye links
        </button>
      </div>
      {state === "sent" && (
        <span className={s.info} role="status">
          Hvis der er klasser på den e-mail, har vi sendt nye links nu.
        </span>
      )}
      {state === "bad" && (
        <span className={s.err} role="alert">
          Skriv en gyldig e-mail, fx navn@skole.dk.
        </span>
      )}
      {state === "error" && (
        <span className={s.err} role="alert">
          Det lykkedes ikke. Prøv igen om lidt.
        </span>
      )}
    </form>
  );
}
