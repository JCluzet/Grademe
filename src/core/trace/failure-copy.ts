import type { MemoryErrorKind } from "@grademe/contracts";

import { outputMatched } from "./test-verdict";
import type { TraceTest } from "./types";

const SIGNAL_HINT: Readonly<Record<string, string>> = {
  SIGABRT: "aborted: failed assert(), abort(), or glibc caught a double free / stack smashing",
  SIGBUS: "bus error: misaligned memory access",
  SIGFPE: "arithmetic exception: integer division or modulo by zero",
  SIGILL: "illegal instruction: corrupt function pointer or overwritten stack",
  SIGPIPE: "broken pipe: wrote to a closed stdout",
  SIGSEGV: "segfault: usually a NULL or out-of-bounds pointer, or a stack overflow",
};

const MEMORY_LABEL: Readonly<Record<MemoryErrorKind, string>> = {
  "invalid-access": "invalid memory access",
  leak: "memory leak",
  other: "memory error",
  uninitialised: "use of uninitialised value",
};

const OUTPUT_MATCHED_ALONE = "Output matched; this alone fails the test.";

export function shortReason({ test, verdict }: TraceTest): string {
  switch (verdict) {
    case "passed":
      return "";
    case "skipped":
      return "skipped";
    case "timeout":
      return "timeout";
    case "crash":
      return `crash (${test.signal ?? "signal"})`;
    case "memory":
      return test.memory ? MEMORY_LABEL[test.memory.kind] : "memory error";
    case "wrong-return":
      return "wrong return value";
    case "wrong-exit-code":
      return `exit code ${String(test.exitCode)}`;
    case "wrong-output":
      return "wrong output";
  }
}

export function longReason({ test, verdict }: TraceTest): string {
  const matched = outputMatched(test);
  switch (verdict) {
    case "passed":
      return "";
    case "skipped":
      return "skipped: not run because an earlier test timed out";
    case "timeout":
      return "timeout: the grader killed your program after the allowed time (infinite loop? blocking read?)";
    case "crash": {
      const signal = test.signal ?? "unknown signal";
      const hint = SIGNAL_HINT[signal] ?? "killed before it could exit";
      return `crash: ${signal}, ${hint}. Whatever the diff shows, fix the crash first.`;
    }
    case "memory": {
      const label = test.memory ? MEMORY_LABEL[test.memory.kind] : "memory error";
      const detail = test.memory ? `: ${test.memory.detail}.` : ".";
      return `${label}${detail}${matched ? ` ${OUTPUT_MATCHED_ALONE}` : ""}`;
    }
    case "wrong-return": {
      const value = test.returnValue;
      const facts = value
        ? `expected ${value.expected}, your function returned ${value.actual}.`
        : "the returned value differs from the expected one.";
      return `wrong return value: ${facts} ${matched ? "Output matched." : "Output differs too, see below."}`;
    }
    case "wrong-exit-code":
      return `exit code ${String(test.exitCode)}: expected ${String(test.expectedExitCode ?? 0)}.${matched ? ` ${OUTPUT_MATCHED_ALONE}` : ""}`;
    case "wrong-output":
      return "wrong output";
  }
}
