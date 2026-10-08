import type { IconName } from "@/lib/skole";

const PATHS: Record<IconName, string> = {
  shield: "M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z",
  phone: "M8 3h8v18H8z M11 18h2",
  wifi: "M2 9a15 15 0 0 1 20 0 M5 13a10 10 0 0 1 14 0 M8.5 16.5a5 5 0 0 1 7 0 M12 20h.01",
  bus: "M5 4h14v13H5z M5 11h14 M8 20v-3 M16 20v-3",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20c0-3 3-5 6-5s6 2 6 5 M17 11a3 3 0 1 0 0-6 M21 20c0-3-2-5-4-5",
  play: "M4 5h16v14H4z M10 9l5 3-5 3z",
  food: "M4 11h16a8 8 0 0 1-16 0z M9 7c0-2 2-2 2-4 M14 7c0-2 2-2 2-4",
  shirt: "M8 4l-5 3 2 4 3-1v10h8V10l3 1 2-4-5-3c-1 2-2 3-4 3s-3-1-4-3z",
  house: "M4 11l8-7 8 7v9H4z M10 20v-5h4v5",
  chat: "M4 5h16v11H9l-5 4z",
};

export function Icon({ name, size = 22, color = "currentColor", width = 1.8 }: { name: IconName; size?: number; color?: string; width?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={PATHS[name]} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Check({ size = 14, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M5 12l5 5 9-10" fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Star() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" fill="#E4B758" stroke="#8A5F0F" strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
}
