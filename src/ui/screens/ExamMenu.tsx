import type { CliExamRow } from "@grademe/contracts";
import { Box, Text, useApp, useInput } from "ink";
import { useState } from "react";
import type { ReactNode } from "react";

import { KeyHints } from "../components/KeyHints";
import { Panel } from "../components/Panel";
import { useTerminalDimensions } from "../hooks/useTerminalDimensions";
import { THEME } from "../theme";
import { ChallengePreview } from "./ChallengePreview";
import { ChallengeRow } from "./ChallengeRow";

export interface ExamMenuProps {
  rows: CliExamRow[];
  onSelect: (slug: string) => void;
  initialSlug?: string;
}

function revealSelection(start: number, index: number, count: number, total: number): number {
  if (index < start) return index;
  if (index >= start + count) return index - count + 1;
  return Math.min(start, Math.max(0, total - count));
}

export function ExamMenu({ rows, onSelect, initialSlug }: ExamMenuProps): ReactNode {
  const items = [...rows.filter((row) => row.audience === "learner"),
    ...rows.filter((row) => row.audience === "developer")];
  const [navigation, setNavigation] = useState(() => ({
    highlighted: Math.max(0, items.findIndex((row) => initialSlug ? row.slug === initialSlug : row.status === "in_progress")),
    start: 0,
  }));
  const { exit } = useApp();
  const { columns, rows: height } = useTerminalDimensions();
  const wide = columns >= 88;
  const selectedIndex = Math.min(navigation.highlighted, Math.max(0, items.length - 1));
  const selected = items[selectedIndex];
  const headerLines = height < 28 || columns < 58 ? 4 : 7;
  const reserved = headerLines + (wide ? 8 : 15) + (columns < 52 ? 1 : 0);
  const visibleCount = Math.max(1, Math.min(8, Math.floor((height - reserved) / 2)));
  const start = revealSelection(navigation.start, selectedIndex, visibleCount, items.length);
  const below = Math.max(0, items.length - start - visibleCount);

  const move = (delta: number): void => {
    const index = Math.max(0, Math.min(items.length - 1, selectedIndex + delta));
    setNavigation({
      highlighted: index,
      start: revealSelection(start, index, visibleCount, items.length),
    });
  };

  useInput((input, key) => {
    if (input === "q") { exit(); return; }
    if (items.length === 0) return;
    if (key.upArrow || input === "k") {
      move(-1);
    } else if (key.downArrow || input === "j") {
      move(1);
    } else if (key.pageDown) {
      move(visibleCount);
    } else if (key.pageUp) {
      move(-visibleCount);
    } else if (key.return && selected !== undefined) onSelect(selected.slug);
  });

  return (
    <Panel title="Choose your challenge">
      {selected === undefined ? (
        <Box flexDirection="column">
          <Text color={THEME.dim}>No challenges available yet.</Text>
          <Text color={THEME.accent}>Discover them on grademe.io</Text>
        </Box>
      ) : (
        <Box flexDirection={wide ? "row" : "column"} columnGap={3}>
          <Box flexDirection="column" width={wide ? "55%" : "100%"} flexShrink={0}>
            <Box justifyContent="space-between">
              <Text color={THEME.dim}>Challenges</Text>
              <Text color={THEME.dim}>
                {String(selectedIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
              </Text>
            </Box>
            <Text color={THEME.dim}>
              {start === 0 ? "Start of list" : `↑ ${String(start)} more above`}
            </Text>
            {items.slice(start, start + visibleCount).map((row, index) => (
              <ChallengeRow key={row.slug} row={row} active={start + index === selectedIndex} />
            ))}
            <Text color={THEME.dim}>
              {below === 0 ? "End of list" : `↓ ${String(below)} more below`}
            </Text>
          </Box>
          <Box flexDirection="column" flexGrow={1} minWidth={0} marginTop={wide ? 0 : 1}>
            <ChallengePreview exam={selected} compact={!wide} />
          </Box>
        </Box>
      )}
      <Box marginTop={1}>
        <KeyHints hints={[
          { action: "move", keys: "↑↓ / j k" },
          { action: "preview", keys: "enter" },
          { action: "quit", keys: "q" },
        ]} />
      </Box>
    </Panel>
  );
}
