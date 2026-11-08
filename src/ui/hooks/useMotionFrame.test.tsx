import { Text } from "ink";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMotionFrame } from "./useMotionFrame";

function Probe({ once = false }: { once?: boolean }) {
  const frame = useMotionFrame(4, 10, once);
  return <Text>frame:{String(frame)}</Text>;
}

const tick = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("terminal motion", () => {
  it("settles a launch animation and stops producing frames", async () => {
    vi.stubEnv("NO_COLOR", undefined);
    vi.stubEnv("GRADEME_REDUCED_MOTION", undefined);
    vi.stubEnv("TERM", "xterm-256color");
    const instance = render(<Probe once />);
    Object.defineProperty(instance.stdout, "isTTY", { value: true });
    instance.rerender(<Probe once />);
    await vi.waitFor(() => { expect(instance.lastFrame()).toContain("frame:3"); });
    const count = instance.frames.length;
    await tick(60);
    expect(instance.frames).toHaveLength(count);
  });

  it("uses a static frame for non-TTY output", async () => {
    const instance = render(<Probe />);
    await tick(40);
    expect(instance.lastFrame()).toContain("frame:0");
    expect(instance.frames).toHaveLength(1);
  });

  it("respects reduced motion even on a TTY", async () => {
    vi.stubEnv("GRADEME_REDUCED_MOTION", "1");
    const instance = render(<Probe once />);
    Object.defineProperty(instance.stdout, "isTTY", { value: true });
    instance.rerender(<Probe once />);
    await tick(40);
    expect(instance.lastFrame()).toContain("frame:3");
  });
});
