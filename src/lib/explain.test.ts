import { describe, expect, it } from 'vitest'
import { buildExplanationPrompt } from './explain'
import type { DiagnosisResult } from './types'

const diagnosis: DiagnosisResult = {
  problems: [
    {
      type: 'drift',
      severity: 'high',
      assetClass: '국내주식',
      current: 80,
      target: 40,
      label: '국내주식에 너무 쏠려 있습니다',
      description: '현재 80%로 목표(40%)보다 40%p 높습니다.',
    },
  ],
  actions: [
    {
      ticker: '005930',
      name: '삼성전자',
      action: 'sell',
      quantity: 3,
      estimatedAmount: 210000,
    },
  ],
  currentAllocation: { '국내주식': 80, '해외주식': 10, '채권': 10, '현금': 0, '기타': 0 },
  targetAllocation: { '국내주식': 40, '해외주식': 30, '채권': 30, '현금': 0 },
  totalValue: 1000000,
}

describe('buildExplanationPrompt', () => {
  it('includes human-readable problem and action summaries', () => {
    const prompt = buildExplanationPrompt(diagnosis)

    expect(prompt).toContain('문제:')
    expect(prompt).toContain('- 국내주식에 너무 쏠려 있습니다: 현재 80%, 목표 40%')
    expect(prompt).toContain('권장 조치:')
    expect(prompt).toContain('- 삼성전자 매도 3주 (약 210,000원)')
  })

  it('keeps the instruction guardrails in the prompt', () => {
    const prompt = buildExplanationPrompt(diagnosis)

    expect(prompt).toContain('숫자를 반드시 사용할 것')
    expect(prompt).toContain('마지막 문장은 "실행 여부와 시점은 본인이 결정하세요."로 끝낼 것')
  })
})
