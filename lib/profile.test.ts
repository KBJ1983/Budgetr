import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { maskEmail, maskPhone, readProfile } from "./profile";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "budgetr-profile-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("readProfile", () => {
  it("is empty while the user has no profile", async () => {
    expect(await readProfile("test1", dir)).toEqual({});
  });

  it("reads the contact details from profiles/<user>.json", async () => {
    await mkdir(path.join(dir, "profiles"));
    await writeFile(path.join(dir, "profiles", "test1.json"), JSON.stringify({ email: " navn@eksempel.dk ", phone: "12 34 56 78", other: 1 }));
    expect(await readProfile("test1", dir)).toEqual({ email: "navn@eksempel.dk", phone: "12 34 56 78" });
  });

  it("ignores a broken file", async () => {
    await mkdir(path.join(dir, "profiles"));
    await writeFile(path.join(dir, "profiles", "test1.json"), "{nope");
    expect(await readProfile("test1", dir)).toEqual({});
  });
});

it("masks the details for the app", () => {
  expect(maskEmail("navn@eksempel.dk")).toBe("n…@eksempel.dk");
  expect(maskPhone("12 34 56 78")).toBe("•• •• •• 78");
  expect(maskEmail(undefined)).toBeNull();
  expect(maskPhone("")).toBeNull();
});
