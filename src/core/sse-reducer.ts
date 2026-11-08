import {
  compileResultSchema,
  examSubmitStreamDoneSchema,
  gradeExerciseErrorSchema,
  gradeTestResultSchema,
  type CompileResult,
  type ExamSubmitStreamDone,
  type GradeExerciseError,
  type GradeTestResult,
} from "@grademe/contracts";

export interface GradingProgress {
  compile: CompileResult | null;
  tests: GradeTestResult[];
  done: ExamSubmitStreamDone | null;
  error: GradeExerciseError | null;
}

export const initialProgress: GradingProgress = {
  compile: null,
  done: null,
  error: null,
  tests: [],
};

export function reduceGradingSse(
  s: GradingProgress,
  frame: { event: string; data: unknown },
): GradingProgress {
  switch (frame.event) {
    case "compile":
      return { ...s, compile: compileResultSchema.parse(frame.data) };
    case "test":
      return { ...s, tests: [...s.tests, gradeTestResultSchema.parse(frame.data)] };
    case "done":
      return { ...s, done: examSubmitStreamDoneSchema.parse(frame.data) };
    case "error":
      return { ...s, error: gradeExerciseErrorSchema.parse(frame.data) };
    default:
      return s;
  }
}
