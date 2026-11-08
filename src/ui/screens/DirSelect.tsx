import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { useState } from "react";
import type { ReactNode } from "react";

import { ensureWritableDir, normalizeWorkspaceDir } from "../../fs/workspace";
import { KeyHints } from "../components/KeyHints";
import { Loader } from "../components/Loader";
import { Panel } from "../components/Panel";
import { friendlyError } from "../friendly-error";
import { THEME } from "../theme";

export interface DirSelectProps {
  initialDir: string;
  onConfirm: (dir: string) => void;
}

export function DirSelect({ initialDir, onConfirm }: DirSelectProps): ReactNode {
  const [value, setValue] = useState(initialDir);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = (raw: string): void => {
    if (checking) return;
    const trimmed = raw.trim();
    const dir = normalizeWorkspaceDir(trimmed.length === 0 ? initialDir : trimmed);
    setError(null);
    setChecking(true);
    void ensureWritableDir(dir)
      .then(() => {
        onConfirm(dir);
      })
      .catch((cause: unknown) => {
        setError(friendlyError(cause));
        setChecking(false);
      });
  };

  return (
    <Panel title="Make room for your next challenge">
      <Text bold>Where should Grademe set up your challenge workspace?</Text>
      <Text color={THEME.dim}>Your editor stays yours. Grademe handles the feedback.</Text>
      <Box marginTop={1}>
        <Text color={THEME.accent}>{"› "}</Text>
        <TextInput focus={!checking} value={value} onChange={setValue} onSubmit={submit} />
      </Box>
      <Box marginTop={1}>
        <Text color={THEME.dim}>Enter to use this folder, or type a different path.</Text>
      </Box>
      <Box flexDirection="column" marginY={1}>
        <Text color={THEME.dim}>├─ subject/     your next assignment</Text>
        <Text color={THEME.dim}>└─ submission/  your code goes here</Text>
      </Box>
      {checking ? <Loader label="Checking workspace" /> : (
        <KeyHints hints={[{ keys: "enter", action: "use this folder" }]} />
      )}
      {error === null ? null : (
        <Box marginTop={1}>
          <Text color={THEME.error}>{error}</Text>
        </Box>
      )}
    </Panel>
  );
}
