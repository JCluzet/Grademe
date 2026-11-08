import { createHash, randomBytes } from "node:crypto";

export function genCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function genState(): string {
  return randomBytes(32).toString("base64url");
}

export function challengeFromVerifier(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
