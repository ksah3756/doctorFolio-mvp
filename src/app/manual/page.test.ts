import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createManualPosition, isManualDraftComplete } from './manualPosition'

describe('ManualInputPage helpers', () => {
  it('activates add only when required fields are present', () => {
    expect(isManualDraftComplete({
      assetClass: '',
      code: '',
      name: '삼성전자',
      value: '100000',
    })).toBe(false)

    expect(isManualDraftComplete({
      assetClass: '국내주식',
      code: '',
      name: '삼성전자',
      value: '100000',
    })).toBe(true)
  })

  it('creates a confirm-page compatible position payload', () => {
    const position = createManualPosition({
      assetClass: '해외주식',
      code: '  ',
      name: ' Apple ',
      value: '150000',
    })

    expect(position).toMatchObject({
      name: 'Apple',
      code: null,
      qty: 1,
      value: 150000,
      avgCost: 150000,
      currentPrice: 150000,
      assetClass: '해외주식',
      sector: '해외주식',
      sourceImage: 1,
    })
    expect(position.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('keeps the manual page constrained to the mobile container and safe-area CTA', () => {
    const css = readFileSync(new URL('./page.module.css', import.meta.url), 'utf8')

    expect(css).toContain('max-width: 440px;')
    expect(css).toContain('env(safe-area-inset-bottom)')
  })
})
