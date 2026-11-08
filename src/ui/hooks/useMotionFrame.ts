import { useIsScreenReaderEnabled, useStdout } from "ink";
import { useEffect, useState } from "react";

export function useMotionFrame(count: number, intervalMs: number, once = false): number {
  const { stdout } = useStdout();
  const screenReader = useIsScreenReaderEnabled();
  const isTerminal = "isTTY" in stdout && stdout.isTTY;
  const enabled = isTerminal && !screenReader && process.env["TERM"] !== "dumb" &&
    process.env["NO_COLOR"] === undefined && process.env["GRADEME_REDUCED_MOTION"] !== "1";
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let current = 0;
    const timer = setInterval(() => {
      current++;
      setFrame(current % count);
      if (once && current >= count - 1) clearInterval(timer);
    }, intervalMs);
    return () => { clearInterval(timer); };
  }, [count, enabled, intervalMs, once]);
  return enabled ? frame : once ? count - 1 : 0;
}
