import { z } from "zod";

import { exerciseLanguageSchema } from "../exercise-language";

export const cliExerciseExampleSchema = z.object({
  command: z.string(),
  output: z.string(),
});

export const cliExerciseKindSchema = z.enum(["program", "function", "server"]);

export const cliExerciseContentSchema = z.object({
  allowedFunctions: z.array(z.string()),
  assignmentName: z.string(),
  examples: z.array(cliExerciseExampleSchema),
  expectedFiles: z.array(z.string()).min(1),
  instructions: z.string(),
  kind: cliExerciseKindSchema,
  language: exerciseLanguageSchema,
  slug: z.string(),
});

export type CliExerciseKind = z.infer<typeof cliExerciseKindSchema>;
export type CliExerciseContent = z.infer<typeof cliExerciseContentSchema>;
