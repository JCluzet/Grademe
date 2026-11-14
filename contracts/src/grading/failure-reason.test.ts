import { describe, expect, it } from "vitest";

import { classifyTestFailure } from "./failure-reason";
import type { GradeTestResult } from "./results";

function makeTest(overrides: Partial<GradeTestResult>): GradeTestResult {
  return {
    actual: "x",
    args: [],
    command: "./bin",
    exitCode: 0,
    expected: "x",
    passed: false,
    signal: null,
    stderr: null,
    stdout: "x",
    testId: "t",
    timedOut: false,
    title: "t",
    ...overrides,
  };
}

describe("classifyTestFailure", () => {
  it("returns null for passing tests", () => {
    expect(classifyTestFailure(makeTest({ passed: true }))).toBe(null);
  });

  it("identifies timeout before anything else", () => {
    expect(classifyTestFailure(makeTest({ exitCode: 139, signal: "SIGSEGV", timedOut: true }))).toBe("timeout");
  });

  it("identifies crash via signal", () => {
    expect(classifyTestFailure(makeTest({ exitCode: 139, signal: "SIGSEGV" }))).toBe("crash");
  });

  it("identifies a wrong exit code when no signal and no timeout", () => {
    expect(classifyTestFailure(makeTest({ exitCode: 1 }))).toBe("wrong-exit-code");
  });

  it("compares the exit code with the one the test expects", () => {
    expect(classifyTestFailure(makeTest({ exitCode: 0, expectedExitCode: 2 }))).toBe("wrong-exit-code");
    expect(classifyTestFailure(makeTest({ exitCode: 1, expectedExitCode: 2 }))).toBe("wrong-exit-code");
    expect(classifyTestFailure(makeTest({ exitCode: 2, expectedExitCode: 2 }))).toBe("wrong-output");
  });

  it("identifies memory and wins over the Valgrind 86 exit code", () => {
    expect(
      classifyTestFailure(
        makeTest({ exitCode: 86, memory: { detail: "13 bytes definitely lost", kind: "leak" } }),
      ),
    ).toBe("memory");
  });

  it("identifies a wrong return value with matching output", () => {
    expect(
      classifyTestFailure(makeTest({ returnValue: { actual: "0", expected: "65" } })),
    ).toBe("wrong-return");
  });

  it("falls back to wrong-output", () => {
    expect(classifyTestFailure(makeTest({ actual: "y" }))).toBe("wrong-output");
  });
});
