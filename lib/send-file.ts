/**
 * "Send på mail": the app builds the PDF or Excel file in the browser and posts it here; the server mails it to one
 * receiver as an attachment (through Resend, lib/auth-mail.ts). The mail names the sender and replies go to them.
 *
 * To keep it from being used to send spam: only signed-in accounts (test users only in development), one receiver per
 * mail, a fixed text around the sender's own message, only budgetpro's own file types, and at most MAX_SENDS mails a day
 * per budget (log in the store as "sends/<userId>.json").
 */
import { openStore } from "./kv";
import { isEmail, normalizeEmail } from "./signup";

export const MAX_SENDS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Vercel takes request bodies up to 4.5 MB; base64 makes the file a third bigger. */
export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export const MAX_MESSAGE = 1000;

export type SendKind = "pdf" | "xlsx";
export type SendError = "email" | "file" | "message" | "limit";

export interface SendRequest {
  to: string;
  kind: SendKind;
  filename: string;
  /** base64 */
  content: string;
  message: string;
}

const FILENAME = /^budgetpro-[a-z0-9æøå-]{0,80}\.(pdf|xlsx)$/;

/** Checks what the app posted. The file must look like what it claims to be: "%PDF" or a zip ("PK", xlsx). */
export function parseSend(x: unknown): { ok: true; value: SendRequest } | { ok: false; error: SendError } {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const to = normalizeEmail(o.to);
  if (!isEmail(to)) return { ok: false, error: "email" };
  const message = typeof o.message === "string" ? o.message.trim().replace(/\r\n?/g, "\n") : "";
  if (message.length > MAX_MESSAGE) return { ok: false, error: "message" };
  const kind = o.kind, filename = o.filename, content = o.content;
  if ((kind !== "pdf" && kind !== "xlsx") || typeof filename !== "string" || typeof content !== "string") return { ok: false, error: "file" };
  const m = FILENAME.exec(filename);
  if (!m || m[1] !== kind || !/^[A-Za-z0-9+/]+={0,2}$/.test(content)) return { ok: false, error: "file" };
  const bytes = Buffer.from(content, "base64");
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) return { ok: false, error: "file" };
  const magic = bytes.subarray(0, 4).toString("latin1");
  if (kind === "pdf" ? magic !== "%PDF" : magic.slice(0, 2) !== "PK") return { ok: false, error: "file" };
  return { ok: true, value: { to, kind, filename, content, message } };
}

/** Counts a mail for userId; false (and nothing counted) when the day's MAX_SENDS are used. */
export async function takeSend(userId: string, now = new Date(), dir?: string): Promise<boolean> {
  const store = openStore(dir), key = `sends/${userId}.json`;
  let log: string[] = [];
  try {
    const j = JSON.parse((await store.get(key)) || "[]");
    if (Array.isArray(j)) log = j.filter((t): t is string => typeof t === "string");
  } catch {}
  log = log.filter((t) => now.getTime() - Date.parse(t) < DAY_MS);
  if (log.length >= MAX_SENDS) return false;
  log.push(now.toISOString());
  await store.set(key, JSON.stringify(log));
  return true;
}

/** The mail around the file. The sender's own message comes first, quoted as theirs. */
export function fileMail(sender: string, senderEmail: string, req: Pick<SendRequest, "kind" | "message">) {
  const what = req.kind === "pdf" ? "et budget som PDF" : "et budget som Excel-fil";
  return {
    subject: `${sender} har sendt dig ${what} fra budgetpro`,
    text: [
      "Hej",
      "",
      `${sender} (${senderEmail}) har sendt dig ${what}. Du finder filen vedhæftet.`,
      ...(req.message ? ["", `Besked fra ${sender}:`, "", req.message] : []),
      "",
      `Svarer du på mailen, går svaret til ${sender}.`,
      "",
      "Kender du ikke afsenderen, kan du se bort fra denne mail. Vi beder dig aldrig om en adgangskode eller om login til din bank.",
      "",
      "Venlig hilsen",
      "budgetpro",
    ].join("\n"),
  };
}
