import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";

import { DirSelect } from "./DirSelect";

describe("DirSelect", () => {
  it("renders the prompt, the pre-filled path and the hint", () => {
    const frame =
      render(<DirSelect initialDir="/tmp/x" onConfirm={() => undefined} />).lastFrame() ?? "";
    expect(frame).toContain("Where should Grademe set up your challenge workspace?");
    expect(frame).not.toMatch(/\bexams?\b/i);
    expect(frame).toContain("/tmp/x");
    expect(frame).toContain("Enter to use this folder, or type a different path.");
  });
});
