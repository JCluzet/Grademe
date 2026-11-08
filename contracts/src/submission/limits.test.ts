import { describe, expect, it } from "vitest";

import {
  isWithinSubmittedFileContentLimit,
  MAX_SUBMITTED_FILE_CONTENT_LENGTH,
  MAX_SUBMITTED_FILE_COUNT,
} from "./limits";

describe("submission limits", () => {
  it("accepts content at the limit", () => {
    expect(isWithinSubmittedFileContentLimit("a".repeat(MAX_SUBMITTED_FILE_CONTENT_LENGTH))).toBe(true);
  });

  it("rejects content over the limit", () => {
    expect(isWithinSubmittedFileContentLimit("a".repeat(MAX_SUBMITTED_FILE_CONTENT_LENGTH + 1))).toBe(false);
  });

  it("pins the limit at 20_000", () => {
    expect(MAX_SUBMITTED_FILE_CONTENT_LENGTH).toBe(20_000);
  });

  it("pins the file-count limit at 20", () => {
    expect(MAX_SUBMITTED_FILE_COUNT).toBe(20);
  });
});
