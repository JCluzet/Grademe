import { z } from "zod";

export type MemoryErrorKind = "leak" | "uninitialised" | "invalid-access" | "other";

export const memoryErrorKindSchema = z.enum([
  "leak",
  "uninitialised",
  "invalid-access",
  "other",
]) satisfies z.ZodType<MemoryErrorKind>;

export const memorySchema = z.object({
  detail: z.string(),
  kind: memoryErrorKindSchema,
});
