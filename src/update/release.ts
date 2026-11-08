import { z } from "zod";

export const releaseVersionSchema = z.string().max(80)
  .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-preview\.[1-9]\d*\.[1-9]\d*)?$/);

export const installMetadataSchema = z.object({
  format: z.literal(1),
  baseUrl: z.url(),
  installDir: z.string(),
  commandName: z.enum(["grademe", "grademe-preview"]).default("grademe"),
  target: z.enum(["darwin-arm64", "darwin-x64", "linux-arm64", "linux-x64", "linux-arm64-musl", "linux-x64-musl"]),
});

export function isNewerRelease(candidate: string, current: string): boolean {
  const parse = (value: string) => releaseVersionSchema.parse(value).split(/[.-]/)
    .map((part) => part === "preview" ? -1 : Number(part));
  const next = parse(candidate);
  const previous = parse(current);
  for (let index = 0; index < Math.max(next.length, previous.length); index++) {
    const a = next[index] ?? Number.POSITIVE_INFINITY;
    const b = previous[index] ?? Number.POSITIVE_INFINITY;
    if (a !== b) return a > b;
  }
  return false;
}

export function validateReleaseUrl(value: string): URL {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.hash || url.search ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && local))) {
    throw new Error("Release downloads require HTTPS (HTTP is allowed only on loopback).");
  }
  return url;
}

export function readChecksum(text: string, asset: string): string {
  const matches = text.trim().split(/\r?\n/).map((line) => line.trim().split(/\s+/))
    .filter((entry) => entry[1] === asset);
  const checksum = matches[0]?.[0];
  if (matches.length !== 1 || checksum === undefined || !/^[a-f0-9]{64}$/.test(checksum)) {
    throw new Error("Missing or invalid release checksum.");
  }
  return checksum;
}
