import type { Metadata } from "next";
import { OpenDemo } from "@/components/app/OpenDemo";
import "../login/app.css";

export const metadata: Metadata = { title: "budgetpro – demo", robots: { index: false } };

export default function DemoPage() {
  return <OpenDemo />;
}
