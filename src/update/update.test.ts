import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, readlink, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readInstallation, type Installation } from "./installation";
import { isNewerRelease, readChecksum, validateReleaseUrl } from "./release";
import { rollbackInstallation, updateInstallation } from "./update";

const run = promisify(execFile);
let directory: string;
let server: Server;
let installation: Installation;
let body: Buffer;
let checksum: string;
let candidate: string;
let requests: string[];

beforeEach(async () => {
  directory = await realpath(await mkdtemp(join(tmpdir(), "grademe-updater-test-")));
  requests = [];
  candidate = "1.1.0";
  body = gzipSync("#!/bin/sh\nprintf 'grademe 1.1.0\\n'\n");
  checksum = createHash("sha256").update(body).digest("hex");
  server = createServer((request, response) => {
    requests.push(request.url ?? "");
    if (request.url === "/latest.txt") response.end(candidate);
    else if (request.url?.endsWith("/checksums.txt")) response.end(`${checksum}  grademe-darwin-arm64.gz\n`);
    else response.end(body);
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP port");
  const current = join(directory, "versions/1.0.0-original/grademe");
  await mkdir(join(directory, "versions/1.0.0-original"), { recursive: true });
  await mkdir(join(directory, "bin"));
  await writeFile(current, "#!/bin/sh\nprintf 'grademe 1.0.0\\n'\n");
  await chmod(current, 0o755);
  const command = join(directory, "bin/grademe");
  await symlink(current, command);
  installation = { dataDir: directory, command, current, target: "darwin-arm64", baseUrl: `http://127.0.0.1:${String(address.port)}` };
  await writeFile(join(directory, "installation.json"), JSON.stringify({
    format: 1, installDir: join(directory, "bin"), target: installation.target, baseUrl: installation.baseUrl,
  }));
});

afterEach(async () => {
  await new Promise<void>((done, reject) => server.close((error) => { if (error) reject(error); else done(); }));
  await rm(directory, { recursive: true, force: true });
});

describe("native update transaction", () => {
  it("recognizes managed installs, updates the next launch, and rolls back without deleting either executable", async () => {
    expect(await readInstallation(installation.current)).toMatchObject(installation);
    await updateInstallation(installation, "1.0.0");
    const updated = await readlink(installation.command);
    expect(updated).not.toBe(installation.current);
    expect(await readInstallation(installation.current)).toBeNull();
    expect(await readInstallation(updated)).not.toBeNull();
    expect((await run(installation.command, ["--version"])).stdout.trim()).toBe("grademe 1.1.0");
    expect((await run(installation.current, ["--version"])).stdout.trim()).toBe("grademe 1.0.0");
    await rollbackInstallation({ ...installation, current: updated });
    expect(await readlink(installation.command)).toBe(installation.current);
    expect(await readFile(join(directory, "auto-update-paused"), "utf8")).toContain("Rollback");
    await updateInstallation(installation, "1.0.0");
    expect((await run(installation.command, ["--version"])).stdout.trim()).toBe("grademe 1.1.0");
  });

  it("rejects a tampered archive before running it, leaving the previous command and lock usable", async () => {
    checksum = "0".repeat(64);
    await expect(updateInstallation(installation, "1.0.0")).rejects.toThrow("Checksum mismatch");
    expect(await readlink(installation.command)).toBe(installation.current);
    await expect(readFile(join(directory, ".install-lock"))).rejects.toThrow();
  });

  it("preserves the old executable if the candidate fails its startup check", async () => {
    body = gzipSync("#!/bin/sh\nexit 1\n");
    checksum = createHash("sha256").update(body).digest("hex");
    await expect(updateInstallation(installation, "1.0.0")).rejects.toThrow();
    expect(await readlink(installation.command)).toBe(installation.current);
  });

  it("does not downgrade, and checks no artifacts when the installed version is current", async () => {
    await updateInstallation(installation, "2.0.0");
    expect(requests).toEqual(["/latest.txt"]);
    expect(await readlink(installation.command)).toBe(installation.current);
  });

  it("honors the same lock as the shell installer", async () => {
    await mkdir(join(directory, ".install-lock"));
    expect(await updateInstallation(installation, "1.0.0")).toContain("already running");
    expect(requests).toEqual([]);
  });

  it("rechecks a rollback pause inside the update lock and resumes only on a manual check", async () => {
    const pauseFile = join(directory, "auto-update-paused");
    await writeFile(pauseFile, "paused");
    expect(await updateInstallation(installation, "1.0.0", true)).toContain("paused");
    expect(requests).toEqual([]);
    candidate = "1.0.0";
    await updateInstallation(installation, "1.0.0");
    await expect(readFile(pauseFile)).rejects.toThrow();
  });

  it("rejects path traversal from the release server", async () => {
    candidate = "../../malicious";
    await expect(updateInstallation(installation, "1.0.0")).rejects.toThrow();
    expect(requests).toEqual(["/latest.txt"]);
  });

  it("refuses a command replaced by another process during the download", async () => {
    installation.current = join(directory, "versions/something-else/grademe");
    await expect(updateInstallation(installation, "1.0.0")).rejects.toThrow("changed during");
    expect((await run(installation.command, ["--version"])).stdout.trim()).toBe("grademe 1.0.0");
  });
});

describe("release validation", () => {
  it.each([
    ["1.10.0", "1.9.0", true], ["1.0.0", "1.0.0-preview.5.1", true],
    ["1.0.0-preview.6.1", "1.0.0-preview.5.2", true],
    ["1.0.0-preview.5.1", "1.0.0", false], ["1.0.0", "1.0.0", false],
  ])("compares %s against %s", (next, current, expected) => {
    expect(isNewerRelease(next, current)).toBe(expected);
  });
  it("rejects duplicate checksum entries", () => {
    expect(() => readChecksum(`${checksum}  asset\n${checksum}  asset`, "asset")).toThrow();
  });
  it.each(["http://evil.example/releases", "https://name:password@example.com", "http://localhost@evil.example"])("rejects %s", (url) => {
    expect(() => validateReleaseUrl(url)).toThrow();
  });
});
