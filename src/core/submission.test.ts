import type { SubmittedFile } from "@grademe/contracts";
import { MAX_SUBMITTED_FILE_CONTENT_LENGTH } from "@grademe/contracts";
import { describe, expect, it } from "vitest";

import { validateSubmission } from "./submission";

function file(path: string, content = "ok"): SubmittedFile {
  return { content, path };
}

describe("validateSubmission", () => {
  it("accepts all expected files when flat, sized, and safe", () => {
    const result = validateSubmission([file("main.c"), file("utils.c")], ["main.c", "utils.c"]);
    expect(result).toEqual({ ok: true });
  });

  it("rejects when an expected file is missing", () => {
    const result = validateSubmission([file("main.c")], ["main.c", "utils.c"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("utils.c");
  });

  it("rejects a file whose content exceeds the size limit", () => {
    const tooBig = "x".repeat(MAX_SUBMITTED_FILE_CONTENT_LENGTH + 1);
    const result = validateSubmission([file("main.c", tooBig)], ["main.c"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("main.c");
  });

  it("rejects an unsafe (non-flat) file name", () => {
    const result = validateSubmission([file("../main.c")], ["../main.c"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("../main.c");
  });

  it("rejects when more than 20 files are submitted", () => {
    const files = Array.from({ length: 21 }, (_, index) => file(`f${String(index)}.c`));
    const expected = files.map((entry) => entry.path);
    const result = validateSubmission(files, expected);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("20");
  });

  it("accepts exactly 20 files", () => {
    const files = Array.from({ length: 20 }, (_, index) => file(`f${String(index)}.c`));
    const expected = files.map((entry) => entry.path);
    expect(validateSubmission(files, expected)).toEqual({ ok: true });
  });
});
