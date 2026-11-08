import { formatUtc } from "../text";
import type { TraceSection } from "../types";

export const headerSection: TraceSection = ({ meta }) => {
  const exercise =
    meta.exerciseTitle !== "" && meta.exerciseTitle !== meta.exerciseSlug
      ? `${meta.exerciseSlug}: ${meta.exerciseTitle}`
      : meta.exerciseSlug;
  return [
    "Grademe trace",
    `  challenge   ${meta.examSlug} · level ${String(meta.level)} · try ${String(meta.attempt)}`,
    `  exercise    ${exercise}`,
    `  graded      ${formatUtc(meta.gradedAt)} UTC`,
    `  client      grademe CLI ${meta.cliVersion}`,
    "",
  ];
};
