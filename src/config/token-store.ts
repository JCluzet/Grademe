import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { chmod, lstat, mkdir, open, rename, rm } from "node:fs/promises";
import { join } from "node:path";

import { z } from "zod";

import { CliError, EXIT } from "../errors";

export interface Creds {
  apiUrl: string;
  email?: string;
  token: string;
}

export interface TokenStore {
  clear(): Promise<void>;
  load(): Promise<Creds | null>;
  save(creds: Creds): Promise<void>;
}

const credsSchema = z.object({
  apiUrl: z.string().min(1),
  email: z.email().optional(),
  token: z.string().min(1),
});

const CREDENTIALS_FILE = "credentials.json";
const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

export class FileTokenStore implements TokenStore {
  private readonly file: string;

  constructor(private readonly dir: string) {
    this.file = join(dir, CREDENTIALS_FILE);
  }

  async load(): Promise<Creds | null> {
    let raw: string;
    try {
      const file = await open(this.file, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const stats = await file.stat();
        if (!stats.isFile()) return null;
        raw = await file.readFile("utf8");
      } finally {
        await file.close();
      }
    } catch {
      return null;
    }
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return null;
    }
    const result = credsSchema.safeParse(parsedJson);
    if (!result.success) return null;
    const { apiUrl, email, token } = result.data;
    return email === undefined ? { apiUrl, token } : { apiUrl, email, token };
  }

  async save(creds: Creds): Promise<void> {
    await mkdir(this.dir, { mode: DIR_MODE, recursive: true });
    const dirStats = await lstat(this.dir);
    if (!dirStats.isDirectory() || dirStats.isSymbolicLink()) {
      throw new CliError(
        `Refusing to store credentials in a symlinked path: ${this.dir}`,
        EXIT.USER,
      );
    }
    await chmod(this.dir, DIR_MODE);

    const tempFile = join(
      this.dir,
      `.${CREDENTIALS_FILE}.${randomBytes(8).toString("hex")}.tmp`,
    );
    try {
      const file = await open(
        tempFile,
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW,
        FILE_MODE,
      );
      try {
        await file.writeFile(`${JSON.stringify(creds, null, 2)}\n`, "utf8");
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(tempFile, this.file);
      await chmod(this.file, FILE_MODE);
    } finally {
      await rm(tempFile, { force: true });
    }
  }

  async clear(): Promise<void> {
    await rm(this.file, { force: true });
  }
}
