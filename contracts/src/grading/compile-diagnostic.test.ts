import { describe, expect, it } from "vitest";

import {
  classifyCompileFailure,
  NO_DIAGNOSTIC_FALLBACK,
  parseCompileDiagnostic,
} from "./compile-diagnostic";

describe("parseCompileDiagnostic", () => {
  it("parses a single forbidden function", () => {
    expect(parseCompileDiagnostic("Forbidden function used: printf\nAllowed functions: write")).toEqual({
      allowedFunctions: ["write"],
      forbiddenFunctions: ["printf"],
      kind: "forbidden-functions",
    });
  });

  it("parses multiple forbidden functions and an empty allowlist", () => {
    expect(
      parseCompileDiagnostic("Forbidden functions used: malloc, printf\nAllowed functions: none"),
    ).toEqual({ allowedFunctions: [], forbiddenFunctions: ["malloc", "printf"], kind: "forbidden-functions" });
  });

  it("ignores normal compiler diagnostics and missing output", () => {
    expect(parseCompileDiagnostic("main.c:1:1: error: nope")).toBe(null);
    expect(parseCompileDiagnostic(null)).toBe(null);
  });
});

describe("classifyCompileFailure", () => {
  it("returns null for a successful build", () => {
    expect(classifyCompileFailure({ ok: true, stderr: null })).toBe(null);
  });

  it("recognises the function policy refusal through the same parser", () => {
    expect(
      classifyCompileFailure({ ok: false, stderr: "Forbidden function used: printf\nAllowed functions: write" }),
    ).toBe("forbidden");
    expect(
      classifyCompileFailure({ ok: false, stderr: "Forbidden functions used: printf, malloc\nAllowed functions: none" }),
    ).toBe("forbidden");
  });

  it("treats the link fallback sentinel and an empty stderr as no diagnostic", () => {
    expect(classifyCompileFailure({ ok: false, stderr: NO_DIAGNOSTIC_FALLBACK })).toBe("none");
    expect(classifyCompileFailure({ ok: false, stderr: "  " })).toBe("none");
    expect(classifyCompileFailure({ ok: false, stderr: null })).toBe("none");
  });

  it("keeps real compiler output as a diagnostic", () => {
    expect(classifyCompileFailure({ ok: false, stderr: "puts.c:10:29: error: passing argument 2 of 'write'" })).toBe(
      "diagnostic",
    );
  });

  it("pins the sentinel the sanitiser emits so a change is a deliberate contract change", () => {
    expect(NO_DIAGNOSTIC_FALLBACK).toBe("Link step failed.");
  });
});
