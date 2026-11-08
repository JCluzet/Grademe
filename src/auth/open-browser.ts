import { spawn } from "node:child_process";
import { release } from "node:os";

export function openBrowser(url: string, platform: NodeJS.Platform = process.platform): boolean {
  const [command, ...args] = openerCommand(url, platform);
  try {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.on("error", () => undefined);
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function openerCommand(url: string, platform: NodeJS.Platform): [string, ...string[]] {
  if (platform === "darwin") return ["open", url];
  const wsl = platform === "linux" && (
    Boolean(process.env["WSL_INTEROP"]) || Boolean(process.env["WSL_DISTRO_NAME"]) || /microsoft/i.test(release())
  );
  if (platform === "win32" || wsl) {
    return ["rundll32.exe", "url.dll,FileProtocolHandler", url];
  }
  return ["xdg-open", url];
}
