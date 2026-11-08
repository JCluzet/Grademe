import { Box, Text } from "ink";
import type { ReactNode } from "react";

import { THEME } from "../theme";

export interface KeyHint {
  keys: string;
  action: string;
}

export interface KeyHintsProps {
  hints: KeyHint[];
}

export function KeyHints({ hints }: KeyHintsProps): ReactNode {
  return (
    <Box flexWrap="wrap" columnGap={2}>
      {hints.map((hint) => (
        <Text key={hint.keys} color={THEME.dim}>
          <Text bold inverse>
            {` ${hint.keys} `}
          </Text>{" "}
          {hint.action}
        </Text>
      ))}
    </Box>
  );
}
