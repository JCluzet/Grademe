import { stripVTControlCharacters } from "node:util";

import { THEME } from "../ui/theme";

interface Output {
  isTTY?: boolean;
  getColorDepth?: () => number;
  write: (text: string) => unknown;
}

export function createLoginOutput(output: Output, env: NodeJS.ProcessEnv = process.env) {
  const color = output.isTTY && env["TERM"] !== "dumb" && env["NO_COLOR"] === undefined;
  const rgb = [1, 3, 5].map((offset) => Number.parseInt(THEME.success.slice(offset, offset + 2), 16)).join(";");
  const accent = color ? (output.getColorDepth?.() === 24 ? `\x1b[38;2;${rgb}m` : "\x1b[32m") : "";
  const reset = color ? "\x1b[0m" : "";
  const bold = color ? "\x1b[1m" : "";
  const underline = color ? "\x1b[4m" : "";
  const hyperlinks = color && (Boolean(env["WT_SESSION"]) ||
    ["iTerm.app", "WezTerm", "vscode", "ghostty"].includes(env["TERM_PROGRAM"] ?? ""));
  const unicode = output.isTTY && /utf-?8/i.test(env["LC_ALL"] ?? env["LC_CTYPE"] ?? env["LANG"] ?? "");
  const arrow = unicode ? "›" : ">";
  const mark = (text: string): string => `${accent}${text}${reset}`;

  return {
    intro(): void {
      output.write(`\n  ${mark(arrow)} ${bold}Grademe CLI${reset}\n\n`);
      output.write("  Sign in with your Grademe account.\n");
    },
    browser(url: string): void {
      const link = hyperlinks ? `\x1b]8;;${url}\x1b\\${url}\x1b]8;;\x1b\\` : url;
      output.write(`  ${mark(arrow)} Continue in your browser.\n\n`);
      output.write("  Browser didn't open? Open or copy this link:\n\n");
      output.write(`${underline}${link}${reset}\n\n`);
      output.write("  Keep this terminal open while you sign in.\n\n");
    },
    prompt: `  ${mark(arrow)} Paste a code, or wait for your browser: `,
    success(email: string | undefined): void {
      const identity = stripVTControlCharacters(email ?? "your account").replace(/[\r\n\t]/g, " ");
      output.write(`\n  ${mark(unicode ? "✓" : "OK")} ${bold}Logged in as ${identity}${reset}\n\n`);
    },
  };
}
