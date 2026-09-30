/**
 * A user's profile: the contact details given when the profile was created. Notifications (the update
 * reminder by e-mail or SMS) always use these; the budget only says which channels the user wants.
 *
 * The profile is written when a new account confirms its e-mail (lib/accounts.ts), as
 * profiles/<userId>.json = { "email": "...", "phone": "..." } in the store (lib/kv.ts; on disk under
 * BUDGETR_DATA_DIR or ./data, git-ignored – real contact details never go into git). Until a user has a profile,
 * their reminders are only shown in the app.
 *
 * Imports lib/kv.ts with its extension, so Node can run it directly from scripts/send-reminders.mjs.
 */
import { openStore } from "./kv.ts";

export interface Profile {
  email?: string;
  phone?: string;
}

/** The user's profile, or {} when there is none (or it can't be read). */
export async function readProfile(userId: string, dir?: string): Promise<Profile> {
  try {
    const x = JSON.parse((await openStore(dir).get(`profiles/${userId}.json`)) ?? "null");
    if (!x || typeof x !== "object") return {};
    return {
      email: typeof x.email === "string" && x.email.trim() ? x.email.trim() : undefined,
      phone: typeof x.phone === "string" && x.phone.trim() ? x.phone.trim() : undefined,
    };
  } catch {
    return {};
  }
}

export async function writeProfile(userId: string, profile: Profile, dir?: string): Promise<void> {
  await openStore(dir).set(`profiles/${userId}.json`, JSON.stringify({ email: profile.email, phone: profile.phone }, null, 1));
}

/** "navn@eksempel.dk" →"n…@eksempel.dk", so the app can show where mails go without exposing the address. */
export const maskEmail = (e?: string) => (e && e.includes("@") ? `${e[0]}…${e.slice(e.indexOf("@"))}` : null);
/** "12 34 56 78" → "•• •• •• 78". */
export const maskPhone = (p?: string) => {
  const d = (p || "").replace(/\D/g, "");
  return d.length >= 2 ? `•• •• •• ${d.slice(-2)}` : null;
};
