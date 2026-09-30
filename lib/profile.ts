/**
 * A user's profile: the contact details given when the profile was created. Notifications (the update
 * reminder by e-mail or SMS) always use these; the budget only says which channels the user wants.
 *
 * The profile is written when a new account confirms its e-mail (lib/accounts.ts), as
 * <dir>/profiles/<userId>.json = { "email": "...", "phone": "..." }. <dir> is BUDGETR_DATA_DIR or ./data
 * (git-ignored – real contact details never go into git). Until a user has a profile, their reminders are
 * only shown in the app.
 *
 * Only node: imports, so Node can run it directly from scripts/send-reminders.mjs.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export interface Profile {
  email?: string;
  phone?: string;
}

// Same default as lib/budget-file.ts (not imported, see above).
const dataDir = () => process.env.BUDGETR_DATA_DIR || path.join(process.cwd(), "data");

/** The user's profile, or {} when there is none (or it can't be read). */
export async function readProfile(userId: string, dir = dataDir()): Promise<Profile> {
  try {
    const x = JSON.parse(await readFile(path.join(dir, "profiles", `${userId}.json`), "utf8"));
    if (!x || typeof x !== "object") return {};
    return {
      email: typeof x.email === "string" && x.email.trim() ? x.email.trim() : undefined,
      phone: typeof x.phone === "string" && x.phone.trim() ? x.phone.trim() : undefined,
    };
  } catch {
    return {};
  }
}

export async function writeProfile(userId: string, profile: Profile, dir = dataDir()): Promise<void> {
  const folder = path.join(dir, "profiles");
  await mkdir(folder, { recursive: true });
  const file = path.join(folder, `${userId}.json`);
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify({ email: profile.email, phone: profile.phone }, null, 1), "utf8");
  await rename(tmp, file);
}

/** "navn@eksempel.dk" →"n…@eksempel.dk", so the app can show where mails go without exposing the address. */
export const maskEmail = (e?: string) => (e && e.includes("@") ? `${e[0]}…${e.slice(e.indexOf("@"))}` : null);
/** "12 34 56 78" → "•• •• •• 78". */
export const maskPhone = (p?: string) => {
  const d = (p || "").replace(/\D/g, "");
  return d.length >= 2 ? `•• •• •• ${d.slice(-2)}` : null;
};
