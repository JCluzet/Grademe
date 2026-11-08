import { useInput } from "ink";
import { useCallback, useState } from "react";

import {
  EMPTY_PROMPT_HISTORY,
  recallNewer,
  recallOlder,
  rememberCommand,
} from "../../core/prompt-history";

export interface UsePromptHistoryArgs {
  active: boolean;
  input: string;
  setInput: (value: string) => void;
}

export interface PromptHistoryControls {
  recallKey: number;
  remember: (command: string) => void;
}

export function usePromptHistory({ active, input, setInput }: UsePromptHistoryArgs): PromptHistoryControls {
  const [history, setHistory] = useState(EMPTY_PROMPT_HISTORY);
  const [recallKey, setRecallKey] = useState(0);

  useInput(
    (_char, key) => {
      if (!key.upArrow && !key.downArrow) return;
      const next = key.upArrow ? recallOlder(history, input) : recallNewer(history, input);
      if (next.input === input) return;
      setHistory(next.history);
      setInput(next.input);
      setRecallKey((current) => current + 1);
    },
    { isActive: active },
  );

  const remember = useCallback((command: string): void => {
    setHistory((current) => rememberCommand(current, command));
  }, []);

  return { recallKey, remember };
}
