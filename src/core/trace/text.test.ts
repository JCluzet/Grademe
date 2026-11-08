import { describe, expect, it } from "vitest";

import { clipBlock, clipLine, ellipsize, MAX_LINE_CHARS, rule, trimTrailingBlank } from "./text";

describe("clipLine", () => {
  it("keeps a line exactly at the limit and clips one past it with the hidden count", () => {
    expect(clipLine("short")).toBe("short");
    expect(clipLine("a".repeat(MAX_LINE_CHARS))).toBe("a".repeat(MAX_LINE_CHARS));
    expect(clipLine("a".repeat(MAX_LINE_CHARS + 1))).toBe(`${"a".repeat(MAX_LINE_CHARS)}… (+1 more characters)`);
    expect(clipLine("a".repeat(MAX_LINE_CHARS + 65_376))).toBe(
      `${"a".repeat(MAX_LINE_CHARS)}… (+65,376 more characters)`,
    );
  });
});

describe("clipBlock", () => {
  it("clips every line and caps the count with a counter line", () => {
    const text = Array.from({ length: 25 }, (_, i) => `line ${String(i)}`).join("\n");
    const lines = clipBlock(text, 20);
    expect(lines).toHaveLength(21);
    expect(lines[0]).toBe("line 0");
    expect(lines[20]).toBe("… 5 more lines");
    expect(clipBlock(`${"x".repeat(200)}\nshort`, 20)).toEqual([clipLine("x".repeat(200)), "short"]);
  });
});

describe("text primitives", () => {
  it("pads a rule to the trace width", () => {
    expect(rule("tests")).toHaveLength(78);
    expect(rule("tests").startsWith("── tests ─")).toBe(true);
  });

  it("ellipsizes past the limit and trims trailing blank lines", () => {
    expect(ellipsize("abcdef", 4)).toBe("abc…");
    expect(ellipsize("abc", 4)).toBe("abc");
    expect(trimTrailingBlank(["a", "", "b", "", ""])).toEqual(["a", "", "b"]);
  });
});
