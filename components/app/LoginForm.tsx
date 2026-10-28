"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { AuthShell, MailSent, safeNext } from "@/components/app/AuthShell";
import { seatMonths, type SeatOffer } from "@/components/app/CreateAccountForm";
import { isEmail } from "@/lib/signup";
import { login, logout, useSession } from "@/lib/store";
import { isAccountId } from "@/lib/users";

/** Log in (/login). A seat code in the link (/login?kode=…) goes along and is taken on login (lib/customer-seats.ts). */
export function LoginForm({ next, email, seat, testHint }: { next?: string; email?: string; seat?: SeatOffer; testHint?: boolean }) {
  const { user, ready } = useSession();
  const [value, setValue] = useState(email ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ email: string; devLink?: string; devCode?: string } | null>(null);
  const inputId = useId();
  const errorId = useId();

  // Already logged in with a real account: take the seat with that account before going on.
  const goOn = async () => {
    if (seat && user && isAccountId(user.id)) {
      setBusy(true);
      await fetch(`/api/account/${user.id}/adgang`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode: seat.code }),
      }).catch(() => null);
    }
    window.location.assign(safeNext(next));
  };

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
        body: JSON.stringify(seat ? { email, kode: seat.code } : { email }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { devLink?: string; devCode?: string };
      setSent({ email, devLink: j.devLink, devCode: j.devCode });
    } catch {
      setError("Vi kunne ikke sende mailen lige nu. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <MailSent
        title="Tjek din mail"
        email={sent.email}
        next={next}
        devLink={sent.devLink}
        devCode={sent.devCode}
        onBack={() => setSent(null)}
      >
        <p className="bx-guide-lead">
          Har du en konto med <b>{sent.email}</b>, har vi sendt dig en kode til at logge ind. Skriv den herunder. Koden
          virker i 20 minutter.
        </p>
        <p className="bx-help" style={{ marginBottom: 20 }}>
          Kan du ikke finde mailen, så kig i spam-mappen. Har du ikke en konto endnu, kan du{" "}
          <Link href="/opret">oprette en</Link>.
        </p>
      </MailSent>
    );

  return (
    <AuthShell>
      <h1>{seat ? `Din adgang fra ${seat.org}` : "Log ind"}</h1>
      {seat ? (
        <p className="bx-guide-lead">
          {seat.org} har givet dig budgetpro i {seatMonths(seat.months)} uden betaling. Log ind, så bliver adgangen din.
        </p>
      ) : null}
      {ready && user ? (
        <div className="bx-note is-info" style={{ marginBottom: 20 }}>
          <span>
            Du er logget ind som <b>{user.name}</b>.
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            <button type="button" className="bx-btn bx-btn-primary" onClick={goOn} disabled={busy}>
              Fortsæt
            </button>
            <button type="button" className="bx-btn" onClick={() => logout()}>
              Log ud
            </button>
          </span>
        </div>
      ) : (
        <p className="bx-guide-lead">
          Skriv din e-mail, så sender vi dig en kode og et link til at logge ind. Der er ingen adgangskode.
          {testHint ? " Testbrugere skriver deres initialer." : null}
        </p>
      )}
      <form onSubmit={submit} noValidate className="bx-auth-form">
        <label className="bx-field" htmlFor={inputId}>
          <span>{testHint ? "E-mail eller initialer" : "E-mail"}</span>
        </label>
        <input
          id={inputId}
          className="bx-input"
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
        <button type="submit" className="bx-btn bx-btn-primary bx-btn-lg" disabled={busy}>
          {busy ? "Sender …" : user ? "Skift bruger" : "Log ind"}
        </button>
      </form>
      <p className="bx-help" style={{ marginTop: 20 }}>
        Har du ikke en konto? <Link href={seat ? `/opret?kode=${seat.code}` : "/opret"}>Opret en konto</Link>.
      </p>
    </AuthShell>
  );
}
