export type ExamCommand =
  | "finish"
  | "grademe"
  | "help"
  | "result"
  | "sponsor"
  | "status"
  | "unknown"
  | "workspace";

const FINISH_ALIASES = new Set(["finish", "exit", "quit"]);

const SHELL_COMMANDS = new Set([
  "ls", "ll", "la", "pwd", "cd", "touch", "mkdir", "rm", "mv", "cp", "cat",
  "vim", "vi", "nvim", "nano", "emacs", "code", "cursor", "open", "clear",
  "git", "make", "gcc", "cc", "clang", "python", "python3", "bash", "zsh",
  "sh", "sudo", "echo", "npm", "pnpm", "node", "curl",
]);

export function isShellCommand(input: string): boolean {
  const command = input.trim().split(/\s+/)[0] ?? "";
  return SHELL_COMMANDS.has(command) || command.startsWith("./") || command.startsWith("/");
}

export function parseExamCommand(raw: string): ExamCommand | null {
  const command = raw.trim();
  if (command === "") return null;
  if (command === "status" || command === "help" || command === "result" || command === "grademe" || command === "sponsor") {
    return command;
  }
  if (FINISH_ALIASES.has(command)) return "finish";
  if (command === "workspace" || isShellCommand(command)) return "workspace";
  return "unknown";
}
