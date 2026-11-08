import {
  CLI_VERSION_HEADER,
  gradeExercisePayloadSchema,
  type SubmittedFile,
} from "@grademe/contracts";
import { describe, expect, it, vi, type Mock } from "vitest";

import { CliError, EXIT } from "../errors";
import { CLI_VERSION, GrademeApi } from "./client";
import type { FetchLike } from "./http";

const BASE = "https://api.test";
const EXAM_SLUG = "c-fundamentals";
const EXERCISE_SLUG = "ft-putchar";
const FILE_NAME = "print_char.c";
const SESSION_ID = "c1bb3d9e-5fa5-4d5a-8f5e-6a2a1f906f87";
const TOKEN = "tok";
const submitContext = { currentLevel: 2, sessionId: SESSION_ID };

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

function sseResponse(status: number, frames: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream" },
    status,
  });
}

const exampleExercise = {
  allowedFunctions: ["write"],
  assignmentName: "print_char",
  examples: [{ command: "./a.out", output: "z" }],
  expectedFiles: [FILE_NAME],
  instructions: "Write print_char.",
  kind: "program",
  language: "c",
  slug: EXERCISE_SLUG,
};

const exampleSession = {
  cooldownUntil: null,
  currentLevel: 2,
  currentTry: 1,
  examSlug: EXAM_SLUG,
  sessionId: SESSION_ID,
  exerciseSlug: EXERCISE_SLUG,
  expiresAt: "2026-06-14T18:00:00.000Z",
  levels: [
    { assignmentName: "string_length", exerciseSlug: "ft-strlen", index: 0, status: "passed" },
    { assignmentName: "string_copy", exerciseSlug: "ft-strcpy", index: 1, status: "passed" },
    { assignmentName: "print_char", exerciseSlug: EXERCISE_SLUG, index: 2, status: "current" },
  ],
  passingScore: 50,
  pointsPerLevel: 13,
  score: 37,
  totalLevels: 8,
};

const exampleRow = {
  audience: "developer",
  bestScoreLabel: null,
  difficulty: 3,
  durationLabel: "3h",
  languageLabel: "C",
  levelLabel: "Level 0/8",
  progressPercent: 0,
  remainingLabel: null,
  slug: EXAM_SLUG,
  status: "not_started",
  title: "C Fundamentals",
};

const compileFrame = 'event: compile\ndata: {"ok":true,"stderr":null,"stdout":null,"timedOut":false}\n\n';

describe("GrademeApi", () => {
  it("exchangeToken POSTs code + verifier and parses the response", async () => {
    const fetchFn = fetchMock(() =>
      jsonResponse(200, { token: TOKEN, user: { email: "u@example.test", id: "u1" } }),
    );
    const api = new GrademeApi({ baseUrl: BASE, fetch: fetchFn });
    const result = await api.exchangeToken("the-code", "the-verifier");

    const [url, init] = firstCall(fetchFn);
    expect(url).toBe(`${BASE}/api/cli/v1/auth/token`);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ code: "the-code", code_verifier: "the-verifier" }));
    expect(new Headers(init?.headers).get(CLI_VERSION_HEADER)).toBe(CLI_VERSION);
    expect(result).toEqual({ token: TOKEN, user: { email: "u@example.test", id: "u1" } });
  });

  it("getCatalog GETs the catalog with the bearer token and parses rows", async () => {
    const fetchFn = fetchMock(() => jsonResponse(200, [exampleRow]));
    const api = new GrademeApi({ baseUrl: BASE, fetch: fetchFn, token: TOKEN });
    const rows = await api.getCatalog();

    const [url, init] = firstCall(fetchFn);
    expect(url).toBe(`${BASE}/api/cli/v1/exams`);
    expect(init?.method).toBe("GET");
    expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(rows).toEqual([exampleRow]);
  });

  it("getExercise GETs the slug route and parses content", async () => {
    const fetchFn = fetchMock(() => jsonResponse(200, exampleExercise));
    const api = new GrademeApi({ baseUrl: BASE, fetch: fetchFn, token: TOKEN });
    const content = await api.getExercise(EXERCISE_SLUG);

    const [url] = firstCall(fetchFn);
    expect(url).toBe(`${BASE}/api/cli/v1/exercises/ft-putchar`);
    expect(content).toEqual(exampleExercise);
  });

  it("getSession GETs the session route and parses the view", async () => {
    const fetchFn = fetchMock(() => jsonResponse(200, exampleSession));
    const api = new GrademeApi({ baseUrl: BASE, fetch: fetchFn, token: TOKEN });
    const session = await api.getSession(EXAM_SLUG);

    const [url] = firstCall(fetchFn);
    expect(url).toBe(`${BASE}/api/cli/v1/exams/c-fundamentals/session`);
    expect(session).toEqual(exampleSession);
  });

  it("getSession returns null on a 404 NO_ACTIVE_SESSION", async () => {
    const fetchFn = fetchMock(() =>
      jsonResponse(404, { error: { code: "NO_ACTIVE_SESSION", message: "No active session." }, ok: false }),
    );
    const api = new GrademeApi({ baseUrl: BASE, fetch: fetchFn, token: TOKEN });
    await expect(api.getSession(EXAM_SLUG)).resolves.toBeNull();
  });

  it("getSession rethrows non-404 errors", async () => {
    const fetchFn = fetchMock(() =>
      jsonResponse(401, { error: { code: "AUTH_REQUIRED", message: "Sign in required." } }),
    );
    const api = new GrademeApi({ baseUrl: BASE, fetch: fetchFn, token: TOKEN });
    const error = await api.getSession(EXAM_SLUG).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CliError);
  });

  it("startExam POSTs the start route with the bearer token", async () => {
    const fetchFn = fetchMock(() => jsonResponse(200, { ok: true }));
    const api = new GrademeApi({ baseUrl: BASE, fetch: fetchFn, token: TOKEN });
    await api.startExam(EXAM_SLUG);

    const [url, init] = firstCall(fetchFn);
    expect(url).toBe(`${BASE}/api/cli/v1/exams/c-fundamentals/start`);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${TOKEN}`);
  });

  it("revoke POSTs the revoke route", async () => {
    const fetchFn = fetchMock(() => jsonResponse(200, { ok: true }));
    const api = new GrademeApi({ baseUrl: BASE, fetch: fetchFn, token: TOKEN });
    await api.revoke();

    const [url, init] = firstCall(fetchFn);
    expect(url).toBe(`${BASE}/api/cli/v1/auth/revoke`);
    expect(init?.method).toBe("POST");
  });

  it("submitExamStream POSTs files in exam mode and streams frames", async () => {
    const files: SubmittedFile[] = [{ content: "int main(){}", path: FILE_NAME }];
    const fetchFn = fetchMock(() => sseResponse(200, [compileFrame]));
    const api = new GrademeApi({ baseUrl: BASE, fetch: fetchFn, token: TOKEN });

    const run = await api.submitExamStream(EXAM_SLUG, submitContext, files);
    const seen: string[] = [];
    for await (const frame of run.frames) seen.push(frame.event);

    const [url, init] = firstCall(fetchFn);
    expect(url).toBe(`${BASE}/api/cli/v1/exams/c-fundamentals/submit/stream`);
    expect(init?.method).toBe("POST");
    if (typeof init?.body !== "string") throw new Error("Expected a JSON request body.");
    const payload = gradeExercisePayloadSchema.parse(JSON.parse(init.body) as unknown);
    expect(payload).toMatchObject({
      examSessionId: SESSION_ID,
      expectedLevel: 2,
      mode: "exam",
      submittedFiles: files,
    });
    expect(new Headers(init.headers).get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(new Headers(init.headers).get(CLI_VERSION_HEADER)).toBe(CLI_VERSION);
    expect(seen).toEqual(["compile"]);
  });

  it("submitExamStream forwards an AbortSignal into the fetch init", async () => {
    const files: SubmittedFile[] = [{ content: "x", path: FILE_NAME }];
    const fetchFn = fetchMock(() => sseResponse(200, [compileFrame]));
    const api = new GrademeApi({ baseUrl: BASE, fetch: fetchFn, token: TOKEN });
    const controller = new AbortController();

    await api.submitExamStream(EXAM_SLUG, submitContext, files, controller.signal);

    const [, init] = firstCall(fetchFn);
    expect(init?.signal).toBe(controller.signal);
  });

  it("submitExamStream omits signal from the init when none is given", async () => {
    const files: SubmittedFile[] = [{ content: "x", path: FILE_NAME }];
    const fetchFn = fetchMock(() => sseResponse(200, [compileFrame]));
    const api = new GrademeApi({ baseUrl: BASE, fetch: fetchFn, token: TOKEN });

    await api.submitExamStream(EXAM_SLUG, submitContext, files);

    const [, init] = firstCall(fetchFn);
    expect(init?.signal).toBeUndefined();
  });

  it("submitExamStream collect() reduces frames into final progress", async () => {
    const files: SubmittedFile[] = [{ content: "x", path: FILE_NAME }];
    const fetchFn = fetchMock(() => sseResponse(200, [compileFrame]));
    const api = new GrademeApi({ baseUrl: BASE, fetch: fetchFn, token: TOKEN });

    const run = await api.submitExamStream(EXAM_SLUG, submitContext, files);
    const progress = await run.collect();
    expect(progress.compile).toEqual({ ok: true, stderr: null, stdout: null, timedOut: false });
    expect(progress.done).toBeNull();
  });

  it("submitExamStream maps a pre-stream non-2xx response to a CliError", async () => {
    const files: SubmittedFile[] = [{ content: "x", path: FILE_NAME }];
    const queueFull = 'event: error\ndata: {"code":"QUEUE_FULL","message":"busy"}\n\n';
    const fetchFn = fetchMock(() => sseResponse(429, [queueFull]));
    const api = new GrademeApi({ baseUrl: BASE, fetch: fetchFn, token: TOKEN });

    const error = await api
      .submitExamStream(EXAM_SLUG, submitContext, files)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CliError);
    if (error instanceof CliError) expect(error.exitCode).toBe(EXIT.NETWORK);
  });
});
