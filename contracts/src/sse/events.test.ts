import { describe, expect, it } from "vitest";

import { parseSseFrame } from "./events";

describe("parseSseFrame", () => {
  it("parses an event/data frame into {event, data}", () => {
    const frame = 'event: test\ndata: {"testId":"t1","passed":true}';
    expect(parseSseFrame(frame)).toEqual({ event: "test", data: { testId: "t1", passed: true } });
  });

  it("returns null for a frame without a data line", () => {
    expect(parseSseFrame("event: ping")).toBeNull();
  });

  it("returns null for invalid JSON in data", () => {
    expect(parseSseFrame("event: test\ndata: {oops")).toBeNull();
  });

  it("reassembles JSON split across multiple data lines", () => {
    const frame = 'event: done\ndata: {"a":1,\ndata: "b":2}';
    expect(parseSseFrame(frame)).toEqual({ event: "done", data: { a: 1, b: 2 } });
  });

  it("parses a CRLF frame", () => {
    const frame = 'event: test\r\ndata: {"ok":true}\r';
    expect(parseSseFrame(frame)).toEqual({ event: "test", data: { ok: true } });
  });

  it("reassembles JSON split across multiple data lines with CRLF delimiters", () => {
    const frame = 'event: done\r\ndata: {"a":1,\r\ndata: "b":2}\r\n';
    expect(parseSseFrame(frame)).toEqual({ event: "done", data: { a: 1, b: 2 } });
  });
});
