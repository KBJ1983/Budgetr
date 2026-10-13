import { describe, expect, it } from "vitest";
import { requestOrigin } from "./skole-host";
import { teacherMail } from "./skole-mail";

describe("skole mails", () => {
  it("sends the sign-up code and link", () => {
    const m = teacherMail("signup", "Lærer Eksempel", "123456", "https://skole.budgetpro.dk/laerer/bekraeft?t=x");
    expect(m.subject).toBe("123 456 er din kode til budgetpro Skole");
    expect(m.text).toContain("Hej Lærer\n");
    expect(m.text).toContain("oprettet en bruger");
    expect(m.text).toContain("\n123 456\n");
    expect(m.text).toContain("https://skole.budgetpro.dk/laerer/bekraeft?t=x");
    expect(m.text).not.toContain("!");
  });

  it("sends the login code", () => {
    const m = teacherMail("login", "Lærer", "000042", "L");
    expect(m.subject).toBe("000 042 er din kode til at logge ind på budgetpro Skole");
    expect(m.text).toContain("bad om at logge ind");
  });

  it("finds the visitor's address, also behind Vercel", () => {
    const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
    expect(requestOrigin(h({ host: "localhost:3200" }), "http://localhost:3200/api/skole/klasse")).toEqual({ origin: "http://localhost:3200", host: "localhost:3200" });
    expect(requestOrigin(h({ host: "x.vercel.app", "x-forwarded-host": "skole.budgetpro.dk", "x-forwarded-proto": "https" }), "http://x.vercel.app/api")).toEqual({
      origin: "https://skole.budgetpro.dk",
      host: "skole.budgetpro.dk",
    });
  });
});
