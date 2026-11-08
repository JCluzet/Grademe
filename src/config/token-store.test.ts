import { mkdtemp, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { FileTokenStore, type Creds } from "./token-store";

const creds: Creds = {
  apiUrl: "https://grademe.io",
  email: "user@example.test",
  token: "secret-token",
};
const CREDENTIALS_FILE = "credentials.json";

describe("FileTokenStore", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "grademe-store-"));
  });

  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it("returns null before anything is saved", async () => {
    const store = new FileTokenStore(join(dir, "nested", "config"));
    await expect(store.load()).resolves.toBeNull();
  });

  it("round-trips save then load", async () => {
    const store = new FileTokenStore(join(dir, "config"));
    await store.save(creds);
    await expect(store.load()).resolves.toEqual(creds);
  });

  it("omits email when absent on save and load", async () => {
    const store = new FileTokenStore(join(dir, "config"));
    const noEmail: Creds = { apiUrl: "https://grademe.io", token: "t" };
    await store.save(noEmail);
    await expect(store.load()).resolves.toEqual(noEmail);
  });

  it("clear removes the credentials and load returns null", async () => {
    const store = new FileTokenStore(join(dir, "config"));
    await store.save(creds);
    await store.clear();
    await expect(store.load()).resolves.toBeNull();
  });

  it("clear is a no-op when nothing exists", async () => {
    const store = new FileTokenStore(join(dir, "config"));
    await expect(store.clear()).resolves.toBeUndefined();
  });

  it("returns null when the stored file is corrupt", async () => {
    const store = new FileTokenStore(join(dir, "config"));
    await store.save(creds);
    await writeFile(join(dir, "config", CREDENTIALS_FILE), "not json", "utf8");
    await expect(store.load()).resolves.toBeNull();
  });

  it.runIf(process.platform !== "win32")(
    "refuses to save through a symlinked config directory",
    async () => {
      const realConfig = join(dir, "real-config");
      const linkedConfig = join(dir, "linked-config");
      await new FileTokenStore(realConfig).save(creds);
      await symlink(realConfig, linkedConfig, "dir");

      const store = new FileTokenStore(linkedConfig);
      await expect(store.save(creds)).rejects.toThrow("Refusing to store credentials");
    },
  );

  it.runIf(process.platform !== "win32")(
    "does not follow a symlinked credentials file while loading",
    async () => {
      const configPath = join(dir, "config");
      const store = new FileTokenStore(configPath);
      await store.save(creds);
      const target = join(dir, "captured.json");
      await writeFile(target, JSON.stringify(creds), "utf8");
      await rm(join(configPath, CREDENTIALS_FILE));
      await symlink(target, join(configPath, CREDENTIALS_FILE));

      await expect(store.load()).resolves.toBeNull();
    },
  );

  it.runIf(process.platform !== "win32")("writes credentials.json at 0600", async () => {
    const configPath = join(dir, "config");
    const store = new FileTokenStore(configPath);
    await store.save(creds);
    const fileStat = await stat(join(configPath, CREDENTIALS_FILE));
    expect(fileStat.mode & 0o777).toBe(0o600);
  });

  it.runIf(process.platform !== "win32")("creates the config dir at 0700", async () => {
    const configPath = join(dir, "config");
    const store = new FileTokenStore(configPath);
    await store.save(creds);
    const dirStat = await stat(configPath);
    expect(dirStat.mode & 0o777).toBe(0o700);
  });
});
