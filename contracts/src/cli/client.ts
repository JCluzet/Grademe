import { z } from "zod";

export const CLI_VERSION_HEADER = "x-grademe-cli-version";

export const cliVersionSchema = z
  .string()
  .max(64)
  .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);

export type CliVersion = z.infer<typeof cliVersionSchema>;
