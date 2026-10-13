import type { Metadata } from "next";
import { headers } from "next/headers";
import { ErhvervLanding } from "@/components/erhverv/ErhvervLanding";
import { siteLinks } from "@/lib/site-host";

export const metadata: Metadata = {
  title: "budgetpro Erhverv – giv dine kunder styr på budgettet",
  description: "Banker, ejendomsmæglere og skoler kan give deres kunder adgang til budgetpro. I sender adgangen med en e-mail.",
};

// erhverv.<domain>/ (proxy.ts) and /erhverv on the main site.
export default async function ErhvervPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const protocol = `${h.get("x-forwarded-proto") ?? "https"}:`;
  return <ErhvervLanding skoleUrl={siteLinks({ protocol, host }).skole} />;
}
