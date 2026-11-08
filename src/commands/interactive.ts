import { render } from "ink";
import { createElement } from "react";

import { runBrowserLogin } from "./login";
import { GrademeApi } from "../api/client";
import type { ParsedArgs } from "../args";
import { confirmLogin } from "../auth/login-confirmation";
import { assertCredentialIssuer, configDir, resolveApiUrl } from "../config/paths";
import { FileTokenStore, type Creds } from "../config/token-store";
import { CliError, EXIT } from "../errors";
import { reportCliError } from "./report-cli-error";
import {
  clearSubmissionExcept,
  ensureWritableDir,
  materializeLevel,
  normalizeWorkspaceDir,
  readSubmission,
  writeTrace,
} from "../fs/workspace";
import { enterAltScreen } from "../ui/alt-screen";
import { App, type AppFs, type ExitReason } from "../ui/App";

const DISCONNECT_MESSAGE = "You have been disconnected after using Ctrl+C\n";

export async function runInteractive(args: ParsedArgs, version: string): Promise<number> {
  const store = new FileTokenStore(configDir());
  const stored = await store.load();
  const apiUrl = resolveApiUrl(args.api, stored?.apiUrl);

  try {
    const creds = await ensureCreds(stored, apiUrl, store);

    const dirExplicit = args.dir !== undefined;
    const initialDir = normalizeWorkspaceDir(args.dir ?? process.cwd());
    if (dirExplicit) {
      await ensureWritableDir(initialDir);
    }

    const api = new GrademeApi({
      baseUrl: apiUrl,
      fetch: (input, init) => fetch(input, init),
      token: creds.token,
    });

    const fs: AppFs = {
      clearSubmissionExcept,
      materializeLevel,
      readSubmission,
      writeTrace,
    };

    const username = creds.email ?? "student";

    const altScreen = enterAltScreen(process.stdout);
    const exit: { reason: ExitReason } = { reason: "normal" };
    const instance = render(
      createElement(App, {
        api,
        dirExplicit,
        fs,
        initialDir,
        ...(args.challenge === undefined ? {} : { initialChallenge: args.challenge }),
        onExit: (reason) => {
          exit.reason = reason;
        },
        username,
        version,
      }),
      { exitOnCtrlC: false },
    );
    await instance.waitUntilExit();
    altScreen.leave();
    if (exit.reason === "ctrl-c") {
      process.stdout.write(DISCONNECT_MESSAGE);
    }
    return EXIT.OK;
  } catch (error) {
    const exitCode = reportCliError(error);
    if (exitCode !== null) return exitCode;
    throw error;
  }
}

async function ensureCreds(
  existing: Creds | null,
  apiUrl: string,
  store: FileTokenStore,
): Promise<Creds> {
  if (existing !== null) {
    assertCredentialIssuer(existing.apiUrl, apiUrl);
    return existing;
  }

  await confirmLogin();
  await runBrowserLogin(apiUrl, store);

  const creds = await store.load();
  if (creds === null) {
    throw new CliError("Login did not persist a token. Please run `grademe login`.", EXIT.AUTH);
  }
  return creds;
}
