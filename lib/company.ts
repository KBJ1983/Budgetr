/**
 * The company behind budgetpro, for the footer, the privacy policy (/privatliv) and the terms (/vilkaar).
 * Fill in the bracketed values before launch: the e-handelslov requires name, CVR, address and an e-mail on the site.
 * Use a shared address (kontakt@…), never a person's own e-mail – the repo is public.
 */
export const COMPANY = {
  name: "[Firmanavn]",
  cvr: "[CVR]",
  address: "[Adresse]",
  email: "[kontakt-e-mail]",
} as const;

/** True while any value above is still a placeholder; the legal pages then say they are a draft. */
export const companyIsDraft = Object.values(COMPANY).some((v) => v.startsWith("["));

/** When the privacy policy and the terms last changed in substance (shown at the top of each page). */
export const PRIVACY_UPDATED = "18. oktober 2026";
export const TERMS_UPDATED = "18. oktober 2026";
