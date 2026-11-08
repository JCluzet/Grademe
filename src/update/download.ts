import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { Transform, Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";

import { validateReleaseUrl } from "./release";

async function responseFor(url: string, signal: AbortSignal): Promise<Response> {
  let destination = validateReleaseUrl(url);
  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await fetch(destination, { redirect: "manual", signal });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Release redirect has no destination.");
      const next = new URL(location, destination);
      if (next.username || next.password ||
          (next.protocol !== "https:" && next.origin !== destination.origin)) {
        throw new Error("Unsafe release redirect.");
      }
      destination = next;
      continue;
    }
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error(`Release download failed (HTTP ${String(response.status)}).`);
    }
    return response;
  }
  throw new Error("Too many release redirects.");
}

function limitBytes(maximum: number, onChunk?: (chunk: Buffer) => void): Transform {
  let received = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, done) {
      received += chunk.length;
      if (received > maximum) { done(new Error("Release download exceeds its size limit.")); return; }
      onChunk?.(chunk);
      done(null, chunk);
    },
  });
}

export async function downloadText(url: string, signal: AbortSignal): Promise<string> {
  const response = await responseFor(url, signal);
  const chunks: Buffer[] = [];
  await pipeline(Readable.from(response.body ?? []), limitBytes(64 * 1024), new Writable({
    write(chunk: Buffer, _encoding, done) { chunks.push(chunk); done(); },
  }), { signal });
  return Buffer.concat(chunks).toString("utf8");
}

export async function downloadExecutable(
  url: string, destination: string, expected: string, signal: AbortSignal,
): Promise<void> {
  const response = await responseFor(url, signal);
  const hash = createHash("sha256");
  await pipeline(
    Readable.from(response.body ?? []),
    limitBytes(256 * 1024 * 1024, (chunk) => { hash.update(chunk); }),
    createGunzip(),
    limitBytes(512 * 1024 * 1024),
    createWriteStream(destination, { flags: "wx", mode: 0o600 }),
    { signal },
  );
  if (hash.digest("hex") !== expected) throw new Error("Checksum mismatch. Existing installation was not changed.");
}
