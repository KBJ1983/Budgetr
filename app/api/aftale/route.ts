import type { NextRequest } from "next/server";
import { addColleague, loadAgreementView, removeColleague } from "@/lib/agreement-admins";
import { currentAgreement, inviteAdmins, mailGrant } from "@/lib/agreement-auth";
import { giveAccess, readGrant, releaseSeat, sendAgain, withdrawGrant } from "@/lib/agreements";
import { AGREEMENT_COOKIE } from "@/lib/session";

// /aftale for a logged-in kundeadmin: GET the agreement (?org=), POST one action on it:
//   { org, action: "give", email }          give a seat to an e-mail (the same e-mail again sends the same code again)
//   { org, action: "again", grant }         send an unused seat's code again
//   { org, action: "withdraw", grant }      take back an unused seat
//   { org, action: "release", grant }       a school takes a seat back from a teacher (the seat is free again)
//   { org, action: "addAdmin" | "removeAdmin", email }
// Answers carry the fresh agreement view – never a code. Without access: 401 (the page then shows the login).
const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const who = await currentAgreement(req.cookies.get(AGREEMENT_COOKIE)?.value, req.nextUrl.searchParams.get("org"));
  if (!who) return new Response(null, { status: 401, headers: noStore });
  return Response.json({ view: await loadAgreementView(who.org, who.admin.email) }, { headers: noStore });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }
  const who = await currentAgreement(req.cookies.get(AGREEMENT_COOKIE)?.value, typeof body.org === "string" ? body.org : null);
  if (!who) return new Response(null, { status: 401, headers: noStore });
  const { admin, org } = who;
  const origin = req.nextUrl.origin;
  const answer = async (result: string, status = 200, fresh = org) =>
    Response.json({ result, view: await loadAgreementView(fresh, admin.email) }, { status, headers: noStore });

  switch (body.action) {
    case "give":
    case "again": {
      const sent =
        body.action === "give"
          ? await giveAccess(org, String(body.email ?? ""))
          : typeof body.grant === "string" && (await readGrant(org.id, body.grant))
            ? await sendAgain(org.id, body.grant)
            : ({ ok: false, error: "unknown" } as const);
      if (!sent.ok) return answer(sent.error, 400);
      try {
        const mailed = await mailGrant(origin, org, sent.grant, sent.code);
        return answer(mailed ? (sent.again ? "again" : "sent") : "nomail");
      } catch (e) {
        console.error("[budgetr] seat mail failed", e);
        return answer("mail", 502);
      }
    }
    case "withdraw": {
      const r = typeof body.grant === "string" ? await withdrawGrant(org.id, body.grant) : { ok: false, error: "unknown" as const };
      return r.ok ? answer("withdrawn") : answer(r.error ?? "unknown", 400);
    }
    case "release": {
      const g = typeof body.grant === "string" ? await readGrant(org.id, body.grant) : null;
      if (org.category !== "skole" || !g?.usedBy) return answer("unknown", 400);
      await releaseSeat(org.id, g.id);
      return answer("released");
    }
    case "addAdmin": {
      const r = await addColleague(org.id, admin.email, body.email);
      if (!r.ok) return answer(r.error, 400);
      const mailed = await inviteAdmins(origin, r.org, [r.added!], admin.email);
      return answer(mailed ? "adminAdded" : "adminAddedNoMail", 200, r.org);
    }
    case "removeAdmin": {
      const r = await removeColleague(org.id, admin.email, body.email);
      return r.ok ? answer("adminRemoved", 200, r.org) : answer(r.error, 400);
    }
    default:
      return Response.json({ error: "action" }, { status: 400, headers: noStore });
  }
}
