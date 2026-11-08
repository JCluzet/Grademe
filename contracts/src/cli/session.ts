import { z } from "zod";

export const cliSessionViewSchema = z.object({
  cooldownUntil: z.string().nullable(),
  currentLevel: z.number().int().nonnegative(),
  currentTry: z.number().int().nonnegative(),
  examSlug: z.string(),
  sessionId: z.uuid(),
  exerciseSlug: z.string(),
  expiresAt: z.string(),
  levels: z.array(
    z.object({
      assignmentName: z.string(),
      exerciseSlug: z.string(),
      index: z.number().int().nonnegative(),
      status: z.enum(["passed", "current"]),
    }),
  ),
  passingScore: z.number().int().min(0).max(100),
  pointsPerLevel: z.number().int().nonnegative(),
  score: z.number().int().min(0).max(100),
  totalLevels: z.number().int().positive(),
});

export type CliSessionView = z.infer<typeof cliSessionViewSchema>;
