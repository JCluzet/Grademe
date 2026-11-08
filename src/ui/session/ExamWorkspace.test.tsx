import type {
  CliExerciseContent,
  CliSessionView,
  ExamSubmitStreamDone,
  GradeExerciseResult,
  ParsedSseFrame,
  SubmittedFile,
} from "@grademe/contracts";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";

import {
  ExamWorkspace,
  type ExamWorkspaceFs,
  type WriteTraceArgs,
} from "./ExamWorkspace";
import { compileFrame, doneFrame, runOf } from "./test-helpers";
import { CLI_VERSION } from "../../version";
import type { GradingApi } from "../hooks/useGradingRun";

const ENTER = "\r";
const ARROW_UP = "\x1b[A";
const ARROW_DOWN = "\x1b[B";
const STATUS_TEXT = "Current assignment";
const GRADING_CONFIRM_TEXT = "Ready to grade?";
const instances = new Set<ReturnType<typeof render>>();

afterEach(() => {
  for (const instance of instances) instance.unmount();
  instances.clear();
  cleanup();
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out");
    await delay(5);
  }
}

function session(overrides: Partial<CliSessionView> = {}): CliSessionView {
  return {
    cooldownUntil: null,
    currentLevel: 0,
    currentTry: 0,
    examSlug: "exam-a",
    sessionId: "c1bb3d9e-5fa5-4d5a-8f5e-6a2a1f906f87",
    exerciseSlug: "level-0",
    expiresAt: new Date(Date.now() + 7_200_000).toISOString(),
    levels: [
      { assignmentName: "print_char", exerciseSlug: "level-0", index: 0, status: "current" },
    ],
    passingScore: 50,
    pointsPerLevel: 25,
    score: 0,
    totalLevels: 4,
    ...overrides,
  };
}

function exercise(overrides: Partial<CliExerciseContent> = {}): CliExerciseContent {
  return {
    allowedFunctions: [],
    assignmentName: "print_char",
    examples: [],
    expectedFiles: ["print_char.c"],
    instructions: "do the thing",
    kind: "program",
    language: "c",
    slug: "level-0",
    ...overrides,
  };
}

function result(overrides: Partial<GradeExerciseResult> = {}): GradeExerciseResult {
  return {
    awardedPoints: 0,
    compile: { ok: true, stderr: null, stdout: null, timedOut: false },
    graderLabel: "c-grader",
    passed: false,
    runtimeMs: 10,
    tests: [],
    trace: null,
    ...overrides,
  };
}

interface Harness {
  api: GradingApi;
  fs: ExamWorkspaceFs;
  openUrl: Mock<(url: string) => boolean>;
  onRefresh: Mock<() => void>;
  onComplete: Mock<() => void>;
}

function harness(over: {
  view?: CliSessionView;
  content?: CliExerciseContent;
  files?: SubmittedFile[];
  done?: ExamSubmitStreamDone;
  frames?: ParsedSseFrame[];
  writeTrace?: (dir: string, args: WriteTraceArgs) => Promise<string>;
} = {}): { h: Harness; view: CliSessionView; content: CliExerciseContent } {
  const view = over.view ?? session();
  const content = over.content ?? exercise();
  const files = over.files ?? [{ content: "int main(){}", path: "print_char.c" }];

  const frames =
    over.frames ?? (over.done === undefined ? [] : [doneFrame(over.done)]);
  const api: GradingApi = {
    submitExamStream: () => Promise.resolve(runOf(frames)),
  };

  const fs: ExamWorkspaceFs = {
    readSubmission: () => Promise.resolve(files),
    writeTrace:
      over.writeTrace ??
      ((dir, args) => Promise.resolve(`${dir}/traces/${args.exerciseSlug}.trace`)),
  };

  return {
    content,
    h: { api, fs, onRefresh: vi.fn(), onComplete: vi.fn(), openUrl: vi.fn(() => true) },
    view,
  };
}

function renderWorkspace(
  built: { h: Harness; view: CliSessionView; content: CliExerciseContent },
): ReturnType<typeof render> {
  const { h, view, content } = built;
  const instance = render(
    <ExamWorkspace
      api={h.api}
      dir="/tmp/x"
      exercise={content}
      fs={h.fs}
      onRefresh={h.onRefresh}
      onComplete={h.onComplete}
      openUrl={h.openUrl}
      slug="exam-a"
      view={view}
    />,
  );
  instances.add(instance);
  return instance;
}

async function type(instance: ReturnType<typeof render>, command: string): Promise<void> {
  await delay(50);
  instance.stdin.write(command);
  await waitFor(() =>
    (instance.lastFrame() ?? "").includes(`grademe> ${command}`),
  );
  await delay(50);
  instance.stdin.write(ENTER);
}

async function waitForStatus(instance: ReturnType<typeof render>): Promise<void> {
  await waitFor(() => (instance.lastFrame() ?? "").includes(STATUS_TEXT));
}

describe("ExamWorkspace", () => {
  it("renders the status pane on mount (idle)", async () => {
    const instance = renderWorkspace(harness());
    await waitForStatus(instance);
    expect(instance.lastFrame() ?? "").toContain("grademe>");
  });

  it("swaps to help on `help` without accumulating a second status block", async () => {
    const instance = renderWorkspace(harness());
    await waitForStatus(instance);
    await type(instance, "help");
    await waitFor(() => (instance.lastFrame() ?? "").includes("Commands:"));
    const frame = instance.lastFrame() ?? "";
    expect(frame).toContain("Commands:");
    const occurrences = frame.split(STATUS_TEXT).length - 1;
    expect(occurrences).toBe(1);
  });

  it("explains how to recover from an unknown command", async () => {
    const instance = renderWorkspace(harness());
    await waitForStatus(instance);
    await type(instance, "wat");
    await waitFor(() => (instance.lastFrame() ?? "").includes("Unknown command"));
    expect(instance.lastFrame() ?? "").toContain(
      "Unknown command. Type help for Grademe commands",
    );
  });

  it.each(["ls -la", "touch main.c", "vim main.c", "workspace"])("guides %s to another terminal without submitting", async (command) => {
    const built = harness();
    const submit = vi.spyOn(built.h.api, "submitExamStream");
    const instance = renderWorkspace(built);
    await waitForStatus(instance);
    await type(instance, command);
    await waitFor(() => (instance.lastFrame() ?? "").includes("not a shell"));
    expect(instance.lastFrame()).toContain("cd '/tmp/x/submission/print_char'");
    expect(instance.lastFrame()).toContain("clock keeps running");
    expect(submit).not.toHaveBeenCalled();
    expect(built.h.openUrl).not.toHaveBeenCalled();
    await type(instance, "status");
    await waitFor(() => !(instance.lastFrame() ?? "").includes("not a shell"));
  });

  it("explains when there is no last correction", async () => {
    const instance = renderWorkspace(harness());
    await waitForStatus(instance);
    await type(instance, "result");
    await waitFor(() => (instance.lastFrame() ?? "").includes("No correction"));
  });

  it("grademe pass path: gate → y → grading → SuccessBanner → enter advances", async () => {
    const done: ExamSubmitStreamDone = {
      completedLevelsCount: 1,
      cooldownUntil: null,
      examCompleted: false,
      levelPassed: true,
      result: result({ passed: true }),
    };
    const built = harness({ done });
    const instance = renderWorkspace(built);
    await waitForStatus(instance);
    await type(instance, "grademe");
    await waitFor(() => (instance.lastFrame() ?? "").includes(GRADING_CONFIRM_TEXT));
    expect(instance.lastFrame() ?? "").toContain(GRADING_CONFIRM_TEXT);
    await delay(20);
    instance.stdin.write("y");
    await waitFor(() => (instance.lastFrame() ?? "").includes("✓ SUCCESS"));
    expect(instance.lastFrame() ?? "").toContain("(Press enter to continue...)");
    await delay(20);
    instance.stdin.write(ENTER);
    await waitFor(() => built.h.onRefresh.mock.calls.length > 0);
    expect(built.h.onRefresh).toHaveBeenCalledTimes(1);
    expect(built.h.onComplete).not.toHaveBeenCalled();
  });

  it("grademe fail path: FailureBanner shown and trace written", async () => {
    const writeTrace = vi.fn((dir: string, args: WriteTraceArgs) =>
      Promise.resolve(`${dir}/traces/${args.exerciseSlug}.trace`),
    );
    const done: ExamSubmitStreamDone = {
      completedLevelsCount: 0,
      cooldownUntil: new Date(Date.now() + 60_000).toISOString(),
      examCompleted: false,
      levelPassed: false,
      result: result({
        passed: false,
        tests: [
          {
            actual: "no",
            args: [],
            command: "./a.out",
            exitCode: 1,
            expected: "yes",
            passed: false,
            signal: null,
            stderr: "boom",
            stdout: null,
            testId: "t1",
            timedOut: false,
            title: "basic",
          },
        ],
        trace: "grader trace here",
      }),
    };
    const built = harness({ done, writeTrace });
    const instance = renderWorkspace(built);
    await waitForStatus(instance);
    await type(instance, "grademe");
    await waitFor(() => (instance.lastFrame() ?? "").includes(GRADING_CONFIRM_TEXT));
    await delay(20);
    instance.stdin.write("y");
    await waitFor(() => (instance.lastFrame() ?? "").includes("× FAILURE"));
    expect(instance.lastFrame() ?? "").toContain("Trace saved to");
    expect(instance.lastFrame() ?? "").toContain("Why: 1 of 1 tests failed · first KO: basic (exit code 1)");
    expect(writeTrace).toHaveBeenCalledTimes(1);
    const [, args] = writeTrace.mock.calls[0] ?? [];
    expect(args).toMatchObject({ attempt: 0, exerciseSlug: "level-0", level: 0 });
    expect(args?.content).toContain("grader trace here");
    expect(args?.content).toContain("basic");
    expect(args?.content).toContain("challenge   exam-a · level 0 · try 0");
    expect(args?.content).toContain("exercise    level-0: print_char");
    expect(args?.content).toContain(`client      grademe CLI ${CLI_VERSION}`);
  });

  it("grademe fail path: a failed trace write still shows the banner and the cause", async () => {
    const writeTrace = vi.fn(() => Promise.reject(new Error("EACCES")));
    const done: ExamSubmitStreamDone = {
      completedLevelsCount: 0,
      cooldownUntil: null,
      examCompleted: false,
      levelPassed: false,
      result: result({
        passed: false,
        tests: [
          {
            actual: "no",
            args: [],
            command: "./a.out",
            exitCode: 1,
            expected: "yes",
            passed: false,
            signal: null,
            stderr: null,
            stdout: null,
            testId: "t1",
            timedOut: false,
            title: "basic",
          },
        ],
      }),
    };
    const instance = renderWorkspace(harness({ done, writeTrace }));
    await waitForStatus(instance);
    await type(instance, "grademe");
    await waitFor(() => (instance.lastFrame() ?? "").includes(GRADING_CONFIRM_TEXT));
    await delay(20);
    instance.stdin.write("y");
    await waitFor(() => (instance.lastFrame() ?? "").includes("× FAILURE"));
    expect(instance.lastFrame() ?? "").toContain("Why: 1 of 1 tests failed · first KO: basic (exit code 1)");
    expect(instance.lastFrame() ?? "").not.toContain("Trace saved to");
  });

  it("recalls previous commands with the up and down arrows", async () => {
    const built = harness();
    const instance = renderWorkspace(built);
    await waitForStatus(instance);
    await type(instance, "zzz-first");
    await waitFor(() => (instance.lastFrame() ?? "").includes("Unknown command"));
    expect(instance.lastFrame() ?? "").not.toContain("zzz-first");
    instance.stdin.write(ARROW_UP);
    await waitFor(() => (instance.lastFrame() ?? "").includes("grademe> zzz-first"));
    await delay(20);
    instance.stdin.write("x");
    await waitFor(() => (instance.lastFrame() ?? "").includes("grademe> zzz-firstx"));
    instance.stdin.write(ARROW_DOWN);
    await waitFor(() => !(instance.lastFrame() ?? "").includes("zzz-first"));
  });

  it("does not recall history while a takeover mode owns the keys", async () => {
    const instance = renderWorkspace(harness());
    await waitForStatus(instance);
    await type(instance, "grademe");
    await waitFor(() => (instance.lastFrame() ?? "").includes(GRADING_CONFIRM_TEXT));
    await delay(20);
    instance.stdin.write(ARROW_UP);
    await waitFor(() => (instance.lastFrame() ?? "").includes("Abort"));
    expect(instance.lastFrame() ?? "").not.toContain("grademe> grademe");
    await delay(20);
    instance.stdin.write(ARROW_UP);
    await waitFor(() => (instance.lastFrame() ?? "").includes("grademe> grademe"));
  });

  it.each(["exit", "quit"])("%s is an alias of finish", async (alias) => {
    const instance = renderWorkspace(harness());
    await waitForStatus(instance);
    await type(instance, alias);
    await waitFor(() =>
      (instance.lastFrame() ?? "").includes("Are you sure you want to exit the challenge?"),
    );
  });

  it("recovers to idle when the grading stream ends with no done frame", async () => {
    const built = harness({
      frames: [compileFrame({ ok: true, stderr: null, stdout: null, timedOut: false })],
    });
    const instance = renderWorkspace(built);
    await waitForStatus(instance);
    await type(instance, "grademe");
    await waitFor(() => (instance.lastFrame() ?? "").includes(GRADING_CONFIRM_TEXT));
    expect(instance.lastFrame() ?? "").toContain(GRADING_CONFIRM_TEXT);
    await delay(20);
    instance.stdin.write("y");
    await waitFor(() =>
      (instance.lastFrame() ?? "").includes("The grading stream ended unexpectedly"),
    );
    const frame = instance.lastFrame() ?? "";
    expect(frame).toContain("grademe>");
    expect(frame).not.toContain("making grading request to server now");
  });

  it("cooldown short-circuits grademe and never submits", async () => {
    const submitExamStream = vi.fn(() => Promise.resolve(runOf([])));
    const built = harness({
      view: session({ cooldownUntil: new Date(Date.now() + 120_000).toISOString() }),
    });
    built.h.api.submitExamStream = submitExamStream;
    const instance = renderWorkspace(built);
    await waitForStatus(instance);
    await type(instance, "grademe");
    await waitFor(() => (instance.lastFrame() ?? "").includes(GRADING_CONFIRM_TEXT));
    await delay(20);
    instance.stdin.write("y");
    await waitFor(() => (instance.lastFrame() ?? "").includes("ERROR: You must wait at least"));
    expect(submitExamStream).not.toHaveBeenCalled();
  });

  it("finish prompts the selector and aborts to idle on cancel", async () => {
    const instance = renderWorkspace(harness());
    await waitForStatus(instance);
    await type(instance, "finish");
    await waitFor(() =>
      (instance.lastFrame() ?? "").includes("Are you sure you want to exit the challenge?"),
    );
    expect(instance.lastFrame() ?? "").toContain("Are you sure you want to exit the challenge?");
    await delay(20);
    instance.stdin.write(ENTER);
    await waitFor(() => (instance.lastFrame() ?? "").includes("** Abort **"));
    expect(instance.lastFrame() ?? "").toContain("** Abort **");
  });

  it("cancels the grading stream on unmount (Ctrl+C during grading)", async () => {
    const signalHolder: { value: AbortSignal | null } = { value: null };
    const submitExamStream = vi.fn((
      _slug: string,
      _context: Pick<CliSessionView, "currentLevel" | "sessionId">,
      _files: SubmittedFile[],
      signal?: AbortSignal,
    ) => {
      signalHolder.value = signal ?? null;
      async function* gen(): AsyncGenerator<ParsedSseFrame> {
        for (;;) {
          if (signal?.aborted === true) return;
          await delay(5);
        }
      }
      return Promise.resolve({ frames: gen() });
    });
    const built = harness();
    built.h.api.submitExamStream = submitExamStream;
    const instance = renderWorkspace(built);

    await waitForStatus(instance);
    await type(instance, "grademe");
    await waitFor(() => (instance.lastFrame() ?? "").includes(GRADING_CONFIRM_TEXT));
    await delay(20);
    instance.stdin.write("y");
    await waitFor(() => (instance.lastFrame() ?? "").includes("making grading request to server now"));
    await waitFor(() => signalHolder.value !== null);
    expect(signalHolder.value?.aborted).toBe(false);

    instance.unmount();

    expect(signalHolder.value?.aborted).toBe(true);
  });

  it("opens grademe.io best-effort on `sponsor`", async () => {
    const built = harness();
    const instance = renderWorkspace(built);
    await waitForStatus(instance);
    await type(instance, "sponsor");
    await waitFor(() => built.h.openUrl.mock.calls.length > 0);
    expect(built.h.openUrl).toHaveBeenCalledWith("https://grademe.io");
  });
});
