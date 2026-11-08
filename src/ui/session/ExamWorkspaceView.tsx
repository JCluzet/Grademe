import type { CliExerciseContent, CliSessionView, ExamSubmitStreamDone } from "@grademe/contracts";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import type { ReactNode } from "react";

import type { GradingProgress } from "../../core/sse-reducer";
import { Hints } from "../components/Hints";
import { THEME } from "../theme";
import { FailureBanner, SuccessBanner } from "./Banners";
import { CompletionScreen } from "./CompletionScreen";
import { FinishSelector } from "./FinishSelector";
import { GradingRecap } from "./GradingRecap";
import { GradingView } from "./GradingView";
import { HelpText } from "./HelpText";
import { SessionStatus } from "./SessionStatus";
import { WorkspaceGuide } from "./WorkspaceGuide";
import { levelSubmissionDir } from "../../fs/workspace";

export type Feedback =
  | { kind: "help" }
  | { kind: "workspace" }
  | { kind: "result" }
  | { kind: "message"; text: string; tone: "info" | "error" };

export const RESULT_PASS_MODE = "result-pass" as const;
export const RESULT_FAIL_MODE = "result-fail" as const;

export type ExamWorkspaceMode =
  | { kind: "idle"; feedback: Feedback | null }
  | { kind: "confirm-grademe" }
  | { kind: "grading" }
  | { kind: typeof RESULT_PASS_MODE; examCompleted: boolean }
  | { kind: typeof RESULT_FAIL_MODE; headline: string; tracePath: string | null }
  | { kind: "finishing" }
  | { kind: "completed" };

interface ExamWorkspaceViewProps {
  dir: string;
  elapsedMs: number;
  exercise: CliExerciseContent;
  input: string;
  inputKey: number;
  mode: ExamWorkspaceMode;
  nowMs: number;
  onCancelFinish: () => void;
  onConfirmFinish: () => void;
  onInputChange: (value: string) => void;
  onSubmit: (value: string) => void;
  progress: GradingProgress;
  lastCorrection: ExamSubmitStreamDone | null;
  slug: string;
  view: CliSessionView;
}

export function ExamWorkspaceView({
  dir,
  elapsedMs,
  exercise,
  input,
  inputKey,
  mode,
  nowMs,
  onCancelFinish,
  onConfirmFinish,
  onInputChange,
  onSubmit,
  progress,
  lastCorrection,
  slug,
  view,
}: ExamWorkspaceViewProps): ReactNode {
  if (mode.kind === "confirm-grademe") return <GrademeConfirm dir={dir} exercise={exercise} />;

  if (mode.kind === "grading") {
    return (
      <Box flexDirection="column">
        <Text>Ok, making grading request to server now.</Text>
        <GradingView elapsedMs={elapsedMs} progress={progress} />
      </Box>
    );
  }

  if (mode.kind === RESULT_PASS_MODE) {
    return (
      <Box flexDirection="column">
        <SuccessBanner />
        <GradingRecap done={progress.done} totalLevels={view.totalLevels} />
        <Text color={THEME.dim}>(Press enter to continue...)</Text>
      </Box>
    );
  }

  if (mode.kind === RESULT_FAIL_MODE) {
    return (
      <Box flexDirection="column">
        <FailureBanner headline={mode.headline} tracePath={mode.tracePath} />
        <GradingRecap done={progress.done} totalLevels={view.totalLevels} />
        <Text color={THEME.dim}>(Press enter to continue...)</Text>
      </Box>
    );
  }

  if (mode.kind === "finishing") {
    return <FinishSelector onCancel={onCancelFinish} onConfirm={onConfirmFinish} />;
  }

  if (mode.kind === "completed") {
    return <CompletionScreen examTitle={slug} />;
  }

  return (
    <Box flexDirection="column">
      {mode.feedback === null ? (
        <SessionStatus dir={dir} exercise={exercise} nowMs={nowMs} session={view} />
      ) : (
        <Box flexDirection="column">
          <Text bold>{mode.feedback.kind === "result" ? "Last correction in this CLI run" : `Current assignment / ${exercise.assignmentName}`}</Text>
          {mode.feedback.kind === "workspace" ? <WorkspaceGuide dir={dir} exercise={exercise} />
            : mode.feedback.kind === "result" ? <GradingRecap done={lastCorrection} totalLevels={view.totalLevels} />
              : <FeedbackBlock feedback={mode.feedback} />}
        </Box>
      )}
      <Box height={1} />
      <Box>
        <Text color={THEME.accent}>grademe</Text>
        <Text>{"> "}</Text>
        <TextInput
          key={inputKey}
          onChange={onInputChange}
          onSubmit={onSubmit}
          value={input}
          placeholder="type a Grademe command"
        />
      </Box>
      <Hints items={["grademe ⏎", "status", "workspace", "help"]} />
    </Box>
  );
}

function FeedbackBlock({ feedback }: { feedback: Extract<Feedback, { kind: "help" | "message" }> }): ReactNode {
  if (feedback.kind === "help") return <HelpText />;
  if (feedback.tone === "error") {
    return <Text color={THEME.error}>{feedback.text}</Text>;
  }
  return <Text>{feedback.text}</Text>;
}

function GrademeConfirm({ dir, exercise }: { dir: string; exercise: CliExerciseContent }): ReactNode {
  return (
    <Box flexDirection="column">
      <Text bold>Ready to grade?</Text>
      <Text wrap="truncate-end">Assignment: {exercise.assignmentName}</Text>
      <Text color={THEME.dim}>Reading your saved files from:</Text>
      <Text wrap="truncate-middle">{levelSubmissionDir(dir, exercise)}/</Text>
      <Text>Save your editor first. A failed attempt increases the cooldown.</Text>
      <Box height={1} />
      <Text>
        <Text color={THEME.accent}>Send for grading?</Text> [y/N]
      </Text>
    </Box>
  );
}
