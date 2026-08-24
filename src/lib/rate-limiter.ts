/**
 * Simple in-memory rate limiter (5.3).
 * Limits: 100 requests per minute per IP for /api/* routes.
 */

const ipHits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_HITS = 100;

// Auto-clean every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of ipHits) {
      if (val.resetAt < now) ipHits.delete(key);
    }
  }, 300_000);
}

export function rateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + WINDOW_MS;
    ipHits.set(ip, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_HITS - 1, resetAt };
  }

  entry.count++;
  if (entry.count > MAX_HITS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: MAX_HITS - entry.count, resetAt: entry.resetAt };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}
