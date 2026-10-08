import { isCode, normalizeCode, sanitizeAnswers, sanitizeFlow } from "@/lib/skole";
import { lookupCode, saveProgress } from "@/lib/skole-store";

// A pupil's code (budgetpro Skole). POST { code } → { code, flow, answers, expires } (flow is null before the first
// save), 404 for an unknown or expired code. PUT { code, flow, answers } saves the work, checked by sanitizeFlow and
// sanitizeAnswers; the teacher can read it. The code travels in the body, not the URL, so æøå need no escaping.
const noStore = { "Cache-Control": "no-store" };
const MAX_BODY = 48_000;

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > MAX_BODY) return null;
  try {
    const x = JSON.parse(text);
    return x && typeof x === "object" ? x : null;
  } catch {
    return null;
  }
}

const codeOf = (b: Record<string, unknown> | null) => (typeof b?.code === "string" ? normalizeCode(b.code) : "");

export async function POST(req: Request) {
  const code = codeOf(await readBody(req));
  const found = isCode(code) ? await lookupCode(code) : null;
  if (!found) return new Response(null, { status: 404, headers: noStore });
  return Response.json({ code, ...found }, { headers: noStore });
}

export async function PUT(req: Request) {
  const b = await readBody(req);
  const code = codeOf(b);
  const flow = sanitizeFlow(b?.flow);
  if (!isCode(code) || !flow) return new Response(null, { status: 400, headers: noStore });
  return new Response(null, { status: (await saveProgress(code, flow, sanitizeAnswers(b?.answers))) ? 204 : 404, headers: noStore });
}
