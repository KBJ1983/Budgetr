"use client";

import { useId, useState, type FormEvent } from "react";
import { Wordmark } from "@/components/Logo";

const TRY_AGAIN = "Det lykkedes ikke lige nu. Prøv igen om lidt.";

/**
 * Login on /aftale for kundeadmins: e-mail → a mailed 6-digit code (or the link in the same mail). The answer is the
 * same for every e-mail, so the page says "if the e-mail runs an agreement".
 */
export function AgreementLogin({ email: initialEmail = "" }: { email?: string }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [dev, setDev] = useState<{ link?: string; code?: string }>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const emailId = useId();
  const codeId = useId();

  const askCode = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/aftale/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      if (r.status === 400) {
        setError("Skriv en gyldig e-mail.");
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { devLink?: string; devCode?: string };
      setDev({ link: j.devLink, code: j.devCode });
      setStep("code");
    } catch {
      setError(TRY_AGAIN);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\D/g, "");
    if (code.length !== 6) {
      setError("Koden har 6 cifre. Du finder den øverst i mailen.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/aftale/auth/indlos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
      if (r.ok) {
        window.location.reload();
        return;
      }
      setError(r.status === 400 ? "Koden passer ikke, eller den er udløbet. Tjek mailen, eller bed om en ny." : TRY_AGAIN);
    } catch {
      setError(TRY_AGAIN);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bx af-login">
      <main className="bx-card af-login-card">
        <Wordmark fontSize={23} dark />
        <h1>Aftale med budgetpro</h1>
        {step === "email" ? (
          <form className="bx-auth-form" onSubmit={askCode} noValidate>
            <p className="bx-muted">For dig, der giver adgang til budgetpro på vegne af en skole, bank eller ejendomsmægler. Skriv din e-mail, så sender vi dig en kode.</p>
            <label className="bx-field" htmlFor={emailId}>
              <span>E-mail</span>
            </label>
            <input
              id={emailId}
              className="bx-input"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error ? <p className="bx-error" role="alert">{error}</p> : null}
            <button type="submit" className="bx-btn bx-btn-primary bx-btn-lg" disabled={busy}>
              {busy ? "Et øjeblik …" : "Send kode"}
            </button>
          </form>
        ) : (
          <form className="bx-auth-form" onSubmit={submitCode} noValidate>
            <p className="bx-muted">
              Hvis <b>{email}</b> er administrator af en aftale, har vi sendt en kode. Skriv den her, eller åbn linket i mailen.
            </p>
            {dev.code ? (
              <p className="bx-note is-info">
                <span>
                  Udvikling: mail er ikke sat op. Koden er {dev.code}
                  {dev.link ? (
                    <>
                      {" "}
                      · <a href={dev.link}>åbn linket</a>
                    </>
                  ) : null}
                </span>
              </p>
            ) : null}
            <label className="bx-field" htmlFor={codeId}>
              <span>Kode fra mailen</span>
            </label>
            <input id={codeId} className="bx-input" name="code" inputMode="numeric" autoComplete="one-time-code" autoFocus />
            {error ? <p className="bx-error" role="alert">{error}</p> : null}
            <button type="submit" className="bx-btn bx-btn-primary bx-btn-lg" disabled={busy}>
              {busy ? "Et øjeblik …" : "Log ind"}
            </button>
            <button
              type="button"
              className="bx-btn"
              onClick={() => {
                setStep("email");
                setError("");
              }}
            >
              Brug en anden e-mail
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
