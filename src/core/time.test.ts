import { describe, expect, it } from "vitest";

import { formatRemaining } from "./time";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

describe("formatRemaining", () => {
  it("renders hrs/min/sec with zero-padded fields", () => {
    expect(formatRemaining(2 * HOUR + 5 * MINUTE + 9 * SECOND)).toBe(
      "2hrs, 05min and 09sec",
    );
  });

  it("keeps full-width minute and second values", () => {
    expect(formatRemaining(3 * HOUR + 59 * MINUTE + 59 * SECOND)).toBe(
      "3hrs, 59min and 59sec",
    );
  });

  it("shows zero hours when under an hour", () => {
    expect(formatRemaining(12 * MINUTE + 30 * SECOND)).toBe("0hrs, 12min and 30sec");
  });

  it("floors sub-second remainders", () => {
    expect(formatRemaining(SECOND + 999)).toBe("0hrs, 00min and 01sec");
  });

  it("renders exactly zero as the full zero string (matches the C++ ==0 path)", () => {
    expect(formatRemaining(0)).toBe("0hrs, 00min and 00sec");
  });

  it("returns the bare '0' for a negative remaining time", () => {
    expect(formatRemaining(-5000)).toBe("0");
  });
});
