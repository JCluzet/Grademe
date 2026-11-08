import type { CliExamRow } from "@grademe/contracts";
import { Box, Text } from "ink";
import type { ReactNode } from "react";

import { THEME } from "../theme";
import { CHALLENGE_STATUS } from "./challenge-status";

interface ChallengePreviewProps {
  exam: CliExamRow;
  compact: boolean;
}

export function ChallengePreview({ exam, compact }: ChallengePreviewProps): ReactNode {
  const status = CHALLENGE_STATUS[exam.status];
  const completed = Math.max(0, Math.min(16, Math.round(exam.progressPercent * 16 / 100)));
  return (
    <Box flexDirection="column" minWidth={0}>
      <Text bold wrap="truncate-end">{exam.title}</Text>
      <Text color={THEME.dim} wrap="truncate-end">{exam.languageLabel} / {exam.durationLabel}</Text>
      <Box marginTop={compact ? 0 : 1} columnGap={1}>
        <Text color={exam.status === "passed" ? THEME.completed : THEME.accent}>
          {"━".repeat(completed)}<Text color={THEME.dim}>{"─".repeat(16 - completed)}</Text>
        </Text>
        <Text>{String(exam.progressPercent)}%</Text>
      </Box>
      <Text color={THEME.dim} wrap="truncate-end">{exam.levelLabel} levels · <Text color={status.color}>{status.label}</Text></Text>
      <Box flexDirection="column" height={2} flexShrink={0}>
        <Text wrap="truncate-end">{exam.remainingLabel === null ? " " : `${exam.remainingLabel} remaining`}</Text>
        <Text color={THEME.completed} wrap="truncate-end">
          {exam.bestScoreLabel === null ? " " : `Best ${exam.bestScoreLabel}`}
        </Text>
      </Box>
      {compact ? null : (
        <Box marginTop={1} flexDirection="column">
          <Text>One subject at a time.</Text>
          <Text color={THEME.dim}>Your editor. Live feedback.</Text>
          <Text color={THEME.dim}>Progress saved as you go.</Text>
        </Box>
      )}
    </Box>
  );
}
