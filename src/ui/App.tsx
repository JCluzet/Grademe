import type { CliExamRow, CliExerciseContent, SubmittedFile } from "@grademe/contracts";
import { Box, useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { openBrowser } from "../auth/open-browser";
import type { WriteTraceArgs } from "../fs/workspace";
import { AppHeader } from "./components/AppHeader";
import { Banner } from "./components/Banner";
import { Loader } from "./components/Loader";
import { Panel } from "./components/Panel";
import { friendlyError } from "./friendly-error";
import { type ExamSessionApi, type WorkspaceFs } from "./hooks/useExamSession";
import { type GradingApi } from "./hooks/useGradingRun";
import { DirSelect } from "./screens/DirSelect";
import { ExamMenu } from "./screens/ExamMenu";
import { ExamReveal } from "./screens/ExamReveal";
import { ChallengeSession } from "./session/ChallengeSession";

export interface AppApi extends ExamSessionApi, GradingApi {
  getCatalog(): Promise<CliExamRow[]>;
}

export interface AppFs extends WorkspaceFs {
  readSubmission(dir: string, content: CliExerciseContent): Promise<SubmittedFile[]>;
  writeTrace(dir: string, args: WriteTraceArgs): Promise<string>;
}

export type ExitReason = "ctrl-c" | "normal";

export interface AppProps {
  api: AppApi;
  fs: AppFs;
  initialDir: string;
  dirExplicit: boolean;
  initialChallenge?: string;
  version: string;
  username: string;
  openUrl?: (url: string) => boolean;
  onExit?: (reason: ExitReason) => void;
}

type Flow =
  | { step: "dir" }
  | { step: "menu" }
  | { step: "reveal"; slug: string }
  | { step: "exam"; slug: string };

export function App({
  api,
  fs,
  initialDir,
  dirExplicit,
  initialChallenge,
  version,
  username,
  openUrl = openBrowser,
  onExit,
}: AppProps): ReactNode {
  const { exit } = useApp();
  const [exiting, setExiting] = useState(false);
  const [dir, setDir] = useState(initialDir);
  const [flow, setFlow] = useState<Flow>(() =>
    dirExplicit ? { step: "menu" } : { step: "dir" },
  );

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      onExit?.("ctrl-c");
      setExiting(true);
    }
  });

  useEffect(() => {
    if (!exiting) return;
    const id = setTimeout(() => {
      exit();
    }, 0);
    return () => {
      clearTimeout(id);
    };
  }, [exiting, exit]);

  return (
    <Box flexDirection="column">
      <AppHeader username={username} version={version} compact={flow.step === "exam"} />
      <Screen
        api={api}
        dir={dir}
        flow={flow}
        fs={fs}
        initialDir={initialDir}
        initialChallenge={initialChallenge}
        openUrl={openUrl}
        setDir={setDir}
        setFlow={setFlow}
      />
    </Box>
  );
}

interface ScreenProps {
  api: AppApi;
  fs: AppFs;
  dir: string;
  initialDir: string;
  initialChallenge: string | undefined;
  flow: Flow;
  openUrl: (url: string) => boolean;
  setDir: (dir: string) => void;
  setFlow: (flow: Flow) => void;
}

function Screen({
  api,
  fs,
  dir,
  initialDir,
  initialChallenge,
  flow,
  openUrl,
  setDir,
  setFlow,
}: ScreenProps): ReactNode {
  if (flow.step === "dir") {
    return (
      <DirSelect
        initialDir={initialDir}
        onConfirm={(chosen) => {
          setDir(chosen);
          setFlow({ step: "menu" });
        }}
      />
    );
  }

  if (flow.step === "exam") {
    return (
      <Panel>
        <ChallengeSession
          api={api}
          dir={dir}
          fs={fs}
          onComplete={() => { setFlow({ step: "menu" }); }}
          openUrl={openUrl}
          slug={flow.slug}
        />
      </Panel>
    );
  }

  return <CatalogStep api={api} flow={flow} initialChallenge={initialChallenge} setFlow={setFlow} />;
}

interface CatalogStepProps {
  api: Pick<AppApi, "getCatalog">;
  flow: { step: "menu" } | { step: "reveal"; slug: string };
  setFlow: (flow: Flow) => void;
  initialChallenge: string | undefined;
}

function CatalogStep({ api, flow, initialChallenge, setFlow }: CatalogStepProps): ReactNode {
  const [selectedSlug, setSelectedSlug] = useState(initialChallenge ?? "");
  const [rows, setRows] = useState<CliExamRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void api
      .getCatalog()
      .then((catalog) => {
        if (!signal.aborted) setRows(catalog);
      })
      .catch((cause: unknown) => {
        if (!signal.aborted) setError(friendlyError(cause));
      });
    return () => {
      controller.abort();
    };
  }, [api]);

  if (error !== null) {
    return (
      <Panel title="Challenges">
        <Banner variant="error">{error}</Banner>
      </Panel>
    );
  }
  if (rows === null) {
    return (
      <Panel title="Challenges">
        <Loader label="Loading challenges" />
      </Panel>
    );
  }

  if (flow.step === "reveal") {
    const exam = rows.find((row) => row.slug === flow.slug);
    if (exam === undefined) {
      return (
        <Panel title="Challenges">
          <Banner variant="error">That challenge is no longer available.</Banner>
        </Panel>
      );
    }
    return (
      <ExamReveal
        exam={exam}
        onBack={() => { setFlow({ step: "menu" }); }}
        onStart={() => {
          setFlow({ step: "exam", slug: exam.slug });
        }}
      />
    );
  }

  return (
    <>
      {selectedSlug !== "" && !rows.some((row) => row.slug === selectedSlug) ? (
        <Banner variant="error">That challenge is not available in your CLI catalog. Choose another below.</Banner>
      ) : null}
      <ExamMenu
      rows={rows}
      initialSlug={selectedSlug}
      onSelect={(slug) => {
        setSelectedSlug(slug);
        setFlow({ step: "reveal", slug });
      }}
    />
    </>
  );
}
