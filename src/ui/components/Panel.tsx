import { Box, Text } from "ink";
import type { ReactNode } from "react";

export interface PanelProps {
  title?: string;
  children: ReactNode;
}

export function Panel({ title, children }: PanelProps): ReactNode {
  return (
    <Box flexDirection="column" paddingX={2} marginBottom={1}>
      {title === undefined ? null : (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>{title}</Text>
        </Box>
      )}
      {children}
    </Box>
  );
}
