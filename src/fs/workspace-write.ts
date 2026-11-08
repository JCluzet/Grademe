import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, realpath, rename, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { CliError, EXIT } from "../errors";

export async function assertWorkspaceDirectory(path: string, parentReal: string) {
  const stats = await lstat(path);
  if (!stats.isDirectory() || stats.isSymbolicLink() ||
      await realpath(path) !== join(parentReal, basename(path))) {
    throw new CliError(`Refusing to use a symlink or directory outside the workspace: ${path}`, EXIT.USER);
  }
  return stats;
}

export async function writeWorkspaceFile(path: string, workspaceReal: string, content: string): Promise<void> {
  const parent = dirname(path);
  const before = await assertWorkspaceDirectory(parent, workspaceReal);
  const temporary = join(workspaceReal, `.grademe-write-${randomUUID()}.tmp`);
  const file = await open(temporary,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    try {
      await file.writeFile(content, "utf8");
      await file.sync();
    } finally {
      await file.close();
    }
    const after = await assertWorkspaceDirectory(parent, workspaceReal);
    if (before.dev !== after.dev || before.ino !== after.ino) {
      throw new CliError(`Workspace directory changed while writing: ${parent}. Retry in a directory you own.`, EXIT.USER);
    }
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}
