import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { downloadExecutable, downloadText } from "./download";
import { isManagedTarget, lockInstallation, replaceCommand, writeState, type Installation } from "./installation";
import { isNewerRelease, readChecksum, releaseVersionSchema } from "./release";

const run = promisify(execFile);

export async function verifyExecutable(executable: string, version: string): Promise<void> {
  const result = await run(executable, ["--version"], { timeout: 10_000, maxBuffer: 8192 });
  if (result.stdout.trim() !== `grademe ${version}`) throw new Error("The downloaded executable failed its startup check.");
  await run(executable, ["--help"], { timeout: 10_000, maxBuffer: 64 * 1024 });
}

export async function updateInstallation(installation: Installation, currentVersion: string, automatic = false): Promise<string> {
  const releaseLock = await lockInstallation(installation.dataDir);
  if (!releaseLock) return "Another installation or update is already running.";
  let stage: string | undefined;
  try {
    const pauseFile = join(installation.dataDir, "auto-update-paused");
    if (automatic && await stat(pauseFile).catch(() => null)) return "Automatic updates are paused.";
    const signal = AbortSignal.timeout(120_000);
    const base = installation.baseUrl.replace(/\/$/, "");
    const version = releaseVersionSchema.parse((await downloadText(`${base}/latest.txt`, signal)).trim());
    if (!isNewerRelease(version, currentVersion)) {
      if (!automatic) await rm(pauseFile, { force: true });
      return `Grademe ${currentVersion} is up to date.`;
    }
    const asset = `grademe-${installation.target}.gz`;
    const checksum = readChecksum(await downloadText(`${base}/${version}/checksums.txt`, signal), asset);
    stage = await mkdtemp(join(installation.dataDir, ".update."));
    const executable = join(stage, "grademe");
    await downloadExecutable(`${base}/${version}/${asset}`, executable, checksum, signal);
    await chmod(executable, 0o755);
    await verifyExecutable(executable, version);
    const directory = await mkdtemp(join(installation.dataDir, "versions", `${version}-${checksum.slice(0, 12)}.`));
    await rename(executable, join(directory, "grademe"));
    await writeState(installation.dataDir, "previous.txt", installation.current);
    await replaceCommand(installation, join(directory, "grademe"));
    await rm(join(installation.dataDir, "auto-update-paused"), { force: true });
    return `Updated to Grademe ${version}. Your next launch will use it.`;
  } finally {
    if (stage) await rm(stage, { recursive: true, force: true });
    await releaseLock();
  }
}

export async function rollbackInstallation(installation: Installation): Promise<string> {
  const releaseLock = await lockInstallation(installation.dataDir);
  if (!releaseLock) return "Another installation or update is already running.";
  try {
    const previous = await readFile(join(installation.dataDir, "previous.txt"), "utf8");
    if (!isManagedTarget(installation.dataDir, previous) || previous === installation.current) {
      throw new Error("No previous managed version is available.");
    }
    await run(previous, ["--help"], { timeout: 10_000, maxBuffer: 64 * 1024 });
    await writeState(installation.dataDir, "auto-update-paused", "Rollback requested. Run grademe update to resume.\n");
    await replaceCommand(installation, previous);
    return "Previous version restored. Automatic updates are paused; run grademe update to resume them.";
  } finally { await releaseLock(); }
}
