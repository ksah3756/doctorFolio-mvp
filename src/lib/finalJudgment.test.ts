import { describe, expect, it } from 'vitest'
import { resolveFinalJudgment } from './finalJudgment'

describe('resolveFinalJudgment', () => {
  it('Risk-On + 매수 신호는 분할매수로 올린다', () => {
    const result = resolveFinalJudgment('risk_on', {
      companyName: 'Apple',
      recommendation: 'buy',
      score: 3,
    })

    expect(result.label).toBe('분할매수')
  })

  it('Risk-Off + 매수 신호는 관망으로 낮춘다', () => {
    const result = resolveFinalJudgment('risk_off', {
      companyName: 'Apple',
      recommendation: 'buy',
      score: 3,
    })

    expect(result.label).toBe('관망')
  })

  it('Risk-Off + 중립 신호는 주의로 본다', () => {
    const result = resolveFinalJudgment('risk_off', {
      companyName: 'Apple',
      recommendation: 'neutral',
      score: 0,
    })

    expect(result.label).toBe('주의')
  })
})
