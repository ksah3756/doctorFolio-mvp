export interface RateLimitStore {
  incr: (key: string) => Promise<number>
  expire: (key: string, seconds: number) => Promise<unknown>
}

export const RATE_LIMIT = {
  limit: 5,
  windowSeconds: 60,
} as const

export function canUseRateLimit(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)
}

export function getClientIp(forwardedFor: string | null | undefined): string {
  return forwardedFor?.split(',')[0]?.trim() || '127.0.0.1'
}

export async function isRateLimited(
  store: RateLimitStore,
  ip: string,
  config: typeof RATE_LIMIT = RATE_LIMIT,
): Promise<boolean> {
  const key = `rate:${ip}`
  const count = await store.incr(key)

  if (count === 1) {
    await store.expire(key, config.windowSeconds)
  }

  return count > config.limit
}
