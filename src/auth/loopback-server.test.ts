import { describe, expect, it } from "vitest";

import { startLoopback } from "./loopback-server";

const STATE = "the-state";

async function get(port: number, path: string): Promise<Response> {
  return fetch(`http://127.0.0.1:${String(port)}${path}`);
}

describe("startLoopback", () => {
  it("resolves the code for a valid /callback request and closes the server", async () => {
    const { port, wait, close } = await startLoopback({ state: STATE, timeoutMs: 5000 });
    try {
      const response = await get(port, `/callback?code=the-code&state=${STATE}`);
      expect(response.status).toBe(200);
      await expect(wait).resolves.toBe("the-code");

      await expect(get(port, "/callback")).rejects.toThrow();
    } finally {
      close();
    }
  });

  it("rejects a callback with the wrong state (400) and does not resolve", async () => {
    const { port, wait, close } = await startLoopback({ state: STATE, timeoutMs: 5000 });
    try {
      const response = await get(port, "/callback?code=c&state=wrong");
      expect(response.status).toBe(400);

      const settled = await Promise.race([
        wait.then(() => "resolved" as const),
        new Promise<"pending">((resolve) => setTimeout(() => { resolve("pending"); }, 50)),
      ]);
      expect(settled).toBe("pending");
    } finally {
      close();
    }
  });

  it("rejects a request to a path other than /callback (400)", async () => {
    const { port, close } = await startLoopback({ state: STATE, timeoutMs: 5000 });
    try {
      const response = await get(port, "/nope?code=c&state=" + STATE);
      expect(response.status).toBe(400);
    } finally {
      close();
    }
  });

  it("rejects the wait promise once the timeout elapses", async () => {
    const { wait, close } = await startLoopback({ state: STATE, timeoutMs: 10 });
    try {
      await expect(wait).rejects.toThrow();
    } finally {
      close();
    }
  });

  it("close() frees the port and is idempotent", async () => {
    const { port, close } = await startLoopback({ state: STATE, timeoutMs: 5000 });
    close();
    close();
    await expect(get(port, "/callback")).rejects.toThrow();
  });
});
