import { describe, expect, it } from "vitest";

import {
  EMPTY_PROMPT_HISTORY,
  MAX_PROMPT_HISTORY,
  recallNewer,
  recallOlder,
  rememberCommand,
  type PromptHistory,
} from "./prompt-history";

function remembered(...commands: string[]): PromptHistory {
  return commands.reduce(rememberCommand, EMPTY_PROMPT_HISTORY);
}

describe("rememberCommand", () => {
  it("stores trimmed commands oldest first and resets any recall in progress", () => {
    const history = remembered("  status ", "help");
    expect(history.entries).toEqual(["status", "help"]);
    expect(history.cursor).toBeNull();
  });

  it("ignores blank lines and an immediate repeat", () => {
    expect(remembered("status", "   ", "status").entries).toEqual(["status"]);
  });

  it("keeps only the most recent entries", () => {
    const many = Array.from({ length: MAX_PROMPT_HISTORY + 5 }, (_, i) => `cmd${String(i)}`);
    const history = remembered(...many);
    expect(history.entries).toHaveLength(MAX_PROMPT_HISTORY);
    expect(history.entries[0]).toBe("cmd5");
  });
});

describe("rememberCommand while recalling", () => {
  it("resets a recall in progress, even for a blank or repeated line", () => {
    const mid = recallOlder(remembered("status", "help"), "draft").history;
    expect(mid.cursor).toBe(1);
    expect(rememberCommand(mid, "grademe")).toEqual({ cursor: null, draft: "", entries: ["status", "help", "grademe"] });
    expect(rememberCommand(mid, "   ")).toEqual({ cursor: null, draft: "", entries: ["status", "help"] });
    expect(rememberCommand(mid, "help")).toEqual({ cursor: null, draft: "", entries: ["status", "help"] });
  });

  it("keeps a repeat that is not adjacent", () => {
    expect(remembered("status", "help", "status").entries).toEqual(["status", "help", "status"]);
  });
});

describe("recallOlder / recallNewer", () => {
  it("walks back through the history and stops at the oldest entry", () => {
    let state = { history: remembered("status", "help", "grademe"), input: "" };
    state = recallOlder(state.history, state.input);
    expect(state.input).toBe("grademe");
    state = recallOlder(state.history, state.input);
    expect(state.input).toBe("help");
    state = recallOlder(state.history, state.input);
    expect(state.input).toBe("status");
    state = recallOlder(state.history, state.input);
    expect(state.input).toBe("status");
  });

  it("restores the line being edited once ↓ goes past the newest entry", () => {
    let state = { history: remembered("status", "help"), input: "gra" };
    state = recallOlder(state.history, state.input);
    expect(state.input).toBe("help");
    state = recallNewer(state.history, state.input);
    expect(state.input).toBe("gra");
    expect(state.history.cursor).toBeNull();
    state = recallNewer(state.history, state.input);
    expect(state.input).toBe("gra");
  });

  it("does nothing with an empty history", () => {
    expect(recallOlder(EMPTY_PROMPT_HISTORY, "x")).toEqual({ history: EMPTY_PROMPT_HISTORY, input: "x" });
    expect(recallNewer(EMPTY_PROMPT_HISTORY, "x")).toEqual({ history: EMPTY_PROMPT_HISTORY, input: "x" });
  });
});
