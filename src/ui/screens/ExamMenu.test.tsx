import type { CliExamRow } from "@grademe/contracts";
import type * as InkModule from "ink";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExamMenu } from "./ExamMenu";

const exitSpy = vi.fn();

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof InkModule>();
  return { ...actual, useApp: () => ({ ...actual.useApp(), exit: exitSpy }) };
});

const DOWN_ARROW = "\u001B[B";
const ENTER = "\r";
const QUIT = "q";

afterEach(cleanup);

function tick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 20);
  });
}

function row(overrides: Partial<CliExamRow>): CliExamRow {
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

const rows: CliExamRow[] = [
  row({ slug: "learn-1", title: "Learner One", audience: "learner", status: "in_progress" }),
  row({ slug: "dev-1", title: "Developer One", audience: "developer", status: "passed" }),
];

describe("ExamMenu", () => {
  it("focuses an in-progress challenge without reordering the catalog", () => {
    const catalog = [row({ slug: "first", title: "First" }), row({ slug: "resume", title: "Resume me", status: "in_progress" })];
    const frame = render(<ExamMenu rows={catalog} onSelect={() => undefined} />).lastFrame() ?? "";
    expect(frame).toContain("› Resume me");
    expect(frame.indexOf("First")).toBeLessThan(frame.indexOf("› Resume me"));
  });
  it("shows the friendly empty-state with the grademe.io promo", () => {
    const { lastFrame } = render(<ExamMenu rows={[]} onSelect={() => undefined} />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("No challenges available yet.");
    expect(frame).not.toMatch(/\bexams?\b/i);
    expect(frame).toContain("Discover them on grademe.io");
  });

  it("renders both exams with status chips and the group headers", () => {
    const { lastFrame } = render(<ExamMenu rows={rows} onSelect={() => undefined} />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Learner One");
    expect(frame).toContain("Developer One");
    expect(frame).toContain("Learner");
    expect(frame).toContain("Developer");
    expect(frame).toContain("[in progress]");
    expect(frame).toContain("[passed]");
  });

  it("highlights the first item by default and moves the highlight with the down arrow", async () => {
    const { lastFrame, stdin } = render(<ExamMenu rows={rows} onSelect={() => undefined} />);
    await tick();
    const firstFrameLines = (lastFrame() ?? "").split("\n");
    const learnerLine = firstFrameLines.find((line) => line.includes("› Learner One")) ?? "";
    expect(learnerLine).toContain("›");

    stdin.write(DOWN_ARROW);
    await tick();
    const secondFrameLines = (lastFrame() ?? "").split("\n");
    const devLine = secondFrameLines.find((line) => line.includes("› Developer One")) ?? "";
    expect(devLine).toContain("›");
  });

  it("calls onSelect with the highlighted slug on Enter", async () => {
    const onSelect = vi.fn();
    const { stdin } = render(<ExamMenu rows={rows} onSelect={onSelect} />);
    await tick();
    stdin.write(DOWN_ARROW);
    await tick();
    stdin.write(ENTER);
    await tick();
    expect(onSelect).toHaveBeenCalledWith("dev-1");
  });

  it("quits the app when q is pressed", async () => {
    exitSpy.mockClear();
    const { stdin } = render(<ExamMenu rows={rows} onSelect={() => undefined} />);
    await tick();
    stdin.write(QUIT);
    await tick();
    expect(exitSpy).toHaveBeenCalled();
  });

  it("restores a selection and navigates with j/k without starting a challenge", async () => {
    const onSelect = vi.fn();
    const instance = render(<ExamMenu rows={rows} initialSlug="dev-1" onSelect={onSelect} />);
    await tick();
    expect(instance.lastFrame()).toContain("› Developer One");
    instance.stdin.write("k");
    await tick();
    expect(instance.lastFrame()).toContain("› Learner One");
    instance.stdin.write("j");
    await tick();
    expect(onSelect).not.toHaveBeenCalled();
    instance.stdin.write(ENTER);
    await tick();
    expect(onSelect).toHaveBeenCalledWith("dev-1");
    instance.unmount();
  });

  it("keeps off-screen challenges reachable in a short terminal", async () => {
    const catalog = Array.from({ length: 20 }, (_, index) =>
      row({ slug: `item-${String(index)}`, title: `Challenge ${String(index)}` }));
    const onSelect = vi.fn();
    const instance = render(<ExamMenu rows={catalog} onSelect={onSelect} />);
    Object.defineProperty(instance.stdout, "columns", { value: 64 });
    Object.defineProperty(instance.stdout, "rows", { value: 24 });
    instance.stdout.emit("resize");
    await tick();
    instance.stdin.write("k");
    await tick();
    expect(instance.lastFrame()).toContain("› Challenge 0");
    expect(instance.lastFrame()).toContain("Start of list");
    for (let page = 0; page < 10; page++) {
      instance.stdin.write("\u001B[6~");
      await tick();
    }
    expect(instance.lastFrame()).toContain("› Challenge 19");
    expect(instance.lastFrame()).toContain("End of list");
    instance.stdin.write("j");
    await tick();
    expect(instance.lastFrame()).toContain("› Challenge 19");
    expect(instance.lastFrame()?.split("\n").length).toBeLessThanOrEqual(20);
    instance.stdin.write(ENTER);
    await tick();
    expect(onSelect).toHaveBeenCalledWith("item-19");
    instance.unmount();
  });

  it.each([64, 100])("keeps a stable viewport and scrolls only at its edges at %i columns", async (columns) => {
    const catalog = Array.from({ length: 20 }, (_, index) => row({
      slug: `item-${String(index)}`,
      title: `Challenge ${String(index)}`,
      bestScoreLabel: index % 2 === 0 ? "75/100" : null,
      remainingLabel: index % 3 === 0 ? "1h 30m" : null,
    }));
    const instance = render(<ExamMenu rows={catalog} onSelect={() => undefined} />);
    Object.defineProperty(instance.stdout, "columns", { value: columns });
    Object.defineProperty(instance.stdout, "rows", { value: 28 });
    instance.stdout.emit("resize");
    await tick();
    const firstLines = (instance.lastFrame() ?? "").split("\n");
    const aboveLine = firstLines.findIndex((line) => line.includes("Start of list"));
    const belowLine = firstLines.findIndex((line) => line.includes("more below"));
    const count = (belowLine - aboveLine - 1) / 2;
    expect(count).toBe(columns === 64 ? 3 : 6);
    const visibleTitles = (): string[] => (instance.lastFrame() ?? "").split("\n")
      .slice(aboveLine + 1, belowLine)
      .flatMap((line) => line.match(/Challenge \d+/g) ?? []);
    const initialTitles = visibleTitles();
    for (let index = 1; index < count; index++) {
      instance.stdin.write("j");
      await tick();
      expect(visibleTitles()).toEqual(initialTitles);
      const lines = (instance.lastFrame() ?? "").split("\n");
      expect(lines.length).toBe(firstLines.length);
      expect(lines[belowLine]).toContain(`${String(20 - count)} more below`);
      expect(lines.findIndex((line) => line.includes("quit")))
        .toBe(firstLines.findIndex((line) => line.includes("quit")));
    }
    instance.stdin.write("j");
    await tick();
    expect(instance.lastFrame()).toContain("↑ 1 more above");
    expect(instance.lastFrame()).toContain(`↓ ${String(19 - count)} more below`);
    expect(visibleTitles()).toEqual(Array.from({ length: count }, (_, index) => `Challenge ${String(index + 1)}`));
    const scrolledTitles = visibleTitles();
    instance.stdin.write("k");
    await tick();
    expect(visibleTitles()).toEqual(scrolledTitles);
    instance.stdin.write("\u001B[5~");
    await tick();
    expect(instance.lastFrame()).toContain("Start of list");
    expect(visibleTitles()).toEqual(initialTitles);
  });
});
