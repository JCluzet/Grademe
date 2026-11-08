import { CliError, EXIT } from "../errors";

export function friendlyError(error: unknown): string {
  if (error instanceof CliError) {
    if (error.exitCode === EXIT.AUTH) {
      return "Your session expired. Run `grademe login`, then start again.";
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
