import type { CliExerciseContent, CliSessionView } from "@grademe/contracts";
import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";

import { SessionStatus } from "./SessionStatus";

const exercise: CliExerciseContent = {
  allowedFunctions: ["write"],
  assignmentName: "print_char",
  examples: [],
  expectedFiles: ["print_char.c"],
  instructions: "Write a function that displays a character.",
  kind: "function",
  language: "c",
  slug: "ex-ft-putchar",
};

function makeSession(overrides: Partial<CliSessionView> = {}): CliSessionView {
  return {
    cooldownUntil: null,
    currentLevel: 2,
    currentTry: 2,
    examSlug: "examrank-02",
    sessionId: "c1bb3d9e-5fa5-4d5a-8f5e-6a2a1f906f87",
    exerciseSlug: "print_char",
    expiresAt: "2026-06-14T18:30:00.000Z",
    levels: [
      { assignmentName: "string_length", exerciseSlug: "string_length", index: 0, status: "passed" },
      { assignmentName: "string_copy", exerciseSlug: "string_copy", index: 1, status: "passed" },
      { assignmentName: "print_char", exerciseSlug: "print_char", index: 2, status: "current" },
    ],
    passingScore: 100,
    pointsPerLevel: 25,
    score: 50,
    totalLevels: 4,
    ...overrides,
  };
}

describe("SessionStatus", () => {
  it("renders the level, mode, grade and rules", () => {
    const session = makeSession();
    const frame =
      render(
        <SessionStatus
          dir="~/exam"
          exercise={exercise}
          nowMs={Date.parse(session.expiresAt) - 3_600_000}
          session={session}
        />,
      ).lastFrame() ?? "";

    expect(frame).toContain("Level 2 / 4");
    expect(frame).toContain("REAL mode · Your grade will be counted");
    expect(frame).toContain("50/100");
    expect(frame).toContain("Assignments:");
    expect(frame).toContain("›");
    expect(frame).not.toContain("===");
  });

  it("renders the submission and subject paths with the reconciled folders", () => {
    const session = makeSession();
    const frame =
      render(
        <SessionStatus dir="~/exam" exercise={exercise} nowMs={Date.now()} session={session} />,
      ).lastFrame() ?? "";

    expect(frame).toContain("~/exam/subject/subject.en.txt");
    expect(frame).toContain("~/exam/submission/print_char/");
    expect(frame).not.toContain("~/exam/submission/ex-ft-putchar/");
    expect(frame).toContain("Grademe commands only.");
  });

  it("expands the assignments list with passed successes, failures and the current row", () => {
    const session = makeSession();
    const frame =
      render(
        <SessionStatus dir="~/exam" exercise={exercise} nowMs={Date.now()} session={session} />,
      ).lastFrame() ?? "";

    expect(frame).toContain("string_length");
    expect(frame).toContain("string_copy");
    expect(frame).toContain("(Success)");
    expect(frame).toContain("(Failure)");
    expect(frame).toContain("(Current)");
    expect(frame).toContain("25 potential points");
    expect(frame).toContain("Current assignment / print_char");
    expect(frame).toContain("2 unsuccessful attempts (Failure)");
  });

  it("renders the end date and the remaining time", () => {
    const session = makeSession();
    const frame =
      render(
        <SessionStatus
          dir="~/exam"
          exercise={exercise}
          nowMs={Date.parse(session.expiresAt) - (3 * 3_600_000 + 5 * 60_000 + 9_000)}
          session={session}
        />,
      ).lastFrame() ?? "";

    expect(frame).toContain("Ends");
    expect(frame).toContain("3hrs, 05min and 09sec remaining");
    expect(frame).toContain("Code in another terminal.");
  });

  it("shows only the Current row when there are no prior tries", () => {
    const session = makeSession({
      currentLevel: 0,
      currentTry: 0,
      levels: [
        { assignmentName: "print_char", exerciseSlug: "print_char", index: 0, status: "current" },
      ],
      score: 0,
    });
    const frame =
      render(
        <SessionStatus dir="~/exam" exercise={exercise} nowMs={Date.now()} session={session} />,
      ).lastFrame() ?? "";

    expect(frame).toContain("(Current)");
    expect(frame).not.toContain("(Failure)");
    expect(frame).not.toContain("(Success)");
  });
});
