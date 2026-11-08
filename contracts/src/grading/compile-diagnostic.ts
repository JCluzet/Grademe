import type { CompileResult } from "./results";

export const NO_DIAGNOSTIC_FALLBACK = "Link step failed.";

export interface ForbiddenFunctionDiagnostic {
  allowedFunctions: string[];
  forbiddenFunctions: string[];
  kind: "forbidden-functions";
}

const FORBIDDEN_LINE = /^Forbidden functions? used:\s*(.+)$/m;
const ALLOWED_LINE = /^Allowed functions:\s*(.+)$/m;

function splitFunctionList(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === "none") return [];
  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function parseCompileDiagnostic(
  stderr: string | null,
): ForbiddenFunctionDiagnostic | null {
  if (!stderr) return null;
  const forbidden = FORBIDDEN_LINE.exec(stderr);
  if (!forbidden) return null;
  const allowed = ALLOWED_LINE.exec(stderr);
  return {
    allowedFunctions: splitFunctionList(allowed?.[1] ?? ""),
    forbiddenFunctions: splitFunctionList(forbidden[1] ?? ""),
    kind: "forbidden-functions",
  };
}

export type CompileFailureKind = "diagnostic" | "forbidden" | "none";

export function classifyCompileFailure(
  compile: Pick<CompileResult, "ok" | "stderr">,
): CompileFailureKind | null {
  if (compile.ok) return null;
  if (parseCompileDiagnostic(compile.stderr) !== null) return "forbidden";
  const stderr = compile.stderr?.trim() ?? "";
  if (stderr.length === 0 || stderr === NO_DIAGNOSTIC_FALLBACK) return "none";
  return "diagnostic";
}
