import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAnalystEbitEstimates } from './fmpAdapter'

const REAL_DATE = Date

function mockDate(isoDate: string) {
  class MockDate extends Date {
    constructor(value?: string | number | Date) {
      super(value ?? isoDate)
    }

    static override now() {
      return new REAL_DATE(isoDate).getTime()
    }
  }

  vi.stubGlobal('Date', MockDate)
}

describe('fetchAnalystEbitEstimates', () => {
  beforeEach(() => {
    process.env.FMP_API_KEY = 'test-key'
    mockDate('2026-04-27T00:00:00.000Z')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    delete process.env.FMP_API_KEY
  })

  it('maps future positive analyst ebit estimates into Y1/Y2 consensus', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { date: '2026-12-31', estimatedEbitAvg: 1200 },
        { date: '2027-12-31', ebitAvg: 1500 },
        { date: '2028-12-31', ebitAvg: 1800 },
        { date: '2027-06-30', ebitAvg: -5 },
        { date: '2026-01-01', ebitAvg: 900 },
      ],
    })

    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'info').mockImplementation(() => {})

    await expect(fetchAnalystEbitEstimates('nvda')).resolves.toEqual([
      { year: 1, ebit: 1200 },
      { year: 2, ebit: 1500 },
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      'https://financialmodelingprep.com/stable/analyst-estimates?symbol=NVDA&period=annual&page=0&limit=10&apikey=test-key',
      { next: { revalidate: 86_400 } },
    )
  })

  it('returns an empty array when the endpoint returns no estimates', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }))
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(fetchAnalystEbitEstimates('msft')).resolves.toEqual([])
  })

  it('warns and returns an empty array when EBIT consensus fields are missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { date: '2026-12-31', estimatedRevenueAvg: 999 },
      ],
    }))
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(fetchAnalystEbitEstimates('aapl')).resolves.toEqual([])
    expect(warnSpy).toHaveBeenCalledWith('FMP analyst-estimates missing EBIT consensus field for AAPL')
  })
})
