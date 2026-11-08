import { Box, Text } from "ink";
import type { ReactNode } from "react";

import { GRADEME_PROMO } from "../copy";
import { THEME } from "../theme";

export interface CompletionScreenProps {
  examTitle: string;
}

export function CompletionScreen({ examTitle }: CompletionScreenProps): ReactNode {
  return (
    <Box flexDirection="column">
      <Text bold color={THEME.completed}>
        ✓ Congratulations! You have finished {examTitle} !
      </Text>
      <Box height={1} />
      <Text>Challenge complete. Thanks for practicing with Grademe.</Text>
      <Text color={THEME.accent}>{GRADEME_PROMO}</Text>
      <Box height={1} />
      <Text color={THEME.dim}>(Press enter to choose another challenge)</Text>
    </Box>
  );
}
