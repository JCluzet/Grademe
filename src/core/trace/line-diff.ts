import { clipLine } from "./text";

type OpcodeTag = "delete" | "equal" | "insert" | "replace";

interface Opcode {
  i1: number;
  i2: number;
  j1: number;
  j2: number;
  tag: OpcodeTag;
}

type EditKind = "delete" | "equal" | "insert";

const MAX_LCS_CELLS = 250_000;
const CONTEXT_LINES = 2;
const DEFAULT_MAX_LINES = 40;

function lcsEdits(a: string[], b: string[]): EditKind[] {
  const width = b.length + 1;
  const table = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * width + j] =
        a[i] === b[j]
          ? (table[(i + 1) * width + j + 1] ?? 0) + 1
          : Math.max(table[(i + 1) * width + j] ?? 0, table[i * width + j + 1] ?? 0);
    }
  }
  const edits: EditKind[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      edits.push("equal");
      i += 1;
      j += 1;
    } else if (
      j >= b.length ||
      (i < a.length && (table[(i + 1) * width + j] ?? 0) >= (table[i * width + j + 1] ?? 0))
    ) {
      edits.push("delete");
      i += 1;
    } else {
      edits.push("insert");
      j += 1;
    }
  }
  return edits;
}

function singleOpcodes(edits: EditKind[]): Opcode[] {
  const codes: Opcode[] = [];
  let i = 0;
  let j = 0;
  for (const edit of edits) {
    const consumesA = edit !== "insert";
    const consumesB = edit !== "delete";
    codes.push({ i1: i, i2: consumesA ? i + 1 : i, j1: j, j2: consumesB ? j + 1 : j, tag: edit });
    if (consumesA) i += 1;
    if (consumesB) j += 1;
  }
  return codes;
}

function mergeAdjacent(previous: Opcode | undefined, next: Opcode): Opcode | null {
  if (previous === undefined) return null;
  if (previous.tag === next.tag) return { ...previous, i2: next.i2, j2: next.j2 };
  if (previous.tag === "delete" && next.tag === "insert") return { ...previous, j2: next.j2, tag: "replace" };
  if (previous.tag === "replace" && next.tag === "insert") return { ...previous, j2: next.j2 };
  return null;
}

function mergeOpcodes(singles: Opcode[]): Opcode[] {
  const codes: Opcode[] = [];
  for (const single of singles) {
    const merged = mergeAdjacent(codes[codes.length - 1], single);
    if (merged === null) codes.push(single);
    else codes[codes.length - 1] = merged;
  }
  return codes;
}

function boundedOpcodes(a: string[], b: string[]): Opcode[] {
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  const codes: Opcode[] = [];
  if (prefix > 0) codes.push({ i1: 0, i2: prefix, j1: 0, j2: prefix, tag: "equal" });
  const i2 = a.length - suffix;
  const j2 = b.length - suffix;
  const deletes = i2 - prefix;
  const inserts = j2 - prefix;
  if (deletes > 0 || inserts > 0) {
    const tag: OpcodeTag = deletes === 0 ? "insert" : inserts === 0 ? "delete" : "replace";
    codes.push({ i1: prefix, i2, j1: prefix, j2, tag });
  }
  if (suffix > 0) codes.push({ i1: i2, i2: a.length, j1: j2, j2: b.length, tag: "equal" });
  return codes;
}

function trimLeading(code: Opcode, context: number): Opcode {
  if (code.tag !== "equal") return code;
  return { ...code, i1: Math.max(code.i1, code.i2 - context), j1: Math.max(code.j1, code.j2 - context) };
}

function trimTrailing(code: Opcode, context: number): Opcode {
  if (code.tag !== "equal") return code;
  return { ...code, i2: Math.min(code.i2, code.i1 + context), j2: Math.min(code.j2, code.j1 + context) };
}

function isOnlyContext(group: Opcode[]): boolean {
  return group.length === 1 && group[0]?.tag === "equal";
}

function groupOpcodes(codes: Opcode[], context: number): Opcode[][] {
  if (codes.length === 0) return [];
  const trimmed = codes.map((code, index) => {
    const leading = index === 0 ? trimLeading(code, context) : code;
    return index === codes.length - 1 ? trimTrailing(leading, context) : leading;
  });
  const groups: Opcode[][] = [];
  let group: Opcode[] = [];
  for (const code of trimmed) {
    const splitsHere = code.tag === "equal" && code.i2 - code.i1 > context * 2;
    if (splitsHere) {
      group.push(trimTrailing(code, context));
      groups.push(group);
      group = [];
    }
    group.push(splitsHere ? trimLeading(code, context) : code);
  }
  if (group.length > 0 && !isOnlyContext(group)) groups.push(group);
  return groups;
}

function formatRange(start: number, stop: number): string {
  const length = stop - start;
  const begin = length === 0 ? start : start + 1;
  return length === 1 ? String(begin) : `${String(begin)},${String(length)}`;
}

function opcodeLineCount(code: Opcode): number {
  if (code.tag === "equal" || code.tag === "delete") return code.i2 - code.i1;
  if (code.tag === "insert") return code.j2 - code.j1;
  return code.i2 - code.i1 + (code.j2 - code.j1);
}

function groupLineCount(group: Opcode[]): number {
  return 1 + group.reduce((count, code) => count + opcodeLineCount(code), 0);
}

function renderGroup(group: Opcode[], a: string[], b: string[], out: string[], budget: number): void {
  const first = group[0];
  const last = group[group.length - 1];
  if (first === undefined || last === undefined) return;
  const push = (prefix: string, lines: string[]): void => {
    for (const line of lines) {
      if (out.length >= budget) return;
      out.push(`${prefix}${clipLine(line)}`);
    }
  };
  out.push(`@@ -${formatRange(first.i1, last.i2)} +${formatRange(first.j1, last.j2)} @@`);
  for (const code of group) {
    if (out.length >= budget) return;
    if (code.tag === "equal") {
      push(" ", a.slice(code.i1, code.i2));
      continue;
    }
    if (code.tag !== "insert") push("-", a.slice(code.i1, code.i2));
    if (code.tag !== "delete") push("+", b.slice(code.j1, code.j2));
  }
}

export function unifiedDiff(expected: string[], actual: string[], maxLines: number = DEFAULT_MAX_LINES): string[] {
  const exact = (expected.length + 1) * (actual.length + 1) <= MAX_LCS_CELLS;
  const codes = exact
    ? mergeOpcodes(singleOpcodes(lcsEdits(expected, actual)))
    : boundedOpcodes(expected, actual);
  const groups = groupOpcodes(codes, CONTEXT_LINES);
  const total = groups.reduce((count, group) => count + groupLineCount(group), 0);
  const lines: string[] = [];
  for (const group of groups) {
    if (lines.length > maxLines) break;
    renderGroup(group, expected, actual, lines, maxLines + 1);
  }
  if (total <= maxLines) return lines;
  return [...lines.slice(0, maxLines), `… ${(total - maxLines).toLocaleString("en-US")} more diff lines`];
}
