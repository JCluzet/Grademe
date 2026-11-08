import type {
  CliExamRow,
  CliExerciseContent,
  CliSessionView,
  SubmittedFile,
} from "@grademe/contracts";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";

import { App, type AppApi, type AppFs } from "./App";
import { doneFrame, runOf } from "./session/test-helpers";

const ENTER = "\r";
const NOT_CALLED = "not called";
const START_CHALLENGE = "start challenge";

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

function examRow(overrides: Partial<CliExamRow>): CliExamRow {
  return {
    audience: "learner",
    bestScoreLabel: null,
    difficulty: 1,
    durationLabel: "2h",
    languageLabel: "C",
    levelLabel: "0/4",
    progressPercent: 0,
    remainingLabel: null,
    slug: "exam-a",
    status: "not_started",
    title: "Exam A",
    ...overrides,
  };
}

function session(overrides: Partial<CliSessionView>): CliSessionView {
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

function exercise(overrides: Partial<CliExerciseContent>): CliExerciseContent {
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

const noopFs: AppFs = {
  clearSubmissionExcept: () => Promise.resolve(),
  materializeLevel: () => Promise.resolve(),
  readSubmission: (): Promise<SubmittedFile[]> => Promise.resolve([]),
  writeTrace: () => Promise.resolve("/tmp/x/traces/0-0_level-0.trace"),
};

function renderApp(api: AppApi, fs: AppFs = noopFs): ReturnType<typeof render> {
  return render(
    <App
      api={api}
      dirExplicit
      fs={fs}
      initialDir="/tmp/x"
      openUrl={() => true}
      username="ada@example.com"
      version="9.9.9"
    />,
  );
}

describe("App", () => {
  it.each([false, true])("returns to a fresh catalog and starts another challenge (already complete: %s)", async (alreadyComplete) => {
    const first = examRow({ title: "First challenge" });
    const second = examRow({ slug: "challenge-b", title: "Second challenge" });
    const getCatalog = vi.fn()
      .mockResolvedValueOnce([first, second])
      .mockResolvedValueOnce([
        { ...first, status: "passed", progressPercent: 100, levelLabel: "4/4" },
        second,
      ]);
    const startExam = vi.fn(() => Promise.resolve());
    const getSession = vi.fn()
      .mockResolvedValueOnce(session({ currentLevel: alreadyComplete ? 4 : 3, score: 75 }))
      .mockResolvedValueOnce(session({ examSlug: "challenge-b" }));
    const submitExamStream = vi.fn(() => Promise.resolve(runOf([doneFrame({
      completedLevelsCount: 4,
      cooldownUntil: null,
      examCompleted: true,
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
    })])));
    const api: AppApi = {
      getCatalog, startExam, getSession, submitExamStream,
      getExercise: () => Promise.resolve(exercise({})),
    };
    const materializeLevel = vi.fn(() => Promise.resolve());
    const instance = renderApp(api, {
      ...noopFs,
      materializeLevel,
      readSubmission: () => Promise.resolve([{ path: "print_char.c", content: "void print_char(char c) {}" }]),
    });
    const press = async (key: string): Promise<void> => {
      await delay(50);
      instance.stdin.write(key);
    };
    await waitFor(() => (instance.lastFrame() ?? "").includes("First challenge"));
    await press(ENTER);
    await waitFor(() => (instance.lastFrame() ?? "").includes(START_CHALLENGE));
    await press(ENTER);
    if (!alreadyComplete) {
      await waitFor(() => (instance.lastFrame() ?? "").includes("grademe>"));
      await press("grademe");
      await waitFor(() => (instance.lastFrame() ?? "").includes("grademe> grademe"));
      await press(ENTER);
      await waitFor(() => (instance.lastFrame() ?? "").includes("Ready to grade?"));
      await press("y");
      await waitFor(() => (instance.lastFrame() ?? "").includes("✓ SUCCESS"));
      await press(ENTER);
    }
    await waitFor(() => (instance.lastFrame() ?? "").includes("Congratulations"));
    expect(getCatalog).toHaveBeenCalledTimes(1);
    expect(instance.lastFrame()).toContain("Press enter to choose another challenge");
    await press(ENTER);
    await waitFor(() => getCatalog.mock.calls.length === 2 && (instance.lastFrame() ?? "").includes("Second challenge"));
    expect(instance.lastFrame()).toContain("[passed]");
    expect(startExam).toHaveBeenCalledTimes(1);
    await press("\u001B[B");
    await press(ENTER);
    await waitFor(() => (instance.lastFrame() ?? "").includes(START_CHALLENGE));
    expect(startExam).toHaveBeenCalledTimes(1);
    await press(ENTER);
    await waitFor(() => (instance.lastFrame() ?? "").includes("Current assignment"));
    expect(startExam).toHaveBeenLastCalledWith("challenge-b");
    expect(startExam).toHaveBeenCalledTimes(2);
    expect(materializeLevel).toHaveBeenLastCalledWith("/tmp/x", expect.anything());
    expect(submitExamStream).toHaveBeenCalledTimes(alreadyComplete ? 0 : 1);
    instance.unmount();
  });

  it("selects a challenge from the website without starting a session", async () => {
    const startExam = vi.fn(() => Promise.resolve());
    const getSession = vi.fn(() => Promise.resolve(session({})));
    const api: AppApi = {
      getCatalog: () => Promise.resolve([examRow({ slug: "first" }), examRow({ slug: "target", title: "Target challenge" })]),
      getExercise: () => Promise.resolve(exercise({})),
      getSession,
      startExam,
      submitExamStream: () => Promise.reject(new Error(NOT_CALLED)),
    };
    const instance = render(<App api={api} fs={noopFs} dirExplicit initialDir="/tmp/x" initialChallenge="target" username="tester" version="0.0.0" />);
    await waitFor(() => (instance.lastFrame() ?? "").includes("› Target challenge"));
    expect(startExam).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
    instance.unmount();
  });
  it("opens directly on the menu under the persistent header", async () => {
    const api: AppApi = {
      getCatalog: () => Promise.resolve([examRow({ slug: "exam-a", title: "Exam A" })]),
      getExercise: () => Promise.resolve(exercise({})),
      getSession: () => Promise.resolve(session({})),
      startExam: () => Promise.resolve(),
      submitExamStream: () => Promise.reject(new Error(NOT_CALLED)),
    };
    const { lastFrame } = renderApp(api);
    await waitFor(() => (lastFrame() ?? "").includes("Exam A"));
    const frame = lastFrame() ?? "";
    expect(frame).toContain("v9.9.9");
    expect(frame.indexOf("Grademe")).toBeLessThan(frame.indexOf("Exam A"));
  });

  it("shows the loader while the catalog is in flight", () => {
    const api: AppApi = {
      getCatalog: () => new Promise<CliExamRow[]>(() => undefined),
      getExercise: () => Promise.resolve(exercise({})),
      getSession: () => Promise.resolve(session({})),
      startExam: () => Promise.resolve(),
      submitExamStream: () => Promise.reject(new Error(NOT_CALLED)),
    };
    const frame = renderApp(api).lastFrame() ?? "";
    expect(frame).toContain("Loading challenges");
    expect(frame).not.toMatch(/\bexams?\b/i);
    expect(frame).toContain("v9.9.9");
  });

  it("routes a selected exam into the reveal, then starts the session", async () => {
    const api: AppApi = {
      getCatalog: () => Promise.resolve([examRow({ slug: "exam-a", title: "Exam A" })]),
      getExercise: () => Promise.resolve(exercise({})),
      getSession: () => Promise.resolve(session({ currentLevel: 1, score: 25 })),
      startExam: () => Promise.resolve(),
      submitExamStream: () => Promise.reject(new Error(NOT_CALLED)),
    };
    const { lastFrame, stdin } = renderApp(api);
    await waitFor(() => (lastFrame() ?? "").includes("Exam A"));
    await delay(20);
    stdin.write(ENTER);
    await waitFor(() => (lastFrame() ?? "").includes(START_CHALLENGE));
    expect(lastFrame() ?? "").toContain("subject.en.txt");
    await delay(20);
    stdin.write(ENTER);
    await waitFor(() => (lastFrame() ?? "").includes("Current assignment"));
    expect(lastFrame() ?? "").toContain("Current assignment");
  });

  it("shows the unsupported panel for a server-kind exercise", async () => {
    const api: AppApi = {
      getCatalog: () => Promise.resolve([examRow({ slug: "exam-a" })]),
      getExercise: () => Promise.resolve(exercise({ kind: "server" })),
      getSession: () => Promise.resolve(session({ currentLevel: 1 })),
      startExam: () => Promise.resolve(),
      submitExamStream: () => Promise.reject(new Error(NOT_CALLED)),
    };
    const { lastFrame, stdin } = renderApp(api);
    await waitFor(() => (lastFrame() ?? "").includes("Exam A"));
    await delay(20);
    stdin.write(ENTER);
    await waitFor(() => (lastFrame() ?? "").includes(START_CHALLENGE));
    await delay(20);
    stdin.write(ENTER);
    await waitFor(() => (lastFrame() ?? "").includes("not supported in the CLI"));
    expect(lastFrame() ?? "").toContain("not supported in the CLI");
  });
});
