import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import { readInstallation, writeState } from "./installation";
import { rollbackInstallation, updateInstallation } from "./update";

function reportError(error: unknown, quiet: boolean): void {
  if (!quiet) process.stderr.write(`${error instanceof Error ? error.message : "Update failed."}\n`);
}

export async function runUpdateCommand(command: "update" | "rollback" | "_update", version: string): Promise<number> {
  try {
    const installation = await readInstallation(process.execPath);
    if (!installation) {
      if (command !== "_update") process.stderr.write("This installation is managed from source or a package manager. Update it using the same method.\n");
      return command === "_update" ? 0 : 1;
    }
    if (command === "_update" && await stat(join(installation.dataDir, "auto-update-paused")).catch(() => null)) return 0;
    const message = command === "rollback"
      ? await rollbackInstallation(installation)
      : await updateInstallation(installation, version, command === "_update");
    if (command !== "_update") process.stdout.write(`${message}\n`);
    return 0;
  } catch (error) {
    reportError(error, command === "_update");
    return 1;
  }
}

export async function startBackgroundUpdate(): Promise<void> {
  if (process.env["GRADEME_NO_AUTO_UPDATE"] === "1") return;
  await scheduleBackgroundUpdate().catch(() => undefined);
}

async function scheduleBackgroundUpdate(): Promise<void> {
  const installation = await readInstallation(process.execPath);
  if (!installation || await stat(join(installation.dataDir, "auto-update-paused")).catch(() => null)) return;
  const last = Number(await readFile(join(installation.dataDir, "last-update-check.txt"), "utf8").catch(() => "0"));
  if (Number.isFinite(last) && Date.now() - last < 6 * 60 * 60 * 1000) return;
  await writeState(installation.dataDir, "last-update-check.txt", String(Date.now()));
  const child = spawn(process.execPath, ["_update"], { detached: true, stdio: "ignore", cwd: installation.dataDir });
  child.on("error", () => undefined);
  child.unref();
}
