import { describe, expect, it, vi } from "vitest";

import { ALT_SCREEN_ENTER, ALT_SCREEN_LEAVE, enterAltScreen } from "./alt-screen";

function fakeStdout(isTTY: boolean): { stream: NodeJS.WriteStream; writes: string[] } {
  const writes: string[] = [];
  const stream = {
    isTTY,
    write: (chunk: string) => {
      writes.push(chunk);
      return true;
    },
  } as unknown as NodeJS.WriteStream;
  return { stream, writes };
}

describe("enterAltScreen", () => {
  it("writes the enter sequence on a TTY and the leave sequence on leave()", () => {
    const off = vi.spyOn(process, "off");
    const { stream, writes } = fakeStdout(true);

    const alt = enterAltScreen(stream);
    expect(writes).toEqual([ALT_SCREEN_ENTER]);

    alt.leave();
    expect(writes).toEqual([ALT_SCREEN_ENTER, ALT_SCREEN_LEAVE]);

    alt.leave();
    expect(writes).toEqual([ALT_SCREEN_ENTER, ALT_SCREEN_LEAVE]);

    off.mockRestore();
  });

  it("does nothing when stdout is not a TTY", () => {
    const { stream, writes } = fakeStdout(false);

    const alt = enterAltScreen(stream);
    alt.leave();

    expect(writes).toEqual([]);
  });
});
