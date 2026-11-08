import type {
  CliExerciseContent,
  CliSessionView,
  SubmittedFile,
} from "@grademe/contracts";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";

import {
  ChallengeSession,
  type ChallengeSessionApi,
  type ChallengeSessionFs,
} from "./ChallengeSession";
import { doneFrame, runOf } from "./test-helpers";

afterEach(cleanup);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 1500): Promise<void> {
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

interface Harness {
  api: ChallengeSessionApi;
  fs: ChallengeSessionFs;
  openUrl: Mock<(url: string) => boolean>;
  onComplete: Mock<() => void>;
}

function harness(over: { view?: CliSessionView; content?: CliExerciseContent } = {}): Harness {
  const view = over.view ?? session();
  const content = over.content ?? exercise();
  const files: SubmittedFile[] = [{ content: "int main(){}", path: "print_char.c" }];

  const api: ChallengeSessionApi = {
    getExercise: () => Promise.resolve(content),
    getSession: () => Promise.resolve(view),
    startExam: () => Promise.resolve(),
    submitExamStream: () => Promise.resolve(runOf([])),
  };

  const fs: ChallengeSessionFs = {
    clearSubmissionExcept: () => Promise.resolve(),
    materializeLevel: () => Promise.resolve(),
    readSubmission: () => Promise.resolve(files),
    writeTrace: (dir, args) => Promise.resolve(`${dir}/traces/${args.exerciseSlug}.trace`),
  };

  return { api, fs, openUrl: vi.fn(() => true), onComplete: vi.fn() };
}

function renderSession(h: Harness): ReturnType<typeof render> {
  return render(
    <ChallengeSession api={h.api} dir="/tmp/x" fs={h.fs} onComplete={h.onComplete} openUrl={h.openUrl} slug="exam-a" />,
  );
}

describe("ChallengeSession", () => {
  it("keeps the last correction after refreshing the workspace", async () => {
    const h = harness();
    h.api.submitExamStream = () => Promise.resolve(runOf([doneFrame({
      completedLevelsCount: 1,
      cooldownUntil: null,
      examCompleted: false,
      levelPassed: true,
      result: {
        awardedPoints: 25,
        compile: { ok: true, stderr: null, stdout: null, timedOut: false },
        graderLabel: "c-grader",
        passed: true,
        runtimeMs: 10,
        tests: [],
        trace: null,
      },
    })]));
    const getSession = vi.spyOn(h.api, "getSession");
    const instance = renderSession(h);
    await waitFor(() => (instance.lastFrame() ?? "").includes("grademe>"));
    await delay(50);
    instance.stdin.write("grademe");
    await waitFor(() => (instance.lastFrame() ?? "").includes("grademe> grademe"));
    await delay(50);
    instance.stdin.write("\r");
    await waitFor(() => (instance.lastFrame() ?? "").includes("Ready to grade?"));
    await delay(50);
    instance.stdin.write("y");
    await waitFor(() => (instance.lastFrame() ?? "").includes("Correction recorded."));
    await delay(50);
    instance.stdin.write("\r");
    await waitFor(() => getSession.mock.calls.length === 2 && (instance.lastFrame() ?? "").includes("grademe>"));
    await delay(50);
    instance.stdin.write("result");
    await waitFor(() => (instance.lastFrame() ?? "").includes("grademe> result"));
    await delay(50);
    instance.stdin.write("\r");
    await waitFor(() => (instance.lastFrame() ?? "").includes("Last correction in this CLI run"));
    expect(instance.lastFrame()).toContain("1 / 4 levels completed");
    expect(instance.lastFrame()).toContain("Compilation passed");
  });

  it("drives straight into the workspace status pane (no explanation gate)", async () => {
    const instance = renderSession(harness());
    await waitFor(
      () =>
        (instance.lastFrame() ?? "").includes("grademe>") &&
        (instance.lastFrame() ?? "").includes("Current assignment"),
    );
    expect(instance.lastFrame() ?? "").not.toContain("EXPLANATION");
    expect(instance.lastFrame() ?? "").toContain("Current assignment");
  });

  it("renders the completion screen when the exam is already complete", async () => {
    const h = harness({ view: session({ currentLevel: 4, totalLevels: 4 }) });
    const instance = renderSession(h);
    await waitFor(() => (instance.lastFrame() ?? "").includes("Congratulations"));
    expect(instance.lastFrame() ?? "").toContain("Congratulations");
    expect(h.onComplete).not.toHaveBeenCalled();
    await delay(50);
    instance.stdin.write("x");
    expect(h.onComplete).not.toHaveBeenCalled();
    instance.stdin.write("\r");
    await waitFor(() => h.onComplete.mock.calls.length === 1);
    expect(h.onComplete).toHaveBeenCalledTimes(1);
  });

  it("uses challenge wording when no active session is returned", async () => {
    const h = harness();
    h.api.getSession = () => Promise.resolve(null);
    const instance = renderSession(h);
    await waitFor(() => (instance.lastFrame() ?? "").includes("No active session"));
    expect(instance.lastFrame()).toContain("No active session for this challenge.");
    expect(instance.lastFrame()).not.toMatch(/\bexams?\b/i);
  });

  it("renders the unsupported notice for a server-kind exercise", async () => {
    const instance = renderSession(
      harness({ content: exercise({ kind: "server" }), view: session({ currentLevel: 1 }) }),
    );
    await waitFor(() => (instance.lastFrame() ?? "").includes("not supported in the CLI"));
    expect(instance.lastFrame() ?? "").toContain("This challenge includes a server exercise");
  });
});
