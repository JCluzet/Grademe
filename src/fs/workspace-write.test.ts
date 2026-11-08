import { mkdir, mkdtemp, open, readFile, readdir, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import type * as FsPromises from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EXIT } from "../errors";
import { writeWorkspaceFile } from "./workspace-write";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return { ...actual, open: vi.fn(actual.open), rename: vi.fn(actual.rename) };
});

const actual = await vi.importActual<typeof FsPromises>("node:fs/promises");
const TRACE_FILE = "result.trace";
const PREVIOUS = "previous trace";

describe("atomic workspace output", () => {
  let directory: string;
  let workspace: string;
  let parent: string;
  let destination: string;

  beforeEach(async () => {
    directory = await realpath(await mkdtemp(join(tmpdir(), "grademe-output-test-")));
    workspace = join(directory, "workspace");
    parent = join(workspace, "traces");
    destination = join(parent, TRACE_FILE);
    await mkdir(parent, { recursive: true });
    await writeFile(destination, PREVIOUS);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.mocked(open).mockReset();
    vi.mocked(rename).mockReset();
    await rm(directory, { recursive: true, force: true });
  });

  it("replaces an existing output and removes the staging file", async () => {
    await writeWorkspaceFile(destination, workspace, "new trace");
    expect(await readFile(destination, "utf8")).toBe("new trace");
    expect(await readdir(workspace)).toEqual(["traces"]);
  });

  it.each(["write", "rename"])("preserves the previous file and cleans up after a %s failure", async (failure) => {
    if (failure === "rename") vi.mocked(rename).mockRejectedValueOnce(new Error("disk failure"));
    else {
      vi.mocked(open).mockImplementationOnce(async (...args) => {
        const file = await actual.open(...args);
        vi.spyOn(file, "writeFile").mockRejectedValueOnce(new Error("disk failure"));
        return file;
      });
    }
    await expect(writeWorkspaceFile(destination, workspace, "new trace")).rejects.toThrow("disk failure");
    expect(await readFile(destination, "utf8")).toBe(PREVIOUS);
    expect(await readdir(workspace)).toEqual(["traces"]);
  });

  it.each(["symlink", "directory"])("refuses a parent replaced with a %s during staging", async (replacement) => {
    const outside = join(directory, "outside");
    await mkdir(outside);
    await writeFile(join(outside, TRACE_FILE), "outside sentinel");
    vi.mocked(open).mockImplementationOnce(async (...args) => {
      const file = await actual.open(...args);
      await actual.rename(parent, join(workspace, "original-traces"));
      if (replacement === "symlink") await symlink(outside, parent);
      else await mkdir(parent);
      return file;
    });

    await expect(writeWorkspaceFile(destination, workspace, "new trace")).rejects.toMatchObject({ exitCode: EXIT.USER });

    expect(await readFile(join(outside, TRACE_FILE), "utf8")).toBe("outside sentinel");
    expect(await readFile(join(workspace, "original-traces", TRACE_FILE), "utf8")).toBe(PREVIOUS);
    expect((await readdir(workspace)).sort()).toEqual(["original-traces", "traces"]);
  });

  it("does not follow a pre-existing parent directory symlink", async () => {
    const outside = join(directory, "outside");
    await rename(parent, outside);
    await symlink(outside, parent);
    await expect(writeWorkspaceFile(destination, workspace, "new trace")).rejects.toMatchObject({ exitCode: EXIT.USER });
    expect(await readFile(join(outside, TRACE_FILE), "utf8")).toBe(PREVIOUS);
  });
});
