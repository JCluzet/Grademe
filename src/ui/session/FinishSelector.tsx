import { Box, Text, useInput } from "ink";
import { useState } from "react";
import type { ReactNode } from "react";

import { THEME } from "../theme";

export interface FinishSelectorProps {
  onConfirm: () => void;
  onCancel: () => void;
}

type Choice = "yes" | "no";

interface Option {
  choice: Choice;
  label: string;
}

const OPTIONS: readonly Option[] = [
  { choice: "yes", label: "Yes" },
  { choice: "no", label: "No" },
];

export function FinishSelector({ onConfirm, onCancel }: FinishSelectorProps): ReactNode {
  const [selected, setSelected] = useState<Choice>("no");

  useInput((input, key) => {
    if (key.leftArrow || input === "h") {
      setSelected("yes");
    } else if (key.rightArrow || input === "l") {
      setSelected("no");
    } else if (key.return) {
      if (selected === "yes") {
        onConfirm();
      } else {
        onCancel();
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Text>Are you sure you want to exit the challenge?</Text>
      <Text color={THEME.dim}>Your progress is saved. Resume anytime with grademe.</Text>
      <Box>
        {OPTIONS.map((option) => {
          const active = option.choice === selected;
          return (
            <Box key={option.choice} marginRight={2}>
              {active ? (
                <Text bold color={THEME.accent}>
                  ▶ [ {option.label} ]
                </Text>
              ) : (
                <Text color={THEME.dim}>{`  [ ${option.label} ]`}</Text>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
