import { displayCommand } from "@grademe/contracts";

import { shortReason } from "../failure-copy";
import type { TestVerdict } from "../test-verdict";
import { ellipsize, rule } from "../text";
import type { TraceSection } from "../types";

const MAX_TITLE_WIDTH = 34;
const MAX_COMMAND_WIDTH = 44;

const LEGEND = [
  "Output is shown as `cat -e` prints it: `$` marks the end of every line.",
  "In each diff, `-` lines are what was expected, `+` lines are what your program printed.",
];

function tag(verdict: TestVerdict): string {
  if (verdict === "passed") return "OK";
  if (verdict === "skipped") return "--";
  return "KO";
}

function widest(values: readonly string[], cap: number): number {
  return Math.min(cap, values.reduce((max, value) => Math.max(max, value.length), 0));
}

export const testsSection: TraceSection = ({ tests }) => {
  if (tests.length === 0) return [];
  const total = String(tests.length);
  const titleWidth = widest(tests.map((entry) => entry.test.title), MAX_TITLE_WIDTH);
  const commands = tests.map((entry) => displayCommand(entry.test.command));
  const commandWidth = widest(commands, MAX_COMMAND_WIDTH);
  const rows = tests.map((entry, position) => {
    const rank = `${String(entry.index + 1).padStart(total.length)}/${total}`;
    const title = ellipsize(entry.test.title, titleWidth).padEnd(titleWidth);
    const command = ellipsize(commands[position] ?? "", commandWidth).padEnd(commandWidth);
    const reason = entry.verdict === "passed" ? "" : `  ← ${shortReason(entry)}`;
    return `${tag(entry.verdict)}  ${rank}  ${title}  ${command}${reason}`.trimEnd();
  });
  return [rule("tests"), ...rows, "", ...LEGEND];
};
