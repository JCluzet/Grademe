import type { ExamCommand } from "../../core/exam-command";
import { GRADEME_PROMO, GRADEME_URL } from "../copy";
import type { ExamWorkspaceMode, Feedback } from "./ExamWorkspaceView";

export interface ExamCommandHandlers {
  openUrl: (url: string) => boolean;
  setMode: (mode: ExamWorkspaceMode) => void;
  setNowMs: (nowMs: number) => void;
  toIdle: (feedback: Feedback | null) => void;
}

const UNKNOWN_COMMAND =
  "Unknown command. Type help for Grademe commands, or workspace to code in another terminal.";

export function runExamCommand(command: ExamCommand | null, handlers: ExamCommandHandlers): void {
  switch (command) {
    case null:
      return;
    case "status":
      handlers.setNowMs(Date.now());
      handlers.toIdle(null);
      return;
    case "help":
    case "result":
      handlers.toIdle({ kind: command });
      return;
    case "workspace":
      handlers.toIdle({ kind: "workspace" });
      return;
    case "grademe":
      handlers.setMode({ kind: "confirm-grademe" });
      return;
    case "finish":
      handlers.setMode({ kind: "finishing" });
      return;
    case "sponsor":
      handlers.toIdle({ kind: "message", text: GRADEME_PROMO, tone: "info" });
      handlers.openUrl(GRADEME_URL);
      return;
    case "unknown":
      handlers.toIdle({ kind: "message", text: UNKNOWN_COMMAND, tone: "info" });
  }
}
