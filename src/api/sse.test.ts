import { describe, expect, it } from "vitest";

import { streamFrames } from "./sse";

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      const chunk = chunks[index];
      index += 1;
      if (chunk !== undefined) controller.enqueue(encoder.encode(chunk));
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<{ data: unknown; event: string }[]> {
  const frames: { data: unknown; event: string }[] = [];
  for await (const frame of streamFrames(stream)) frames.push(frame);
  return frames;
}

describe("streamFrames", () => {
  it("reassembles a frame split across two chunks", async () => {
    const stream = streamFromChunks([
      'event: compile\ndata: {"ok":',
      'true}\n\n',
    ]);
    const frames = await collect(stream);
    expect(frames).toEqual([{ data: { ok: true }, event: "compile" }]);
  });

  it("decodes multiple frames and a multi-line data frame", async () => {
    const stream = streamFromChunks([
      'event: test\ndata: {"testId":"t1"}\n\n',
      "event: done\ndata: {\n",
      'data: "examCompleted": false\n',
      "data: }\n\n",
    ]);
    const frames = await collect(stream);
    expect(frames).toEqual([
      { data: { testId: "t1" }, event: "test" },
      { data: { examCompleted: false }, event: "done" },
    ]);
  });

  it("skips frames that parseSseFrame rejects", async () => {
    const stream = streamFromChunks([
      "event: ping\n\n",
      'event: compile\ndata: {"ok":false}\n\n',
    ]);
    const frames = await collect(stream);
    expect(frames).toEqual([{ data: { ok: false }, event: "compile" }]);
  });

  it("emits a trailing frame even without a closing blank line", async () => {
    const stream = streamFromChunks(['event: error\ndata: {"code":"X"}']);
    const frames = await collect(stream);
    expect(frames).toEqual([{ data: { code: "X" }, event: "error" }]);
  });

  it("yields nothing for an empty stream", async () => {
    const frames = await collect(streamFromChunks([]));
    expect(frames).toEqual([]);
  });

  it("cancels the underlying stream when the iterator is abandoned early", async () => {
    let cancelled = false;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
      start(controller) {
        controller.enqueue(encoder.encode('event: compile\ndata: {"ok":true}\n\n'));
        controller.enqueue(encoder.encode('event: test\ndata: {"testId":"t1"}\n\n'));
      },
    });

    for await (const frame of streamFrames(stream)) {
      expect(frame.event).toBe("compile");
      break;
    }

    expect(cancelled).toBe(true);
  });
});
