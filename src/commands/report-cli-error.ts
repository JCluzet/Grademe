import { CliError } from "../errors";

export function reportCliError(error: unknown): number | null {
  if (!(error instanceof CliError)) return null;
  process.stderr.write(`${error.message}\n`);
  return error.exitCode;
}
