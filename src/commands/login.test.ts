import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseArgs } from "../args";
import { runInteractive } from "./interactive";
import { runLoginCommand } from "./login";
import type { LoginDeps } from "../auth/login-flow";

const harness = vi.hoisted(() => ({
  load: vi.fn(),
  open: vi.fn(),
  confirm: vi.fn(),
  leave: vi.fn(),
  render: vi.fn(() => ({ waitUntilExit: () => Promise.resolve() })),
}));
const URL = "https://grademe.io/auth/cli?code_challenge=test&state=test";

vi.mock("../config/paths", () => ({
  configDir: () => "/unused",
  resolveApiUrl: () => "https://grademe.io",
  assertCredentialIssuer: vi.fn(),
}));
vi.mock("../config/token-store", () => ({
  FileTokenStore: class {
    load = harness.load;
    save = vi.fn();
  },
}));
vi.mock("../api/client", () => ({ GrademeApi: class { exchangeToken = vi.fn(); } }));
vi.mock("../auth/login-confirmation", () => ({ confirmLogin: harness.confirm }));
vi.mock("../auth/open-browser", () => ({ openBrowser: harness.open }));
vi.mock("../auth/login-flow", () => ({
  runLogin: (deps: LoginDeps) => {
    deps.openBrowser("https://grademe.io/auth/cli?code_challenge=test&state=test");
    return Promise.resolve({ email: "you@example.test" });
  },
}));
vi.mock("../ui/alt-screen", () => ({ enterAltScreen: () => ({ leave: harness.leave }) }));
vi.mock("../ui/App", () => ({ App: () => null }));
vi.mock("ink", () => ({ render: harness.render }));

describe("login entrypoints", () => {
  let transcript: string;

  beforeEach(() => {
    vi.clearAllMocks();
    transcript = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      transcript += String(chunk);
      return true;
    });
    harness.load.mockReset();
    harness.load.mockResolvedValueOnce(null).mockResolvedValue({
      apiUrl: "https://grademe.io", email: "you@example.test", token: "test-token",
    });
    harness.open.mockImplementation(() => {
      expect(transcript).toContain(URL);
      return false;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(["interactive", "login"])("prints the fallback before trying the browser for %s", async (entrypoint) => {
    const args = parseArgs(entrypoint === "login" ? ["login"] : []);
    const result = entrypoint === "login"
      ? await runLoginCommand(args)
      : await runInteractive(args, "0.1.0");
    expect(result).toBe(0);
    expect(harness.open).toHaveBeenCalledExactlyOnceWith(URL);
    expect(transcript).toContain("Grademe CLI");
    expect(transcript).toContain("Browser didn't open? Open or copy this link:");
    expect(transcript).toContain("Keep this terminal open while you sign in.");
    expect(transcript).toContain("Logged in as you@example.test");
    if (entrypoint === "interactive") {
      expect(harness.confirm).toHaveBeenCalledOnce();
      expect(harness.render).toHaveBeenCalledOnce();
      expect(harness.leave).toHaveBeenCalledOnce();
    }
  });

  it("does not print login instructions for an already connected user", async () => {
    harness.load.mockReset().mockResolvedValue({
      apiUrl: "https://grademe.io", email: "you@example.test", token: "test-token",
    });
    expect(await runInteractive(parseArgs([]), "0.1.0")).toBe(0);
    expect(harness.open).not.toHaveBeenCalled();
    expect(harness.confirm).not.toHaveBeenCalled();
    expect(transcript).toBe("");
  });
});
