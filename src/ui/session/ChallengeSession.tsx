import type { ExamSubmitStreamDone } from "@grademe/contracts";
import { Box, Text, useInput } from "ink";
import { useState, type ReactNode } from "react";

import { Loader } from "../components/Loader";
import {
  useExamSession,
  type ExamSessionApi,
  type WorkspaceFs,
} from "../hooks/useExamSession";
import { type GradingApi } from "../hooks/useGradingRun";
import { THEME } from "../theme";
import { CompletionScreen } from "./CompletionScreen";
import { ExamWorkspace, type ExamWorkspaceFs } from "./ExamWorkspace";

export type ChallengeSessionApi = ExamSessionApi & GradingApi;

export interface ChallengeSessionFs extends WorkspaceFs, ExamWorkspaceFs {}

export interface ChallengeSessionProps {
  api: ChallengeSessionApi;
  fs: ChallengeSessionFs;
  dir: string;
  slug: string;
  onComplete: () => void;
  openUrl: (url: string) => boolean;
}

export function ChallengeSession({
  api,
  fs,
  dir,
  slug,
  onComplete,
  openUrl,
}: ChallengeSessionProps): ReactNode {
  const session = useExamSession({ api, dir, fs, slug });
  const [lastCorrection, setLastCorrection] = useState<ExamSubmitStreamDone | null>(null);

  useInput(
    (_input, key) => {
      if (key.return) onComplete();
    },
    { isActive: session.status === "completed" },
  );

  if (session.status === "loading") {
    return <Loader label="Preparing your workspace" />;
  }

  if (session.status === "error") {
    return <Text color={THEME.error}>{session.error ?? "Something went wrong."}</Text>;
  }

  if (session.status === "unsupported") {
    return (
      <Box flexDirection="column">
        <Text color={THEME.warn}>
          This challenge includes a server exercise, not supported in the CLI v1.
        </Text>
        <Text>
          Run it on <Text color={THEME.accent}>grademe.io</Text> instead.
        </Text>
      </Box>
    );
  }

  if (session.status === "completed") {
    return <CompletionScreen examTitle={slug} />;
  }

  const view = session.session;
  const exercise = session.exercise;
  if (view === null || exercise === null) {
    return <Text color={THEME.dim}>Preparing your session…</Text>;
  }

  return (
    <ExamWorkspace
      api={api}
      dir={dir}
      exercise={exercise}
      fs={fs}
      onRefresh={session.refresh}
      onComplete={onComplete}
      onCorrection={setLastCorrection}
      lastCorrection={lastCorrection}
      openUrl={openUrl}
      slug={slug}
      view={view}
    />
  );
}
