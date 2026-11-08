import { parseSseFrame, type ParsedSseFrame } from "@grademe/contracts";

function extractCompleteFrames(buffer: string): {
  frames: ParsedSseFrame[];
  rest: string;
} {
  const frames: ParsedSseFrame[] = [];
  let rest = buffer;
  let delimiter = rest.indexOf("\n\n");
  while (delimiter !== -1) {
    const parsed = parseSseFrame(rest.slice(0, delimiter));
    if (parsed) frames.push(parsed);
    rest = rest.slice(delimiter + 2);
    delimiter = rest.indexOf("\n\n");
  }
  return { frames, rest };
}

export async function* streamFrames(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ParsedSseFrame> {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const extracted = extractCompleteFrames(buffer);
      buffer = extracted.rest;
      for (const frame of extracted.frames) yield frame;
    }

    buffer += decoder.decode();
    const trailing = buffer.trim();
    if (trailing.length > 0) {
      const parsed = parseSseFrame(trailing);
      if (parsed) yield parsed;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
