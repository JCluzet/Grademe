import type { CliExerciseContent } from "@grademe/contracts";
import { Box, Text } from "ink";
import type { ReactNode } from "react";

import { levelSubmissionDir } from "../../fs/workspace";
import { THEME } from "../theme";

interface WorkspaceGuideProps {
  dir: string;
  exercise: CliExerciseContent;
}

export function WorkspaceGuide({ dir, exercise }: WorkspaceGuideProps): ReactNode {
  const folder = levelSubmissionDir(dir, exercise);
  const quoted = `'${folder.replaceAll("'", "'\\''")}'`;
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>This is Grademe, not a shell.</Text>
      <Text>Open another terminal tab to use ls, touch, vim or your editor.</Text>
      <Box flexDirection="column">
        <Text color={THEME.dim}>In that other terminal (bash / zsh):</Text>
        <Text color={THEME.accent}>cd {quoted}</Text>
      </Box>
      <Text>Keep this tab for grading. Your challenge clock keeps running.</Text>
      <Text color={THEME.dim}>Type status to return, or grademe when your files are ready.</Text>
    </Box>
  );
}
