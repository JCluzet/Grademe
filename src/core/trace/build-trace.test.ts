import type { GradeExerciseResult, GradeTestResult } from "@grademe/contracts";
import { describe, expect, it } from "vitest";

import { buildTraceModel, failureHeadline, renderTrace } from "./build-trace";
import type { TraceInput, TraceMeta } from "./types";

function buildTrace(input: TraceInput): string {
  return renderTrace(buildTraceModel(input));
}

const ESC = "\x1b";

function headlineOf(value: GradeExerciseResult): string {
  return failureHeadline(buildTraceModel({ meta: META, result: value }));
}

const META: TraceMeta = {
  attempt: 0,
  cliVersion: "0.1.2",
  examSlug: "c-foundations-01",
  exerciseSlug: "puts",
  exerciseTitle: "Print a string with a newline",
  gradedAt: new Date("2026-09-19T13:38:12Z"),
  level: 4,
};

function catE(raw: string | null): string | null {
  return raw === null ? null : raw.replaceAll("\n", "$\n");
}

function test(
  title: string,
  command: string,
  expectedRaw: string,
  actualRaw: string | null,
  overrides: Partial<GradeTestResult> = {},
): GradeTestResult {
  const base: GradeTestResult = {
    actual: catE(actualRaw),
    args: [],
    command,
    exitCode: 0,
    expected: catE(expectedRaw),
    expectedRaw,
    passed: false,
    signal: null,
    stderr: null,
    stdout: actualRaw,
    testId: title,
    timedOut: false,
    title,
    ...overrides,
  };
  const failed =
    base.expected !== base.actual ||
    base.exitCode !== 0 ||
    base.signal !== null ||
    base.timedOut ||
    base.memory !== undefined ||
    base.returnValue !== undefined;
  return { ...base, passed: overrides.passed ?? !failed };
}

function result(overrides: Partial<GradeExerciseResult>): GradeExerciseResult {
  return {
    awardedPoints: 0,
    compile: { ok: true, stderr: null, stdout: null, timedOut: false },
    graderLabel: "grader-beta",
    passed: false,
    runtimeMs: 300,
    tests: [],
    trace: null,
    ...overrides,
  };
}

const COMPILE_ERROR =
  "puts.c:10:29: error: passing argument 2 of 'write' makes pointer from integer without a cast [-Wint-conversion]\n   10 |                 write(1, str[i], 1);";

const PUTS_CASES: [string, string][] = [
  ["Typical string", "git status"],
  ["Empty string: just a newline", ""],
  ["String with spaces", "docker build ."],
];

describe("buildTrace", () => {
  it("renders a compile error with the raw diagnostic and a next step", () => {
    const trace = buildTrace({
      meta: META,
      result: result({ compile: { ok: false, stderr: COMPILE_ERROR, stdout: null, timedOut: false } }),
    });
    expect(trace).toContain("RESULT  KO · compilation failed");
    expect(trace).toContain("compiler output:\n" + COMPILE_ERROR);
    expect(trace).toContain("No test ran. Fix the build, then run grademe again.");
    expect(trace).not.toContain("── tests");
  });

  it("renders a forbidden function refusal with the allowed list", () => {
    const trace = buildTrace({
      meta: META,
      result: result({
        compile: { ok: false, stderr: "Forbidden function used: printf\nAllowed functions: write", stdout: null, timedOut: false },
      }),
    });
    expect(trace).toContain("RESULT  KO · forbidden function");
    expect(trace).toContain("Allowed functions: write");
    expect(trace).toContain("refused before compiling");
  });

  it("pins the copy for a compile timeout: the shared classifier does not see timedOut", () => {
    const trace = buildTrace({
      meta: META,
      result: result({ compile: { ok: false, stderr: null, stdout: null, timedOut: true } }),
    });
    expect(trace).toContain("RESULT  KO · build failed without a diagnostic");
    expect(trace).toContain("No test ran. Fix the build, then run grademe again.");
    expect(trace).not.toContain("── tests");
  });

  it("prints the exercise slug alone when the title adds nothing", () => {
    const trace = buildTrace({
      meta: { ...META, exerciseTitle: META.exerciseSlug },
      result: result({ compile: { ok: false, stderr: COMPILE_ERROR, stdout: null, timedOut: false } }),
    });
    expect(trace).toContain("\n  exercise    puts\n");
  });

  it("never writes an empty file when the grader gave no diagnostic", () => {
    const trace = buildTrace({
      meta: META,
      result: result({ compile: { ok: false, stderr: "Link step failed.", stdout: null, timedOut: false } }),
    });
    expect(trace).toContain("RESULT  KO · build failed without a diagnostic");
    expect(trace).toContain("run grademe again");
    expect(trace).not.toContain("Link step failed.");
  });

  it("renders the missing-newline case exactly as reviewed", () => {
    const tests = PUTS_CASES.map(([title, s]) => test(title, `puts("${s}")`, `${s}\n`, s));
    const trace = buildTrace({ meta: META, result: result({ tests }) });
    expect(trace).toBe(
      [
        "Grademe trace",
        "  challenge   c-foundations-01 · level 4 · try 0",
        "  exercise    puts: Print a string with a newline",
        "  graded      2026-09-19 13:38:12 UTC",
        "  client      grademe CLI 0.1.2",
        "",
        "RESULT  KO · 3 tests · 0 passed · 3 failed",
        "",
        "── tests ─────────────────────────────────────────────────────────────────────",
        'KO  1/3  Typical string                puts("git status")      ← wrong output',
        'KO  2/3  Empty string: just a newline  puts("")                ← wrong output',
        'KO  3/3  String with spaces            puts("docker build .")  ← wrong output',
        "",
        "Output is shown as `cat -e` prints it: `$` marks the end of every line.",
        "In each diff, `-` lines are what was expected, `+` lines are what your program printed.",
        "",
        "── KO 1/3 · Typical string ───────────────────────────────────────────────────",
        'command   puts("git status")',
        "reason    wrong output",
        "exit      0",
        "",
        "--- expected",
        "+++ got",
        "@@ -1 +1 @@",
        "-git status$",
        "+git status",
        "",
        "── KO 2/3 · Empty string: just a newline ─────────────────────────────────────",
        'command   puts("")',
        "reason    wrong output",
        "exit      0",
        "",
        "--- expected",
        "+++ got       (no output)",
        "@@ -1 +0,0 @@",
        "-$",
        "",
        "── KO 3/3 · String with spaces ───────────────────────────────────────────────",
        'command   puts("docker build .")',
        "reason    wrong output",
        "exit      0",
        "",
        "--- expected",
        "+++ got",
        "@@ -1 +1 @@",
        "-docker build .$",
        "+docker build .",
        "",
      ].join("\n"),
    );
  });

  it("lists passing tests, details only the failing ones, and pipes shell commands through cat -e", () => {
    const tests = [
      test("Single letter", "./index_alpha a", "a\n", "a\n"),
      test("Two letters starting at b", "./index_alpha bc", "bcc\n", "", {
        exitCode: 139,
        signal: "SIGSEGV",
        stderr: "timeout: the monitored command dumped core",
      }),
      test("No arguments", "./index_alpha", "wrong number of arguments\n", "wrong number of arguments\n", { exitCode: 1 }),
    ];
    const trace = buildTrace({ meta: META, result: result({ tests }) });
    expect(trace).toContain("RESULT  KO · 3 tests · 1 passed · 2 failed");
    expect(trace).toContain("OK  1/3  Single letter");
    expect(trace).toContain("./index_alpha bc | cat -e  ← crash (SIGSEGV)");
    expect(trace).toContain("exit      139 (signal SIGSEGV)");
    expect(trace).toContain("+++ got       (no output)");
    expect(trace).toContain("stderr:\n  timeout: the monitored command dumped core");
    expect(trace).toContain("exit code 1: expected 0. Output matched; this alone fails the test.");
    expect(trace).toContain("output    identical to expected");
    expect(trace).not.toContain("── KO 1/3");
  });

  it("truncates a runaway output, marks skipped tests, and explains them once", () => {
    const tests = [
      test("Loops forever", "./alpha_pairs", "ab\n", "a".repeat(65_536), { exitCode: 124, timedOut: true }),
      test("Never ran", "./alpha_pairs x", "ab\n", "", { exitCode: 125, skipped: true, stderr: "Skipped after timeout" }),
    ];
    const trace = buildTrace({ meta: META, result: result({ tests }) });
    expect(trace).toContain("RESULT  KO · 2 tests · 0 passed · 1 failed · 1 skipped");
    expect(trace).toContain("--  2/2  Never ran");
    expect(trace).toContain("… (+65,376 more characters)");
    expect(trace).toContain("── skipped");
    expect(trace).not.toContain("── KO 2/2");
    expect(trace).not.toContain("Skipped after timeout");
  });

  it("leads with the real cause for return values and memory errors", () => {
    const tests = [
      test("Uppercase letter", "putchar('A')", "A", "z", { returnValue: { actual: "0", expected: "65" } }),
      test("No underscore", "./camel_fmt flag", "flag\n", "flag\n", {
        exitCode: 86,
        memory: { detail: "5 bytes definitely lost in main (camel_fmt.c:29)", kind: "leak" },
        memoryChecked: true,
      }),
    ];
    const trace = buildTrace({ meta: META, result: result({ tests }) });
    expect(trace).toContain("← wrong return value");
    expect(trace).toContain("reason    wrong return value: expected 65, your function returned 0. Output differs too, see below.");
    expect(trace).toContain("← memory leak");
    expect(trace).toContain("memory leak: 5 bytes definitely lost in main (camel_fmt.c:29). Output matched; this alone fails the test.");
  });

  it("still shows a difference hidden past the clip point, and names a newline-only difference", () => {
    const long = "a".repeat(200);
    const tests = [
      test("Long line", "./wide", `${long}b\n`, `${long}c\n`),
      test("Trailing bytes", "./tail", "a\n", "a$", { passed: false }),
    ];
    const trace = buildTrace({ meta: META, result: result({ tests }) });
    expect(trace).toContain(`-${"a".repeat(160)}… (+42 more characters)`);
    expect(trace).toContain(`+${"a".repeat(160)}… (+42 more characters)`);
    expect(trace).toContain("(no line differs: the outputs differ only in their final newline or trailing bytes)");
  });

  it("pads ranks, ellipsizes long titles and commands, and bounds stderr", () => {
    const stderr = Array.from({ length: 25 }, (_, i) => `warn ${String(i)}`).join("\n");
    const tests = [
      ...Array.from({ length: 8 }, (_, i) => test(`Case ${String(i)}`, `./c ${String(i)}`, "ok\n", "ok\n")),
      test("A very long title that will not fit in the column", `./c ${"x".repeat(60)}`, "ok\n", "ko\n", {
        exitCode: 124,
        stderr,
        timedOut: true,
      }),
      test("Printed when nothing was expected", "./c 9", "", "x\n"),
    ];
    const trace = buildTrace({ meta: META, result: result({ tests }) });
    expect(trace).toContain("OK   1/10  Case 0");
    expect(trace).toContain("KO   9/10  A very long title that will not f…");
    expect(trace).toContain(`./c ${"x".repeat(39)}…  ← timeout`);
    expect(trace).not.toContain("exit      124");
    expect(trace).toContain("  … 5 more lines");
    expect(trace).toContain("--- expected  (no output)");
  });

  it("neutralises terminal control sequences from server strings before rendering", () => {
    const tests = [test(`basic${ESC}]52;c;x\x07`, `./a\r`, "y\n", "n\n", { exitCode: 1 })];
    const value = result({ tests, trace: `note${ESC}[31m` });
    const trace = buildTrace({ meta: META, result: value });
    expect(trace).not.toContain(ESC);
    expect(trace).not.toContain("\r");
    expect(trace).toContain("KO 1/1 · basic ");
    expect(headlineOf(value)).toBe("1 of 1 tests failed · first KO: basic (exit code 1)");
  });

  it("keeps the grader's own notes when it sent some", () => {
    const trace = buildTrace({
      meta: META,
      result: result({ tests: [test("basic", "./a.out", "yes", "no", { exitCode: 1 })], trace: "grader trace here" }),
    });
    expect(trace).toContain("── grader notes");
    expect(trace).toContain("grader trace here");
  });

  it("is never empty, whatever the failing result looks like", () => {
    const odd: GradeExerciseResult[] = [
      result({}),
      result({ compile: { ok: false, stderr: null, stdout: null, timedOut: true } }),
      result({ tests: [test("x", "./x", "", null, { passed: false })] }),
    ];
    for (const value of odd) {
      const trace = buildTrace({ meta: META, result: value });
      expect(trace.trim().length).toBeGreaterThan(40);
      expect(trace).toContain("RESULT  KO");
    }
  });
});

describe("failureHeadline", () => {
  it("names the build verdict or the first failing test", () => {
    expect(headlineOf(result({ compile: { ok: false, stderr: "x.c:1:1: error: boom", stdout: null, timedOut: false } }))).toBe("compilation failed");
    expect(
      headlineOf(result({ compile: { ok: false, stderr: "Forbidden function used: printf", stdout: null, timedOut: false } })),
    ).toBe("forbidden function");
    expect(headlineOf(result({ compile: { ok: false, stderr: null, stdout: null, timedOut: false } }))).toBe(
      "build failed without a diagnostic",
    );
    const tests = [
      test("Single letter", "./index_alpha a", "a\n", "a\n"),
      test("Two letters", "./index_alpha bc", "bcc\n", "", { exitCode: 139, signal: "SIGSEGV" }),
      test("No arguments", "./index_alpha", "x\n", "x\n", { exitCode: 1 }),
    ];
    expect(headlineOf(result({ tests }))).toBe("2 of 3 tests failed · first KO: Two letters (crash (SIGSEGV))");
  });

  it("falls back to the counts when every test was skipped", () => {
    const tests = [test("a", "./a", "x\n", "", { exitCode: 125, skipped: true })];
    expect(headlineOf(result({ tests }))).toBe("1 tests · 0 passed · 0 failed · 1 skipped");
  });
});
