import { rule } from "../text";
import type { TraceSection } from "../types";

export const skippedSection: TraceSection = ({ tests }) => {
  const skipped = tests.filter((entry) => entry.verdict === "skipped").length;
  if (skipped === 0) return [];
  return [
    "",
    rule("skipped"),
    `${String(skipped)} test(s) were not run because an earlier test timed out. Fix that one first; they run again on your next grademe.`,
  ];
};
