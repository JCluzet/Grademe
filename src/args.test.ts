import { describe, expect, it } from "vitest";

import { parseArgs } from "./args";

const INTERACTIVE = "interactive";
const EXAMPLE_URL = "https://example.test";

describe("parseArgs", () => {
  it("selects a challenge without treating its slug as a subcommand", () => {
    expect(parseArgs(["--challenge", "foundations-1"])).toEqual({ command: INTERACTIVE, challenge: "foundations-1" });
  });
  it.each([undefined, "--dir", "../private", "a;curl"])("rejects a missing or unsafe challenge slug %s", (value) => {
    expect(() => parseArgs(value === undefined ? ["--challenge"] : ["--challenge", value])).toThrow("--challenge needs");
  });
  it("defaults to interactive with no args", () => {
    expect(parseArgs([])).toEqual({ command: INTERACTIVE });
  });

  it("parses the login command", () => {
    expect(parseArgs(["login"])).toEqual({ command: "login" });
  });

  it("parses the logout command", () => {
    expect(parseArgs(["logout"])).toEqual({ command: "logout" });
  });

  it("parses --dir into interactive with dir", () => {
    expect(parseArgs(["--dir", "x"])).toEqual({ command: INTERACTIVE, dir: "x" });
  });

  it("parses --api into interactive with api", () => {
    expect(parseArgs(["--api", EXAMPLE_URL])).toEqual({
      command: INTERACTIVE,
      api: EXAMPLE_URL,
    });
  });

  it("carries --dir and --api onto the login command", () => {
    expect(parseArgs(["login", "--dir", "x", "--api", EXAMPLE_URL])).toEqual({
      command: "login",
      dir: "x",
      api: EXAMPLE_URL,
    });
  });

  it("treats -h as help", () => {
    expect(parseArgs(["-h"])).toEqual({ command: "help" });
  });

  it("treats --help as help", () => {
    expect(parseArgs(["--help"])).toEqual({ command: "help" });
  });

  it("treats -v as version", () => {
    expect(parseArgs(["-v"])).toEqual({ command: "version" });
  });

  it("treats --version as version", () => {
    expect(parseArgs(["--version"])).toEqual({ command: "version" });
  });
});
