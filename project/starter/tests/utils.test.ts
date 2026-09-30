import { describe, it, expect, vi } from 'vitest';
import {
  withRetry,
  withTimeout,
  ReviewError,
  ErrorCodes,
  RateLimiter,
} from '../src/utils/index.js';

describe('utility functions', () => {
  it('withRetry retries before succeeding', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValue('ok');
    await expect(
      withRetry(fn, { maxRetries: 1, delayMs: 1 }),
    ).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('withRetry throws RETRY_EXHAUSTED after all retries fail', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always down'));
    const err = await withRetry(fn, { maxRetries: 2, delayMs: 1 }).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(ReviewError);
    expect((err as ReviewError).code).toBe(ErrorCodes.RETRY_EXHAUSTED);
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('withTimeout resolves fast operations', async () => {
    await expect(withTimeout(async () => 'fast', 1000)).resolves.toBe(
      'fast',
    );
  });

  it('withTimeout rejects with TIMEOUT on slow operations', async () => {
    const slow = () => new Promise<string>(() => {});
    const err = await withTimeout(slow, 10).catch((e) => e);
    expect(err).toBeInstanceOf(ReviewError);
    expect((err as ReviewError).code).toBe(ErrorCodes.TIMEOUT);
  });

  it('RateLimiter allows requests within limits and prunes old records', () => {
    const limiter = new RateLimiter({
      requestsPerMinute: 2,
      tokensPerMinute: 100,
      maxConcurrent: 5,
    });
    expect(limiter.canProceed(10)).toBe(true);
    // Old records fall off the 60s sliding window.
    (limiter as unknown as { requestHistory: { timestamp: number; tokens: number }[] }).requestHistory = [
      { timestamp: Date.now() - 61_000, tokens: 10 },
    ];
    limiter.pruneOldRecords();
    expect(limiter.getRecentRequestCount()).toBe(0);
    expect(limiter.canProceed(10)).toBe(true);
  });

  it('RateLimiter blocks when the per-minute request limit is reached', async () => {
    const limiter = new RateLimiter({
      requestsPerMinute: 1,
      tokensPerMinute: 100,
      maxConcurrent: 5,
    });
    await limiter.acquire(10);
    try {
      expect(limiter.canProceed(10)).toBe(false);
    } finally {
      limiter.release();
    }
  });
});