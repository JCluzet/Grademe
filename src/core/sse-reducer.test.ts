import type {
  CompileResult,
  ExamSubmitStreamDone,
  GradeExerciseError,
  GradeTestResult,
} from "@grademe/contracts";
import { describe, expect, it } from "vitest";

import { initialProgress, reduceGradingSse } from "./sse-reducer";

const compile: CompileResult = { ok: true, stderr: null, stdout: null, timedOut: false };

function test(testId: string, passed: boolean): GradeTestResult {
  return {
    actual: null,
    args: [],
    command: "./a.out",
    exitCode: 0,
    expected: null,
    passed,
    signal: null,
    stderr: null,
    stdout: null,
    testId,
    timedOut: false,
    title: `test ${testId}`,
  };
}

const done: ExamSubmitStreamDone = {
  completedLevelsCount: 1,
  cooldownUntil: null,
  examCompleted: false,
  levelPassed: true,
  result: {
    awardedPoints: 1,
    compile,
    graderLabel: "C",
    passed: true,
    runtimeMs: 12,
    tests: [test("t1", true)],
    trace: null,
  },
};

const error: GradeExerciseError = { code: "QUEUE_FULL", message: "busy" };

describe("reduceGradingSse", () => {
  it("accumulates compile, then two tests, then done in order", () => {
    let state = initialProgress;
    state = reduceGradingSse(state, { data: compile, event: "compile" });
    state = reduceGradingSse(state, { data: test("t1", true), event: "test" });
    state = reduceGradingSse(state, { data: test("t2", false), event: "test" });
    state = reduceGradingSse(state, { data: done, event: "done" });

    expect(state.compile).toEqual(compile);
    expect(state.tests.map((entry) => entry.testId)).toEqual(["t1", "t2"]);
    expect(state.done).toEqual(done);
    expect(state.error).toBeNull();
  });

  it("captures an error frame", () => {
    const state = reduceGradingSse(initialProgress, { data: error, event: "error" });
    expect(state.error).toEqual(error);
  });

  it("ignores an unknown frame", () => {
    const state = reduceGradingSse(initialProgress, { data: { foo: 1 }, event: "ping" });
    expect(state).toEqual(initialProgress);
  });

  it("does not mutate the input state", () => {
    const before = initialProgress;
    reduceGradingSse(before, { data: compile, event: "compile" });
    expect(before).toEqual({ compile: null, done: null, error: null, tests: [] });
  });

  it("throws when a compile payload is malformed", () => {
    expect(() => reduceGradingSse(initialProgress, { data: { ok: "nope" }, event: "compile" })).toThrow();
  });
});
