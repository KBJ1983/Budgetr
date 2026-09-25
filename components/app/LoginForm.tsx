"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { login, logout, useSession } from "@/lib/store";

/** Only allow in-app redirects. */
const safeNext = (next: string | undefined) => (next && next.startsWith("/app") ? next : "/app");

export function LoginForm({ next, email }: { next?: string; email?: string }) {
  const router = useRouter();
  const { user, ready } = useSession();
  const [value, setValue] = useState(email ?? "");
  const [error, setError] = useState("");
  const inputId = useId();
  const errorId = useId();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = login(value);
    if (!u) {
      setError("Vi kender ikke den bruger. Mens vi tester, er der kun adgang for testbrugere.");
      return;
    }
    router.push(safeNext(next));
  };

  return (
    <div className="bx" data-theme="light">
      <header className="bx-top">
        <div className="bx-wrap bx-top-row">
          <Link href="/" className="bx-brand" aria-label="budgetr – til forsiden">
            <LogoMark size={26} />
            <b style={{ fontSize: 19, letterSpacing: "-0.03em" }}>budgetr</b>
          </Link>
        </div>
      </header>
      <main className="bx-guide" style={{ maxWidth: 460 }}>
        <h1>Log ind</h1>
        {ready && user ? (
          <div className="bx-note is-info" style={{ marginBottom: 20 }}>
            <span>
              Du er logget ind som <b>{user.name}</b>.
            </span>
            <span style={{ display: "flex", gap: 8 }}>
              <Link href={safeNext(next)} className="bx-btn bx-btn-primary">
                Fortsæt
              </Link>
              <button type="button" className="bx-btn" onClick={() => logout()}>
                Log ud
              </button>
            </span>
          </div>
        ) : (
          <p className="bx-guide-lead">
            Skriv din e-mail eller dine initialer. Mens vi tester, er der ingen adgangskode – rigtigt login kommer senere.
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
            autoCapitalize="characters"
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
          <button type="submit" className="bx-btn bx-btn-primary bx-btn-lg" style={{ height: 52 }}>
            {user ? "Skift bruger" : "Log ind"}
          </button>
        </form>
        <p className="bx-help" style={{ marginTop: 20 }}>
          Hver bruger har sine egne budgetter. De gemmes i denne browser, så en bruger ser kun det, der er lavet på samme computer.
        </p>
      </main>
    </div>
  );
}
