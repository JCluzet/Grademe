import type { CliExerciseContent, GradeExerciseResult, GradeTestResult } from "@grademe/contracts";
import { describe, expect, it } from "vitest";

import { buildFailureTrace } from "./exam-workspace-outcome";
import { CLI_VERSION } from "../../version";

const EXERCISE: CliExerciseContent = {
  allowedFunctions: ["write"],
  assignmentName: "print_char",
  examples: [],
  expectedFiles: ["print_char.c"],
  instructions: "Write a char.",
  kind: "program",
  language: "c",
  slug: "level-0",
};

const NOW = new Date("2026-09-20T18:00:00Z");

function result(tests: GradeTestResult[]): GradeExerciseResult {
  return {
    awardedPoints: 0,
    compile: { ok: true, stderr: null, stdout: null, timedOut: false },
    graderLabel: "grader",
    passed: false,
    runtimeMs: 1,
    tests,
    trace: null,
  };
}

const FAILING: GradeTestResult = {
  actual: "no",
  args: [],
  command: "./a.out",
  exitCode: 1,
  expected: "yes",
  passed: false,
  signal: null,
  stderr: null,
  stdout: "no",
  testId: "t1",
  timedOut: false,
  title: "basic",
};

describe("buildFailureTrace", () => {
  it("returns the banner headline and the exact write arguments", () => {
    const { headline, writeArgs } = buildFailureTrace(result([FAILING]), {
      attempt: 2,
      examSlug: "exam-a",
      exercise: EXERCISE,
      level: 3,
      now: NOW,
    });
    expect(headline).toBe("1 of 1 tests failed · first KO: basic (exit code 1)");
    expect(writeArgs).toMatchObject({ attempt: 2, exerciseSlug: "level-0", level: 3 });
    expect(writeArgs.content).toContain("  challenge   exam-a · level 3 · try 2");
    expect(writeArgs.content).toContain("  exercise    level-0: print_char");
    expect(writeArgs.content).toContain("  graded      2026-09-20 18:00:00 UTC");
    expect(writeArgs.content).toContain(`  client      grademe CLI ${CLI_VERSION}`);
  });

  it("never lets a rendering failure take the banner down", () => {
    const broken = { ...result([]), tests: null as unknown as GradeTestResult[] };
    const { headline, writeArgs } = buildFailureTrace(broken, {
      attempt: 0,
      examSlug: "exam-a",
      exercise: EXERCISE,
      level: 0,
      now: NOW,
    });
    expect(headline).toBe("trace unavailable");
    expect(writeArgs.content).toContain("RESULT  KO · trace unavailable");
    expect(writeArgs.content.trim().length).toBeGreaterThan(40);
  });
});
