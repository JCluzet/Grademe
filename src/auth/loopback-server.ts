import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

export interface LoopbackOptions {
  state: string;
  timeoutMs: number;
}

export interface Loopback {
  close: () => void;
  port: number;
  wait: Promise<string>;
}

export function startLoopback(options: LoopbackOptions): Promise<Loopback> {
  return new Promise<Loopback>((resolveStart, rejectStart) => {
    let resolveCode: (code: string) => void;
    let rejectCode: (error: Error) => void;
    const wait = new Promise<string>((resolve, reject) => {
      resolveCode = resolve;
      rejectCode = reject;
    });

    let closed = false;
    const close = (): void => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      server.close();
    };

    const server = createServer((req, res) => {
      handleRequest(req, res, options.state, (code) => {
        resolveCode(code);
        close();
      });
    });

    const timer = setTimeout(() => {
      rejectCode(new Error("Timed out waiting for browser authorization."));
    }, options.timeoutMs);
    timer.unref();

    server.on("error", (error) => {
      clearTimeout(timer);
      rejectStart(error);
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        close();
        rejectStart(new Error("Loopback server did not bind to a TCP port."));
        return;
      }
      resolveStart({ close, port: address.port, wait });
    });
  });
}

function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  expectedState: string,
  onCode: (code: string) => void,
): void {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (url.pathname !== "/callback") {
    respond(res, 400, "Not found.");
    return;
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (code === null || state !== expectedState) {
    respond(res, 400, "Invalid authorization callback.");
    return;
  }

  respond(res, 200, "Authorization received. You can close this tab and return to the terminal.");
  onCode(code);
}

function respond(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, {
    connection: "close",
    "content-type": "text/plain; charset=utf-8",
  });
  res.end(message);
}
