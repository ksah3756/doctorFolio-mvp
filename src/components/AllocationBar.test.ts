import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AllocationBar } from './AllocationBar'

describe('AllocationBar', () => {
  it('채권·기타 행에 기타 비중을 합산해 표시한다', () => {
    const html = renderToStaticMarkup(
      createElement(AllocationBar, {
        current: { '국내주식': 40, '해외주식': 30, '채권': 10, '기타': 20 },
        target: { '국내주식': 40, '해외주식': 30, '채권': 30 },
      })
    )

    expect(html).toMatch(/채권·기타.*?>30%<\/div>/)
  })
})
