import type { CliExamRow } from "@grademe/contracts";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";

import { ExamReveal } from "./ExamReveal";

function row(overrides: Partial<CliExamRow> = {}): CliExamRow {
  return {
    audience: "learner",
    bestScoreLabel: null,
    difficulty: 2,
    durationLabel: "3h",
    languageLabel: "C",
    levelLabel: "0/4",
    progressPercent: 0,
    remainingLabel: null,
    slug: "exam-a",
    status: "not_started",
    title: "C Fundamentals",
    ...overrides,
  };
}

describe("ExamReveal", () => {
  it("returns to the catalog with Escape without starting the clock", async () => {
    const onStart = vi.fn();
    const onBack = vi.fn();
    const instance = render(<ExamReveal exam={row()} onStart={onStart} onBack={onBack} />);
    await new Promise((resolve) => { setTimeout(resolve, 20); });
    instance.stdin.write("\u001b");
    await new Promise((resolve) => { setTimeout(resolve, 40); });
    expect(onBack).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();
    instance.unmount();
  });
  it("shows the exam title, language and the essential how-to lines", () => {
    const frame =
      render(<ExamReveal exam={row()} onStart={() => undefined} />).lastFrame() ?? "";
    expect(frame).toContain("C Fundamentals");
    expect(frame).toContain("C");
    expect(frame).toContain("subject.en.txt");
    expect(frame).toContain("grademe");
    expect(frame).toContain("No git");
    expect(frame).toContain("grademe.io");
  });
});
