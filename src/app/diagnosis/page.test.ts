import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('DiagnosisPage source', () => {
  it('removes action-item based buy/sell recommendations and keeps prototype-style sections', () => {
    const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

    expect(source).not.toContain("from '@/components/ActionItem'")
    expect(source).not.toContain('권장 조치')
    expect(source).toContain('포트폴리오 개선 보기')
    expect(source).toContain('종목 시그널 분석 보기')
    expect(source).toContain('다시 진단')
  })

  it('uses the diagnosis page styles that keep the navy header and allocation panel', () => {
    const css = readFileSync(new URL('./page.module.css', import.meta.url), 'utf8')

    expect(css).toContain('.allocationPanel')
    expect(css).toContain('.retryBtn')
    expect(css).toContain('.healthScoreDot')
  })
})
