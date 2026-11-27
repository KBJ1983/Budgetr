import type { NextRequest } from "next/server";
import { sendMail } from "@/lib/auth-mail";
import { changeLead, createLead, deleteLead, getLead, importResearch, listLeads, mailLead } from "@/lib/crm-store";
import { isOwner, ownerEmails } from "@/lib/owner-store";
import { ADMIN_COOKIE, SESSION_COOKIE } from "@/lib/session";

// The owner's sales CRM on /admin (lib/crm.ts, lib/crm-store.ts).
// GET → { leads: LeadSummary[] }; GET ?id=<lead> → { lead }.
// POST { type: "import", file } merges a research file; { type: "create", lead } makes one; { type: "change", id, change }
// applies one change (status, contact, contactDelete, log, eventDelete, details); { type: "delete", id } deletes a lead;
// { type: "mail", id, contactId, subject, text, consent, outcome?, months? } mails a contact and logs it.
// Anyone but the owner gets a plain 404, like /api/owner.
const noStore = { "Cache-Control": "no-store" };
const denied = async (req: NextRequest) =>
  !(await isOwner({ session: req.cookies.get(SESSION_COOKIE)?.value, admin: req.cookies.get(ADMIN_COOKIE)?.value }));
const bad = (error: string, status = 400) => Response.json({ error }, { status, headers: noStore });

export async function GET(req: NextRequest) {
  if (await denied(req)) return new Response(null, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const lead = await getLead(id);
    return lead ? Response.json({ lead }, { headers: noStore }) : bad("lead", 404);
  }
  return Response.json({ leads: await listLeads() }, { headers: noStore });
}

export async function POST(req: NextRequest) {
  if (await denied(req)) return new Response(null, { status: 404 });
  let body: Record<string, unknown>;
  try {
    const x: unknown = await req.json();
    body = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
  } catch {
    return new Response(null, { status: 400 });
  }
  switch (body.type) {
    case "import": {
      const r = await importResearch(body.file);
      if (!r.added && !r.updated) return bad("import");
      return Response.json({ ...r, leads: await listLeads() }, { headers: noStore });
    }
    case "create": {
      const r = await createLead(body.lead);
      return r.ok ? Response.json({ lead: r.lead, leads: await listLeads() }, { headers: noStore }) : bad(r.error);
    }
    case "change": {
      const r = await changeLead(body.id, body.change);
      return r.ok ? Response.json({ lead: r.lead, leads: await listLeads() }, { headers: noStore }) : bad(r.error);
    }
    case "delete":
      return (await deleteLead(body.id)) ? Response.json({ leads: await listLeads() }, { headers: noStore }) : bad("lead");
    case "mail": {
      // Answers go to the owner (the first OWNER_EMAILS address), not to the no-reply sender.
      const replyTo = ownerEmails()[0];
      try {
        const r = await mailLead(body.id, body, (to, subject, text) =>
          sendMail(to, { subject, text }, { replyTo, origin: req.nextUrl.origin }, " Salgsmail fra /admin."),
        );
        return r.ok ? Response.json({ lead: r.lead, sent: r.sent, leads: await listLeads() }, { headers: noStore }) : bad(r.error);
      } catch (e) {
        console.error("[budgetr] CRM mail failed", e);
        return bad("send", 502);
      }
    }
    default:
      return bad("change");
  }
}
