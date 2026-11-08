import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";

import { HelpText } from "./HelpText";

describe("HelpText", () => {
  it("lists the session commands", () => {
    const frame = render(<HelpText />).lastFrame() ?? "";
    expect(frame).toContain("Commands:");
    expect(frame).toContain("help:");
    expect(frame).toContain("display this help");
    expect(frame).toContain("status:");
    expect(frame).toContain("display information about the challenge");
    expect(frame).toContain("grademe:");
    expect(frame).toContain("grade your exercise");
    expect(frame).toContain("finish:");
    expect(frame).toContain("exit the challenge");
    expect(frame).not.toMatch(/\bexams?\b/i);
  });

  it("points to grademe.io", () => {
    const frame = render(<HelpText />).lastFrame() ?? "";
    expect(frame).toContain("grademe.io:");
    expect(frame).toContain("no cooldown");
  });
});
