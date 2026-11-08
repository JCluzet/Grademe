import type { GradeTestResult } from "./results";

export type FailureReason =
  | "crash"
  | "timeout"
  | "memory"
  | "exit-nonzero"
  | "wrong-return"
  | "wrong-output";

export function classifyTestFailure(test: GradeTestResult): FailureReason | null {
  if (test.passed) return null;
  if (test.timedOut) return "timeout";
  if (test.signal !== null) return "crash";
  if (test.memory) return "memory";
  if (test.returnValue !== undefined) return "wrong-return";
  if (test.exitCode !== 0) return "exit-nonzero";
  return "wrong-output";
}
