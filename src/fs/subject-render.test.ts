import type { CliExerciseContent } from "@grademe/contracts";
import { describe, expect, it } from "vitest";

import { renderSubject } from "./subject-render";

const content: CliExerciseContent = {
  allowedFunctions: ["write", "malloc"],
  assignmentName: "string_length",
  examples: [
    { command: "./a.out hello", output: "5" },
    { command: "./a.out", output: "" },
  ],
  expectedFiles: ["string_length.c", "string_length.h"],
  instructions: "Write a function that returns the length of a string.",
  kind: "function",
  language: "c",
  slug: "ft-strlen",
};

describe("renderSubject", () => {
  it("renders the subject.en.txt layout in order", () => {
    const text = renderSubject(content);

    expect(text).toBe(
      [
        "Assignment name: string_length",
        "Expected files: string_length.c, string_length.h",
        "Allowed functions: write, malloc",
        "--------------------------------------------------------------------------------",
        "Write a function that returns the length of a string.",
        "",
        "Examples:",
        "",
        "$ ./a.out hello",
        "5",
        "",
        "$ ./a.out",
        "",
      ].join("\n"),
    );
  });

  it("renders Allowed functions as None when empty", () => {
    const text = renderSubject({ ...content, allowedFunctions: [] });

    expect(text).toContain("Allowed functions: None");
  });

  it("omits the Examples section when there are no examples", () => {
    const text = renderSubject({ ...content, examples: [] });

    expect(text).not.toContain("Examples:");
  });

  it("uses LF line endings only", () => {
    const text = renderSubject(content);

    expect(text).not.toContain("\r");
  });
});
