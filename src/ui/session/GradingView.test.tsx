import type { GradeTestResult } from "@grademe/contracts";
import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";

import { GradingView } from "./GradingView";
import type { GradingProgress } from "../../core/sse-reducer";

function makeTest(overrides: Partial<GradeTestResult>): GradeTestResult {
  return {
    actual: null,
    args: [],
    command: "./a.out",
    exitCode: 0,
    expected: null,
    passed: true,
    signal: null,
    stderr: null,
    stdout: null,
    testId: "t1",
    timedOut: false,
    title: "basic case",
    ...overrides,
  };
}

describe("GradingView", () => {
  it("renders the wait lines and a spinning compile status", () => {
    const progress: GradingProgress = {
      compile: null,
      done: null,
      error: null,
      tests: [],
    };
    const frame = render(<GradingView elapsedMs={2_000} progress={progress} />).lastFrame() ?? "";

    expect(frame).toContain("We will now wait for the job to complete.");
    expect(frame).toContain("Please be patient, this can take a few seconds…");
    expect(frame).toContain("Compiling…");
    expect(frame).toContain("⏱ 2s");
  });

  it("renders a ✓/✗ line per test once compiled", () => {
    const progress: GradingProgress = {
      compile: { ok: true, stderr: null, stdout: null, timedOut: false },
      done: null,
      error: null,
      tests: [
        makeTest({ passed: true, testId: "pass-1", title: "handles empty input" }),
        makeTest({ passed: false, testId: "fail-1", title: "rejects bad arg" }),
      ],
    };
    const frame = render(<GradingView elapsedMs={5_000} progress={progress} />).lastFrame() ?? "";

    expect(frame).toContain("Running tests…");
    expect(frame).toContain("✓ handles empty input");
    expect(frame).toContain("✗ rejects bad arg");
  });
});
