/**
 * The company behind budgetpro, for the footer, the privacy policy (/privatliv) and the terms (/vilkaar).
 * The e-handelslov asks for name, CVR, address and an e-mail on the site; the address is left out while it is empty.
 * Use a shared address (info@…), never a person's own e-mail – the repo is public.
 */
export const COMPANY = {
  name: "Budgetpro",
  cvr: "36656077",
  address: "",
  email: "info@budgetpro.dk",
} as const;

/** True while any value above is still a placeholder; the legal pages then say they are a draft. */
export const companyIsDraft = Object.values(COMPANY).some((v) => v.startsWith("["));

/** "Budgetpro, CVR 36656077" plus the address when there is one. */
export const companyLine = [COMPANY.name, `CVR ${COMPANY.cvr}`, COMPANY.address].filter(Boolean).join(", ");

/** When the privacy policy and the terms last changed in substance (shown at the top of each page). */
export const PRIVACY_UPDATED = "18. oktober 2026";
export const TERMS_UPDATED = "18. oktober 2026";
