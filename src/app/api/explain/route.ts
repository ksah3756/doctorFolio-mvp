// src/app/api/explain/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildExplanationPrompt } from '@/lib/explain'
import type { DiagnosisResult } from '@/lib/types'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const diagnosis: DiagnosisResult = await req.json()
  const prompt = buildExplanationPrompt(diagnosis)

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ explanation: text })
}
