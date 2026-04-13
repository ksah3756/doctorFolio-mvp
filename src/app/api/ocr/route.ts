// src/app/api/ocr/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildOcrPrompt, getOcrErrorDetails, normalizeOcrItems, parseOcrResponse } from '@/lib/ocr'
import { canUseRateLimit, getClientIp, isRateLimited, OCR_RATE_LIMIT } from '@/lib/rateLimit'
import type { PortfolioPosition } from '@/lib/types'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    if (canUseRateLimit()) {
      const { Redis } = await import('@upstash/redis')
      const redis = Redis.fromEnv()
      const ip = getClientIp(req.headers.get('x-forwarded-for'))
      const limited = await isRateLimited(redis, ip, OCR_RATE_LIMIT, 'ocr')
      if (limited) {
        return NextResponse.json(
          { error: '24시간 내 OCR 요청 한도(5회)를 초과했습니다. 내일 다시 시도해주세요.' },
          { status: 429 },
        )
      }
    }
    const formData = await req.formData()
    const images = formData.getAll('images') as File[]

    if (images.length === 0) {
      return NextResponse.json({ error: '이미지가 없습니다' }, { status: 400 })
    }
    if (images.length > 5) {
      return NextResponse.json({ error: '최대 5장까지 업로드 가능합니다' }, { status: 400 })
    }

    const allPositions: PortfolioPosition[] = []

    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: buildOcrPrompt() },
          ],
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const rawItems = parseOcrResponse(text)
      allPositions.push(...normalizeOcrItems(rawItems, i + 1))
    }

    return NextResponse.json(allPositions)
  } catch (error) {
    const { status, message } = getOcrErrorDetails(error)
    console.error('OCR route failed', error)
    return NextResponse.json({ error: message }, { status })
  }
}
