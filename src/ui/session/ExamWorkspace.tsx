import type {
  CliExerciseContent,
  CliSessionView,
  ExamSubmitStreamDone,
  SubmittedFile,
} from "@grademe/contracts";
import { useApp, useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { cooldownMessage } from "./cooldown";
import { runExamCommand } from "./exam-commands";
import { buildFailureTrace, gradingFailureMessage } from "./exam-workspace-outcome";
import {
  ExamWorkspaceView,
  RESULT_FAIL_MODE,
  RESULT_PASS_MODE,
  type ExamWorkspaceMode,
  type Feedback,
} from "./ExamWorkspaceView";
import { parseExamCommand } from "../../core/exam-command";
import { validateSubmission } from "../../core/submission";
import { CliError } from "../../errors";
import {
  useGradingRun,
  type GradingApi,
  type GradingRunOutcome,
} from "../hooks/useGradingRun";
import { usePromptHistory } from "../hooks/usePromptHistory";

const ELAPSED_TICK_MS = 250;

export interface WriteTraceArgs {
  level: number;
  attempt: number;
  exerciseSlug: string;
  content: string;
}

export interface ExamWorkspaceFs {
  readSubmission(dir: string, content: CliExerciseContent): Promise<SubmittedFile[]>;
  writeTrace(dir: string, args: WriteTraceArgs): Promise<string>;
}

export interface ExamWorkspaceProps {
  api: GradingApi;
  fs: ExamWorkspaceFs;
  dir: string;
  slug: string;
  view: CliSessionView;
  exercise: CliExerciseContent;
  onRefresh: () => void;
  onComplete: () => void;
  openUrl: (url: string) => boolean;
  lastCorrection?: ExamSubmitStreamDone | null;
  onCorrection?: (done: ExamSubmitStreamDone) => void;
}

export function ExamWorkspace({
  api,
  fs,
  dir,
  slug,
  view,
  exercise,
  onRefresh,
  onComplete,
  openUrl,
  lastCorrection = null,
  onCorrection,
}: ExamWorkspaceProps): ReactNode {
  const { exit } = useApp();
  const grading = useGradingRun({ api, session: view, slug });

  const [mode, setMode] = useState<ExamWorkspaceMode>({ feedback: null, kind: "idle" });
  const [input, setInput] = useState("");
  const { recallKey, remember } = usePromptHistory({ active: mode.kind === "idle", input, setInput });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);

  const toIdle = useCallback((feedback: Feedback | null): void => {
    setMode({ feedback, kind: "idle" });
  }, []);

  const finishGrading = useCallback(
    (outcome: GradingRunOutcome): void => {
      const done = outcome.progress.done;
      if (done === null) {
        toIdle({
          kind: "message",
          text: gradingFailureMessage(outcome),
          tone: "error",
        });
        return;
      }
      onCorrection?.(done);
      if (done.levelPassed) {
        setMode({ examCompleted: done.examCompleted, kind: RESULT_PASS_MODE });
        return;
      }

      const { headline, writeArgs } = buildFailureTrace(done.result, {
        attempt: view.currentTry,
        examSlug: slug,
        exercise,
        level: view.currentLevel,
        now: new Date(),
      });
      void fs
        .writeTrace(dir, writeArgs)
        .then((tracePath) => {
          setMode({ headline, kind: RESULT_FAIL_MODE, tracePath });
        })
        .catch(() => {
          setMode({ headline, kind: RESULT_FAIL_MODE, tracePath: null });
        });
    },
    [dir, exercise, fs, onCorrection, slug, toIdle, view.currentLevel, view.currentTry],
  );

  const startGrading = useCallback((): void => {
    if (view.cooldownUntil !== null) {
      const remaining = Date.parse(view.cooldownUntil) - Date.now();
      if (remaining > 0) {
        toIdle({ kind: "message", text: cooldownMessage(remaining), tone: "error" });
        return;
      }
    }

    void fs
      .readSubmission(dir, exercise)
      .then((files) => {
        const validation = validateSubmission(files, exercise.expectedFiles);
        if (!validation.ok) {
          toIdle({ kind: "message", text: validation.reason, tone: "error" });
          return;
        }
        setElapsedMs(0);
        setMode({ kind: "grading" });
        grading.run(files, finishGrading);
      })
      .catch((cause: unknown) => {
        toIdle({
          kind: "message",
          text: cause instanceof CliError ? cause.message : "Could not read your files.",
          tone: "error",
        });
      });
  }, [dir, exercise, finishGrading, fs, grading, toIdle, view.cooldownUntil]);

  const { cancel } = grading;
  useEffect(() => cancel, [cancel]);

  useEffect(() => {
    if (mode.kind !== "grading") return;
    const start = Date.now();
    const id = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, ELAPSED_TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [mode.kind]);

  const dispatch = useCallback(
    (raw: string): void => {
      runExamCommand(parseExamCommand(raw), { openUrl, setMode, setNowMs, toIdle });
    },
    [openUrl, toIdle],
  );

  const onSubmit = useCallback(
    (raw: string): void => {
      setInput("");
      remember(raw);
      dispatch(raw);
    },
    [dispatch, remember],
  );

  useInput(
    (char) => {
      if (char === "y" || char === "Y") {
        startGrading();
      } else {
        toIdle({ kind: "message", text: " Abort", tone: "info" });
      }
    },
    { isActive: mode.kind === "confirm-grademe" },
  );

  useInput(
    (_input, key) => {
      if (!key.return) return;
      if (mode.kind === RESULT_PASS_MODE && mode.examCompleted) {
        setMode({ kind: "completed" });
        return;
      }
      onRefresh();
      toIdle(null);
    },
    { isActive: mode.kind === RESULT_PASS_MODE || mode.kind === RESULT_FAIL_MODE },
  );

  useInput(
    (_input, key) => {
      if (key.return) onComplete();
    },
    { isActive: mode.kind === "completed" },
  );

  return (
    <ExamWorkspaceView
      dir={dir}
      elapsedMs={elapsedMs}
      exercise={exercise}
      input={input}
      inputKey={recallKey}
      mode={mode}
      nowMs={nowMs}
      onCancelFinish={() => {
        toIdle({ kind: "message", text: " ** Abort ** ", tone: "info" });
      }}
      onConfirmFinish={exit}
      onInputChange={setInput}
      onSubmit={onSubmit}
      progress={grading.progress}
      lastCorrection={grading.progress.done ?? lastCorrection}
      slug={slug}
      view={view}
    />
  );
}
