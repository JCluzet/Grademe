import { CLI_VERSION_HEADER } from "@grademe/contracts";
import { describe, expect, it, vi, type Mock } from "vitest";

import { CliError, EXIT, type ExitCode } from "../errors";
import { request, type FetchLike } from "./http";

const TEST_URL = "https://api.test/x";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function fetchMock(respond: () => Response): Mock<FetchLike> {
  return vi.fn<FetchLike>(() => Promise.resolve(respond()));
}

function firstCall(fetchFn: Mock<FetchLike>): [string, RequestInit | undefined] {
  const call = fetchFn.mock.calls[0];
  if (!call) throw new Error("Expected fetch to have been called.");
  return [call[0], call[1]];
}

async function captureError(promise: Promise<unknown>): Promise<CliError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof CliError) return error;
    throw error;
  }
  throw new Error("Expected the request to reject with a CliError.");
}

describe("request", () => {
  it("returns parsed JSON for a 2xx response", async () => {
    const fetchFn = fetchMock(() => jsonResponse(200, { ok: true }));
    const result = await request("GET", TEST_URL, { fetch: fetchFn });
    expect(result).toEqual({ ok: true });
  });

  it("sends the bearer token and JSON body", async () => {
    const fetchFn = fetchMock(() => jsonResponse(200, {}));
    await request("POST", TEST_URL, {
      body: { hello: "world" },
      cliVersion: "0.1.0",
      fetch: fetchFn,
      token: "tok",
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = firstCall(fetchFn);
    expect(url).toBe(TEST_URL);
    expect(init?.method).toBe("POST");
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer tok");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get(CLI_VERSION_HEADER)).toBe("0.1.0");
    expect(init?.body).toBe(JSON.stringify({ hello: "world" }));
  });

  it("omits authorization and body when not provided", async () => {
    const fetchFn = fetchMock(() => jsonResponse(200, {}));
    await request("GET", TEST_URL, { fetch: fetchFn });
    const [, init] = firstCall(fetchFn);
    const headers = new Headers(init?.headers);
    expect(headers.has("authorization")).toBe(false);
    expect(init?.body).toBeUndefined();
  });

  it("maps a 401 to a CliError with the AUTH exit code", async () => {
    const fetchFn = fetchMock(() =>
      jsonResponse(401, { error: { code: "AUTH_REQUIRED", message: "Sign in required." } }),
    );
    const err = await captureError(request("GET", TEST_URL, { fetch: fetchFn }));
    const auth: ExitCode = EXIT.AUTH;
    expect(err.exitCode).toBe(auth);
    expect(err.message).toBe("Sign in required.");
  });

  it("maps a 429 QUEUE_FULL to a CliError with the NETWORK exit code", async () => {
    const fetchFn = fetchMock(() =>
      jsonResponse(429, { error: { code: "QUEUE_FULL", message: "Too busy." } }),
    );
    const err = await captureError(request("POST", TEST_URL, { fetch: fetchFn }));
    expect(err.exitCode).toBe(EXIT.NETWORK);
  });

  it("falls back to INTERNAL when the error envelope is missing", async () => {
    const fetchFn = fetchMock(() => new Response("boom", { status: 500 }));
    const err = await captureError(request("GET", TEST_URL, { fetch: fetchFn }));
    expect(err.exitCode).toBe(EXIT.INTERNAL);
  });
});
