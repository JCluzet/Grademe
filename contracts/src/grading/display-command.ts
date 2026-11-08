const SHELL_COMMAND_PREFIXES = ["./", "node ", "python3 "] as const;

function isShellTestCommand(command: string): boolean {
  return SHELL_COMMAND_PREFIXES.some((prefix) => command.startsWith(prefix));
}

export function displayCommand(command: string): string {
  return isShellTestCommand(command) ? `${command} | cat -e` : command;
}
