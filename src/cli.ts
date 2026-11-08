import { parseArgs } from "./args";
import { EXIT } from "./errors";
import { CLI_VERSION } from "./version";

const VERSION = CLI_VERSION;
const HELP_TEXT = `grademe - terminal challenge runner

Usage:
  grademe            browse challenges or resume your current one
  grademe login      connect this CLI to your Grademe account
  grademe logout     disconnect
  grademe update     install the newest release
  grademe rollback   restore the previous release and pause auto-updates

Options:
  --challenge <slug> select a challenge without starting its clock
  --dir <path>       working directory (default: cwd)
  --api <url>        override GRADEME_API_URL
  -v, --version      print version
  -h, --help         print help

Inside Grademe: grademe, status, workspace, result, help, finish.
Use another terminal tab for shell commands and your editor.
`;

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (["interactive", "login"].includes(args.command)) {
    void import("./update/commands").then(({ startBackgroundUpdate }) => startBackgroundUpdate());
  }
  switch (args.command) {
    case "version": process.stdout.write(`grademe ${VERSION}\n`); return EXIT.OK;
    case "help": process.stdout.write(HELP_TEXT); return EXIT.OK;
    case "update":
    case "rollback":
    case "_update": return (await import("./update/commands")).runUpdateCommand(args.command, VERSION);
    case "login": return (await import("./commands/login")).runLoginCommand(args);
    case "logout": return (await import("./commands/logout")).runLogoutCommand();
    case "interactive": return (await import("./commands/interactive")).runInteractive(args, VERSION);
  }
}
main().then((code) => { process.exitCode = code; }).catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = EXIT.INTERNAL;
});
