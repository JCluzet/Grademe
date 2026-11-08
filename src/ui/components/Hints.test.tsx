import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";

import { Hints } from "./Hints";

describe("Hints", () => {
  it("renders each hint label", () => {
    const frame = render(<Hints items={["grademe ⏎", "help"]} />).lastFrame() ?? "";
    expect(frame).toContain("grademe");
    expect(frame).toContain("help");
  });
});
