import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runLogoutCommand } from "./logout";
import { configDir } from "../config/paths";
import { FileTokenStore } from "../config/token-store";

const ISSUER = "https://issuer.example.test";
const TOKEN = "test-only-bearer";
const stdout = vi.fn<typeof process.stdout.write>(() => true);
const stderr = vi.fn<typeof process.stderr.write>(() => true);

describe("logout credential destination", () => {
  let directory: string;
  let store: FileTokenStore;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "grademe-logout-test-"));
    vi.stubEnv("XDG_CONFIG_HOME", directory);
    vi.stubEnv("APPDATA", directory);
    vi.stubEnv("GRADEME_API_URL", "https://untrusted.example.test");
    store = new FileTokenStore(configDir());
    await store.save({ apiUrl: ISSUER, token: TOKEN });
    stdout.mockClear();
    stderr.mockClear();
    vi.spyOn(process.stdout, "write").mockImplementation(stdout);
    vi.spyOn(process.stderr, "write").mockImplementation(stderr);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  });

  it.each([ISSUER, "http://localhost:3000", "https://dev.example.test/api-prefix/"])(
    "revokes only at the stored issuer %s despite an environment override",
    async (apiUrl) => {
      await store.save({ apiUrl, token: TOKEN });
      const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
      vi.stubGlobal("fetch", transport);

      expect(await runLogoutCommand()).toBe(0);

      expect(transport).toHaveBeenCalledExactlyOnceWith(
        `${apiUrl.replace(/\/$/, "")}/api/cli/v1/auth/revoke`,
        expect.objectContaining({ redirect: "error" }),
      );
      expect(transport.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
      expect(new Headers(transport.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${TOKEN}`);
      expect(await store.load()).toBeNull();
      expect(stdout).toHaveBeenCalledWith("Logged out\n");
    },
  );

  it.each(["network", "http", "invalid-issuer"])("reports unconfirmed revocation on %s failure", async (failure) => {
    if (failure === "invalid-issuer") await store.save({ apiUrl: "not a URL", token: TOKEN });
    const transport = vi.fn<typeof fetch>();
    if (failure === "http") transport.mockResolvedValue(new Response(null, { status: 503 }));
    else transport.mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", transport);

    expect(await runLogoutCommand()).toBe(0);

    expect(await store.load()).toBeNull();
    expect(stdout).not.toHaveBeenCalledWith("Logged out\n");
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("Server revocation could not be confirmed"));
    if (failure === "invalid-issuer") expect(transport).not.toHaveBeenCalled();
  });

  it("does not call any server when no credentials are stored", async () => {
    await store.clear();
    const transport = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", transport);
    expect(await runLogoutCommand()).toBe(0);
    expect(transport).not.toHaveBeenCalled();
  });
});
