"use client";

import { useId, useState, type FormEvent } from "react";
import { Wordmark } from "@/components/Logo";

const ERRORS: Record<string, string> = {
  wrong: "E-mail eller kodeord passer ikke.",
  locked: "For mange forkerte forsøg. Prøv igen om 15 minutter.",
  off: "Login er ikke sat op.",
};

/** The owner's login on /admin: e-mail + the fixed password (app/api/admin/login). */
export function AdminLogin() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const emailId = useId();
  const passwordId = useId();

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
      });
      if (r.ok) {
        window.location.reload();
        return;
      }
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setError(ERRORS[j.error ?? ""] ?? "Det lykkedes ikke lige nu. Prøv igen om lidt.");
    } catch {
      setError("Det lykkedes ikke lige nu. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bx ow-login">
      <main className="bx-card ow-login-card">
        <Wordmark fontSize={23} dark />
        <h1>Log ind</h1>
        <form className="bx-auth-form" onSubmit={submit} noValidate>
          <label className="bx-field" htmlFor={emailId}>
            <span>E-mail</span>
          </label>
          <input id={emailId} className="bx-input" name="email" type="email" autoComplete="username" autoFocus required />
          <label className="bx-field" htmlFor={passwordId}>
            <span>Kodeord</span>
          </label>
          <input id={passwordId} className="bx-input" name="password" type="password" autoComplete="current-password" required />
          {error ? (
            <p className="bx-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="bx-btn bx-btn-primary bx-btn-lg" disabled={busy}>
            {busy ? "Et øjeblik …" : "Log ind"}
          </button>
        </form>
      </main>
    </div>
  );
}
