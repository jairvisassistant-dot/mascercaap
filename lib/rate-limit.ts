/**
 * Rate limiter — dual mode.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, uses
 * @upstash/ratelimit with Redis — survives multi-instance/serverless deployments.
 *
 * Otherwise, falls back to a per-process sliding window (adequate for
 * single-instance or dev environments).
 *
 * Usage:
 *   const limiter = createRateLimiter({ id: "contact", max: 5, windowMs: 60_000 })
 *   const { allowed, retryAfter } = await limiter.check(ip)
 *
 * To activate Redis mode, set in your deployment environment:
 *   UPSTASH_REDIS_REST_URL=...
 *   UPSTASH_REDIS_REST_TOKEN=...
 */

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export interface RateLimiter {
  check(ip: string): Promise<{ allowed: boolean; retryAfter: number }>;
}

const WINDOW_SECONDS = 60;

export function createRateLimiter(opts: {
  id: string;
  max: number;
  windowMs?: number;
}): RateLimiter {
  const windowMs = opts.windowMs ?? WINDOW_SECONDS * 1000;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    // Redis mode — shared state across all instances
    const redis = new Redis({ url: redisUrl, token: redisToken });
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(opts.max, `${Math.ceil(windowMs / 1000)} s`),
      prefix: `rl:${opts.id}`,
    });

    return {
      async check(ip: string) {
        const { success } = await ratelimit.limit(ip);
        return {
          allowed: success,
          retryAfter: Math.ceil(windowMs / 1000),
        };
      },
    };
  }

  // In-memory sliding window fallback
  const store = new Map<string, number[]>();

  return {
    async check(ip: string) {
      const now = Date.now();
      const windowStart = now - windowMs;
      const timestamps = (store.get(ip) ?? []).filter((t) => t > windowStart);

      if (timestamps.length >= opts.max) {
        return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
      }

      timestamps.push(now);
      store.set(ip, timestamps);

      // Prevent unbounded growth — purge fully-expired entries
      if (store.size > 500) {
        for (const [key, times] of store.entries()) {
          if (times.every((t) => t <= windowStart)) store.delete(key);
        }
      }

      return { allowed: true, retryAfter: Math.ceil(windowMs / 1000) };
    },
  };
}
