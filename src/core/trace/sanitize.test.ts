import type { GradeExerciseResult } from "@grademe/contracts";
import { describe, expect, it } from "vitest";

import { sanitizeGradeResult, stripTerminalControl } from "./sanitize";

const ESC = "\x1b";
const BEL = "\x07";

describe("stripTerminalControl", () => {
  it("removes CSI, OSC and other escape sequences whole", () => {
    expect(stripTerminalControl(`plain ${ESC}[31mred${ESC}[0m text`)).toBe("plain red text");
    expect(stripTerminalControl(`basic${ESC}]52;c;ZWNobyBwd25lZA==${BEL}`)).toBe("basic");
    expect(stripTerminalControl(`${ESC}]8;;https://evil.example${BEL}click${ESC}]8;;${BEL}`)).toBe("click");
    expect(stripTerminalControl(`a${ESC}Ppayload${ESC}\\b`)).toBe("ab");
    expect(stripTerminalControl(`a${ESC}Mb`)).toBe("ab");
  });

  it("drops bare control characters but keeps newlines and tabs", () => {
    expect(stripTerminalControl("a\rb\x00c\x7fd\x85e")).toBe("abcde");
    expect(stripTerminalControl("line\n\tindented")).toBe("line\n\tindented");
  });
});

describe("sanitizeGradeResult", () => {
  it("cleans every server-provided string without touching the shape", () => {
    const result: GradeExerciseResult = {
      awardedPoints: 0,
      compile: { ok: false, stderr: `err${ESC}[2J`, stdout: null, timedOut: false },
      graderLabel: "grader",
      passed: false,
      runtimeMs: 1,
      tests: [
        {
          actual: "x$\n",
          args: [],
          command: `./a${BEL}`,
          exitCode: 139,
          expected: "y$\n",
          memory: { detail: "leak\r", kind: "leak" },
          passed: false,
          returnValue: { actual: `1${ESC}[A`, expected: "2" },
          signal: `SIGSEGV${ESC}[0m`,
          stderr: null,
          stdout: "x\n",
          testId: "t",
          timedOut: false,
          title: `basic${ESC}]52;c;x${BEL}`,
        },
      ],
      trace: `note${ESC}[1m`,
    };
    const safe = sanitizeGradeResult(result);
    expect(safe.compile.stderr).toBe("err");
    expect(safe.trace).toBe("note");
    const [test] = safe.tests;
    expect(test?.title).toBe("basic");
    expect(test?.command).toBe("./a");
    expect(test?.signal).toBe("SIGSEGV");
    expect(test?.memory?.detail).toBe("leak");
    expect(test?.returnValue).toEqual({ actual: "1", expected: "2" });
    expect(test?.stderr).toBeNull();
    expect(result.tests[0]?.title).toContain(ESC);
  });
});
