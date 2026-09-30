import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/Logo";

/** Only allow in-app redirects. */
export const safeNext = (next: string | undefined) => (next && next.startsWith("/app") ? next : "/app");

/** Page frame for /login, /opret and /login/bekraeft (styles in app/login/app.css). */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="bx" data-theme="light">
      <header className="bx-top">
        <div className="bx-wrap bx-top-row">
          <Link href="/" className="bx-brand" aria-label="budgetpro – til forsiden">
            <Wordmark fontSize={23} />
          </Link>
        </div>
      </header>
      <main className="bx-guide" style={{ maxWidth: 460 }}>
        {children}
      </main>
    </div>
  );
}

/** "Check your mail" state after a link has been requested. */
export function MailSent({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <AuthShell>
      <h1>{title}</h1>
      {children}
      <button type="button" className="bx-btn" style={{ marginTop: 20 }} onClick={onBack}>
        Ret e-mail
      </button>
    </AuthShell>
  );
}

/** Local development without a mail provider: the API hands back the link, so it can be opened here. */
export function DevLink({ href }: { href?: string }) {
  if (!href) return null;
  return (
    <div className="bx-note is-info" style={{ marginTop: 20 }}>
      <span>
        Udviklingstilstand: der er ikke sat en mailudbyder op, så mailen er ikke sendt. <a href={href}>Åbn linket her</a>.
      </span>
    </div>
  );
}
