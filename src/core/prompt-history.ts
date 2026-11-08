export interface PromptHistory {
  readonly entries: readonly string[];
  readonly cursor: number | null;
  readonly draft: string;
}

export interface PromptRecall {
  history: PromptHistory;
  input: string;
}

export const MAX_PROMPT_HISTORY = 50;

export const EMPTY_PROMPT_HISTORY: PromptHistory = { cursor: null, draft: "", entries: [] };

export function rememberCommand(history: PromptHistory, command: string): PromptHistory {
  const trimmed = command.trim();
  if (trimmed === "" || history.entries[history.entries.length - 1] === trimmed) {
    return { ...history, cursor: null, draft: "" };
  }
  const entries = [...history.entries, trimmed].slice(-MAX_PROMPT_HISTORY);
  return { cursor: null, draft: "", entries };
}

export function recallOlder(history: PromptHistory, input: string): PromptRecall {
  if (history.entries.length === 0) return { history, input };
  if (history.cursor === null) {
    const cursor = history.entries.length - 1;
    return {
      history: { ...history, cursor, draft: input },
      input: history.entries[cursor] ?? input,
    };
  }
  if (history.cursor === 0) return { history, input };
  const cursor = history.cursor - 1;
  return { history: { ...history, cursor }, input: history.entries[cursor] ?? input };
}

export function recallNewer(history: PromptHistory, input: string): PromptRecall {
  if (history.cursor === null) return { history, input };
  const cursor = history.cursor + 1;
  if (cursor >= history.entries.length) {
    return { history: { ...history, cursor: null, draft: "" }, input: history.draft };
  }
  return { history: { ...history, cursor }, input: history.entries[cursor] ?? input };
}
