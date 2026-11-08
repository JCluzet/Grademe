import { describe, expect, it } from "vitest";

import { cooldownMessage } from "./cooldown";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

describe("cooldownMessage", () => {
  it("spells out minutes and seconds when at least one minute remains", () => {
    expect(cooldownMessage(2 * MINUTE + 15 * SECOND)).toBe(
      "ERROR: You must wait at least 2 minutes and 15 seconds until next grading request, so take your time to make more tests and be sure you will succeed next try!",
    );
  });

  it("keeps the seconds remainder even when it is zero", () => {
    expect(cooldownMessage(1 * MINUTE)).toBe(
      "ERROR: You must wait at least 1 minutes and 0 seconds until next grading request, so take your time to make more tests and be sure you will succeed next try!",
    );
  });

  it("drops to seconds-only under a minute", () => {
    expect(cooldownMessage(45 * SECOND)).toBe(
      "ERROR: You must wait at least 45 seconds until next grading request, so take your time to make more tests and be sure you will succeed next try!",
    );
  });

  it("clamps a non-positive remaining time to 0 seconds", () => {
    expect(cooldownMessage(-1)).toBe(
      "ERROR: You must wait at least 0 seconds until next grading request, so take your time to make more tests and be sure you will succeed next try!",
    );
  });
});
