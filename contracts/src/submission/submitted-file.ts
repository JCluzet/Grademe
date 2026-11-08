import { z } from "zod";

import { isSafeExerciseFilePath } from "./file-path";
import { isWithinSubmittedFileContentLimit, MAX_SUBMITTED_FILE_CONTENT_LENGTH } from "./limits";

export interface SubmittedFile {
  content: string;
  path: string;
}

export const submittedFileSchema = z.object({
  content: z
    .string()
    .refine(
      isWithinSubmittedFileContentLimit,
      `Submitted file content must be at most ${String(MAX_SUBMITTED_FILE_CONTENT_LENGTH)} characters.`,
    ),
  path: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .refine(isSafeExerciseFilePath, "Submitted file paths must be flat .c, .h, .py, or .js file names."),
}) satisfies z.ZodType<SubmittedFile>;
