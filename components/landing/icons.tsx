import type { ReactNode } from "react";

/** Thin stroke icons from the design facit (docs/design/forside-*.html). All decorative. */
type IconProps = { size?: number; strokeWidth?: number; className?: string };

function Svg({ size = 24, strokeWidth = 2, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2.4} {...props}>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg size={18} strokeWidth={2.2} {...props}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Svg>
  );
}

export function PeopleIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.9} {...props}>
      <circle cx="8" cy="8.5" r="3" />
      <path d="M3 19c0-3.2 2.2-5.5 5-5.5s5 2.3 5 5.5" />
      <circle cx="16.5" cy="9.5" r="2.5" />
      <path d="M15 14.2c.5-.2 1-.3 1.5-.3 2.5 0 4.5 2.1 4.5 5.1" />
    </Svg>
  );
}

export function WandIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.9} {...props}>
      <path d="M4 20L15 9" />
      <path d="M14 4v3M19.5 9.5h-3M18 5l-2 2" />
    </Svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.9} {...props}>
      <path d="M12 13.5v-10M8 7.5l4-4 4 4" />
      <path d="M4.5 15.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2.5" />
    </Svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.9} {...props}>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    </Svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.9} {...props}>
      <path d="M12 3.5v10M8 9.5l4 4 4-4" />
      <path d="M4.5 15.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2.5" />
    </Svg>
  );
}

/** A bank, struck through: no access to the netbank. */
export function NoBankIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.8} {...props}>
      <path d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18M12 3l9 5H3z" />
      <path d="M3 3l18 18" />
    </Svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.9} {...props}>
      <path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

/** A globe: where the data is kept. */
export function GlobeIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.9} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5s1.2-6.1 3.6-8.5z" />
    </Svg>
  );
}

/** Descending steps: a loan being paid down. */
export function LoanIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.9} {...props}>
      <path d="M4 6h4v4h4v4h4v4h4" />
      <path d="M4 20h16" />
    </Svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.9} {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" />
    </Svg>
  );
}

/** A road that splits in two: a scenario next to the current budget (the app's Hvad nu hvis). */
export function BranchIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.9} {...props}>
      <path d="M12 20.5V15c0-2.2-1-3.4-2.6-5L5 5.5M12 15c0-2.2 1-3.4 2.6-5L19 5.5M5 10V5.5h4.5M19 10V5.5h-4.5" />
    </Svg>
  );
}

export function TransferIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.9} {...props}>
      <path d="M4 8h14" />
      <path d="M15 5l3 3-3 3" />
      <path d="M20 16H6" />
      <path d="M9 13l-3 3 3 3" />
    </Svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.9} {...props}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M9 3.5v4M15 3.5v4M8.5 14h.01M12 14h.01M15.5 14h.01" />
    </Svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg size={20} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg size={20} {...props}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </Svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 10a5.5 5.5 0 0 1 11 0v3.5l1.8 3H4.7l1.8-3z" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </Svg>
  );
}
export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
