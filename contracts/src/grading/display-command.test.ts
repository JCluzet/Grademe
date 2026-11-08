import { describe, expect, it } from "vitest";

import { displayCommand } from "./display-command";

describe("displayCommand", () => {
  it("pipes shell invocations through cat -e", () => {
    expect(displayCommand("./puts hello")).toBe("./puts hello | cat -e");
    expect(displayCommand("node main.js 3")).toBe("node main.js 3 | cat -e");
    expect(displayCommand("python3 main.py")).toBe("python3 main.py | cat -e");
  });

  it("leaves function-call displays as written", () => {
    expect(displayCommand('puts("hello")')).toBe('puts("hello")');
    expect(displayCommand("putchar('A')")).toBe("putchar('A')");
  });
});
