import type { NextRequest } from "next/server";
import { applyChange } from "@/lib/owner";
import { isOwner, listAccounts, loadOverview, readLedger, writeLedger } from "@/lib/owner-store";
import { SESSION_COOKIE } from "@/lib/session";

// Owner overview (lib/owner.ts): GET the numbers, POST one change to the ledger (plans, organisations, expenses).
const noStore = { "Cache-Control": "no-store" };
const denied = async (req: NextRequest) => !(await isOwner(req.cookies.get(SESSION_COOKIE)?.value));

export async function GET(req: NextRequest) {
  if (await denied(req)) return new Response(null, { status: 401 });
  return Response.json(await loadOverview(), { headers: noStore });
}

export async function POST(req: NextRequest) {
  if (await denied(req)) return new Response(null, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const ids = (await listAccounts()).map((a) => a.id);
  const r = applyChange(await readLedger(), body, ids);
  if (!r.ok) return Response.json({ error: r.error }, { status: 400, headers: noStore });
  await writeLedger(r.ledger);
  return Response.json(await loadOverview(), { headers: noStore });
}
