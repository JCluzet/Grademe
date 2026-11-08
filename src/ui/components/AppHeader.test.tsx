import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";

import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("renders the brand mark, version and connected identity", () => {
    const frame =
      render(<AppHeader username="ada@example.com" version="1.2.3" />).lastFrame() ?? "";
    expect(frame).toContain("Grademe");
    expect(frame).toContain("1.2.3");
    expect(frame).toContain("connected as");
    expect(frame).toContain("ada@example.com");
  });
});
