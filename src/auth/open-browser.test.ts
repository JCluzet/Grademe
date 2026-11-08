import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { release } from "node:os";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { openBrowser } from "./open-browser";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));
vi.mock("node:os", () => ({ release: vi.fn(() => "6.8.0-generic") }));

const spawnMock = vi.mocked(spawn);
const SITE_URL = "https://grademe.io";

function childProcessStub(): never {
  return {
    on: vi.fn(),
    unref: vi.fn(),
  } as never;
}

describe("openBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("WSL_INTEROP", "");
    vi.stubEnv("WSL_DISTRO_NAME", "");
    vi.mocked(release).mockReturnValue("6.8.0-generic");
    spawnMock.mockReturnValue(childProcessStub());
  });
  afterEach(() => vi.unstubAllEnvs());

  it("opens Windows URLs without passing through cmd.exe", () => {
    spawnMock.mockReturnValue(childProcessStub());
    const url = "https://grademe.io/auth/cli?code=a&state=b";

    expect(openBrowser(url, "win32")).toBe(true);
    expect(spawnMock).toHaveBeenCalledWith(
      "rundll32.exe",
      ["url.dll,FileProtocolHandler", url],
      { detached: true, stdio: "ignore" },
    );
  });

  it.each([
    ["darwin", "open"],
    ["linux", "xdg-open"],
  ] as const)("preserves the native %s opener", (platform, command) => {
    expect(openBrowser(SITE_URL, platform)).toBe(true);
    expect(spawnMock).toHaveBeenCalledWith(command, [SITE_URL], { detached: true, stdio: "ignore" });
  });

  it.each(["WSL_INTEROP", "WSL_DISTRO_NAME"])("uses the Windows browser when %s identifies WSL", (key) => {
    vi.stubEnv(key, "present");
    const url = "https://grademe.io/auth/cli?state=a&redirect_uri=http%3A%2F%2F127.0.0.1%3A51234%2Fcallback";
    openBrowser(url, "linux");
    expect(spawnMock).toHaveBeenCalledWith("rundll32.exe", ["url.dll,FileProtocolHandler", url], { detached: true, stdio: "ignore" });
  });

  it.each(["4.4.0-19041-Microsoft", "5.15.167.4-microsoft-standard-WSL2"])("detects WSL from kernel %s without environment markers", (kernel) => {
    vi.mocked(release).mockReturnValue(kernel);
    openBrowser(SITE_URL, "linux");
    expect(spawnMock.mock.calls[0]?.[0]).toBe("rundll32.exe");
  });

  it("does not let inherited WSL markers change the macOS opener", () => {
    vi.stubEnv("WSL_DISTRO_NAME", "Ubuntu");
    openBrowser(SITE_URL, "darwin");
    expect(spawnMock.mock.calls[0]?.[0]).toBe("open");
  });

  it("leaves manual login available when spawning throws", () => {
    spawnMock.mockImplementationOnce(() => { throw new Error("permission denied"); });
    expect(openBrowser(SITE_URL, "linux")).toBe(false);
  });

  it("handles a missing opener asynchronously without an uncaught error", () => {
    const child = Object.assign(new EventEmitter(), { unref: vi.fn() });
    spawnMock.mockReturnValueOnce(child as never);
    openBrowser(SITE_URL, "linux");
    expect(() => child.emit("error", new Error("ENOENT"))).not.toThrow();
    expect(child.unref).toHaveBeenCalledOnce();
  });
});
