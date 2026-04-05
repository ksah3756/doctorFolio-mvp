// src/app/api/ocr/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { normalizeOcrItems, parseOcrResponse } from '@/lib/ocr'
import type { PortfolioPosition } from '@/lib/types'

const client = new Anthropic()

const PROMPT = `다음 증권사 MTS 보유 종목 화면에서 모든 보유 종목 정보를 추출해줘.

추출할 필드:
- name: 종목명
- code: 종목코드 (6자리 숫자 or 알파벳 티커, 없으면 null)
- qty: 보유수량 (정수)
- value: 보유금액/평가금액/현재금액/보유평가금액 (원화 숫자만, 콤마/₩/원 제거)
- avgCost: 평균단가/매입단가/취득단가 (원화 숫자만, 콤마/₩/원 제거, 없으면 null)

규칙:
- 필드가 화면에 없으면 null
- 금액은 숫자만 (콤마, ₩, 원 모두 제거)
- JSON 배열만 반환, 다른 텍스트 없음

형식: [{"name":"삼성전자","code":"005930","qty":50,"value":2000000,"avgCost":38000}]`

export async function POST(req: NextRequest) {
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
          { type: 'text', text: PROMPT },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const rawItems = parseOcrResponse(text)
    allPositions.push(...normalizeOcrItems(rawItems, i + 1))
  }

  return NextResponse.json(allPositions)
}
