import { MAX_PUPILS, TRIN } from "@/lib/skole";
import { createClass } from "@/lib/skole-store";

// budgetpro Skole: a teacher makes a class (no login). Returns the teacher link's token and the pupil codes; the
// token is shown only this once (only a hash of it is kept).
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const trin = Number(b.trin);
  const antal = Number(b.antal);
  if (!TRIN.includes(trin) || !Number.isInteger(antal) || antal < 1 || antal > MAX_PUPILS) {
    return Response.json({ error: "input" }, { status: 400 });
  }
  const { token, cls } = await createClass(trin, antal);
  return Response.json({ token, trin: cls.trin, codes: cls.codes }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
