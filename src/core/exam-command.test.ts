import { describe, expect, it } from "vitest";

import { isShellCommand, parseExamCommand } from "./exam-command";

describe("shell command guidance", () => {
  it.each(["ls -la", " touch main.c", "vim main.c", "cd ../", "./a.out", "/bin/sh", "sudo rm file"])("recognizes %s without executing it", (input) => {
    expect(isShellCommand(input)).toBe(true);
  });
  it.each(["grademe", "help", "status", "result", "workspace", "", "unknown"])("keeps %s out of shell handling", (input) => {
    expect(isShellCommand(input)).toBe(false);
  });
});

describe("parseExamCommand", () => {
  it.each([
    ["status", "status"],
    ["  help ", "help"],
    ["result", "result"],
    ["grademe", "grademe"],
    ["sponsor", "sponsor"],
    ["finish", "finish"],
    ["exit", "finish"],
    ["quit", "finish"],
    ["workspace", "workspace"],
    ["ls -la", "workspace"],
    ["./a.out", "workspace"],
    ["vim main.c", "workspace"],
    ["frobnicate", "unknown"],
  ] as const)("maps %j to %s", (raw, expected) => {
    expect(parseExamCommand(raw)).toBe(expected);
  });

  it("treats a blank line as nothing to do", () => {
    expect(parseExamCommand("")).toBeNull();
    expect(parseExamCommand("   ")).toBeNull();
  });
});
