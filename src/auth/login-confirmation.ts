import { createInterface } from "node:readline";

import { CliError, EXIT } from "../errors";

export interface LoginConfirmationDeps {
  ask: (question: string) => Promise<void>;
  isInteractive: boolean;
}

const PROMPT = "You need to sign in to use Grademe. Press Enter to continue (Ctrl+C to cancel): ";

const defaultDeps: LoginConfirmationDeps = {
  ask(question) {
    const readline = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      readline.question(question, () => {
        readline.close();
        resolve();
      });
    });
  },
  isInteractive: process.stdin.isTTY,
};

export async function confirmLogin(
  deps: LoginConfirmationDeps = defaultDeps,
): Promise<void> {
  if (!deps.isInteractive) {
    throw new CliError(
      "You need to sign in from an interactive terminal. Run `grademe login` to continue.",
      EXIT.AUTH,
    );
  }
  await deps.ask(PROMPT);
}
