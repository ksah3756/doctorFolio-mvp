// middleware.ts (프로젝트 루트)
import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const LIMIT = 5       // 분당 최대 요청 수
const WINDOW = 60     // 초

export async function middleware(req: NextRequest) {
  // API 라우트만 rate limit
  if (!req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1'
  const key = `rate:${ip}`

  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, WINDOW)

  if (count > LIMIT) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
