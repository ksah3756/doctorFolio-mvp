import { describe, expect, it } from 'vitest'
import { DIAGNOSIS_DISCLAIMER_LINES } from './disclaimers'

describe('DIAGNOSIS_DISCLAIMER_LINES', () => {
  it('contains the required disclaimer and pricing notice copy', () => {
    expect(DIAGNOSIS_DISCLAIMER_LINES).toEqual([
      '이 서비스는 투자자문업 등록 서비스가 아닙니다. 최종 투자 결정은 본인 책임입니다.',
      '캡처 시점 기준 데이터. 실제 주문 시 시세를 다시 확인해주세요.',
    ])
  })
})
