import { displayCommand, type GradeTestResult } from "@grademe/contracts";

import { splitCatE } from "../cat-e";
import { longReason } from "../failure-copy";
import { unifiedDiff } from "../line-diff";
import { isFailedVerdict, outputMatched } from "../test-verdict";
import { clipBlock, rule } from "../text";
import type { TraceSection, TraceTest } from "../types";

const MAX_STDERR_LINES = 20;
const NO_LINE_DIFFERS =
  "(no line differs: the outputs differ only in their final newline or trailing bytes)";

function exitLine(test: GradeTestResult): string[] {
  if (test.timedOut) return [];
  if (test.signal !== null) return [`exit      ${String(test.exitCode)} (signal ${test.signal})`];
  return [`exit      ${String(test.exitCode)}`];
}

function outputBlock(test: GradeTestResult): string[] {
  if (outputMatched(test)) return ["output    identical to expected"];
  const expected = splitCatE(test.expected);
  const actual = splitCatE(test.actual);
  const hunks = unifiedDiff(expected, actual);
  return [
    `--- expected${expected.length === 0 ? "  (no output)" : ""}`,
    `+++ got${actual.length === 0 ? "       (no output)" : ""}`,
    ...(hunks.length === 0 ? [NO_LINE_DIFFERS] : hunks),
  ];
}

function stderrBlock(test: GradeTestResult): string[] {
  const stderr = test.stderr?.trim() ?? "";
  if (stderr === "") return [];
  return ["", "stderr:", ...clipBlock(stderr, MAX_STDERR_LINES).map((line) => `  ${line}`)];
}

function failureBlock(entry: TraceTest, total: string): string[] {
  return [
    "",
    rule(`KO ${String(entry.index + 1)}/${total} · ${entry.test.title}`),
    `command   ${displayCommand(entry.test.command)}`,
    `reason    ${longReason(entry)}`,
    ...exitLine(entry.test),
    "",
    ...outputBlock(entry.test),
    ...stderrBlock(entry.test),
  ];
}

export const failureSection: TraceSection = ({ tests }) => {
  const total = String(tests.length);
  return tests.filter((entry) => isFailedVerdict(entry.verdict)).flatMap((entry) => failureBlock(entry, total));
};
