import { chmod, link, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, sep } from "node:path";

import { MAX_SUBMITTED_FILE_CONTENT_LENGTH, type CliExerciseContent } from "@grademe/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CliError, EXIT } from "../errors";
import {
  assignmentFolderName,
  clearSubmissionExcept,
  ensureWritableDir,
  levelSubmissionDir,
  materializeLevel,
  normalizeWorkspaceDir,
  readSubmission,
  subjectFilePath,
  writeTrace,
} from "./workspace";

const C_FILE = "string_length.c";
const H_FILE = "string_length.h";
const OUTSIDE_PREFIX = "grademe-out-";
const SUBJECT_FILE = "subject.en.txt";

const content: CliExerciseContent = {
  allowedFunctions: ["write"],
  assignmentName: "string_length",
  examples: [{ command: "./a.out", output: "5" }],
  expectedFiles: [C_FILE, H_FILE],
  instructions: "Write string_length.",
  kind: "function",
  language: "c",
  slug: "ft-strlen",
};

function submissionDir(dir: string, name = content.assignmentName): string {
  return join(dir, "submission", name);
}

function submissionRootDir(dir: string): string {
  return join(dir, "submission");
}

describe("workspace", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "grademe-ws-"));
  });

  afterEach(async () => {
    await chmod(dir, 0o700).catch(() => undefined);
    await rm(dir, { force: true, recursive: true });
  });

  describe("ensureWritableDir", () => {
    it("resolves for an existing writable dir", async () => {
      await expect(ensureWritableDir(dir)).resolves.toBeUndefined();
    });

    it("throws a USER CliError when the dir does not exist", async () => {
      await expect(ensureWritableDir(join(dir, "missing"))).rejects.toMatchObject({
        exitCode: EXIT.USER,
      });
    });

    it.runIf(process.platform !== "win32")(
      "throws a USER CliError when the dir is not writable",
      async () => {
        await chmod(dir, 0o500);
        const error = await ensureWritableDir(dir).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(CliError);
        expect((error as CliError).exitCode).toBe(EXIT.USER);
      },
    );
  });

  describe("materializeLevel + readSubmission round-trip", () => {
    it("writes the subject and reads back the expected files", async () => {
      await materializeLevel(dir, content);

      const subject = await readFile(join(dir, "subject", SUBJECT_FILE), "utf8");
      expect(subject).toContain("Assignment name: string_length");

      await writeFile(join(submissionDir(dir), C_FILE), "int main(){}\n", "utf8");
      await writeFile(join(submissionDir(dir), H_FILE), "#pragma once\n", "utf8");

      const files = await readSubmission(dir, content);
      expect(files).toEqual([
        { content: "int main(){}\n", path: C_FILE },
        { content: "#pragma once\n", path: H_FILE },
      ]);
    });

    it("does not overwrite user files when the submission dir already exists", async () => {
      await materializeLevel(dir, content);
      await writeFile(join(submissionDir(dir), C_FILE), "keep me\n", "utf8");

      await materializeLevel(dir, content);

      const kept = await readFile(join(submissionDir(dir), C_FILE), "utf8");
      expect(kept).toBe("keep me\n");
    });
  });

  describe("materializeLevel write-side containment", () => {
    it.each(["subject", "trace"] as const)("replaces a %s file symlink without changing its external target", async (kind) => {
      const outside = await mkdtemp(join(tmpdir(), OUTSIDE_PREFIX));
      try {
        const victim = join(outside, "victim.txt");
        await writeFile(victim, "keep outside");
        const folder = join(dir, kind === "subject" ? "subject" : "traces");
        await mkdir(folder);
        const destination = join(folder, kind === "subject" ? SUBJECT_FILE : "0-0_ft-strlen.trace");
        await symlink(victim, destination);
        if (kind === "subject") await materializeLevel(dir, content);
        else await writeTrace(dir, { level: 0, attempt: 0, exerciseSlug: content.slug, content: "trace" });
        expect(await readFile(victim, "utf8")).toBe("keep outside");
        expect((await lstat(destination)).isSymbolicLink()).toBe(false);
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    });

    it.each(["subject", "trace"] as const)("replaces a %s hard link without truncating its external inode", async (kind) => {
      const outside = await mkdtemp(join(tmpdir(), OUTSIDE_PREFIX));
      try {
        const victim = join(outside, "victim.txt");
        await writeFile(victim, "keep hard link");
        const folder = join(dir, kind === "subject" ? "subject" : "traces");
        await mkdir(folder);
        const destination = join(folder, kind === "subject" ? SUBJECT_FILE : "0-0_ft-strlen.trace");
        await link(victim, destination);
        if (kind === "subject") await materializeLevel(dir, content);
        else await writeTrace(dir, { level: 0, attempt: 0, exerciseSlug: content.slug, content: "trace" });
        expect(await readFile(victim, "utf8")).toBe("keep hard link");
        expect((await lstat(destination)).ino).not.toBe((await lstat(victim)).ino);
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    });

    it.runIf(process.platform !== "win32")(
      "refuses when the submission folder is a symlink escaping the workspace",
      async () => {
        const outside = await mkdtemp(join(tmpdir(), OUTSIDE_PREFIX));
        try {
          await mkdir(join(dir, "submission"), { recursive: true });
          await symlink(outside, join(dir, "submission", content.assignmentName));

          const error = await materializeLevel(dir, content).catch((e: unknown) => e);
          expect(error).toBeInstanceOf(CliError);
          expect((error as CliError).exitCode).toBe(EXIT.USER);
        } finally {
          await rm(outside, { force: true, recursive: true });
        }
      },
    );

    it.runIf(process.platform !== "win32")(
      "refuses when the subject folder is a symlink escaping the workspace",
      async () => {
        const outside = await mkdtemp(join(tmpdir(), OUTSIDE_PREFIX));
        try {
          await symlink(outside, join(dir, "subject"));

          const error = await materializeLevel(dir, content).catch((e: unknown) => e);
          expect(error).toBeInstanceOf(CliError);
          expect((error as CliError).exitCode).toBe(EXIT.USER);
          await expect(
            readFile(join(outside, SUBJECT_FILE), "utf8"),
          ).rejects.toThrow();
        } finally {
          await rm(outside, { force: true, recursive: true });
        }
      },
    );
  });

  describe("readSubmission errors", () => {
    it("throws a USER CliError listing the missing expected files", async () => {
      await materializeLevel(dir, content);
      await writeFile(join(submissionDir(dir), C_FILE), "x\n", "utf8");

      const error = await readSubmission(dir, content).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).exitCode).toBe(EXIT.USER);
      expect((error as CliError).message).toContain(H_FILE);
    });

    it("rejects an unsafe expected filename", async () => {
      await materializeLevel(dir, content);
      const evil: CliExerciseContent = { ...content, expectedFiles: ["../escape.c"] };

      const error = await readSubmission(dir, evil).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).exitCode).toBe(EXIT.USER);
    });

    it("rejects an oversized file before loading it into memory", async () => {
      await materializeLevel(dir, content);
      await writeFile(
        join(submissionDir(dir), C_FILE),
        "x".repeat(MAX_SUBMITTED_FILE_CONTENT_LENGTH * 4 + 1),
        "utf8",
      );
      await writeFile(join(submissionDir(dir), H_FILE), "ok\n", "utf8");

      const error = await readSubmission(dir, content).catch((cause: unknown) => cause);
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).message).toContain("oversized");
    });

    it.runIf(process.platform !== "win32")(
      "rejects a symlink that escapes the submission dir",
      async () => {
        await materializeLevel(dir, content);
        const outside = join(dir, "outside.c");
        await writeFile(outside, "secret\n", "utf8");
        await symlink(outside, join(submissionDir(dir), C_FILE));
        await writeFile(join(submissionDir(dir), H_FILE), "ok\n", "utf8");

        const error = await readSubmission(dir, content).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(CliError);
        expect((error as CliError).exitCode).toBe(EXIT.USER);
      },
    );
  });

  describe("writeTrace", () => {
    it("writes traces/<level>-<attempt>_<slug>.trace and returns the path", async () => {
      const path = await writeTrace(dir, {
        attempt: 2,
        content: "failure trace body\n",
        exerciseSlug: "ft-strlen",
        level: 1,
      });

      expect(path).toBe(join(dir, "traces", "1-2_ft-strlen.trace"));
      const body = await readFile(path, "utf8");
      expect(body).toBe("failure trace body\n");
    });

    it("creates the traces/ directory recursively", async () => {
      const path = await writeTrace(dir, {
        attempt: 0,
        content: "x",
        exerciseSlug: "ex",
        level: 0,
      });
      await expect(readFile(path, "utf8")).resolves.toBe("x");
    });

    it("rejects an unsafe exercise slug", async () => {
      const error = await writeTrace(dir, {
        attempt: 0,
        content: "x",
        exerciseSlug: "../escape",
        level: 0,
      }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).exitCode).toBe(EXIT.USER);
    });
  });

  describe("clearSubmissionExcept", () => {
    it("removes other submission dirs and keeps the named one", async () => {
      await mkdir(submissionDir(dir, "string_length"), { recursive: true });
      await mkdir(submissionDir(dir, "print_char"), { recursive: true });
      await writeFile(join(submissionDir(dir, "string_length"), C_FILE), "keep\n", "utf8");

      await clearSubmissionExcept(dir, "string_length");

      const kept = await readFile(join(submissionDir(dir, "string_length"), C_FILE), "utf8");
      expect(kept).toBe("keep\n");
      await expect(readFile(join(submissionDir(dir, "print_char"), "x"), "utf8")).rejects.toThrow();
    });

    it("is a no-op when there is no submission dir yet", async () => {
      await expect(clearSubmissionExcept(dir, "string_length")).resolves.toBeUndefined();
    });

    it.runIf(process.platform !== "win32")(
      "refuses when the submission root is a symlink pointing elsewhere",
      async () => {
        const outside = await mkdtemp(join(tmpdir(), OUTSIDE_PREFIX));
        try {
          await mkdir(join(outside, "print_char"), { recursive: true });
          await writeFile(join(outside, "print_char", "x"), "victim\n", "utf8");
          await symlink(outside, join(dir, "submission"));

          const error = await clearSubmissionExcept(dir, "string_length").catch((e: unknown) => e);
          expect(error).toBeInstanceOf(CliError);
          expect((error as CliError).exitCode).toBe(EXIT.USER);
          await expect(readFile(join(outside, "print_char", "x"), "utf8")).resolves.toBe(
            "victim\n",
          );
        } finally {
          await rm(outside, { force: true, recursive: true });
        }
      },
    );

    it.runIf(process.platform !== "win32")(
      "skips a symlinked entry instead of deleting through it",
      async () => {
        const outside = await mkdtemp(join(tmpdir(), OUTSIDE_PREFIX));
        try {
          await mkdir(join(outside, "data"), { recursive: true });
          await writeFile(join(outside, "data", "x"), "victim\n", "utf8");
          await mkdir(submissionRootDir(dir), { recursive: true });
          await symlink(join(outside, "data"), join(submissionRootDir(dir), "print_char"));

          await clearSubmissionExcept(dir, "string_length");

          await expect(readFile(join(outside, "data", "x"), "utf8")).resolves.toBe("victim\n");
        } finally {
          await rm(outside, { force: true, recursive: true });
        }
      },
    );
  });
});

describe("normalizeWorkspaceDir", () => {
  it("drops a trailing separator so displayed paths never double the slash", () => {
    expect(normalizeWorkspaceDir("/Users/jo/Desktop/test_Grademe/")).toBe("/Users/jo/Desktop/test_Grademe");
    expect(normalizeWorkspaceDir("/Users/jo/Desktop/test_Grademe")).toBe("/Users/jo/Desktop/test_Grademe");
  });

  it("makes a relative directory absolute", () => {
    expect(isAbsolute(normalizeWorkspaceDir("exam"))).toBe(true);
    expect(normalizeWorkspaceDir("exam").endsWith(`${sep}exam`)).toBe(true);
  });

  it("leaves an empty directory empty so the writability check refuses it", () => {
    expect(normalizeWorkspaceDir("")).toBe("");
    expect(normalizeWorkspaceDir("   ")).toBe("   ");
  });
});

describe("workspace path builders", () => {
  it("spell the subject and submission locations once, without doubled separators", () => {
    expect(subjectFilePath("/exam")).toBe("/exam/subject/subject.en.txt");
    expect(levelSubmissionDir("/exam", content)).toBe(`/exam/submission/${assignmentFolderName(content)}`);
  });
});
