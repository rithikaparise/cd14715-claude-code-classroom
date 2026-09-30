/** Token-bucket + sliding-window rate limiter (60s window). */

export interface RateLimiterConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  maxConcurrent: number;
}

interface RequestRecord {
  timestamp: number;
  tokens: number;
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimiterConfig = {
  requestsPerMinute: 50,
  tokensPerMinute: 90000,
  maxConcurrent: 3,
};

const WINDOW_MS = 60_000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class RateLimiter {
  private config: RateLimiterConfig;
  private requestHistory: RequestRecord[] = [];
  private activeRequests = 0;
  private waitQueue: Array<() => void> = [];

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
  }

  /** Drop records older than 60s (sliding window). */
  pruneOldRecords(): void {
    const cutoff = Date.now() - WINDOW_MS;
    this.requestHistory = this.requestHistory.filter(
      (r) => r.timestamp > cutoff,
    );
  }

  /** True when a request with estimatedTokens may proceed immediately. */
  canProceed(estimatedTokens = 0): boolean {
    this.pruneOldRecords();
    if (this.activeRequests >= this.config.maxConcurrent) return false;
    if (this.requestHistory.length >= this.config.requestsPerMinute)
      return false;
    const tokensUsed = this.requestHistory.reduce(
      (sum, r) => sum + r.tokens,
      0,
    );
    if (tokensUsed + estimatedTokens > this.config.tokensPerMinute)
      return false;
    return true;
  }

  /** Wait until a concurrent slot is free; resolved by release(). */
  async waitForSlot(): Promise<void> {
    if (this.activeRequests < this.config.maxConcurrent) return;
    await new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  /** Wait until sliding-window limits allow the request. */
  async waitForRateLimit(estimatedTokens = 0): Promise<void> {
    // biome-ignore lint: polling loop with sleep
    while (!this.canProceed(estimatedTokens)) {
      this.pruneOldRecords();
      if (this.requestHistory.length === 0) {
        await sleep(1000);
        continue;
      }
      const oldest = Math.min(
        ...this.requestHistory.map((r) => r.timestamp),
      );
      const waitMs = Math.max(oldest + WINDOW_MS - Date.now(), 100);
      await sleep(Math.min(waitMs, 5000));
    }
  }

  /** Main entry point: wait for slot + rate limit, then record the request. */
  async acquire(estimatedTokens = 0): Promise<void> {
    await this.waitForSlot();
    await this.waitForRateLimit(estimatedTokens);
    this.activeRequests += 1;
    this.requestHistory.push({ timestamp: Date.now(), tokens: estimatedTokens });
  }

  /** Free a concurrent slot and wake the next waiter (FIFO). */
  release(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    const next = this.waitQueue.shift();
    if (next) next();
  }

  getActiveRequests(): number {
    return this.activeRequests;
  }

  getRecentRequestCount(): number {
    this.pruneOldRecords();
    return this.requestHistory.length;
  }
}
