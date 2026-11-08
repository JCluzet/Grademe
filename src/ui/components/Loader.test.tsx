import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";

import { Loader } from "./Loader";

describe("Loader", () => {
  it("renders the label without throwing", () => {
    const frame = render(<Loader label="Preparing your workspace" />).lastFrame() ?? "";
    expect(frame).toContain("Preparing your workspace");
  });
});
