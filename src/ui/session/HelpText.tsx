import { Box, Text } from "ink";
import type { ReactNode } from "react";

import { GRADEME_PROMO } from "../copy";
import { THEME } from "../theme";

interface HelpCommand {
  name: string;
  description: string;
}

const COMMANDS: readonly HelpCommand[] = [
  { description: " display this help", name: "help:" },
  { description: " display information about the challenge", name: "status:" },
  { description: " show where to code in another terminal", name: "workspace:" },
  { description: " review your last correction in this session", name: "result:" },
  { description: " grade your exercise", name: "grademe:" },
  { description: " exit the challenge", name: "finish:" },
];

export function HelpText(): ReactNode {
  return (
    <Box flexDirection="column">
      <Text>Commands:</Text>
      {COMMANDS.map((command) => (
        <Text key={command.name}>
          {"    "}
          <Text color={THEME.accent}>{command.name}</Text>
          {command.description}
        </Text>
      ))}
      <Text>
        {"    "}
        <Text color={THEME.accent}>grademe.io:</Text> {GRADEME_PROMO}
      </Text>
      <Text color={THEME.dim}>Use ↑ and ↓ to recall previous commands.</Text>
    </Box>
  );
}
