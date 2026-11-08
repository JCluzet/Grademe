import { classifyTestFailure, type FailureReason, type GradeTestResult } from "@grademe/contracts";

export type TestVerdict = FailureReason | "passed" | "skipped";

export function verdictOf(test: GradeTestResult): TestVerdict {
  if (test.passed) return "passed";
  if (test.skipped === true) return "skipped";
  return classifyTestFailure(test) ?? "wrong-output";
}

export function isFailedVerdict(verdict: TestVerdict): boolean {
  return verdict !== "passed" && verdict !== "skipped";
}

export function outputMatched(test: GradeTestResult): boolean {
  return (test.actual ?? "") === (test.expected ?? "");
}
