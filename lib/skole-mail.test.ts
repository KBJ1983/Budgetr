import { describe, expect, it } from "vitest";
import { requestOrigin } from "./skole-host";
import { classMail, linksMail } from "./skole-mail";

const expires = new Date(2027, 0, 6, 10);

describe("skole mails", () => {
  it("sends the class link with the expiry date and the codes", () => {
    const m = classMail({ trin: 8, link: "https://skole.budgetpro.dk/klasse/abc.def", expires, codes: ["BLÅ-ORM-47", "GUL-RÆV-12"], pupilAddress: "skole.budgetpro.dk", lostUrl: "https://skole.budgetpro.dk/laerer" });
    expect(m.subject).toBe("Din 8. klasse på budgetpro Skole");
    expect(m.text).toContain("https://skole.budgetpro.dk/klasse/abc.def");
    expect(m.text).toContain("Elevkoderne udløber den 6. januar 2027.");
    expect(m.text).toContain("1. BLÅ-ORM-47\n2. GUL-RÆV-12");
    expect(m.text).toContain("Eleverne går ind på skole.budgetpro.dk");
    expect(m.text).not.toContain("!");
  });

  it("sends new links to all of a teacher's classes", () => {
    const one = linksMail([{ trin: 7, link: "L1", expires }]);
    expect(one.subject).toBe("Nyt link til din klasse på budgetpro Skole");
    const two = linksMail([{ trin: 7, link: "L1", expires }, { trin: 9, link: "L2", expires }]);
    expect(two.subject).toBe("Nye links til dine klasser på budgetpro Skole");
    expect(two.text).toContain("7. klasse – elevkoderne udløber den 6. januar 2027:\nL1");
    expect(two.text).toContain("9. klasse");
    expect(two.text).toContain("De links, du har fået før, virker ikke længere.");
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
