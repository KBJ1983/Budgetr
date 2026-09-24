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
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M16 14.2c2.4.2 4 1.8 4.5 4.8" />
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
      <path d="M12 20V9" />
      <path d="M7 13l5-5 5 5" />
      <path d="M5 4h14" />
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
      <path d="M12 4v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 20h14" />
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
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
