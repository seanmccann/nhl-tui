import { useStdout } from "ink";
import { useEffect, useState } from "react";

export type TerminalSize = {
  columns: number;
  rows: number;
};

const DEFAULT_SIZE: TerminalSize = { columns: 80, rows: 24 };

function readSize(stdout: NodeJS.WriteStream | undefined): TerminalSize {
  return {
    columns: stdout?.columns ?? DEFAULT_SIZE.columns,
    rows: stdout?.rows ?? DEFAULT_SIZE.rows,
  };
}

/**
 * Tracks the terminal dimensions and updates on resize, so views can bound
 * their content to what actually fits instead of overflowing (which garbles
 * an Ink render). Falls back to a sane 80x24 when the size is unknown (e.g.
 * output is not a TTY).
 */
export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();
  const [size, setSize] = useState<TerminalSize>(() => readSize(stdout));

  useEffect(() => {
    if (!stdout) {
      return;
    }

    const onResize = () => setSize(readSize(stdout));
    onResize();
    stdout.on("resize", onResize);

    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  return size;
}
