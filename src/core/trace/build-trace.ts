import { classifyCompileFailure } from "@grademe/contracts";

import { sanitizeGradeResult } from "./sanitize";
import { buildSection } from "./sections/build-section";
import { failureSection } from "./sections/failure-section";
import { graderNotesSection } from "./sections/grader-notes-section";
import { headerSection } from "./sections/header-section";
import { skippedSection } from "./sections/skipped-section";
import { testsSection } from "./sections/tests-section";
import { verdictSection } from "./sections/verdict-section";
import { verdictOf } from "./test-verdict";
import { trimTrailingBlank } from "./text";
import type { TraceInput, TraceModel, TraceSection } from "./types";

export { failureHeadline } from "./headline";

const BUILD_FAILED_SECTIONS: readonly TraceSection[] = [
  headerSection,
  verdictSection,
  buildSection,
  graderNotesSection,
];

const TESTS_RAN_SECTIONS: readonly TraceSection[] = [
  headerSection,
  verdictSection,
  testsSection,
  failureSection,
  skippedSection,
  graderNotesSection,
];

export function buildTraceModel({ meta, result }: TraceInput): TraceModel {
  const safe = sanitizeGradeResult(result);
  const notes = safe.trace?.trim() ?? "";
  return {
    compile: safe.compile,
    compileKind: classifyCompileFailure(safe.compile),
    graderNotes: notes === "" ? null : notes,
    meta,
    tests: safe.tests.map((test, index) => ({ index, test, verdict: verdictOf(test) })),
  };
}

export function renderTrace(model: TraceModel): string {
  const sections = model.compileKind === null ? TESTS_RAN_SECTIONS : BUILD_FAILED_SECTIONS;
  return `${trimTrailingBlank(sections.flatMap((section) => section(model))).join("\n")}\n`;
}
