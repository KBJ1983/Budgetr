import { describe, expect, it } from "vitest";
import { findUser, USERS } from "./users";

describe("test users", () => {
  it("finds users by login, ignoring case and spaces", () => {
    expect(findUser("KBJ")?.id).toBe("kbj");
    expect(findUser(" kbj ")?.id).toBe("kbj");
    expect(findUser("test3")?.id).toBe("test3");
    expect(findUser("")).toBeUndefined();
    expect(findUser("TEST6")).toBeUndefined();
  });
  it("has KBJ with the example and five empty test users", () => {
    expect(USERS.find((u) => u.id === "kbj")?.seed).toBe("example");
    expect(USERS.filter((u) => u.id.startsWith("test") && u.seed === "empty")).toHaveLength(5);
    const logins = USERS.flatMap((u) => u.logins.map((l) => l.toLowerCase()));
    expect(new Set(logins).size).toBe(logins.length);
  });
});
