import { describe, expect, it } from "vitest";
import { CHECK_TEXT, MAKE_ACCOUNT_TEXT, MAKE_TRANSFER_TEXT, openTodos, todoCount } from "./todos";

describe("openTodos", () => {
  it("collects tasks from accounts, then entries, and counts Skal tjekkes", () => {
    const budget = {
      accounts: [
        { name: "Opsparing", todo: " Opret kontoen i banken " },
        { name: "Budgetkonto", todo: "" },
      ],
      entries: [
        { desc: "Husleje", todo: "Opret den faste overførsel i banken", check: true },
        { desc: "Forsikring", check: false },
        { desc: "", todo: "Opsig aftalen" },
      ],
    };
    expect(openTodos(budget)).toEqual([
      { title: "Opsparing", text: "Opret kontoen i banken" },
      { title: "Husleje", text: "Opret den faste overførsel i banken" },
      { title: "Husleje", text: CHECK_TEXT },
      { title: "Budgetpost", text: "Opsig aftalen" },
    ]);
  });

  it("lists accounts and active fixed transfers not yet created in the bank", () => {
    const budget = {
      accounts: [
        { name: "Opsparing", made: false, madeSince: "2026-09-01", todo: "Bestil kort til kontoen" },
        { name: "Budgetkonto" },
      ],
      entries: [
        { desc: "Til opsparing", type: "overfoersel", made: false, madeSince: "2026-09-02" },
        { desc: "Gammel overførsel", type: "overfoersel", made: false, active: false },
        { desc: "Husleje", type: "udgift", made: false },
        { desc: "Til budgetkonto", type: "overfoersel" },
      ],
    };
    expect(openTodos(budget)).toEqual([
      { title: "Opsparing", text: MAKE_ACCOUNT_TEXT, since: "2026-09-01" },
      { title: "Opsparing", text: "Bestil kort til kontoen" },
      { title: "Til opsparing", text: MAKE_TRANSFER_TEXT, since: "2026-09-02" },
    ]);
  });

  it("copes with missing or broken data", () => {
    expect(openTodos(null)).toEqual([]);
    expect(openTodos({ accounts: "x", entries: [null, 3] })).toEqual([]);
  });

  it("counts in Danish", () => {
    expect(todoCount(1)).toBe("1 opgave");
    expect(todoCount(4)).toBe("4 opgaver");
  });
});
