import { Text } from "ink";
import type { ReactNode } from "react";

import { THEME } from "../theme";

export interface HintsProps {
  items: string[];
}

export function Hints({ items }: HintsProps): ReactNode {
  return <Text color={THEME.dim}>{items.join("  ·  ")}</Text>;
}
