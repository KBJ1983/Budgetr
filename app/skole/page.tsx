import { headers } from "next/headers";
import { SkoleLanding } from "@/components/skole/landing/SkoleLanding";
import { mainSiteUrl, skoleBase } from "@/lib/skole-host";

// The front page; pupils type their code on /elev.
export default async function SkolePage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const protocol = `${h.get("x-forwarded-proto") ?? "https"}:`;
  return <SkoleLanding base={skoleBase(host)} mainSite={mainSiteUrl({ protocol, host })} />;
}
