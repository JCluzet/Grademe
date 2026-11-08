import { z } from "zod";

import { gradeExerciseResultSchema } from "../grading/results";

export interface ChallengeSubmissionContext {
  currentLevel: number;
  sessionId: string;
}

export const examSubmitStreamDoneSchema = z.object({
  completedLevelsCount: z.number().int().nonnegative(),
  cooldownUntil: z.string().nullable(),
  examCompleted: z.boolean(),
  levelPassed: z.boolean(),
  result: gradeExerciseResultSchema,
});

export type ExamSubmitStreamDone = z.infer<typeof examSubmitStreamDoneSchema>;
