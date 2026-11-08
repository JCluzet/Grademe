import { createInterface } from "node:readline";

import { GrademeApi } from "../api/client";
import type { ParsedArgs } from "../args";
import { runLogin, type CancellablePaste, type LoginResult } from "../auth/login-flow";
import { startLoopback } from "../auth/loopback-server";
import { openBrowser } from "../auth/open-browser";
import { configDir, resolveApiUrl } from "../config/paths";
import { FileTokenStore } from "../config/token-store";
import { EXIT } from "../errors";
import { createLoginOutput } from "./login-output";
import { reportCliError } from "./report-cli-error";

export function promptPasteFromStdin(): CancellablePaste {
  let settle: (code: string) => void = () => undefined;
  let answered = false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const promise = new Promise<string>((resolve) => {
    settle = resolve;
    rl.question(createLoginOutput(process.stdout).prompt, (answer) => {
      answered = true;
      rl.close();
      resolve(answer.trim());
    });
  });

  const cancel = (): void => {
    rl.close();
    if (!answered) {
      answered = true;
      process.stdout.write("\n");
    }
    settle("");
  };

  return { cancel, promise };
}

export async function runLoginCommand(args: ParsedArgs): Promise<number> {
  const apiUrl = resolveApiUrl(args.api);
  const store = new FileTokenStore(configDir());
  try {
    await runBrowserLogin(apiUrl, store);
    return EXIT.OK;
  } catch (error) {
    const exitCode = reportCliError(error);
    if (exitCode !== null) return exitCode;
    throw error;
  }
}

export async function runBrowserLogin(apiUrl: string, store: FileTokenStore): Promise<LoginResult> {
  const api = new GrademeApi({ baseUrl: apiUrl, fetch: (input, init) => fetch(input, init) });
  const output = createLoginOutput(process.stdout);
  output.intro();
  const result = await runLogin({
    apiUrl,
    api,
    openBrowser: (url) => {
      output.browser(url);
      return openBrowser(url);
    },
    promptPaste: promptPasteFromStdin,
    startLoopback,
    store,
  });
  output.success(result.email);
  return result;
}
