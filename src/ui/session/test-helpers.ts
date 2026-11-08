import type {
  CompileResult,
  ExamSubmitStreamDone,
  ParsedSseFrame,
} from "@grademe/contracts";

import type { ExamSubmitRun } from "../hooks/useGradingRun";

export function doneFrame(done: ExamSubmitStreamDone): ParsedSseFrame {
  return { data: done, event: "done" };
}

export function compileFrame(compile: CompileResult): ParsedSseFrame {
  return { data: compile, event: "compile" };
}

export function runOf(frames: ParsedSseFrame[]): ExamSubmitRun {
  async function* gen(): AsyncGenerator<ParsedSseFrame> {
    for (const frame of frames) {
      await Promise.resolve();
      yield frame;
    }
  }
  return { frames: gen() };
}
