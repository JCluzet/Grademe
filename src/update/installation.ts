import { lstat, mkdir, mkdtemp, readFile, readlink, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { installMetadataSchema, validateReleaseUrl } from "./release";

export interface Installation {
  baseUrl: string;
  dataDir: string;
  command: string;
  current: string;
  target: string;
}

export function isManagedTarget(dataDir: string, target: string): boolean {
  return isAbsolute(target) && dirname(dirname(target)) === join(dataDir, "versions") &&
    target.endsWith("/grademe");
}

export async function readInstallation(executable: string): Promise<Installation | null> {
  const current = await realpath(executable);
  const dataDir = dirname(dirname(dirname(current)));
  if (!isManagedTarget(dataDir, current)) return null;
  const metadataFile = join(dataDir, "installation.json");
  const stat = await lstat(metadataFile).catch(() => null);
  if (!stat?.isFile() || stat.size > 8192) return null;
  const metadata = installMetadataSchema.parse(JSON.parse(await readFile(metadataFile, "utf8")));
  validateReleaseUrl(metadata.baseUrl);
  if (!isAbsolute(metadata.installDir) || resolve(metadata.installDir) !== metadata.installDir) {
    throw new Error("Invalid installation directory.");
  }
  const command = join(metadata.installDir, metadata.commandName);
  const linked = await readlink(command);
  if (!isManagedTarget(dataDir, linked)) throw new Error("Refusing to replace an unmanaged command.");
  if (linked !== current) return null;
  return { ...metadata, command, current: linked, dataDir };
}

export async function replaceCommand(installation: Installation, target: string): Promise<void> {
  if (!isManagedTarget(installation.dataDir, target)) throw new Error("Invalid update target.");
  if (await readlink(installation.command) !== installation.current) {
    throw new Error("The installed command changed during this update. Please retry.");
  }
  const stage = await mkdtemp(join(dirname(installation.command), ".grademe-link."));
  try {
    await symlink(target, join(stage, "grademe"));
    await rename(join(stage, "grademe"), installation.command);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

export async function lockInstallation(dataDir: string): Promise<(() => Promise<void>) | null> {
  const lock = join(dataDir, ".install-lock");
  try { await mkdir(lock, { mode: 0o700 }); }
  catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") return null;
    throw error;
  }
  return () => rm(lock, { recursive: true, force: true });
}

export async function writeState(dataDir: string, name: string, value: string): Promise<void> {
  const stage = await mkdtemp(join(dataDir, ".state."));
  try {
    await writeFile(join(stage, "value"), value, { mode: 0o600, flag: "wx" });
    await rename(join(stage, "value"), join(dataDir, name));
  } finally { await rm(stage, { recursive: true, force: true }); }
}
