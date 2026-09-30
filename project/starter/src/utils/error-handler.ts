/** Custom error class + retry/timeout utilities for the review pipeline. */

export enum ErrorCodes {
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
  TIMEOUT = 'TIMEOUT',
  VALIDATION = 'VALIDATION',
  AGENT_FAILED = 'AGENT_FAILED',
  API_ERROR = 'API_ERROR',
}

export class ReviewError extends Error {
  code: ErrorCodes;
  cause?: unknown;

  constructor(message: string, code: ErrorCodes, cause?: unknown) {
    super(message);
    this.name = 'ReviewError';
    this.code = code;
    this.cause = cause;
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
}

/**
 * Retry `fn` with exponential backoff and jitter.
 * Delay for attempt n (1-based): delayMs * 2^(n-1) + random(0-100ms).
 * Throws ReviewError with RETRY_EXHAUSTED when retries are spent.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000 } = options;
  let attempt = 0;
  // biome-ignore lint: retry loop
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > maxRetries) {
        throw new ReviewError(
          `Operation failed after ${maxRetries} retries: ${(err as Error)?.message ?? String(err)}`,
          ErrorCodes.RETRY_EXHAUSTED,
          err,
        );
      }
      const backoff = delayMs * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * 101); // 0-100ms thundering-herd guard
      await sleep(backoff + jitter);
    }
  }
}

/**
 * Limit operation duration via Promise.race.
 * Rejects with ReviewError(TIMEOUT) if `fn` does not settle in time.
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new ReviewError(
          `Operation timed out after ${timeoutMs}ms`,
          ErrorCodes.TIMEOUT,
        ),
      );
    }, timeoutMs);
  });
  return Promise.race([fn(), timeout]);
}
