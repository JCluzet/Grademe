import { z } from "zod";

export const exerciseLanguageSchema = z.enum(["c", "cpp", "javascript", "python"]);

export type ExerciseLanguage = z.infer<typeof exerciseLanguageSchema>;
