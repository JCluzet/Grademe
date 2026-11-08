import { Box, Text } from "ink";
import type { ReactNode } from "react";

import { useTerminalDimensions } from "../hooks/useTerminalDimensions";
import { THEME } from "../theme";
import { LaunchMark } from "./LaunchMark";

export interface AppHeaderProps {
  version: string;
  username: string;
  compact?: boolean;
}

export function AppHeader({ version, username, compact = false }: AppHeaderProps): ReactNode {
  const { columns, rows } = useTerminalDimensions();
  const small = compact || rows < 28 || columns < 58;
  return (
    <Box flexDirection="column" paddingX={2} marginY={1}>
      <Box columnGap={2}>
        {small ? null : <LaunchMark />}
        <Box flexDirection="column" flexGrow={1} minWidth={0}>
          <Box justifyContent="space-between">
            <Box>
              {small ? <LaunchMark compact /> : null}
              <Text bold>{small ? "Grademe" : "G R A D E M E"}</Text>
            </Box>
            <Text color={THEME.dim}>v{version}</Text>
          </Box>
          {small ? null : <Text>Code. Pass. Repeat.</Text>}
          {small ? null : <Box height={1} />}
          <Text color={THEME.dim} wrap="truncate-end">
            <Text color={THEME.accent}>● </Text>connected as {username}
          </Text>
          {small ? null : <Text color={THEME.dim}>Grademe / your terminal, your editor.</Text>}
        </Box>
      </Box>
    </Box>
  );
}
