import { describe, expect, it } from "vitest";
import { CHECK_TEXT, openTodos, todoCount } from "./todos";

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

  it("copes with missing or broken data", () => {
    expect(openTodos(null)).toEqual([]);
    expect(openTodos({ accounts: "x", entries: [null, 3] })).toEqual([]);
  });

  it("counts in Danish", () => {
    expect(todoCount(1)).toBe("1 opgave");
    expect(todoCount(4)).toBe("4 opgaver");
  });
});
