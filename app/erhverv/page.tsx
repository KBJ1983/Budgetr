import type { Metadata } from "next";
import { ErhvervLanding } from "@/components/erhverv/ErhvervLanding";

export const metadata: Metadata = {
  title: "budgetpro Erhverv – giv dine kunder styr på budgettet",
  description: "Banker, ejendomsmæglere og skoler kan give deres kunder adgang til budgetpro. I sender adgangen med en e-mail.",
};

// erhverv.<domain>/ (proxy.ts) and /erhverv on the main site.
export default function ErhvervPage() {
  return <ErhvervLanding />;
}
