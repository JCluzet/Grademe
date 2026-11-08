import type { CliExerciseContent, CliSessionView } from "@grademe/contracts";
import { useCallback, useEffect, useState } from "react";

import { CliError, EXIT } from "../../errors";
import { friendlyError } from "../friendly-error";

export type ExamSessionStatus = "loading" | "ready" | "completed" | "unsupported" | "error";

export interface ExamSessionApi {
  startExam(slug: string): Promise<void>;
  getSession(slug: string): Promise<CliSessionView | null>;
  getExercise(slug: string): Promise<CliExerciseContent>;
}

export interface WorkspaceFs {
  materializeLevel(dir: string, content: CliExerciseContent): Promise<void>;
  clearSubmissionExcept(dir: string, keepAssignment: string): Promise<void>;
}

export interface UseExamSessionArgs {
  api: ExamSessionApi;
  fs: WorkspaceFs;
  slug: string;
  dir: string;
}

export interface ExamSessionState {
  status: ExamSessionStatus;
  session: CliSessionView | null;
  exercise: CliExerciseContent | null;
  error: string | null;
  refresh: () => void;
}

export function useExamSession({ api, fs, slug, dir }: UseExamSessionArgs): ExamSessionState {
  const [status, setStatus] = useState<ExamSessionStatus>("loading");
  const [session, setSession] = useState<CliSessionView | null>(null);
  const [exercise, setExercise] = useState<CliExerciseContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => {
    setNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const stale = (): boolean => controller.signal.aborted;

    const load = async (): Promise<void> => {
      setStatus("loading");
      setError(null);

      await api.startExam(slug);
      const nextSession = await api.getSession(slug);
      if (stale()) return;

      if (nextSession === null) {
        throw new CliError("No active session for this challenge.", EXIT.BUSINESS);
      }
      setSession(nextSession);

      if (nextSession.currentLevel >= nextSession.totalLevels) {
        setExercise(null);
        setStatus("completed");
        return;
      }

      const content = await api.getExercise(nextSession.exerciseSlug);
      if (stale()) return;

      if (content.kind === "server") {
        setExercise(content);
        setStatus("unsupported");
        return;
      }

      await fs.clearSubmissionExcept(dir, content.assignmentName);
      await fs.materializeLevel(dir, content);
      if (stale()) return;

      setExercise(content);
      setStatus("ready");
    };

    void load().catch((cause: unknown) => {
      if (stale()) return;
      setError(friendlyError(cause));
      setStatus("error");
    });

    return () => {
      controller.abort();
    };
  }, [api, fs, slug, dir, nonce]);

  return { error, exercise, refresh, session, status };
}
