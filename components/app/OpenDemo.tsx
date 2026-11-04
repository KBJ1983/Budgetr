"use client";

import { useEffect, useState } from "react";
import { AuthShell } from "@/components/app/AuthShell";
import { login } from "@/lib/store";

const KEY = "budgetr-app:demo";

/**
 * /demobruger: resets the demo budget and logs in as the demo customer, then waits on this screen until the visitor
 * presses "Start demoen" (user's wish: a calm "being prepared" screen, no jump straight into the app).
 */
export function OpenDemo() {
  const [state, setState] = useState<"prep" | "ready" | "failed">("prep");

  useEffect(() => {
    let gone = false;
    (async () => {
      try {
        const r = await fetch("/api/demo", { method: "POST", cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
      } catch {
        if (!gone) setState("failed");
        return;
      }
      // Drop this browser's copy (and an open draft), so the app loads the fresh demo from the server.
      try {
        for (const k of Object.keys(localStorage)) if (k === KEY || k.startsWith(KEY + ":")) localStorage.removeItem(k);
        sessionStorage.removeItem(KEY + ":draft");
        sessionStorage.removeItem("budgetr:quiet");
        // The demo always opens in the light theme (user's wish); the visitor can switch in the menu.
        localStorage.setItem("hb-theme", "light");
      } catch {}
      login("DEMO");
      if (!gone) setState("ready");
    })();
    return () => {
      gone = true;
    };
  }, []);

  return (
    <AuthShell>
      <h1>Demo</h1>
      {state === "failed" ? (
        <p className="bx-guide-lead" role="alert">
          Demoen kunne ikke åbnes lige nu. Prøv igen om lidt.
        </p>
      ) : (
        <>
          <p className="bx-guide-lead" role="status">
            {state === "prep"
              ? "Demoen gøres klar. Den viser en opdigtet familie med alle funktioner i brug."
              : "Demoen er klar. Den viser en opdigtet familie med alle funktioner i brug."}
          </p>
          <p>
            <button
              type="button"
              className="bx-btn bx-btn-primary bx-btn-lg"
              disabled={state !== "ready"}
              aria-busy={state === "prep"}
              onClick={() => window.location.assign("/app")}
            >
              {state === "prep" ? "Gør demoen klar …" : "Start demoen"}
            </button>
          </p>
        </>
      )}
    </AuthShell>
  );
}
