import { describe, expect, it } from 'vitest'
import { buildOcrPrompt, getOcrErrorDetails, normalizeOcrItems, parseOcrErrorResponse, parseOcrResponse } from './ocr'

describe('parseOcrResponse', () => {
  it('extracts the JSON array from a Claude text response', () => {
    const items = parseOcrResponse('분석 결과\n[{"name":"삼성전자","code":"005930","sector":"반도체","qty":2,"value":120000,"avgCost":50000,"currentPrice":60000}]')

    expect(items).toEqual([
      { name: '삼성전자', code: '005930', sector: '반도체', qty: 2, value: 120000, avgCost: 50000, currentPrice: 60000 },
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
        { name: '삼성전자', code: '005930', sector: null, qty: null, value: 120000, avgCost: null, currentPrice: null },
        { name: 'TIGER 미국S&P500', code: null, sector: null, qty: 4, value: 400000, avgCost: 90000, currentPrice: 100000 },
        { name: '', code: '000000', sector: null, qty: 1, value: 1000, avgCost: 1000, currentPrice: 1000 },
      ],
      2,
      () => 'fixed-id',
    )

    expect(positions).toHaveLength(2)
    expect(positions[0]).toMatchObject({
      id: 'fixed-id',
      name: '삼성전자',
      qty: 1,
      value: 120000,
      avgCost: 120000,
      currentPrice: 120000,
      assetClass: '국내주식',
      sector: '반도체',
      sourceImage: 2,
    })
    expect(positions[1]).toMatchObject({
      name: 'TIGER 미국S&P500',
      qty: 4,
      value: 400000,
      avgCost: 90000,
      currentPrice: 100000,
      assetClass: '해외주식',
      sector: '미국ETF',
    })
  })

  it('prefers the OCR sector over fallback classification', () => {
    const [position] = normalizeOcrItems(
      [
        { name: '삼성전자', code: '005930', sector: '하드웨어', qty: 1, value: 120000, avgCost: null, currentPrice: 120000 },
      ],
      1,
      () => 'ocr-sector',
    )

    expect(position).toMatchObject({
      id: 'ocr-sector',
      assetClass: '국내주식',
      sector: '하드웨어',
    })
  })

  it('falls back to name-keyed classification when OCR sector is missing', () => {
    const [position] = normalizeOcrItems(
      [
        { name: 'SK 하이닉스', code: null, sector: null, qty: 2, value: 500000, avgCost: 240000, currentPrice: 250000 },
      ],
      1,
      () => 'name-fallback',
    )

    expect(position).toMatchObject({
      id: 'name-fallback',
      assetClass: '국내주식',
      sector: '반도체',
    })
  })

  it('skips zero-value rows and normalizes non-positive quantities to 1', () => {
    const positions = normalizeOcrItems(
      [
        { name: '삼성전자', code: '005930', sector: null, qty: 0, value: 100000, avgCost: null, currentPrice: null },
        { name: '현금', code: null, sector: null, qty: -3, value: 0, avgCost: null, currentPrice: null },
      ],
      1,
      () => 'safe-id',
    )

    expect(positions).toHaveLength(1)
    expect(positions[0]).toMatchObject({
      id: 'safe-id',
      qty: 1,
      value: 100000,
      avgCost: 100000,
      currentPrice: 100000,
    })
  })

  it('prefers parsed currentPrice and recomputes value when the OCR total is inconsistent', () => {
    const [position] = normalizeOcrItems(
      [
        { name: 'SK하이닉스', code: '000660', sector: null, qty: 4, value: 2418500, avgCost: 270375, currentPrice: 875000 },
      ],
      1,
      () => 'ocr-fix',
    )

    expect(position).toMatchObject({
      id: 'ocr-fix',
      qty: 4,
      value: 3500000,
      avgCost: 270375,
      currentPrice: 875000,
    })
  })

  it('derives total value from currentPrice when OCR returns a non-positive total', () => {
    const [position] = normalizeOcrItems(
      [
        { name: 'TIGER 구리실물', code: null, sector: null, qty: 20, value: -1600, avgCost: 15470, currentPrice: 15390 },
      ],
      1,
      () => 'derived-total',
    )

    expect(position).toMatchObject({
      id: 'derived-total',
      qty: 20,
      value: 307800,
      avgCost: 15470,
      currentPrice: 15390,
    })
  })
})

describe('parseOcrErrorResponse', () => {
  it('extracts the error field from a JSON response body', () => {
    expect(parseOcrErrorResponse('{"error":"OCR API 크레딧이 부족합니다."}')).toBe('OCR API 크레딧이 부족합니다.')
  })

  it('falls back when the response body is empty', () => {
    expect(parseOcrErrorResponse('   ', '기본 오류')).toBe('기본 오류')
  })

  it('returns raw text when the error response is not JSON', () => {
    expect(parseOcrErrorResponse('일시적인 오류')).toBe('일시적인 오류')
  })
})

describe('getOcrErrorDetails', () => {
  it('maps Anthropic credit exhaustion to a user-friendly message', () => {
    expect(getOcrErrorDetails({
      status: 400,
      error: { message: 'Your credit balance is too low to access the Anthropic API.' },
    })).toEqual({
      status: 503,
      message: 'OCR API 크레딧이 부족합니다. Anthropic 결제 상태를 확인해 주세요.',
    })
  })

  it('falls back to a generic OCR error for unknown failures', () => {
    expect(getOcrErrorDetails(new Error('boom'))).toEqual({
      status: 502,
      message: 'OCR 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    })
  })
})

describe('buildOcrPrompt', () => {
  it('explicitly requests sector labels plus 매입가, 현재가, 평가금액 rules', () => {
    const prompt = buildOcrPrompt()

    expect(prompt).toContain('- sector: 아래 25개 중 하나로 분류')
    expect(prompt).toContain('ETF는 미국ETF, 국내ETF, 채권ETF, 원자재ETF 중 하나로 분류')
    expect(prompt).toContain('의료기기/서비스, 제약/바이오')
    expect(prompt).toContain('미디어/엔터, 유틸리티, 리츠, 부동산')
    expect(prompt).toContain('value: 평가금액/보유금액/보유평가금액 "총액"')
    expect(prompt).toContain('avgCost: 매입가/평균단가/매입단가 "1주당 단가"')
    expect(prompt).toContain('currentPrice: 현재가 "1주당 단가"')
    expect(prompt).toContain('"평가손익", "손익", "수익률", "%" 열의 숫자는 절대 사용하지 마')
    expect(prompt).toContain('"qty × currentPrice ≈ value" 관계가 성립하도록 읽어줘')
    expect(prompt).toContain('첫 번째 블록 = 손익/수익률 → 항상 무시')
    expect(prompt).toContain('{"name":"TIGER 미국S&P500","code":null,"sector":"미국ETF","qty":24,"value":589680,"avgCost":24892,"currentPrice":24570}')
  })
})
