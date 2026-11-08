import { describe, expect, it } from "vitest";

import { unifiedDiff } from "./line-diff";

function numbered(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${String(i)}$`);
}

describe("unifiedDiff", () => {
  it("yields nothing for identical inputs", () => {
    expect(unifiedDiff(["a$", "b$"], ["a$", "b$"])).toEqual([]);
    expect(unifiedDiff([], [])).toEqual([]);
  });

  it("shows a missing newline as the one changed line", () => {
    expect(unifiedDiff(["git status$"], ["git status"])).toEqual(["@@ -1 +1 @@", "-git status$", "+git status"]);
  });

  it("uses diff -u range notation when one side is empty", () => {
    expect(unifiedDiff(["backward$", "it$", "ship$"], [])).toEqual([
      "@@ -1,3 +0,0 @@",
      "-backward$",
      "-it$",
      "-ship$",
    ]);
    expect(unifiedDiff([], ["x$"])).toEqual(["@@ -0,0 +1 @@", "+x$"]);
  });

  it("keeps two lines of context around a change in the middle", () => {
    const expected = ["10$", "9$", "8$", "7$", "6$", "5$", "4$", "3$", "2$", "1$", "0$"];
    expect(unifiedDiff(expected, expected.slice(0, -1))).toEqual(["@@ -9,3 +9,2 @@", " 2$", " 1$", "-0$"]);
  });

  it("lists every removed line before the added ones in a replace hunk", () => {
    expect(unifiedDiff(["a$", "b$", "c$", "d$"], ["a$", "x$", "y$", "z$", "d$"])).toEqual([
      "@@ -1,4 +1,5 @@",
      " a$",
      "-b$",
      "-c$",
      "+x$",
      "+y$",
      "+z$",
      " d$",
    ]);
  });

  it("merges changes separated by up to twice the context and splits beyond it", () => {
    const base = numbered(12);
    const near = [...base];
    near[2] = "X$";
    near[7] = "Y$";
    expect(unifiedDiff(base, near).filter((line) => line.startsWith("@@"))).toEqual(["@@ -1,10 +1,10 @@"]);
    const far = [...base];
    far[2] = "X$";
    far[8] = "Y$";
    expect(unifiedDiff(base, far).filter((line) => line.startsWith("@@"))).toEqual([
      "@@ -1,5 +1,5 @@",
      "@@ -7,5 +7,5 @@",
    ]);
  });

  it("caps the output and reports how much was hidden without rendering it", () => {
    const lines = unifiedDiff(numbered(100), [], 10);
    expect(lines).toHaveLength(11);
    expect(lines[10]).toBe("… 91 more diff lines");
  });

  it("clips over-long lines inside hunks", () => {
    const [, removed] = unifiedDiff([`${"a".repeat(200)}$`], ["b$"]);
    expect(removed).toBe(`-${"a".repeat(160)}… (+41 more characters)`);
  });

  it("falls back to a prefix/suffix diff on inputs too large for an exact one", () => {
    const expected = numbered(3000);
    const actual = [...expected.slice(0, 1500), "changed$", ...expected.slice(1501)];
    expect(unifiedDiff(expected, actual)).toEqual([
      "@@ -1499,5 +1499,5 @@",
      " 1498$",
      " 1499$",
      "-1500$",
      "+changed$",
      " 1501$",
      " 1502$",
    ]);
  });

  it("collapses a large output changed at both ends into one capped hunk", () => {
    const expected = numbered(600);
    const actual = [...expected];
    actual[0] = "first$";
    actual[599] = "last$";
    const lines = unifiedDiff(expected, actual);
    expect(lines[0]).toBe("@@ -1,600 +1,600 @@");
    expect(lines).toHaveLength(41);
    expect(lines[40]).toBe("… 1,161 more diff lines");
  });

  it("handles a million single-character lines within the cap", () => {
    const actual = Array.from({ length: 1_000_000 }, () => "$");
    const lines = unifiedDiff(["ab$"], actual);
    expect(lines).toHaveLength(41);
    expect(lines[40]).toBe("… 999,962 more diff lines");
  });
});
