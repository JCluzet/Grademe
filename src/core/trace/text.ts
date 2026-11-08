const TRACE_WIDTH = 78;

export const MAX_LINE_CHARS = 160;

export function rule(label: string): string {
  const head = `── ${label} `;
  return head + "─".repeat(Math.max(0, TRACE_WIDTH - head.length));
}

export function ellipsize(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

export function formatUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export function clipLine(line: string): string {
  if (line.length <= MAX_LINE_CHARS) return line;
  const hidden = line.length - MAX_LINE_CHARS;
  return `${line.slice(0, MAX_LINE_CHARS)}… (+${hidden.toLocaleString("en-US")} more characters)`;
}

export function clipBlock(text: string, maxLines: number): string[] {
  const lines = text.split("\n");
  const shown = lines.slice(0, maxLines).map(clipLine);
  const hidden = lines.length - shown.length;
  return hidden > 0 ? [...shown, `… ${hidden.toLocaleString("en-US")} more lines`] : shown;
}

export function trimTrailingBlank(lines: string[]): string[] {
  const out = [...lines];
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return out;
}
