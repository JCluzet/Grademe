import { describe, expect, it } from "vitest";

import { createLoginOutput } from "./login-output";

function render(isTTY: boolean, env: NodeJS.ProcessEnv, depth = 24): string {
  const writes: string[] = [];
  const output = createLoginOutput({ isTTY, getColorDepth: () => depth, write: (text) => writes.push(text) }, env);
  output.intro();
  output.browser("https://grademe.io/auth/cli?code_challenge=test");
  writes.push(output.prompt);
  output.success("you@example.test");
  return writes.join("");
}

describe("login presentation", () => {
  it("keeps a readable transcript without terminal escapes when redirected", () => {
    const text = render(false, { TERM: "xterm-256color", LANG: "en_US.UTF-8" });
    expect(text).not.toContain("\x1b");
    expect(text).toContain("> Grademe CLI");
    expect(text).toContain("https://grademe.io/auth/cli?code_challenge=test");
    expect(text).toContain("OK Logged in as you@example.test");
  });

  it.each([{ NO_COLOR: "" }, { NO_COLOR: "1" }, { TERM: "dumb" }])("respects plain terminal settings %j", (env) => {
    expect(render(true, env)).not.toContain("\x1b");
  });

  it("uses the semantic accent and never moves the input cursor", () => {
    const text = render(true, { TERM: "xterm-256color", LANG: "en_US.UTF-8" });
    expect(text).toContain("\x1b[38;2;");
    expect(text).toContain("✓");
    expect(text).not.toContain("\x1b[2K");
    expect(text).not.toContain("\r");
  });

  it("falls back to the terminal palette without true color", () => {
    const text = render(true, { TERM: "xterm" }, 4);
    expect(text).toContain("\x1b[32m");
    expect(text).not.toContain("38;2");
  });

  it("does not interpret terminal controls in the account identity", () => {
    let text = "";
    const output = createLoginOutput({ write: (value) => { text += value; } }, {});
    output.success("you\x1b[2J\n@example.test");
    expect(text).toContain("you @example.test");
    expect(text).not.toContain("\x1b");
  });

  it("provides an explicit hyperlink in Windows Terminal while keeping the entire URL visible", () => {
    const text = render(true, { TERM: "xterm-256color", WT_SESSION: "test" });
    const url = "https://grademe.io/auth/cli?code_challenge=test";
    expect(text).toContain(`\x1b]8;;${url}\x1b\\${url}\x1b]8;;\x1b\\`);
    expect(text).toContain("Keep this terminal open while you sign in.");
  });

  it.each([
    [false, { WT_SESSION: "test" }],
    [true, { WT_SESSION: "test", NO_COLOR: "1" }],
    [true, { WT_SESSION: "test", TERM: "dumb" }],
    [true, { TERM: "xterm" }],
  ] as const)("does not emit unsupported hyperlinks (%s, %j)", (tty, env) => {
    expect(render(tty, env)).not.toContain("\x1b]8;");
  });

  it("never truncates or inserts hard line breaks in the fallback URL", () => {
    const url = `https://grademe.io/auth/cli?code_challenge=${"x".repeat(128)}&state=test&redirect_uri=http%3A%2F%2F127.0.0.1%3A51234%2Fcallback`;
    let text = "";
    createLoginOutput({ write: (value) => { text += value; } }, {}).browser(url);
    expect(text.split("\n")).toContain(url);
  });
});
