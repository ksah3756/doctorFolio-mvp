// middleware.ts (프로젝트 루트)
import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { canUseRateLimit, getClientIp, isRateLimited } from '@/lib/rateLimit'

let redis: Redis | null | undefined

function getRedisClient(): Redis | null {
  if (redis !== undefined) return redis

  if (!canUseRateLimit()) {
    redis = null
    return redis
  }

  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  return redis
}

export async function middleware(req: NextRequest) {
  // API 라우트만 rate limit
  if (!req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const client = getRedisClient()
  if (!client) {
    return NextResponse.next()
  }

  const ip = getClientIp(req.headers.get('x-forwarded-for'))

  try {
    if (await isRateLimited(client, ip)) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      )
    }
  } catch {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
