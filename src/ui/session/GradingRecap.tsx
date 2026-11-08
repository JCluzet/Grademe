import type { ExamSubmitStreamDone } from "@grademe/contracts";
import { Box, Text } from "ink";
import type { ReactNode } from "react";

import { THEME } from "../theme";

interface GradingRecapProps {
  done: ExamSubmitStreamDone | null;
  totalLevels: number;
}

export function GradingRecap({ done, totalLevels }: GradingRecapProps): ReactNode {
  if (done === null) return <Text color={THEME.dim}>No correction in this session yet. Type grademe when ready.</Text>;
  const passed = done.result.tests.filter((test) => test.passed).length;
  return (
    <Box flexDirection="column" marginY={1}>
      <Text color={THEME.completed}>{String(done.completedLevelsCount)} / {String(totalLevels)} levels completed</Text>
      <Text>{done.result.compile.ok ? "Compilation passed" : "Compilation failed"}</Text>
      {done.result.tests.length > 0 ? <Text>{String(passed)} / {String(done.result.tests.length)} tests passed</Text> : null}
      <Text color={THEME.dim}>{done.examCompleted ? "Challenge complete. Your result is saved." : "Correction recorded."}</Text>
    </Box>
  );
}
