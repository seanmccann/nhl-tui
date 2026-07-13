import { VERSION } from "../meta.js";

const BASE_URL = "https://api-web.nhle.com/v1";

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 400;
const MAX_BACKOFF_MS = 5000;

export type NhlErrorKind = "http" | "network" | "timeout" | "parse" | "aborted";

export class NhlApiError extends Error {
  readonly kind: NhlErrorKind;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    message: string,
    options: { kind: NhlErrorKind; retryable: boolean; status?: number; cause?: unknown },
  ) {
    super(message, { cause: options.cause });
    this.name = "NhlApiError";
    this.kind = options.kind;
    this.retryable = options.retryable;
    this.status = options.status;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof NhlApiError && error.kind === "aborted";
}

export type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  attempts?: number;
};

const USER_AGENT = `nhl-tui/${VERSION}`;

function backoffMs(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs !== undefined) {
    return Math.min(retryAfterMs, MAX_BACKOFF_MS);
  }

  const exponential = BASE_BACKOFF_MS * 2 ** (attempt - 1);
  const capped = Math.min(exponential, MAX_BACKOFF_MS);
  // Full jitter avoids synchronized retries hammering the API in lockstep.
  return Math.round(Math.random() * capped);
}

function parseRetryAfter(headerValue: string | null): number | undefined {
  if (!headerValue) {
    return undefined;
  }

  const seconds = Number(headerValue);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const dateMs = Date.parse(headerValue);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return undefined;
}

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new NhlApiError("Request aborted", { kind: "aborted", retryable: false }));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new NhlApiError("Request aborted", { kind: "aborted", retryable: false }));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function requestOnce(path: string, timeoutMs: number, signal?: AbortSignal): Promise<unknown> {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
  const requestSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        headers: { "user-agent": USER_AGENT, accept: "application/json" },
        signal: requestSignal,
      });
    } catch (error) {
      if (signal?.aborted) {
        throw new NhlApiError("Request aborted", { kind: "aborted", retryable: false, cause: error });
      }

      if (timeoutController.signal.aborted) {
        throw new NhlApiError(`NHL API request timed out after ${timeoutMs}ms`, {
          kind: "timeout",
          retryable: true,
          cause: error,
        });
      }

      throw new NhlApiError(`NHL API network error: ${formatCause(error)}`, {
        kind: "network",
        retryable: true,
        cause: error,
      });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const retryable = response.status === 429 || response.status >= 500;
      const error = new NhlApiError(
        `NHL API request failed: ${response.status} ${response.statusText} ${body}`.trim(),
        { kind: "http", retryable, status: response.status },
      );
      // Stash Retry-After so the retry loop can honor server-directed backoff.
      (error as NhlApiError & { retryAfterMs?: number }).retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after"),
      );
      throw error;
    }

    try {
      return await response.json();
    } catch (error) {
      throw new NhlApiError(`NHL API returned invalid JSON: ${formatCause(error)}`, {
        kind: "parse",
        retryable: false,
        cause: error,
      });
    }
  } finally {
    clearTimeout(timer);
  }
}

function formatCause(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function requestJson(path: string, options: RequestOptions = {}): Promise<unknown> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS, attempts = DEFAULT_ATTEMPTS } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await requestOnce(path, timeoutMs, signal);
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === attempts;
      const retryable = error instanceof NhlApiError && error.retryable;
      if (!retryable || isLastAttempt) {
        throw error;
      }

      const retryAfterMs = (error as NhlApiError & { retryAfterMs?: number }).retryAfterMs;
      await abortableDelay(backoffMs(attempt, retryAfterMs), signal);
    }
  }

  throw lastError;
}

export class NhlApi {
  async fetchScoreboard(scoreboardDate: string, options?: RequestOptions): Promise<unknown> {
    return requestJson(`/score/${scoreboardDate}`, options);
  }

  async fetchStandings(scoreboardDate: string, options?: RequestOptions): Promise<unknown> {
    return requestJson(`/standings/${scoreboardDate}`, options);
  }

  async fetchSkaterLeaders(limit = 10, options?: RequestOptions): Promise<unknown> {
    return requestJson(
      `/skater-stats-leaders/current?categories=points,goals,assists&limit=${limit}`,
      options,
    );
  }

  async fetchGoalieLeaders(limit = 10, options?: RequestOptions): Promise<unknown> {
    return requestJson(
      `/goalie-stats-leaders/current?categories=goalsAgainstAverage,savePctg,shutouts&limit=${limit}`,
      options,
    );
  }

  async fetchSummary(gameId: number, options?: RequestOptions): Promise<unknown> {
    return requestJson(`/gamecenter/${gameId}/landing`, options);
  }

  async fetchPlayByPlay(gameId: number, options?: RequestOptions): Promise<unknown> {
    return requestJson(`/gamecenter/${gameId}/play-by-play`, options);
  }

  async fetchBoxScore(gameId: number, options?: RequestOptions): Promise<unknown> {
    return requestJson(`/gamecenter/${gameId}/boxscore`, options);
  }
}
