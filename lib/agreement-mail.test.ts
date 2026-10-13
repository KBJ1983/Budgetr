import { describe, expect, it } from "vitest";
import { adminInviteMail, adminLoginMail, grantMail } from "./agreement-mail";

describe("agreement mails", () => {
  it("puts the login code in the subject and the body, spaced", () => {
    const m = adminLoginMail("123456", "https://budgetpro.dk/aftale/bekraeft?t=x");
    expect(m.subject).toContain("123 456");
    expect(m.text).toContain("https://budgetpro.dk/aftale/bekraeft?t=x");
  });

  it("tells a new kundeadmin who added them and where to log in", () => {
    expect(adminInviteMail("Banken", "https://budgetpro.dk/aftale", "anna@banken.dk").text).toContain("anna@banken.dk har gjort dig til administrator af Bankens aftale");
    expect(adminInviteMail("Banken", "https://budgetpro.dk/aftale").text).toContain("https://budgetpro.dk/aftale");
  });

  it("sends a customer the code, the link, the months and the last day – and that the bank can't see the budget", () => {
    const m = grantMail({ orgName: "Mægleren", category: "maegler", months: 3, sendBy: "2027-10-01", code: "ABCD-EFGH", link: "https://budgetpro.dk/aftale/brug?kode=ABCD-EFGH" });
    expect(m.subject).toBe("Mægleren har givet dig adgang til budgetpro");
    expect(m.text).toContain("ABCD-EFGH");
    expect(m.text).toContain("i 3 måneder");
    expect(m.text).toContain("senest den 1.10.2027");
    expect(m.text).toContain("Mægleren kan ikke se dit budget");
    expect(m.text).not.toMatch(/!|\n\n\n/);
  });

  it("gives a teacher a seat on budgetpro Skole", () => {
    const m = grantMail({ orgName: "Skolen", category: "skole", months: 12, sendBy: "2027-08-01", code: "ABCD-EFGH", link: "x" });
    expect(m.subject).toContain("budgetpro Skole");
    expect(m.text).toContain("lærerplads");
    expect(m.text).not.toContain("kan ikke se dit budget");
    expect(m.text).not.toMatch(/\n\n\n/);
  });
});
