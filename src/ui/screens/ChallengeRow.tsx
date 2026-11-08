import type { CliExamRow } from "@grademe/contracts";
import { Box, Text } from "ink";
import type { ReactNode } from "react";

import { THEME } from "../theme";
import { CHALLENGE_STATUS } from "./challenge-status";

interface ChallengeRowProps {
  row: CliExamRow;
  active: boolean;
}

export function ChallengeRow({ row, active }: ChallengeRowProps): ReactNode {
  const status = CHALLENGE_STATUS[row.status];
  return (
    <Box flexDirection="column">
      <Text bold={active} inverse={active} wrap="truncate-end">
        {active ? " › " : "   "}{row.title}{" "}
      </Text>
      <Text color={THEME.dim} wrap="truncate-end">
        {"   "}{row.audience === "learner" ? "Learner" : "Developer"} / {row.languageLabel}
        {" · "}<Text color={status.color}>[{status.label}]</Text>
      </Text>
    </Box>
  );
}
