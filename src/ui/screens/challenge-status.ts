import type { CliExamStatus } from "@grademe/contracts";

import { THEME } from "../theme";

export const CHALLENGE_STATUS: Record<CliExamStatus, { label: string; color: string }> = {
  failed: { color: THEME.error, label: "failed" },
  in_progress: { color: THEME.accent, label: "in progress" },
  not_started: { color: THEME.dim, label: "not started" },
  passed: { color: THEME.completed, label: "passed" },
};
