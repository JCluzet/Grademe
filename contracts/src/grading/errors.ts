import { z } from "zod";

export const gradeExerciseErrorSchema = z.object({
  code: z.enum([
    "AUTH_REQUIRED",
    "BAD_REQUEST",
    "EXERCISE_NOT_FOUND",
    "NOT_FOUND",
    "QUEUE_FULL",
    "QUEUE_TIMEOUT",
    "GRADE_TIMEOUT",
    "DUPLICATE_SUBMISSION",
    "RESET_REQUIRED",
    "STALE_SESSION",
    "NO_ACTIVE_SESSION",
    "SESSION_EXPIRED",
    "COOLDOWN_ACTIVE",
    "INVALID_LEVEL",
    "GRADING_NOT_IMPLEMENTED",
    "REMOTE_PROVIDER_NOT_CONFIGURED",
    "REMOTE_PROVIDER_ERROR",
    "REMOTE_PROVIDER_INVALID_RESPONSE",
    "SCHEDULER_ERROR",
    "UNAUTHORIZED",
    "INTERNAL_ERROR",
  ]),
  message: z.string(),
});

export type GradeExerciseError = z.infer<typeof gradeExerciseErrorSchema>;
export type GradeExerciseErrorCode = GradeExerciseError["code"];
