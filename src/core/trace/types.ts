import type { CompileFailureKind, CompileResult, GradeExerciseResult, GradeTestResult } from "@grademe/contracts";

import type { TestVerdict } from "./test-verdict";

export interface TraceMeta {
  attempt: number;
  cliVersion: string;
  examSlug: string;
  exerciseSlug: string;
  exerciseTitle: string;
  gradedAt: Date;
  level: number;
}

export interface TraceInput {
  meta: TraceMeta;
  result: GradeExerciseResult;
}

export interface TraceTest {
  index: number;
  test: GradeTestResult;
  verdict: TestVerdict;
}

export interface TraceModel {
  compile: CompileResult;
  compileKind: CompileFailureKind | null;
  graderNotes: string | null;
  meta: TraceMeta;
  tests: readonly TraceTest[];
}

export type TraceSection = (model: TraceModel) => string[];
