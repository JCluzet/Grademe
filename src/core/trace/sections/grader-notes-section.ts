import { clipBlock, rule } from "../text";
import type { TraceSection } from "../types";

const MAX_NOTES_LINES = 40;

export const graderNotesSection: TraceSection = ({ graderNotes }) => {
  if (graderNotes === null) return [];
  return ["", rule("grader notes"), ...clipBlock(graderNotes, MAX_NOTES_LINES)];
};
