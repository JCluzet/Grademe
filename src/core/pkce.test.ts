import { describe, expect, it } from "vitest";

import { challengeFromVerifier, genCodeVerifier, genState } from "./pkce";

describe("pkce", () => {
  it("derives the RFC 7636 challenge from the reference verifier", () => {
    expect(challengeFromVerifier("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });

  it("generates a verifier of at least 43 characters", () => {
    expect(genCodeVerifier().length).toBeGreaterThanOrEqual(43);
  });

  it("generates a state of at least 43 characters", () => {
    expect(genState().length).toBeGreaterThanOrEqual(43);
  });

  it("generates distinct verifiers", () => {
    expect(genCodeVerifier()).not.toBe(genCodeVerifier());
  });

  it("generates distinct states", () => {
    expect(genState()).not.toBe(genState());
  });

  it("produces a url-safe verifier (base64url alphabet only)", () => {
    expect(genCodeVerifier()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
