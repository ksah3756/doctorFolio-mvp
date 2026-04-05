import { describe, expect, it } from 'vitest'
import {
  canUseRateLimit,
  getClientIp,
  isRateLimited,
  RATE_LIMIT,
  type RateLimitStore,
} from './rateLimit'

function createStore(sequence: number[]): RateLimitStore & { keys: string[]; expires: Array<[string, number]> } {
  let index = 0

  return {
    keys: [],
    expires: [],
    async incr(key: string) {
      this.keys.push(key)
      const value = sequence[index] ?? sequence[sequence.length - 1] ?? 1
      index += 1
      return value
    },
    async expire(key: string, seconds: number) {
      this.expires.push([key, seconds])
      return 1
    },
  }
}

describe('rateLimit helpers', () => {
  it('detects whether Upstash credentials are available', () => {
    expect(canUseRateLimit({})).toBe(false)
    expect(canUseRateLimit({ UPSTASH_REDIS_REST_URL: 'https://example.com' })).toBe(false)
    expect(canUseRateLimit({
      UPSTASH_REDIS_REST_URL: 'https://example.com',
      UPSTASH_REDIS_REST_TOKEN: 'token',
    })).toBe(true)
  })

  it('extracts the first forwarded IP and trims whitespace', () => {
    expect(getClientIp(' 1.2.3.4 , 5.6.7.8 ')).toBe('1.2.3.4')
    expect(getClientIp(null)).toBe('127.0.0.1')
  })

  it('sets expiry when the first request in a window arrives', async () => {
    const store = createStore([1])

    const limited = await isRateLimited(store, '1.2.3.4')

    expect(limited).toBe(false)
    expect(store.keys).toEqual(['rate:1.2.3.4'])
    expect(store.expires).toEqual([['rate:1.2.3.4', RATE_LIMIT.windowSeconds]])
  })

  it('blocks requests after the configured limit', async () => {
    const store = createStore([RATE_LIMIT.limit + 1])

    const limited = await isRateLimited(store, '9.9.9.9')

    expect(limited).toBe(true)
    expect(store.expires).toEqual([])
  })
})
