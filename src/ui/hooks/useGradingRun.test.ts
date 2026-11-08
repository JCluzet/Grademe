import type { ParsedSseFrame, SubmittedFile } from "@grademe/contracts";
import { Text } from "ink";
import { render } from "ink-testing-library";
import { createElement, useEffect, useRef, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { useGradingRun, type ExamSubmitRun, type GradingApi, type GradingRunState } from "./useGradingRun";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 1500): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out");
    await delay(5);
  }
}

function pendingRun(signal: AbortSignal, onPull: () => void): ExamSubmitRun {
  async function* gen(): AsyncGenerator<ParsedSseFrame> {
    onPull();
    for (;;) {
      if (signal.aborted) return;
      await delay(5);
    }
  }
  return { frames: gen() };
}

interface ProbeProps {
  api: GradingApi;
  onState: (state: GradingRunState) => void;
  files?: SubmittedFile[];
}

function Probe({ api, onState, files }: ProbeProps): ReactNode {
  const state = useGradingRun({
    api,
    session: {
      currentLevel: 0,
      sessionId: "c1bb3d9e-5fa5-4d5a-8f5e-6a2a1f906f87",
    },
    slug: "exam-a",
  });
  onState(state);
  const { run } = state;
  const started = useRef(false);
  useEffect(() => {
    if (started.current || files === undefined) return;
    started.current = true;
    run(files, () => undefined);
  }, [files, run]);
  return createElement(Text, null, state.running ? "running" : "idle");
}

interface Holder {
  state: GradingRunState | null;
}

describe("useGradingRun", () => {
  it("exposes a stable `cancel` that is safe to call when idle", async () => {
    const holder: Holder = { state: null };
    const api: GradingApi = {
      submitExamStream: () =>
        Promise.resolve({
          frames: (async function* (): AsyncGenerator<ParsedSseFrame> {
            await Promise.resolve();
            yield* [];
          })(),
        }),
    };
    render(
      createElement(Probe, {
        api,
        onState: (s) => {
          holder.state = s;
        },
      }),
    );

    await waitFor(() => holder.state !== null);
    expect(typeof holder.state?.cancel).toBe("function");
    expect(() => holder.state?.cancel()).not.toThrow();
  });

  it("cancel aborts the in-flight run's signal", async () => {
    const holder: Holder = { state: null };
    const signalHolder: { value: AbortSignal | null } = { value: null };
    let pulled = false;

    const api: GradingApi = {
      submitExamStream: (_slug, _context, _files, signal) => {
        signalHolder.value = signal ?? null;
        return Promise.resolve(
          pendingRun(signal ?? new AbortController().signal, () => {
            pulled = true;
          }),
        );
      },
    };

    render(
      createElement(Probe, {
        api,
        files: [{ content: "x", path: "print_char.c" }],
        onState: (s) => {
          holder.state = s;
        },
      }),
    );

    await waitFor(() => pulled && signalHolder.value !== null);
    expect(holder.state?.running).toBe(true);
    expect(signalHolder.value?.aborted).toBe(false);

    holder.state?.cancel();

    expect(signalHolder.value?.aborted).toBe(true);
  });
});
