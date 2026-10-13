import type { NextRequest } from "next/server";
import { inviteAdmins } from "@/lib/agreement-auth";
import { loadPackUse } from "@/lib/agreements";
import { markInquiry } from "@/lib/erhverv-inbox";
import { applyChange } from "@/lib/owner";
import { isOwner, listAccounts, loadOwnerData, readLedger, writeLedger } from "@/lib/owner-store";
import { ADMIN_COOKIE, SESSION_COOKIE } from "@/lib/session";

// Owner overview (lib/owner.ts): GET the numbers, POST one change to the ledger (plans, organisations, seat packs, expenses)
// or to a henvendelse from the Erhverv form ({ type: "inquiry", id, done }; an org change may carry "inquiry" too, which
// marks that henvendelse as done with the agreement it became).
// Anyone but the owner gets a plain 404, so the route doesn't give itself away.
const noStore = { "Cache-Control": "no-store" };
const denied = async (req: NextRequest) =>
  !(await isOwner({ session: req.cookies.get(SESSION_COOKIE)?.value, admin: req.cookies.get(ADMIN_COOKIE)?.value }));

export async function GET(req: NextRequest) {
  if (await denied(req)) return new Response(null, { status: 404 });
  return Response.json(await loadOwnerData(), { headers: noStore });
}

export async function POST(req: NextRequest) {
  if (await denied(req)) return new Response(null, { status: 404 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const change = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (change.type === "inquiry") {
    if (!(await markInquiry(change.id, change.done === true))) return Response.json({ error: "inquiry" }, { status: 400, headers: noStore });
    return Response.json(await loadOwnerData(), { headers: noStore });
  }
  const ids = (await listAccounts()).map((a) => a.id);
  const ledger = await readLedger();
  // Seats already sent keep a pack (and its organisation) from being shrunk or deleted.
  const r = applyChange(ledger, body, ids, await loadPackUse(ledger.orgs));
  if (!r.ok) return Response.json({ error: r.error }, { status: 400, headers: noStore });
  await writeLedger(r.ledger);
  // New kundeadmins get a mail telling them they can log in on /aftale.
  for (const org of r.ledger.orgs) {
    const before = ledger.orgs.find((o) => o.id === org.id)?.admins ?? [];
    const added = (org.admins ?? []).filter((e) => !before.includes(e));
    if (added.length) await inviteAdmins(req.nextUrl.origin, org, added);
  }
  if (change.type === "org" && typeof change.inquiry === "string") {
    const made = r.ledger.orgs.find((o) => !ledger.orgs.some((b) => b.id === o.id));
    await markInquiry(change.inquiry, true, made?.id);
  }
  return Response.json(await loadOwnerData(), { headers: noStore });
}
