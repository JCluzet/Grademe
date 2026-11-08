import { useStdout } from "ink";
import { useEffect, useState } from "react";

interface TerminalSize { columns: number; rows: number }

function readTerminalSize(stdout: NodeJS.WritableStream): TerminalSize {
  const columns = "columns" in stdout && typeof stdout.columns === "number" ? stdout.columns : 0;
  const rows = "rows" in stdout && typeof stdout.rows === "number" ? stdout.rows : 0;
  return { columns: columns || 80, rows: rows || 30 };
}

export function useTerminalDimensions(): TerminalSize {
  const { stdout } = useStdout();
  const [size, setSize] = useState(() => readTerminalSize(stdout));
  useEffect(() => {
    const resize = (): void => {
      setSize(readTerminalSize(stdout));
    };
    stdout.on("resize", resize);
    return () => { stdout.off("resize", resize); };
  }, [stdout]);
  return size;
}
