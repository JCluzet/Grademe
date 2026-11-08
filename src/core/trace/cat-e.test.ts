import { describe, expect, it } from "vitest";

import { splitCatE } from "./cat-e";

describe("splitCatE", () => {
  it("returns no lines for empty or missing output", () => {
    expect(splitCatE(null)).toEqual([]);
    expect(splitCatE("")).toEqual([]);
  });

  it("closes the last line on a trailing newline and keeps a bare last line otherwise", () => {
    expect(splitCatE("git status$\n")).toEqual(["git status$"]);
    expect(splitCatE("git status")).toEqual(["git status"]);
    expect(splitCatE("a$\nb$\nc")).toEqual(["a$", "b$", "c"]);
  });

  it("keeps an empty line that only holds its marker, and never clips", () => {
    expect(splitCatE("$\n")).toEqual(["$"]);
    const long = "a".repeat(500);
    expect(splitCatE(`${long}$\n`)).toEqual([`${long}$`]);
  });
});
