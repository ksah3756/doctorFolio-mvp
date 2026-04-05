import { describe, expect, it } from 'vitest'
import { normalizeOcrItems, parseOcrResponse } from './ocr'

describe('parseOcrResponse', () => {
  it('extracts the JSON array from a Claude text response', () => {
    const items = parseOcrResponse('분석 결과\n[{"name":"삼성전자","code":"005930","qty":2,"value":120000,"avgCost":50000}]')

    expect(items).toEqual([
      { name: '삼성전자', code: '005930', qty: 2, value: 120000, avgCost: 50000 },
    ])
  })

  it('returns an empty array when no JSON array is present', () => {
    expect(parseOcrResponse('json 없음')).toEqual([])
  })

  it('returns an empty array when the embedded JSON is malformed', () => {
    expect(parseOcrResponse('[{"name":"삼성전자",]')).toEqual([])
  })
})

describe('normalizeOcrItems', () => {
  it('fills defaults and classifies positions', () => {
    const positions = normalizeOcrItems(
      [
        { name: '삼성전자', code: '005930', qty: null, value: 120000, avgCost: null },
        { name: 'TIGER 미국S&P500', code: null, qty: 4, value: 400000, avgCost: 90000 },
        { name: '', code: '000000', qty: 1, value: 1000, avgCost: 1000 },
      ],
      2,
      () => 'fixed-id',
    )

    expect(positions).toHaveLength(2)
    expect(positions[0]).toMatchObject({
      id: 'fixed-id',
      name: '삼성전자',
      qty: 1,
      avgCost: 120000,
      currentPrice: 120000,
      assetClass: '국내주식',
      sector: '반도체',
      sourceImage: 2,
    })
    expect(positions[1]).toMatchObject({
      name: 'TIGER 미국S&P500',
      qty: 4,
      avgCost: 90000,
      currentPrice: 100000,
      assetClass: '해외주식',
      sector: '미국 ETF',
    })
  })

  it('skips zero-value rows and normalizes non-positive quantities to 1', () => {
    const positions = normalizeOcrItems(
      [
        { name: '삼성전자', code: '005930', qty: 0, value: 100000, avgCost: null },
        { name: '현금', code: null, qty: -3, value: 0, avgCost: null },
      ],
      1,
      () => 'safe-id',
    )

    expect(positions).toHaveLength(1)
    expect(positions[0]).toMatchObject({
      id: 'safe-id',
      qty: 1,
      avgCost: 100000,
      currentPrice: 100000,
    })
  })
})
