"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { AuthShell, DevLink, MailSent, safeNext } from "@/components/app/AuthShell";
import { isEmail } from "@/lib/signup";
import { login, logout, useSession } from "@/lib/store";

export function LoginForm({ next, email }: { next?: string; email?: string }) {
  const { user, ready } = useSession();
  const [value, setValue] = useState(email ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ email: string; devLink?: string } | null>(null);
  const inputId = useId();
  const errorId = useId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Test users log in with their initials, no password.
    if (login(value)) {
      // /app is the original static app, outside the Next router: do a full navigation.
      window.location.assign(safeNext(next));
      return;
    }
    const email = value.trim();
    if (!isEmail(email.toLowerCase())) {
      setError("Skriv den e-mail, du oprettede din konto med, fx navn@eksempel.dk.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { devLink?: string };
      setSent({ email, devLink: j.devLink });
    } catch {
      setError("Vi kunne ikke sende mailen lige nu. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <MailSent title="Tjek din mail" onBack={() => setSent(null)}>
        <p className="bx-guide-lead">
          Har du en konto med <b>{sent.email}</b>, har vi sendt dig et link til at logge ind. Linket virker i 20
          minutter.
        </p>
        <p className="bx-help">
          Kan du ikke finde mailen, så kig i spam-mappen. Har du ikke en konto endnu, kan du{" "}
          <Link href="/opret">oprette en</Link>.
        </p>
        <DevLink href={sent.devLink} />
      </MailSent>
    );

  return (
    <AuthShell>
      <h1>Log ind</h1>
      {ready && user ? (
        <div className="bx-note is-info" style={{ marginBottom: 20 }}>
          <span>
            Du er logget ind som <b>{user.name}</b>.
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            <a href={safeNext(next)} className="bx-btn bx-btn-primary">
              Fortsæt
            </a>
            <button type="button" className="bx-btn" onClick={() => logout()}>
              Log ud
            </button>
          </span>
        </div>
      ) : (
        <p className="bx-guide-lead">
          Skriv din e-mail, så sender vi dig et link til at logge ind. Der er ingen adgangskode. Testbrugere skriver
          deres initialer.
        </p>
      )}
      <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label className="bx-field" htmlFor={inputId}>
          <span>E-mail eller initialer</span>
        </label>
        <input
          id={inputId}
          className="bx-input"
          style={{ height: 52, borderRadius: 12, fontSize: 16 }}
          autoComplete="username"
          autoCapitalize="none"
          inputMode="email"
          autoFocus
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
        />
        {error ? (
          <p id={errorId} className="bx-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="bx-btn bx-btn-primary bx-btn-lg" style={{ height: 52 }} disabled={busy}>
          {busy ? "Sender …" : user ? "Skift bruger" : "Log ind"}
        </button>
      </form>
      <p className="bx-help" style={{ marginTop: 20 }}>
        Har du ikke en konto? <Link href="/opret">Opret en gratis konto</Link>.
      </p>
    </AuthShell>
  );
}
