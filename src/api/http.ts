import { CLI_VERSION_HEADER } from "@grademe/contracts";
import { z } from "zod";

import { CliError, EXIT, exitForServerCode } from "../errors";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type HttpMethod = "GET" | "POST";

export interface RequestOptions {
  body?: unknown;
  cliVersion?: string;
  fetch: FetchLike;
  token?: string;
}

const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export async function readErrorEnvelope(
  response: Response,
): Promise<{ code: string; message: string } | null> {
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    return null;
  }
  const parsed = errorEnvelopeSchema.safeParse(raw);
  return parsed.success ? parsed.data.error : null;
}

export async function fetchOrThrow(
  fetch: FetchLike,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new CliError(
      "Couldn't reach Grademe. Please check your connection and try again.",
      EXIT.NETWORK,
    );
  }
}

export function cliErrorFromEnvelope(
  url: string,
  status: number,
  envelope: { code: string; message: string } | null,
): CliError {
  if (!envelope) {
    return new CliError(`Request to ${url} failed (HTTP ${String(status)}).`, EXIT.INTERNAL);
  }
  return new CliError(envelope.message, exitForServerCode(envelope.code));
}

export async function request(
  method: HttpMethod,
  url: string,
  options: RequestOptions,
): Promise<unknown> {
  const headers = new Headers();
  const init: RequestInit = { headers, method };
  if (options.cliVersion !== undefined) headers.set(CLI_VERSION_HEADER, options.cliVersion);
  if (options.token !== undefined) headers.set("authorization", `Bearer ${options.token}`);
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(options.body);
  }

  const response = await fetchOrThrow(options.fetch, url, init);

  if (!response.ok) {
    throw cliErrorFromEnvelope(url, response.status, await readErrorEnvelope(response));
  }

  return response.json();
}
