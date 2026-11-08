import {
  CLI_VERSION_HEADER,
  cliAuthTokenResponseSchema,
  cliExamRowSchema,
  cliExerciseContentSchema,
  cliSessionViewSchema,
  gradeExerciseErrorSchema,
  cliVersionSchema,
  type ChallengeSubmissionContext,
  type CliAuthTokenResponse,
  type CliExamRow,
  type CliExerciseContent,
  type CliSessionView,
  type ParsedSseFrame,
  type SubmittedFile,
} from "@grademe/contracts";
import { z } from "zod";

import { initialProgress, reduceGradingSse, type GradingProgress } from "../core/sse-reducer";
import { CliError, EXIT, exitForServerCode } from "../errors";
import { CLI_VERSION as buildVersion } from "../version";
import {
  cliErrorFromEnvelope,
  fetchOrThrow,
  readErrorEnvelope,
  request,
  type FetchLike,
} from "./http";
import { streamFrames } from "./sse";

export interface GrademeApiConfig {
  baseUrl: string;
  fetch: FetchLike;
  token?: string;
}

export interface ExamSubmitRun {
  collect(): Promise<GradingProgress>;
  frames: AsyncGenerator<ParsedSseFrame>;
}

export type ExamSubmitContext = ChallengeSubmissionContext;

const examRowsSchema = z.array(cliExamRowSchema);
export const CLI_VERSION = cliVersionSchema.parse(buildVersion);

export class GrademeApi {
  private readonly baseUrl: string;
  private readonly fetch: FetchLike;
  private readonly token: string | undefined;

  constructor(config: GrademeApiConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.fetch = config.fetch;
    this.token = config.token;
  }

  async exchangeToken(code: string, verifier: string): Promise<CliAuthTokenResponse> {
    const data = await this.request("POST", "/api/cli/v1/auth/token", {
      code,
      code_verifier: verifier,
    });
    return cliAuthTokenResponseSchema.parse(data);
  }

  async getCatalog(): Promise<CliExamRow[]> {
    const data = await this.request("GET", "/api/cli/v1/exams");
    return examRowsSchema.parse(data);
  }

  async getExercise(slug: string): Promise<CliExerciseContent> {
    const data = await this.request("GET", `/api/cli/v1/exercises/${encodeURIComponent(slug)}`);
    return cliExerciseContentSchema.parse(data);
  }

  async getSession(slug: string): Promise<CliSessionView | null> {
    const url = this.url(`/api/cli/v1/exams/${encodeURIComponent(slug)}/session`);
    const response = await fetchOrThrow(this.fetch, url, { headers: this.headers(), method: "GET" });
    if (response.ok) return cliSessionViewSchema.parse(await response.json());

    const envelope = await readErrorEnvelope(response);
    if (response.status === 404 && envelope?.code === "NO_ACTIVE_SESSION") return null;
    throw cliErrorFromEnvelope(url, response.status, envelope);
  }

  async startExam(slug: string): Promise<void> {
    await this.request("POST", `/api/cli/v1/exams/${encodeURIComponent(slug)}/start`, {});
  }

  async revoke(): Promise<void> {
    await this.request("POST", "/api/cli/v1/auth/revoke", {});
  }

  async submitExamStream(
    slug: string,
    context: ExamSubmitContext,
    files: SubmittedFile[],
    signal?: AbortSignal,
  ): Promise<ExamSubmitRun> {
    const url = this.url(`/api/cli/v1/exams/${encodeURIComponent(slug)}/submit/stream`);
    const headers = this.headers();
    headers.set("content-type", "application/json");
    const response = await fetchOrThrow(this.fetch, url, {
      body: JSON.stringify({
        mode: "exam",
        submissionId: crypto.randomUUID(),
        examSessionId: context.sessionId,
        expectedLevel: context.currentLevel,
        submittedFiles: files,
      }),
      headers,
      method: "POST",
      ...(signal === undefined ? {} : { signal }),
    });

    if (!response.body) {
      throw new CliError("The grading stream returned an empty body.", EXIT.INTERNAL);
    }
    if (!response.ok) throw await streamErrorToCliError(url, response);

    const frames = streamFrames(response.body);
    return {
      frames,
      async collect() {
        let progress = initialProgress;
        for await (const frame of frames) progress = reduceGradingSse(progress, frame);
        return progress;
      },
    };
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    return request(method, this.url(path), {
      fetch: this.fetch,
      cliVersion: CLI_VERSION,
      ...(body === undefined ? {} : { body }),
      ...(this.token === undefined ? {} : { token: this.token }),
    });
  }

  private headers(): Headers {
    const headers = new Headers();
    headers.set(CLI_VERSION_HEADER, CLI_VERSION);
    if (this.token !== undefined) headers.set("authorization", `Bearer ${this.token}`);
    return headers;
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}

async function streamErrorToCliError(url: string, response: Response): Promise<CliError> {
  if (response.body) {
    for await (const frame of streamFrames(response.body)) {
      if (frame.event !== "error") continue;
      const parsed = gradeExerciseErrorSchema.safeParse(frame.data);
      if (parsed.success) {
        return new CliError(parsed.data.message, exitForServerCode(parsed.data.code));
      }
    }
  }
  return new CliError(
    `Request to ${url} failed (HTTP ${String(response.status)}).`,
    EXIT.INTERNAL,
  );
}
