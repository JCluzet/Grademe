import type { CliExerciseContent, CliSessionView } from "@grademe/contracts";
import { Box, Text } from "ink";
import type { ReactNode } from "react";

import { formatRemaining } from "../../core/time";
import { levelSubmissionDir, subjectFilePath } from "../../fs/workspace";
import { useTerminalDimensions } from "../hooks/useTerminalDimensions";
import { THEME } from "../theme";

export interface SessionStatusProps {
  session: CliSessionView;
  exercise: CliExerciseContent;
  dir: string;
  nowMs: number;
}

export function SessionStatus({ session, exercise, dir, nowMs }: SessionStatusProps): ReactNode {
  const remaining = formatRemaining(Date.parse(session.expiresAt) - nowMs);
  const { columns, rows } = useTerminalDimensions();
  const compact = rows < 30 || columns < 68;
  return (
    <Box flexDirection="column">
      <Text bold wrap="truncate-end">Current assignment / {exercise.assignmentName}</Text>
      <Text color={THEME.dim}>
        Level {String(session.currentLevel)} / {String(session.totalLevels)}
        {" · "}<Text color={THEME.completed}>{String(session.score)}/100</Text>
        {" · "}{String(session.pointsPerLevel)} potential points
      </Text>
      <Box marginY={1} flexDirection="column">
        <Text><Text color={THEME.accent}>› </Text>{remaining} remaining</Text>
        <Text color={THEME.dim}>REAL mode · Your grade will be counted</Text>
        {compact ? null : <Text color={THEME.dim}>Ends {new Date(session.expiresAt).toLocaleString()}</Text>}
      </Box>
      <Text color={THEME.dim}>Assignments:{compact ? ` ${String(session.levels.filter((level) => level.status === "passed").length)} completed` : ""}</Text>
      {!compact && session.levels.length > 4 ? <Text color={THEME.dim}>  … earlier levels completed</Text> : null}
      {session.levels.slice(compact ? -1 : -4).map((level) => (
        <Text key={level.index} wrap="truncate-end">
          <Text color={level.status === "passed" ? THEME.completed : THEME.accent}>
            {level.status === "passed" ? "  ✓ " : "  › "}
          </Text>
          {level.assignmentName}
          <Text color={THEME.dim}> {level.status === "passed" ? "(Success)" : "(Current)"}</Text>
        </Text>
      ))}
      {session.currentTry > 0 ? (
        <Text color={THEME.dim}>  {String(session.currentTry)} unsuccessful attempts (Failure)</Text>
      ) : null}
      <Box marginY={1} flexDirection="column">
        <Text color={THEME.dim}>Subject</Text>
        <Text wrap="truncate-middle">{subjectFilePath(dir)}</Text>
        <Text color={THEME.dim}>Submission</Text>
        <Text wrap="truncate-middle">{levelSubmissionDir(dir, exercise)}/</Text>
      </Box>
      <Text color={THEME.dim}>Grademe commands only. Code in another terminal.</Text>
    </Box>
  );
}
