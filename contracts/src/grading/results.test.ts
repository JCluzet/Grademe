import { describe, expect, it } from "vitest";

import { gradeExercisePayloadSchema } from "./payload";
import { gradeExerciseResultSchema } from "./results";

const validResult = {
  awardedPoints: 50,
  compile: { ok: true, stderr: null, stdout: null, timedOut: false },
  graderLabel: "http",
  passed: true,
  runtimeMs: 12,
  tests: [
    {
      actual: "5",
      args: [],
      command: "./a.out",
      exitCode: 0,
      expected: "5",
      passed: true,
      signal: null,
      stderr: null,
      stdout: "5",
      testId: "t1",
      timedOut: false,
      title: "len",
    },
  ],
  trace: null,
};

describe("gradeExerciseResultSchema", () => {
  it("parses a valid result", () => {
    expect(gradeExerciseResultSchema.parse(validResult).passed).toBe(true);
  });

  it("parses an optional counted verdict", () => {
    expect(gradeExerciseResultSchema.parse({ ...validResult, counted: false }).counted).toBe(false);
  });

  it("rejects a negative awardedPoints", () => {
    expect(() => gradeExerciseResultSchema.parse({ ...validResult, awardedPoints: -1 })).toThrow();
  });
});

const EXAM_SESSION_ID = "b8ec729f-38d8-4b11-b1f1-1a8cb1050664";
const EXAM_SUBMISSION_ID = "afe56b96-a066-492f-9a4f-5f6a632b6a3d";

describe("gradeExercisePayloadSchema", () => {
  it("parses an optional integrity band", () => {
    const result = gradeExercisePayloadSchema.parse({
      expectedAttemptCycle: 1,
      integrityBand: "elevated",
      mode: "practice",
      submissionId: "a8ee5abc-e53f-4e07-9f3d-f38e53988c38",
      submittedFiles: [{ path: "main.c", content: "int main(void) { return 0; }" }],
    });

    expect(result.mode).toBe("practice");
    if (result.mode !== "practice") throw new Error("expected practice payload");
    expect(result.integrityBand).toBe("elevated");
  });

  it("parses an optional integrity band on an exam submission", () => {
    const result = gradeExercisePayloadSchema.parse({
      examSessionId: EXAM_SESSION_ID,
      expectedLevel: 2,
      integrityBand: "low",
      mode: "exam",
      submissionId: EXAM_SUBMISSION_ID,
      submittedFiles: [{ path: "main.c", content: "int main(void) { return 0; }" }],
    });

    if (result.mode !== "exam") throw new Error("expected exam payload");
    expect(result.integrityBand).toBe("low");
  });

  it("still accepts an exam submission from a client that predates the integrity band", () => {
    const result = gradeExercisePayloadSchema.parse({
      examSessionId: EXAM_SESSION_ID,
      expectedLevel: 0,
      mode: "exam",
      submissionId: EXAM_SUBMISSION_ID,
      submittedFiles: [{ path: "main.c", content: "int main(void) { return 0; }" }],
    });

    if (result.mode !== "exam") throw new Error("expected exam payload");
    expect(result.integrityBand).toBeUndefined();
  });

  it("rejects an unknown integrity band on an exam submission", () => {
    expect(() => gradeExercisePayloadSchema.parse({
      examSessionId: EXAM_SESSION_ID,
      expectedLevel: 0,
      integrityBand: "clean",
      mode: "exam",
      submissionId: EXAM_SUBMISSION_ID,
      submittedFiles: [{ path: "main.c", content: "x" }],
    })).toThrow();
  });

  it("rejects an oversized file", () => {
    expect(() =>
      gradeExercisePayloadSchema.parse({
        examSessionId: EXAM_SESSION_ID,
        expectedLevel: 0,
        mode: "exam",
        submissionId: EXAM_SUBMISSION_ID,
        submittedFiles: [{ path: "main.c", content: "a".repeat(20_001) }],
      }),
    ).toThrow();
  });

  it("rejects more than 20 files", () => {
    const files = Array.from({ length: 21 }, (_, i) => ({ path: `f${String(i)}.c`, content: "x" }));
    expect(() => gradeExercisePayloadSchema.parse({
      expectedAttemptCycle: 1,
      mode: "practice",
      submissionId: "911b0285-9aee-4031-a4f3-683ac16c4340",
      submittedFiles: files,
    })).toThrow();
  });
});
