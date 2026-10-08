import type { Case } from "@/lib/skole";

/** The drawn face of a case (the sketch's round avatar). */
export function Avatar({ c, size }: { c: Case; size: number }) {
  const l = c.look;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" style={{ borderRadius: "50%", display: "block", flexShrink: 0 }}>
      <rect width="120" height="120" fill={l.bg} />
      <path d="M24 120c0-26 16-40 36-40s36 14 36 40z" fill={l.shirt} />
      <circle cx="60" cy="54" r="20" fill={l.skin} />
      <path d="M39 52c0-15 9-24 21-24s21 9 21 24c-6-7-13-10-21-10s-15 3-21 10z" fill={l.hair} />
    </svg>
  );
}
