import { isCode, normalizeCode, sanitizeFlow } from "@/lib/skole";
import { lookupCode, saveFlow } from "@/lib/skole-store";

// A pupil's code (budgetpro Skole). POST { code } → { code, flow } (flow is null before the first save), 404 for an
// unknown code. PUT { code, flow } saves the choices, checked by sanitizeFlow. Reflection answers never come here.
// The code travels in the body, not the URL, so æøå need no escaping.
const noStore = { "Cache-Control": "no-store" };
const MAX_BODY = 32_000;

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
  return Response.json({ code, flow: found.flow }, { headers: noStore });
}

export async function PUT(req: Request) {
  const b = await readBody(req);
  const code = codeOf(b);
  const flow = sanitizeFlow(b?.flow);
  if (!isCode(code) || !flow) return new Response(null, { status: 400, headers: noStore });
  return new Response(null, { status: (await saveFlow(code, flow)) ? 204 : 404, headers: noStore });
}
