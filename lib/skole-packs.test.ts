import { describe, expect, it } from "vitest";
import { SCHOOL_PACKS, schoolPackSendBy, schoolYearEnd } from "./skole-packs";

describe("school packs", () => {
  it("costs whole kroner, and the big pack less per class", () => {
    expect(SCHOOL_PACKS.lille).toMatchObject({ classes: 6, price: 3000 });
    expect(SCHOOL_PACKS.stor).toMatchObject({ classes: 12, price: 5000 });
    expect(SCHOOL_PACKS.stor.price / SCHOOL_PACKS.stor.classes).toBeLessThan(SCHOOL_PACKS.lille.price / SCHOOL_PACKS.lille.classes);
  });

  it("runs to the end of the school year, and from 1 April on through the next one too", () => {
    expect(schoolYearEnd("2026-08-01")).toBe("2027-08-01");
    expect(schoolYearEnd("2026-11-27")).toBe("2027-08-01");
    expect(schoolYearEnd("2027-03-31")).toBe("2027-08-01");
    expect(schoolYearEnd("2027-04-01")).toBe("2028-08-01");
    expect(schoolYearEnd("2027-07-31")).toBe("2028-08-01");
    expect(schoolPackSendBy("2027-08-01")).toBe("2027-07-31");
  });
});
