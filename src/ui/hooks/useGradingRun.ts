import type { CliSessionView, ParsedSseFrame, SubmittedFile } from "@grademe/contracts";
import { useCallback, useRef, useState } from "react";

import { initialProgress, reduceGradingSse, type GradingProgress } from "../../core/sse-reducer";
import { friendlyError } from "../friendly-error";

export interface ExamSubmitRun {
  frames: AsyncGenerator<ParsedSseFrame>;
}

export interface GradingApi {
  submitExamStream(
    slug: string,
    context: Pick<CliSessionView, "currentLevel" | "sessionId">,
    files: SubmittedFile[],
    signal?: AbortSignal,
  ): Promise<ExamSubmitRun>;
}

export interface UseGradingRunArgs {
  api: GradingApi;
  session: Pick<CliSessionView, "currentLevel" | "sessionId">;
  slug: string;
}

export interface GradingRunState {
  progress: GradingProgress;
  running: boolean;
  run: (files: SubmittedFile[], onSettled: (outcome: GradingRunOutcome) => void) => void;
  cancel: () => void;
}

export interface GradingRunOutcome {
  error: string | null;
  progress: GradingProgress;
}

export function useGradingRun({ api, session, slug }: UseGradingRunArgs): GradingRunState {
  const [progress, setProgress] = useState<GradingProgress>(initialProgress);
  const [running, setRunning] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(
    (files: SubmittedFile[], onSettled: (outcome: GradingRunOutcome) => void): void => {
      if (running) return;
      setRunning(true);
      setProgress(initialProgress);

      const controller = new AbortController();
      controllerRef.current = controller;
      const stale = (): boolean => controller.signal.aborted;

      let current = initialProgress;
      const consume = async (): Promise<void> => {
        const submission = await api.submitExamStream(slug, session, files, controller.signal);
        for await (const frame of submission.frames) {
          current = reduceGradingSse(current, frame);
          if (!stale()) setProgress(current);
        }
      };

      void consume()
        .then(() => {
          if (!stale()) onSettled({ error: null, progress: current });
        })
        .catch((cause: unknown) => {
          if (!stale()) onSettled({ error: friendlyError(cause), progress: current });
        })
        .finally(() => {
          if (controllerRef.current === controller) controllerRef.current = null;
          if (!stale()) setRunning(false);
        });
    },
    [api, session, slug, running],
  );

  const cancel = useCallback((): void => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  return { cancel, progress, run, running };
}
