export type Command = "interactive" | "login" | "logout" | "help" | "version" | "update" | "rollback" | "_update";

export interface ParsedArgs {
  command: Command;
  dir?: string;
  api?: string;
  challenge?: string;
}

const COMMANDS = ["interactive", "login", "logout", "update", "rollback", "_update"] as const;

function isCommand(value: string): value is (typeof COMMANDS)[number] {
  return (COMMANDS as readonly string[]).includes(value);
}

function valueAfter(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.includes("-h") || argv.includes("--help")) return { command: "help" };
  if (argv.includes("-v") || argv.includes("--version")) return { command: "version" };

  const command = argv.find((value, index) => isCommand(value) && !["--dir", "--api", "--challenge"].includes(argv[index - 1] ?? "")) ?? "interactive";
  const dir = valueAfter(argv, "--dir");
  const api = valueAfter(argv, "--api");
  const challenge = valueAfter(argv, "--challenge");
  if (argv.includes("--challenge") && (challenge === undefined || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(challenge))) {
    throw new Error("--challenge needs a challenge slug, for example: --challenge c-foundations-01");
  }

  return {
    command: isCommand(command) ? command : "interactive",
    ...(dir === undefined ? {} : { dir }),
    ...(api === undefined ? {} : { api }),
    ...(challenge === undefined ? {} : { challenge }),
  };
}
