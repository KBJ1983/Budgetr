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
  it("has KBJ and five test users with unique logins and URL-safe ids", () => {
    expect(USERS.map((u) => u.id)).toEqual(["kbj", "test1", "test2", "test3", "test4", "test5"]);
    const logins = USERS.flatMap((u) => u.logins.map((l) => l.toLowerCase()));
    expect(new Set(logins).size).toBe(logins.length);
    // The id is used in the storage key and in /private/<id>.legacy.json.
    for (const u of USERS) expect(u.id).toMatch(/^[a-z0-9-]+$/);
  });
});
