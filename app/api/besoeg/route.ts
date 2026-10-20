import { notePageView } from "@/lib/traffic-store";

// One page view from components/Track.tsx (sent with navigator.sendBeacon): { path, ref, utmSource, utmCampaign }.
// Counted without cookies (lib/traffic-store.ts); the answer is always empty, so it tells nothing back.
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 2_000) return new Response(null, { status: 413 });
  try {
    const body = JSON.parse(text);
    if (body && typeof body === "object") await notePageView(body, req.headers);
  } catch (e) {
    if (!(e instanceof SyntaxError)) console.error("[budgetr] page view failed", e);
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
