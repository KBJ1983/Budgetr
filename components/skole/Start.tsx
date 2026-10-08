import Link from "next/link";
import { CASES } from "@/lib/skole";
import { Avatar } from "./Avatar";
import s from "./skole.module.css";

export function Start({ code, error, busy, onCode, onStart }: { code: string; error: string | null; busy: boolean; onCode: (v: string) => void; onStart: () => void }) {
  return (
    <div className={s.start}>
      <form
        className={s.startBox}
        onSubmit={(e) => {
          e.preventDefault();
          onStart();
        }}
      >
        <div className={s.faces}>
          {CASES.map((c) => (
            <Avatar key={c.id} c={c} size={64} />
          ))}
        </div>
        <h1 className={s.h1}>Hvad koster det at være voksen?</h1>
        <p className={s.lead}>Lav et månedsbudget for en fremtidsperson i 8 trin.</p>
        <div className={s.field}>
          <label className={s.label} htmlFor="elevkode">
            Din elevkode
          </label>
          <input
            id="elevkode"
            className={s.codeInput}
            value={code}
            onChange={(e) => onCode(e.target.value.toUpperCase())}
            placeholder="BLÅ-ORM-47"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            aria-invalid={!!error}
            aria-describedby="elevkode-hint"
          />
          {error && (
            <span className={s.err} role="alert">
              {error}
            </span>
          )}
          <span id="elevkode-hint" className={s.hint}>
            Format: ORD-ORD-00
          </span>
        </div>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={busy}>
          Start
        </button>
        <Link href="/skole/laerer" className={s.small}>
          Er du lærer? Opret en klasse.
        </Link>
      </form>
    </div>
  );
}
