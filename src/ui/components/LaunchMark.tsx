import { Box, Text } from "ink";
import type { ReactNode } from "react";

import { useMotionFrame } from "../hooks/useMotionFrame";
import { THEME } from "../theme";

const MARK = [
  { id: "top", text: "██▄     " }, { id: "upper", text: "  ██▄   " },
  { id: "point", text: "    ██▸ " }, { id: "lower", text: "  ██▀   " },
  { id: "bottom", text: "██▀     " },
];

export function LaunchMark({ compact = false }: { compact?: boolean }): ReactNode {
  const frame = useMotionFrame(13, 60, true);
  if (compact) {
    const signals = ["›  ", "─› ", "──›", " ─›", "  ›", " › "];
    return <Text color={THEME.accent}>{frame === 12 ? "›  " : signals[frame % signals.length]}</Text>;
  }
  return (
    <Box flexDirection="column" width={9} flexShrink={0}>
      {MARK.map((line, index) => (
        <Text key={line.id} color={THEME.accent} dimColor={frame < index * 2}>
          {line.text}
        </Text>
      ))}
    </Box>
  );
}
