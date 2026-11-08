import { Text } from "ink";
import type { ReactNode } from "react";

import { useMotionFrame } from "../hooks/useMotionFrame";
import { THEME } from "../theme";

const FRAMES = ["›    ", "─›   ", "──›  ", " ──› ", "  ──›", "   ─›", "    ›", "     "];

export interface LoaderProps {
  label: string;
}

export function Loader({ label }: LoaderProps): ReactNode {
  const frame = useMotionFrame(FRAMES.length, 90);
  return (
    <Text>
      <Text color={THEME.accent}>{FRAMES[frame]}</Text>
      <Text bold> {label}</Text>
    </Text>
  );
}
