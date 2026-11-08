import { homedir } from "node:os";

import { CliError, EXIT } from "../errors";
import { CLI_VERSION, DEFAULT_API_URL } from "../version";

export function configDir(platform: NodeJS.Platform = process.platform, version = CLI_VERSION): string {
  const suffix = version.includes("-preview.") ? "-preview" : "";
  if (platform === "win32") {
    const appData = process.env["APPDATA"] ?? `${homedir()}/AppData/Roaming`;
    return `${appData}/Grademe${suffix}`;
  }
  const base = process.env["XDG_CONFIG_HOME"] ?? `${homedir()}/.config`;
  return `${base}/grademe${suffix}`;
}

export function resolveApiUrl(flag?: string, stored?: string): string {
  const value = flag ?? process.env["GRADEME_API_URL"] ?? stored ?? DEFAULT_API_URL;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CliError(`Invalid Grademe API URL: ${value}`, EXIT.USER);
  }

  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]";
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new CliError(
      "The Grademe API URL must use HTTPS (HTTP is allowed only for loopback development).",
      EXIT.USER,
    );
  }
  return url.toString().replace(/\/$/, "");
}

export function assertCredentialIssuer(storedApiUrl: string, selectedApiUrl: string): void {
  const issuer = resolveApiUrl(storedApiUrl);
  if (issuer === selectedApiUrl) return;
  throw new CliError(
    `Stored credentials belong to ${storedApiUrl}. Run \`grademe logout\` before connecting to ${selectedApiUrl}.`,
    EXIT.AUTH,
  );
}
