import type { GradeTestResult } from "@grademe/contracts";
import { describe, expect, it } from "vitest";

import { isFailedVerdict, outputMatched, verdictOf } from "./test-verdict";

function test(overrides: Partial<GradeTestResult>): GradeTestResult {
  return {
    actual: "x$\n",
    args: [],
    command: "./bin",
    exitCode: 0,
    expected: "x$\n",
    passed: false,
    signal: null,
    stderr: null,
    stdout: "x\n",
    testId: "t",
    timedOut: false,
    title: "t",
    ...overrides,
  };
}

describe("verdictOf", () => {
  it("names passed and skipped tests before delegating to the shared classification", () => {
    expect(verdictOf(test({ passed: true }))).toBe("passed");
    expect(verdictOf(test({ exitCode: 125, skipped: true }))).toBe("skipped");
    expect(verdictOf(test({ exitCode: 139, signal: "SIGSEGV" }))).toBe("crash");
    expect(verdictOf(test({ actual: "y$\n" }))).toBe("wrong-output");
  });

  it("separates failures from the two non-failures", () => {
    expect(isFailedVerdict("passed")).toBe(false);
    expect(isFailedVerdict("skipped")).toBe(false);
    expect(isFailedVerdict("timeout")).toBe(true);
  });

  it("compares outputs with null read as empty", () => {
    expect(outputMatched(test({ actual: null, expected: null }))).toBe(true);
    expect(outputMatched(test({ actual: "", expected: null }))).toBe(true);
    expect(outputMatched(test({ actual: "a", expected: "b" }))).toBe(false);
  });
});
