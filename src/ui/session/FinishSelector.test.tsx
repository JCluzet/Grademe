import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";

import { FinishSelector } from "./FinishSelector";

describe("FinishSelector", () => {
  it("renders the prompt, resumable wording and both options", () => {
    const frame =
      render(<FinishSelector onCancel={vi.fn()} onConfirm={vi.fn()} />).lastFrame() ?? "";

    expect(frame).toContain("Are you sure you want to exit the challenge?");
    expect(frame).not.toMatch(/\bexams?\b/i);
    expect(frame).toContain("Your progress is saved. Resume anytime with grademe.");
    expect(frame).toContain("Yes");
    expect(frame).toContain("No");
    expect(frame).not.toContain("lost");
  });
});
