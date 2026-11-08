import { constants } from "node:fs";
import {
  access,
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
} from "node:fs/promises";
import { join, resolve, sep } from "node:path";

import {
  isSafeExerciseFilePath,
  MAX_SUBMITTED_FILE_CONTENT_LENGTH,
} from "@grademe/contracts";
import type { CliExerciseContent, SubmittedFile } from "@grademe/contracts";

import { CliError, EXIT } from "../errors";
import { renderSubject } from "./subject-render";
import { assertWorkspaceDirectory, writeWorkspaceFile } from "./workspace-write";

const SUBJECT_DIR = "subject";
const SUBJECT_FILE = "subject.en.txt";
const SUBMISSION_DIR = "submission";
const TRACES_DIR = "traces";
const MAX_SUBMITTED_FILE_BYTES = MAX_SUBMITTED_FILE_CONTENT_LENGTH * 4;

export function assignmentFolderName(content: CliExerciseContent): string {
  const name = content.assignmentName;
  if (
    name.length === 0 ||
    name.includes("/") ||
    name.includes("\\") ||
    name === "." ||
    name === ".." ||
    name.startsWith(".")
  ) {
    throw new CliError(`Unsafe assignment name for a folder: ${name}`, EXIT.USER);
  }
  return name;
}

export function normalizeWorkspaceDir(dir: string): string {
  return dir.trim() === "" ? dir : resolve(dir);
}

export function subjectFilePath(dir: string): string {
  return join(dir, SUBJECT_DIR, SUBJECT_FILE);
}

function submissionRoot(dir: string): string {
  return join(dir, SUBMISSION_DIR);
}

export function levelSubmissionDir(dir: string, content: CliExerciseContent): string {
  return join(submissionRoot(dir), assignmentFolderName(content));
}

export async function ensureWritableDir(dir: string): Promise<void> {
  try {
    await access(dir, constants.W_OK | constants.X_OK);
  } catch {
    throw new CliError(
      `Working directory is not writable: ${dir}. Pick a directory you own with free space.`,
      EXIT.USER,
    );
  }
}

export async function materializeLevel(dir: string, content: CliExerciseContent): Promise<void> {
  await ensureWritableDir(dir);
  const dirReal = await realpath(dir);

  const subjectDir = join(dirReal, SUBJECT_DIR);
  await mkdir(subjectDir, { recursive: true });
  await writeWorkspaceFile(join(subjectDir, SUBJECT_FILE), dirReal, renderSubject(content));

  const root = submissionRoot(dirReal);
  await mkdir(root, { recursive: true });
  await assertWorkspaceDirectory(root, dirReal);
  const levelDir = levelSubmissionDir(dirReal, content);
  await mkdir(levelDir, { recursive: true });
  await assertWorkspaceDirectory(levelDir, root);
}

export async function readSubmission(
  dir: string,
  content: CliExerciseContent,
): Promise<SubmittedFile[]> {
  const baseDir = levelSubmissionDir(dir, content);
  const realBase = await realpath(baseDir);

  const files: SubmittedFile[] = [];
  const missing: string[] = [];

  for (const name of content.expectedFiles) {
    if (!isSafeExerciseFilePath(name)) {
      throw new CliError(`Unsafe expected file name: ${name}`, EXIT.USER);
    }

    const candidate = join(baseDir, name);

    let realPath: string;
    try {
      realPath = await realpath(candidate);
    } catch {
      missing.push(name);
      continue;
    }

    if (realPath !== join(realBase, name) && !realPath.startsWith(realBase + sep)) {
      throw new CliError(
        `Refusing to read a file outside the submission directory: ${name}`,
        EXIT.USER,
      );
    }

    const stats = await lstat(realPath);
    if (!stats.isFile() || stats.size > MAX_SUBMITTED_FILE_BYTES) {
      throw new CliError(
        `Refusing to read an invalid or oversized submission file: ${name}`,
        EXIT.USER,
      );
    }

    const fileContent = await readFile(realPath, "utf8");
    files.push({ content: fileContent, path: name });
  }

  if (missing.length > 0) {
    throw new CliError(
      `Missing expected file(s) in ${baseDir}: ${missing.join(", ")}`,
      EXIT.USER,
    );
  }

  return files;
}

export interface WriteTraceArgs {
  level: number;
  attempt: number;
  exerciseSlug: string;
  content: string;
}

function safeTraceSlug(slug: string): string {
  if (
    slug.length === 0 ||
    slug.includes("/") ||
    slug.includes("\\") ||
    slug.includes("..") ||
    slug === "." ||
    slug.startsWith(".")
  ) {
    throw new CliError(`Unsafe exercise slug for a trace file: ${slug}`, EXIT.USER);
  }
  return slug;
}

export async function writeTrace(
  dir: string,
  { level, attempt, exerciseSlug, content }: WriteTraceArgs,
): Promise<string> {
  await ensureWritableDir(dir);
  const dirReal = await realpath(dir);

  const tracesDir = join(dirReal, TRACES_DIR);
  await mkdir(tracesDir, { recursive: true });

  const fileName = `${String(level)}-${String(attempt)}_${safeTraceSlug(exerciseSlug)}.trace`;
  const tracePath = join(tracesDir, fileName);
  await writeWorkspaceFile(tracePath, dirReal, content);

  return join(dir, TRACES_DIR, fileName);
}

export async function clearSubmissionExcept(dir: string, keepAssignment: string): Promise<void> {
  const root = submissionRoot(dir);

  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return;
  }

  const rootReal = await realpath(root);
  if (rootReal !== join(await realpath(dir), SUBMISSION_DIR)) {
    throw new CliError(
      `Refusing to clear a submission root outside the workspace: ${root}`,
      EXIT.USER,
    );
  }

  await Promise.all(
    entries
      .filter((entry) => entry !== keepAssignment)
      .map(async (entry) => {
        const entryPath = join(root, entry);
        const stats = await lstat(entryPath);
        if (stats.isSymbolicLink()) {
          return;
        }
        await rm(entryPath, { force: true, recursive: true });
      }),
  );
}
