import { z } from "zod";

export const cliExamStatusSchema = z.enum(["not_started", "in_progress", "passed", "failed"]);

export const cliExamRowSchema = z.object({
  audience: z.enum(["learner", "developer"]),
  bestScoreLabel: z.string().nullable(),
  difficulty: z.number().int().min(1).max(5),
  durationLabel: z.string(),
  languageLabel: z.string(),
  levelLabel: z.string(),
  progressPercent: z.number().min(0).max(100),
  remainingLabel: z.string().nullable(),
  slug: z.string(),
  status: cliExamStatusSchema,
  title: z.string(),
});

export type CliExamStatus = z.infer<typeof cliExamStatusSchema>;
export type CliExamRow = z.infer<typeof cliExamRowSchema>;
