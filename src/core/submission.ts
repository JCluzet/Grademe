import type { SubmittedFile } from "@grademe/contracts";
import {
  isSafeExerciseFilePath,
  MAX_SUBMITTED_FILE_CONTENT_LENGTH,
  MAX_SUBMITTED_FILE_COUNT,
} from "@grademe/contracts";

export type SubmissionValidation = { ok: true } | { ok: false; reason: string };

export function validateSubmission(
  files: SubmittedFile[],
  expected: string[],
): SubmissionValidation {
  if (files.length > MAX_SUBMITTED_FILE_COUNT) {
    return {
      ok: false,
      reason: `Too many files: ${String(files.length)} submitted (max ${String(MAX_SUBMITTED_FILE_COUNT)}).`,
    };
  }

  for (const file of files) {
    if (!isSafeExerciseFilePath(file.path)) {
      return { ok: false, reason: `Unsafe file name: ${file.path}` };
    }
    if (file.content.length > MAX_SUBMITTED_FILE_CONTENT_LENGTH) {
      return {
        ok: false,
        reason: `File too large: ${file.path} (max ${String(MAX_SUBMITTED_FILE_CONTENT_LENGTH)} characters).`,
      };
    }
  }

  const present = new Set(files.map((file) => file.path));
  for (const name of expected) {
    if (!present.has(name)) {
      return { ok: false, reason: `Missing expected file: ${name}` };
    }
  }

  return { ok: true };
}
