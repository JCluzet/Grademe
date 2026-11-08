import { describe, expect, it } from "vitest";

import { cliAuthTokenResponseSchema } from "./auth";
import { cliExamRowSchema } from "./catalog";
import { cliVersionSchema } from "./client";
import { cliExerciseContentSchema } from "./exercise";
import { cliSessionViewSchema } from "./session";

describe("CLI DTO schemas", () => {
  it("parses a CliExamRow", () => {
    const row = cliExamRowSchema.parse({
      audience: "learner",
      bestScoreLabel: null,
      difficulty: 1,
      durationLabel: "3h",
      languageLabel: "C",
      levelLabel: "8 levels",
      progressPercent: 0,
      remainingLabel: null,
      slug: "beginner-exam-01",
      status: "not_started",
      title: "Beginner Exam 01",
    });
    expect(row.slug).toBe("beginner-exam-01");
  });

  it("parses a CliExerciseContent with kind and language", () => {
    const content = cliExerciseContentSchema.parse({
      allowedFunctions: [],
      assignmentName: "string_length",
      examples: [],
      expectedFiles: ["string_length.c"],
      instructions: "Write string_length.",
      kind: "function",
      language: "c",
      slug: "ft-strlen",
    });
    expect(content.kind).toBe("function");
  });

  it("parses a CliSessionView with ISO timestamps", () => {
    const view = cliSessionViewSchema.parse({
      cooldownUntil: null,
      currentLevel: 0,
      currentTry: 0,
      examSlug: "beginner-exam-01",
      sessionId: "c1bb3d9e-5fa5-4d5a-8f5e-6a2a1f906f87",
      exerciseSlug: "ft-strlen",
      expiresAt: "2026-06-14T18:32:00.000Z",
      levels: [
        { assignmentName: "string_length", exerciseSlug: "ft-strlen", index: 0, status: "current" },
      ],
      passingScore: 50,
      pointsPerLevel: 13,
      score: 0,
      totalLevels: 8,
    });
    expect(view.totalLevels).toBe(8);
    expect(view.levels[0]?.status).toBe("current");
  });

  it("parses a CliAuthTokenResponse", () => {
    const res = cliAuthTokenResponseSchema.parse({
      token: "gmcli_abc",
      user: { email: "ada@example.com", id: "u1" },
    });
    expect(res.user.email).toBe("ada@example.com");
  });

  it("parses a CliAuthTokenResponse without an email", () => {
    const res = cliAuthTokenResponseSchema.parse({
      token: "gmcli_abc",
      user: { id: "u1" },
    });
    expect(res.user.email).toBeUndefined();
  });

  it.each(["0.1.0", "1.2.3-beta.1", "1.2.3+build.42"])(
    "accepts the CLI version %s",
    (version) => {
      expect(cliVersionSchema.parse(version)).toBe(version);
    },
  );

  it.each(["latest", "v1.2.3", "1.2", "1.2.3\nforged"])(
    "rejects the malformed CLI version %s",
    (version) => {
      expect(cliVersionSchema.safeParse(version).success).toBe(false);
    },
  );
});
