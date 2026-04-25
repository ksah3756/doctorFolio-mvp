import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AllocationBar } from './AllocationBar'

describe('AllocationBar', () => {
  it('채권과 현금은 채권·기타 한 행으로 묶어 표시한다', () => {
    const html = renderToStaticMarkup(
      createElement(AllocationBar, {
        current: { '국내주식': 40, '해외주식': 30, '채권': 10, '현금': 20, '기타': 0 },
        target: { '국내주식': 40, '해외주식': 30, '채권': 10, '현금': 20 },
      })
    )

    expect(html).toContain('채권·기타')
    expect(html).toContain('30%')
    expect(html).toContain('목표 30%')
  })
})
