import type { CliExerciseContent, GradeExerciseResult } from "@grademe/contracts";

import type { WriteTraceArgs } from "./ExamWorkspace";
import { buildTraceModel, failureHeadline, renderTrace } from "../../core/trace/build-trace";
import { CLI_VERSION } from "../../version";
import type { GradingRunOutcome } from "../hooks/useGradingRun";

export interface FailureTraceContext {
  attempt: number;
  examSlug: string;
  exercise: CliExerciseContent;
  level: number;
  now: Date;
}

export interface FailureTrace {
  headline: string;
  writeArgs: WriteTraceArgs;
}

const FALLBACK_HEADLINE = "trace unavailable";

export function buildFailureTrace(result: GradeExerciseResult, ctx: FailureTraceContext): FailureTrace {
  const target = { attempt: ctx.attempt, exerciseSlug: ctx.exercise.slug, level: ctx.level };
  try {
    const model = buildTraceModel({
      meta: {
        attempt: ctx.attempt,
        cliVersion: CLI_VERSION,
        examSlug: ctx.examSlug,
        exerciseSlug: ctx.exercise.slug,
        exerciseTitle: ctx.exercise.assignmentName,
        gradedAt: ctx.now,
        level: ctx.level,
      },
      result,
    });
    return { headline: failureHeadline(model), writeArgs: { ...target, content: renderTrace(model) } };
  } catch {
    return {
      headline: FALLBACK_HEADLINE,
      writeArgs: {
        ...target,
        content: `Grademe trace\n\nRESULT  KO · ${FALLBACK_HEADLINE}\n\nThe grade failed but the trace could not be rendered. Run grademe again; if this repeats, report it from grademe.io.\n`,
      },
    };
  }
}

export function gradingFailureMessage(outcome: GradingRunOutcome): string {
  if (outcome.error !== null) return outcome.error;
  const progressError = outcome.progress.error;
  if (progressError === null) {
    return "The grading stream ended unexpectedly. Run grademe again.";
  }
  return progressError.message === ""
    ? `The grading server reported an error (${progressError.code}).`
    : progressError.message;
}
