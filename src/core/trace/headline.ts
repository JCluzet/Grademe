import type { CompileFailureKind } from "@grademe/contracts";

import { shortReason } from "./failure-copy";
import { isFailedVerdict } from "./test-verdict";
import type { TraceModel } from "./types";

const COMPILE_HEADLINE: Readonly<Record<CompileFailureKind, string>> = {
  diagnostic: "compilation failed",
  forbidden: "forbidden function",
  none: "build failed without a diagnostic",
};

function countVerdicts(model: TraceModel): { failed: number; passed: number; skipped: number; total: number } {
  const passed = model.tests.filter((entry) => entry.verdict === "passed").length;
  const skipped = model.tests.filter((entry) => entry.verdict === "skipped").length;
  return { failed: model.tests.length - passed - skipped, passed, skipped, total: model.tests.length };
}

export function traceHeadline(model: TraceModel): string {
  if (model.compileKind !== null) return COMPILE_HEADLINE[model.compileKind];
  const { failed, passed, skipped, total } = countVerdicts(model);
  const parts = [`${String(total)} tests`, `${String(passed)} passed`, `${String(failed)} failed`];
  if (skipped > 0) parts.push(`${String(skipped)} skipped`);
  return parts.join(" · ");
}

export function failureHeadline(model: TraceModel): string {
  if (model.compileKind !== null) return COMPILE_HEADLINE[model.compileKind];
  const firstFailed = model.tests.find((entry) => isFailedVerdict(entry.verdict));
  if (firstFailed === undefined) return traceHeadline(model);
  const { failed, total } = countVerdicts(model);
  return `${String(failed)} of ${String(total)} tests failed · first KO: ${firstFailed.test.title} (${shortReason(firstFailed)})`;
}
