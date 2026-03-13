import { Box, Text } from "ink";
import { useEffect, useState } from "react";

type StatusLineProps = {
  updatedAt?: number;
  pollDelayMs?: number;
  errorMessage?: string;
};

const MIN_STALE_MS = 10_000;
const STALE_MULTIPLIER = 2;

export function StatusLine({
  updatedAt,
  pollDelayMs,
  errorMessage,
}: StatusLineProps) {
  const [now, setNow] = useState(() => Date.now());
  const staleAfterMs =
    pollDelayMs === undefined
      ? undefined
      : Math.max(MIN_STALE_MS, pollDelayMs * STALE_MULTIPLIER);

  useEffect(() => {
    setNow(Date.now());

    if (!updatedAt || staleAfterMs === undefined) {
      return undefined;
    }

    let timeout: NodeJS.Timeout | undefined;
    let interval: NodeJS.Timeout | undefined;

    const startStaleTicker = () => {
      setNow(Date.now());
      interval = setInterval(() => {
        setNow(Date.now());
      }, 1000);
    };

    const ageMs = Date.now() - updatedAt;
    if (ageMs >= staleAfterMs) {
      startStaleTicker();
    } else {
      timeout = setTimeout(startStaleTicker, staleAfterMs - ageMs);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [updatedAt, staleAfterMs]);

  const ageMs = updatedAt ? now - updatedAt : 0;
  const isStale =
    Boolean(updatedAt) && staleAfterMs !== undefined && ageMs >= staleAfterMs;

  return (
    <Box>
      <Text dimColor>
        {pollDelayMs === undefined
          ? "auto off"
          : `auto ${Math.round(pollDelayMs / 1000)}s`}
      </Text>
      {isStale && <Text color="yellow">{`  |  stale ${Math.floor(ageMs / 1000)}s`}</Text>}
      {errorMessage && <Text color="redBright">{`  |  error ${errorMessage}`}</Text>}
    </Box>
  );
}
