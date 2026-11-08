import type { GradeTestResult } from "@grademe/contracts";
import { describe, expect, it } from "vitest";

import { longReason, shortReason } from "./failure-copy";
import { verdictOf } from "./test-verdict";
import type { TraceTest } from "./types";

function entry(overrides: Partial<GradeTestResult>): TraceTest {
  const test: GradeTestResult = {
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
  return { index: 0, test, verdict: verdictOf(test) };
}

describe("shortReason / longReason", () => {
  it("describes a crash with the signal and a hint", () => {
    const t = entry({ actual: "", exitCode: 139, signal: "SIGSEGV" });
    expect(shortReason(t)).toBe("crash (SIGSEGV)");
    expect(longReason(t)).toContain("SIGSEGV, segfault");
  });

  it("says when the output matched and the status alone failed the test", () => {
    const t = entry({ exitCode: 1 });
    expect(shortReason(t)).toBe("exit code 1");
    expect(longReason(t)).toBe("exit code 1: expected 0. Output matched; this alone fails the test.");
  });

  it("names the memory error family and quotes the Valgrind detail", () => {
    const t = entry({ exitCode: 86, memory: { detail: "5 bytes definitely lost in main (a.c:29)", kind: "leak" } });
    expect(shortReason(t)).toBe("memory leak");
    expect(longReason(t)).toBe(
      "memory leak: 5 bytes definitely lost in main (a.c:29). Output matched; this alone fails the test.",
    );
  });

  it("states both values for a wrong return and whether output differed too", () => {
    const t = entry({ actual: "z", expected: "A", returnValue: { actual: "0", expected: "65" } });
    expect(longReason(t)).toBe("wrong return value: expected 65, your function returned 0. Output differs too, see below.");
  });

  it("explains a timeout and a skipped test, and says nothing for a pass", () => {
    expect(longReason(entry({ exitCode: 124, timedOut: true }))).toContain("killed your program after the allowed time");
    expect(longReason(entry({ exitCode: 125, skipped: true }))).toContain("earlier test timed out");
    expect(shortReason(entry({ passed: true }))).toBe("");
  });
});
