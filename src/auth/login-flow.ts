import type { CliAuthTokenResponse } from "@grademe/contracts";

import type { Loopback, LoopbackOptions } from "./loopback-server";
import type { Creds } from "../config/token-store";
import { challengeFromVerifier, genCodeVerifier, genState } from "../core/pkce";

const LOGIN_TIMEOUT_MS = 300_000;

export interface LoginApi {
  exchangeToken(code: string, verifier: string): Promise<CliAuthTokenResponse>;
}

export interface LoginStore {
  save(creds: Creds): Promise<void>;
}

export interface CancellablePaste {
  cancel: () => void;
  promise: Promise<string>;
}

export interface LoginDeps {
  api: LoginApi;
  apiUrl: string;
  openBrowser: (url: string) => boolean;
  promptPaste: () => CancellablePaste;
  startLoopback: (options: LoopbackOptions) => Promise<Loopback>;
  store: LoginStore;
}

export interface LoginResult {
  email?: string;
}

export async function runLogin(deps: LoginDeps): Promise<LoginResult> {
  const verifier = genCodeVerifier();
  const challenge = challengeFromVerifier(verifier);
  const state = genState();

  const { port, wait, close } = await deps.startLoopback({ state, timeoutMs: LOGIN_TIMEOUT_MS });
  let paste: CancellablePaste | undefined;
  try {
    const redirectUri = `http://127.0.0.1:${String(port)}/callback`;
    const url =
      `${deps.apiUrl}/auth/cli?code_challenge=${challenge}` +
      `&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    deps.openBrowser(url);
    paste = deps.promptPaste();

    const code = await Promise.race([wait, paste.promise]);
    const { token, user } = await deps.api.exchangeToken(code, verifier);

    const creds: Creds =
      user.email === undefined
        ? { apiUrl: deps.apiUrl, token }
        : { apiUrl: deps.apiUrl, email: user.email, token };
    await deps.store.save(creds);

    return user.email === undefined ? {} : { email: user.email };
  } finally {
    close();
    paste?.cancel();
  }
}
