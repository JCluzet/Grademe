import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";

import { FailureBanner, SuccessBanner } from "./Banners";

describe("SuccessBanner", () => {
  it("renders the success rule", () => {
    const frame = render(<SuccessBanner />).lastFrame() ?? "";
    expect(frame).toContain("✓ SUCCESS");
  });
});

describe("FailureBanner", () => {
  it("renders the failure rule and the failed-assignment line", () => {
    const frame = render(<FailureBanner headline="compilation failed" />).lastFrame() ?? "";
    expect(frame).toContain("× FAILURE");
    expect(frame).toContain("You have failed the assignment.");
    expect(frame).toContain("Why: compilation failed");
    expect(frame).not.toContain("Trace saved to");
  });

  it("renders the trace line when a path is given", () => {
    const frame =
      render(<FailureBanner headline="1 of 2 tests failed" tracePath="~/exam/traces/0-0_string_length.trace" />).lastFrame() ??
      "";
    expect(frame).toContain("Trace saved to ~/exam/traces/0-0_string_length.trace");
  });

  it("omits the trace line for an empty path", () => {
    const frame = render(<FailureBanner headline="timeout" tracePath="" />).lastFrame() ?? "";
    expect(frame).not.toContain("Trace saved to");
  });
});
