import { clipBlock, rule } from "../text";
import type { TraceSection } from "../types";

const MAX_BUILD_LINES = 40;
const NO_TEST_RAN = "No test ran. Fix the build, then run grademe again.";

export const buildSection: TraceSection = ({ compile, compileKind }) => {
  const stderr = compile.stderr?.trim() ?? "";
  switch (compileKind) {
    case null:
      return [];
    case "forbidden":
      return [
        rule("build"),
        ...clipBlock(stderr, MAX_BUILD_LINES),
        "",
        "The build was refused before compiling. Replace the forbidden call with allowed functions only.",
        "",
        NO_TEST_RAN,
      ];
    case "none":
      return [
        rule("build"),
        "The grader could not compile your code but produced no diagnostic.",
        "This is usually a transient issue on our side: run grademe again.",
        "If it happens twice in a row, report it from grademe.io (Feedback button).",
        "",
        NO_TEST_RAN,
      ];
    case "diagnostic":
      return [rule("build"), "compiler output:", ...clipBlock(stderr, MAX_BUILD_LINES), "", NO_TEST_RAN];
  }
};
