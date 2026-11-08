import { Box, Text } from "ink";
import type { ReactNode } from "react";

import { THEME } from "../theme";

const SUCCESS_LINE = "✓ SUCCESS / one step further.";
const FAILURE_LINE = "× FAILURE / try another approach.";

export function SuccessBanner(): ReactNode {
  return <Box marginY={1}><Text bold color={THEME.completed}>{SUCCESS_LINE}</Text></Box>;
}

export interface FailureBannerProps {
  headline: string;
  tracePath?: string | null;
}

export function FailureBanner({ headline, tracePath = null }: FailureBannerProps): ReactNode {
  return (
    <Box flexDirection="column">
      <Text color={THEME.error}>{FAILURE_LINE}</Text>
      <Text>You have failed the assignment.</Text>
      <Text>
        Why: <Text color={THEME.error}>{headline}</Text>
      </Text>
      {tracePath !== null && tracePath !== "" ? (
        <Text>
          Trace saved to <Text color={THEME.accent}>{tracePath}</Text>
        </Text>
      ) : null}
    </Box>
  );
}
