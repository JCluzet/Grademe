import { describe, expect, it, vi, type Mock } from "vitest";

import { CliError, EXIT } from "../errors";
import { runLogin, type CancellablePaste, type LoginDeps } from "./login-flow";
import type { Loopback } from "./loopback-server";

const API_URL = "https://grademe.io";
const EMAIL = "u@example.test";
const TOKEN = "tok";

interface Harness {
  cancel: Mock<() => void>;
  close: Mock<() => void>;
  deps: LoginDeps;
  openBrowser: Mock<(url: string) => boolean>;
  promptPaste: Mock<() => CancellablePaste>;
  save: Mock<LoginDeps["store"]["save"]>;
}

function makeHarness(overrides: {
  exchange?: LoginDeps["api"]["exchangeToken"];
  loopbackWait?: Promise<string>;
  pastePromise?: Promise<string>;
}): Harness {
  const close = vi.fn();
  const cancel = vi.fn();
  const save = vi.fn<LoginDeps["store"]["save"]>(() => Promise.resolve());
  const openBrowser = vi.fn<(url: string) => boolean>(() => true);
  const promptPaste = vi.fn<() => CancellablePaste>(() => ({
    cancel,
    promise: overrides.pastePromise ?? new Promise<string>(() => undefined),
  }));

  const exchange =
    overrides.exchange ??
    vi.fn(() => Promise.resolve({ token: TOKEN, user: { email: EMAIL, id: "u1" } }));

  const startLoopback = vi.fn(
    (): Promise<Loopback> =>
      Promise.resolve({
        close,
        port: 51234,
        wait: overrides.loopbackWait ?? new Promise<string>(() => undefined),
      }),
  );

  const deps: LoginDeps = {
    apiUrl: API_URL,
    api: { exchangeToken: exchange },
    openBrowser: openBrowser,
    promptPaste: promptPaste,
    startLoopback: startLoopback,
    store: { save: save },
  };

  return { cancel, close, deps, openBrowser, promptPaste, save };
}

describe("runLogin", () => {
  it("loopback path: opens the /auth/cli URL, exchanges the code, saves, tears both down", async () => {
    const harness = makeHarness({ loopbackWait: Promise.resolve("code-from-loopback") });

    const result = await runLogin(harness.deps);

    expect(result).toEqual({ email: EMAIL });
    expect(harness.openBrowser).toHaveBeenCalledTimes(1);
    expect(harness.openBrowser.mock.invocationCallOrder[0]).toBeLessThan(harness.promptPaste.mock.invocationCallOrder[0] ?? 0);
    const url = harness.openBrowser.mock.calls[0]?.[0];
    if (url === undefined) throw new Error("Expected the browser URL.");
    expect(url.startsWith(`${API_URL}/auth/cli?`)).toBe(true);
    expect(url).toContain("code_challenge=");
    expect(url).toContain("state=");
    expect(url).toContain(`redirect_uri=${encodeURIComponent("http://127.0.0.1:51234/callback")}`);
    expect(harness.save).toHaveBeenCalledWith({
      apiUrl: API_URL,
      email: EMAIL,
      token: TOKEN,
    });
    expect(harness.close).toHaveBeenCalledTimes(1);
    expect(harness.cancel).toHaveBeenCalledTimes(1);
  });

  it("loopback path: cancels the paste prompt that never settled (no dangling pending)", async () => {
    const harness = makeHarness({ loopbackWait: Promise.resolve("code-from-loopback") });

    await runLogin(harness.deps);

    expect(harness.promptPaste).toHaveBeenCalledTimes(1);
    expect(harness.cancel).toHaveBeenCalledTimes(1);
    expect(harness.close).toHaveBeenCalledTimes(1);
  });

  it("paste path: uses the pasted code when it wins the race, still tears both down", async () => {
    const harness = makeHarness({ pastePromise: Promise.resolve("pasted-code") });

    const result = await runLogin(harness.deps);

    expect(result).toEqual({ email: EMAIL });
    expect(harness.close).toHaveBeenCalledTimes(1);
    expect(harness.cancel).toHaveBeenCalledTimes(1);
  });

  it("still authorizes with a pasted code when no browser can be opened", async () => {
    const exchange = vi.fn(() => Promise.resolve({ token: TOKEN, user: { email: EMAIL, id: "u1" } }));
    const harness = makeHarness({ pastePromise: Promise.resolve("manual-code"), exchange });
    harness.openBrowser.mockReturnValue(false);
    await expect(runLogin(harness.deps)).resolves.toEqual({ email: EMAIL });
    expect(exchange).toHaveBeenCalledWith("manual-code", expect.any(String));
    expect(harness.cancel).toHaveBeenCalledOnce();
    expect(harness.close).toHaveBeenCalledOnce();
  });

  it("omits email from the saved creds when the user has none", async () => {
    const harness = makeHarness({
      loopbackWait: Promise.resolve("c"),
      exchange: vi.fn(() => Promise.resolve({ token: TOKEN, user: { id: "u1" } })),
    });

    const result = await runLogin(harness.deps);

    expect(result).toEqual({});
    expect(harness.save).toHaveBeenCalledWith({ apiUrl: API_URL, token: TOKEN });
    expect(harness.cancel).toHaveBeenCalledTimes(1);
  });

  it("propagates an exchange failure as a CliError and still closes", async () => {
    const harness = makeHarness({
      loopbackWait: Promise.resolve("c"),
      exchange: vi.fn(() => Promise.reject(new CliError("bad code", EXIT.AUTH))),
    });

    const error = await runLogin(harness.deps).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CliError);
    if (error instanceof CliError) expect(error.exitCode).toBe(EXIT.AUTH);
    expect(harness.save).not.toHaveBeenCalled();
    expect(harness.close).toHaveBeenCalledTimes(1);
    expect(harness.cancel).toHaveBeenCalledTimes(1);
  });

  it("closes the loopback if the manual prompt cannot start", async () => {
    const harness = makeHarness({});
    harness.promptPaste.mockImplementation(() => { throw new Error("stdin unavailable"); });
    await expect(runLogin(harness.deps)).rejects.toThrow("stdin unavailable");
    expect(harness.close).toHaveBeenCalledTimes(1);
    expect(harness.save).not.toHaveBeenCalled();
  });
});
