import { Box, Text } from "ink";
import type { ReactNode } from "react";

import type { GradingProgress } from "../../core/sse-reducer";
import { Loader } from "../components/Loader";
import { THEME } from "../theme";

const MS_PER_SECOND = 1000;

export interface GradingViewProps {
  progress: GradingProgress;
  elapsedMs: number;
}

export function GradingView({ progress, elapsedMs }: GradingViewProps): ReactNode {
  const { compile, tests } = progress;
  const status = compile === null ? "Compiling…" : "Running tests…";
  const elapsedSeconds = Math.floor(elapsedMs / MS_PER_SECOND);

  return (
    <Box flexDirection="column">
      <Text>We will now wait for the job to complete.</Text>
      <Text>
        Please be <Text color={THEME.accent}>patient</Text>, this can take a few seconds…
      </Text>
      <Box marginY={1}><Loader label={status} /></Box>
      {tests.map((test) => (
        <Text key={test.testId} color={test.passed ? THEME.success : THEME.error}>
          {test.passed ? "✓" : "✗"} {test.title}
        </Text>
      ))}
      <Text color={THEME.dim}>{`⏱ ${String(elapsedSeconds)}s`}</Text>
    </Box>
  );
}
