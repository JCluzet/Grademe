import type { CliExamRow } from "@grademe/contracts";
import { Box, Text, useInput } from "ink";
import type { ReactNode } from "react";

import { KeyHints } from "../components/KeyHints";
import { Panel } from "../components/Panel";
import { useTerminalDimensions } from "../hooks/useTerminalDimensions";
import { THEME } from "../theme";

export interface ExamRevealProps {
  exam: CliExamRow;
  onStart: () => void;
  onBack?: () => void;
}

const STEPS = [
  { key: "01", title: "Read the subject", short: "subject/subject.en.txt", text: "Open subject/subject.en.txt in your editor." },
  { key: "02", title: "Make it work", short: "submission/<assignment>/", text: "Write your files in submission/<assignment>/." },
  { key: "03", title: "Send it", short: "Type grademe, then Enter.", text: "Type grademe here. Pass → next level. Fail → try again." },
];

export function ExamReveal({ exam, onStart, onBack }: ExamRevealProps): ReactNode {
  const { columns, rows } = useTerminalDimensions();
  const compact = columns < 58 || rows < 28;
  useInput((_input, key) => {
    if (key.return) onStart();
    else if (key.escape) onBack?.();
  });
  return (
    <Panel>
      <Box marginBottom={1} flexDirection="column">
        <Text bold>{exam.title}</Text>
        <Text color={THEME.dim}>
          {exam.languageLabel} / {exam.durationLabel} / {exam.levelLabel} levels
        </Text>
      </Box>
      <Text>Keep this terminal open. Code in another window.</Text>
      <Box flexDirection="column" marginY={1}>
        {STEPS.map((step) => (
          <Box key={step.key} marginBottom={compact ? 0 : 1} columnGap={2}>
            <Text color={THEME.accent}>{step.key}</Text>
            <Box flexDirection="column" flexShrink={1}>
              <Text bold>{step.title}</Text>
              <Text color={THEME.dim}>{compact ? step.short : step.text}</Text>
            </Box>
          </Box>
        ))}
      </Box>
      <Text color={THEME.dim}>Each failed attempt increases the cooldown. No git needed.</Text>
      <Text color={THEME.dim}>Practice without cooldowns on <Text underline>grademe.io</Text>.</Text>
      <Box marginTop={1}>
        <KeyHints hints={[
          { keys: "enter", action: exam.status === "in_progress" ? "resume challenge" : "start challenge" },
          ...(onBack === undefined ? [] : [{ keys: "esc", action: "back" }]),
        ]} />
      </Box>
    </Panel>
  );
}
