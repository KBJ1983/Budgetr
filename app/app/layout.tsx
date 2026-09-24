import type { Metadata } from "next";
import "./app.css";

export const metadata: Metadata = {
  title: "budgetr – dit budget",
  robots: { index: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
