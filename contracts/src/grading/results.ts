import { z } from "zod";

import { memorySchema } from "./memory";

export const compileResultSchema = z.object({
  ok: z.boolean(),
  stderr: z.string().nullable(),
  stdout: z.string().nullable(),
  timedOut: z.boolean(),
});

export const gradeTestResultSchema = z.object({
  actual: z.string().nullable(),
  args: z.array(z.string()),
  command: z.string(),
  exitCode: z.number().int(),
  expected: z.string().nullable(),
  expectedExitCode: z.number().int().optional(),
  expectedRaw: z.string().optional(),
  memory: memorySchema.optional(),
  memoryChecked: z.boolean().optional(),
  passed: z.boolean(),
  returnValue: z.object({ actual: z.string(), expected: z.string() }).optional(),
  signal: z.string().nullable(),
  skipped: z.boolean().optional(),
  stderr: z.string().nullable(),
  stdout: z.string().nullable(),
  testId: z.string(),
  timedOut: z.boolean(),
  title: z.string(),
});

export const gradeExerciseResultSchema = z.object({
  attemptCount: z.number().int().positive().optional(),
  awardedPoints: z.number().int().nonnegative(),
  compile: compileResultSchema,
  counted: z.boolean().optional(),
  graderLabel: z.string().trim().min(1),
  passed: z.boolean(),
  runtimeMs: z.number().nonnegative(),
  tests: z.array(gradeTestResultSchema),
  trace: z.string().nullable(),
});

export type CompileResult = z.infer<typeof compileResultSchema>;
export type GradeTestResult = z.infer<typeof gradeTestResultSchema>;
export type GradeExerciseResult = z.infer<typeof gradeExerciseResultSchema>;
