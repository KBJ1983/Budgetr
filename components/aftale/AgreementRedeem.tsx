"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";

/** /aftale/bekraeft: the mailed login link is only used on a button press, so mail scanners can't spend it. */
export function AgreementRedeem({ token }: { token?: string }) {
  const [state, setState] = useState<"ready" | "busy" | "expired" | "error">(token ? "ready" : "expired");

  const go = async () => {
    setState("busy");
    try {
      const r = await fetch("/api/aftale/auth/indlos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      if (r.ok) {
        window.location.replace("/aftale");
        return;
      }
      setState(r.status === 400 ? "expired" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="bx af-login">
      <main className="bx-card af-login-card">
        <Logo fontSize={20} dark bg="#1A2B42" />
        <h1>Log ind på aftalen</h1>
        {state === "expired" ? (
          <>
            <p className="bx-muted">Linket er brugt eller udløbet. Bed om en ny kode med din e-mail.</p>
            <a className="bx-btn bx-btn-primary bx-btn-lg" href="/aftale">
              Til log ind
            </a>
          </>
        ) : (
          <>
            <p className="bx-muted">Tryk på knappen for at logge ind på denne enhed.</p>
            {state === "error" ? <p className="bx-error" role="alert">Det lykkedes ikke lige nu. Prøv igen om lidt.</p> : null}
            <button type="button" className="bx-btn bx-btn-primary bx-btn-lg" onClick={go} disabled={state === "busy"}>
              {state === "busy" ? "Et øjeblik …" : "Log ind"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
