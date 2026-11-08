import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  assertCredentialIssuer,
  configDir,
  resolveApiUrl,
} from "./paths";
import { DEFAULT_API_URL } from "../version";

const ENV_KEYS = ["XDG_CONFIG_HOME", "APPDATA", "HOME", "GRADEME_API_URL"] as const;
const STORED_URL = "https://stored.test";
const STABLE_VERSION = "0.1.0";

describe("configDir", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const key of ENV_KEYS) saved[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = saved[key];
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
    }
  });

  it("prefers XDG_CONFIG_HOME on posix", () => {
    delete process.env["APPDATA"];
    process.env["XDG_CONFIG_HOME"] = "/xdg";
    expect(configDir("linux", STABLE_VERSION)).toBe("/xdg/grademe");
  });

  it("falls back to ~/.config on posix when XDG is unset", () => {
    delete process.env["XDG_CONFIG_HOME"];
    process.env["HOME"] = "/home/u";
    expect(configDir("linux", STABLE_VERSION)).toBe("/home/u/.config/grademe");
  });

  it("uses %APPDATA%/Grademe on win32", () => {
    process.env["APPDATA"] = "C:\\Users\\u\\AppData\\Roaming";
    expect(configDir("win32", STABLE_VERSION)).toBe("C:\\Users\\u\\AppData\\Roaming/Grademe");
  });

  it("isolates preview credentials so a main build never inherits a production login", () => {
    process.env["XDG_CONFIG_HOME"] = "/xdg";
    expect(configDir("linux", "0.1.0-preview.42.1")).toBe("/xdg/grademe-preview");
    expect(configDir("linux", STABLE_VERSION)).toBe("/xdg/grademe");
  });
});

describe("resolveApiUrl", () => {
  let savedApi: string | undefined;

  beforeEach(() => {
    savedApi = process.env["GRADEME_API_URL"];
    delete process.env["GRADEME_API_URL"];
  });

  afterEach(() => {
    if (savedApi === undefined) delete process.env["GRADEME_API_URL"];
    else process.env["GRADEME_API_URL"] = savedApi;
  });

  it("prefers the flag over everything", () => {
    process.env["GRADEME_API_URL"] = "https://env.test";
    expect(resolveApiUrl("https://flag.test", STORED_URL)).toBe("https://flag.test");
  });

  it("prefers the env var over stored", () => {
    process.env["GRADEME_API_URL"] = "https://env.test";
    expect(resolveApiUrl(undefined, STORED_URL)).toBe("https://env.test");
  });

  it("uses stored when no flag or env", () => {
    expect(resolveApiUrl(undefined, STORED_URL)).toBe(STORED_URL);
  });

  it("falls back to the default", () => {
    expect(resolveApiUrl()).toBe(DEFAULT_API_URL);
    expect(DEFAULT_API_URL).toBe("https://grademe.io");
  });

  it("allows HTTP only for loopback development", () => {
    expect(resolveApiUrl("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
    expect(() => resolveApiUrl("http://evil.test")).toThrow("must use HTTPS");
  });

  it("rejects credentials and fragments in the API URL", () => {
    expect(() => resolveApiUrl("https://user:pass@grademe.io")).toThrow("must use HTTPS");
    expect(() => resolveApiUrl("https://grademe.io#unexpected")).toThrow("must use HTTPS");
  });
});

describe("assertCredentialIssuer", () => {
  it("accepts the API that minted the stored token", () => {
    expect(() => {
      assertCredentialIssuer("https://grademe.io/", "https://grademe.io");
    }).not.toThrow();
  });

  it("rejects sending a stored token to an overridden API", () => {
    expect(() => {
      assertCredentialIssuer("https://grademe.io", "https://attacker.test");
    }).toThrow("grademe logout");
  });
});
