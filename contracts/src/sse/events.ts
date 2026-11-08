import type { GradeExerciseError } from "../grading/errors";
import type { CompileResult, GradeTestResult } from "../grading/results";

export type SseEventName = "compile" | "test" | "done" | "error";

export interface ParsedSseFrame {
  data: unknown;
  event: string;
}

function stripSsePrefix(line: string, prefixLen: number): string {
  const body = line.slice(prefixLen);
  return body.startsWith(" ") ? body.slice(1) : body;
}

export function parseSseFrame(frame: string): ParsedSseFrame | null {
  let event = "message";
  const dataLines: string[] = [];

  for (const rawLine of frame.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (line.startsWith("event:")) event = stripSsePrefix(line, "event:".length);
    else if (line.startsWith("data:")) dataLines.push(stripSsePrefix(line, "data:".length));
  }

  if (dataLines.length === 0) return null;

  try {
    return { data: JSON.parse(dataLines.join("\n")) as unknown, event };
  } catch {
    return null;
  }
}

export interface CompileSseEvent {
  payload: CompileResult;
  type: "compile";
}

export interface TestSseEvent {
  payload: GradeTestResult;
  type: "test";
}

export interface ErrorSseEvent {
  payload: GradeExerciseError;
  type: "error";
}
