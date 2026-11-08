import { z } from "zod";

import { MAX_SUBMITTED_FILE_COUNT } from "../submission/limits";
import { submittedFileSchema } from "../submission/submitted-file";

export const gradingModeSchema = z.enum(["practice", "exam"]);

export const integrityBandSchema = z.enum(["insufficient-signal", "low", "elevated"]);

const gradingPayloadBaseSchema = z.object({
  submittedFiles: z.array(submittedFileSchema).min(1).max(MAX_SUBMITTED_FILE_COUNT),
});

export const gradeExercisePayloadSchema = z.discriminatedUnion("mode", [
  gradingPayloadBaseSchema.extend({
    mode: z.literal("practice"),
    submissionId: z.uuid(),
    expectedAttemptCycle: z.number().int().positive(),
    integrityBand: integrityBandSchema.optional(),
  }).strict(),
  gradingPayloadBaseSchema.extend({
    mode: z.literal("exam"),
    submissionId: z.uuid(),
    examSessionId: z.uuid(),
    expectedLevel: z.number().int().nonnegative(),
    integrityBand: integrityBandSchema.optional(),
  }).strict(),
]);

export type GradingMode = z.infer<typeof gradingModeSchema>;
export type GradeExercisePayload = z.infer<typeof gradeExercisePayloadSchema>;
export type IntegrityBand = z.infer<typeof integrityBandSchema>;
