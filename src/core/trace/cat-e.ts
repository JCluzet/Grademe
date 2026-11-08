export function splitCatE(text: string | null): string[] {
  if (text === null || text.length === 0) return [];
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}
