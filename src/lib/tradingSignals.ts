import type { PortfolioPosition } from './types'

export type TradingMarket = 'US' | 'KR'
export type TradingRecommendation = 'buy' | 'neutral' | 'sell'

export interface TradingSignalTarget {
  market: TradingMarket
  name: string
  ticker: string
}

export interface PriceHistoryPoint {
  close: number
  volume: number
}

export interface FearGreedSnapshot {
  label: string
  score: number
}

export interface InsiderActivitySummary {
  buyCount: number
  netValue: number
  sellCount: number
}

export interface TradingSignalMetric {
  key: 'rsi' | 'macd' | 'volume' | 'fiftyTwoWeek' | 'sixMonthAverage' | 'insider' | 'fearGreed'
  label: string
  signal: TradingRecommendation
  summary: string
  value: string
}

export interface TradingSignal {
  companyName: string
  fetchedAt: string
  headline: string
  market: TradingMarket
  marketSymbol: string
  metrics: TradingSignalMetric[]
  recommendation: TradingRecommendation
  score: number
  ticker: string
}

export interface BuildTradingSignalInput {
  companyName: string
  currentPrice: number
  fearGreed: FearGreedSnapshot
  insiderActivity: InsiderActivitySummary
  market: TradingMarket
  marketSymbol: string
  priceHistory: PriceHistoryPoint[]
  ticker: string
  week52High: number
  week52Low: number
}

export interface YahooSnapshot {
  companyName: string
  currentPrice: number
  marketSymbol: string
  priceHistory: PriceHistoryPoint[]
  week52High: number
  week52Low: number
}

type YahooChartResponse = {
  chart?: {
    error?: { code?: string; description?: string } | null
    result?: Array<{
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>
          volume?: Array<number | null>
        }>
      }
      meta?: {
        fiftyTwoWeekHigh?: number
        fiftyTwoWeekLow?: number
        longName?: string
        regularMarketPrice?: number
        shortName?: string
        symbol?: string
      }
    }>
  }
}

const DAY_IN_SECONDS = 86_400
const YAHOO_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; DrFolio/1.0; +https://vercel.app)',
}

const SEC_HEADERS = {
  Accept: 'application/atom+xml, text/html;q=0.9, application/xhtml+xml;q=0.8, */*;q=0.5',
  'User-Agent': 'portfolio-doctor/1.0 help@example.com',
}

export const SIGNAL_CACHE_SECONDS = DAY_IN_SECONDS

export function resolveTradingSignalTarget(position: PortfolioPosition): TradingSignalTarget | null {
  if ((position.assetClass !== '국내주식' && position.assetClass !== '해외주식') || !position.code) {
    return null
  }

  const code = position.code.trim()
  if (!code) return null

  if (position.assetClass === '국내주식') {
    return /^\d{6}$/.test(code)
      ? { ticker: code, market: 'KR', name: position.name }
      : null
  }

  const normalized = code.toUpperCase()
  return /^[A-Z.-]{1,10}$/.test(normalized)
    ? { ticker: normalized, market: 'US', name: position.name }
    : null
}

export function calculateRsi(closes: number[], period = 14): number {
  if (closes.length <= period) return 50

  let gainSum = 0
  let lossSum = 0

  for (let index = 1; index <= period; index += 1) {
    const diff = closes[index] - closes[index - 1]
    if (diff >= 0) gainSum += diff
    else lossSum += Math.abs(diff)
  }

  let averageGain = gainSum / period
  let averageLoss = lossSum / period

  for (let index = period + 1; index < closes.length; index += 1) {
    const diff = closes[index] - closes[index - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? Math.abs(diff) : 0

    averageGain = ((averageGain * (period - 1)) + gain) / period
    averageLoss = ((averageLoss * (period - 1)) + loss) / period
  }

  if (averageLoss === 0) return 100

  const relativeStrength = averageGain / averageLoss
  return 100 - (100 / (1 + relativeStrength))
}

export function calculateMacdState(closes: number[]): { histogram: number; macd: number; signal: number } {
  if (closes.length < 35) {
    return { histogram: 0, macd: 0, signal: 0 }
  }

  const ema12 = calculateExponentialMovingAverage(closes, 12)
  const ema26 = calculateExponentialMovingAverage(closes, 26)
  const macdSeries = ema12.map((value, index) => value - ema26[index])
  const signalSeries = calculateExponentialMovingAverage(macdSeries, 9)
  const macd = macdSeries[macdSeries.length - 1]
  const signal = signalSeries[signalSeries.length - 1]

  return {
    histogram: macd - signal,
    macd,
    signal,
  }
}

export function parseOpenInsiderActivity(html: string): InsiderActivitySummary {
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []
  let buyCount = 0
  let sellCount = 0
  let netValue = 0

  for (const row of rows) {
    const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(match => stripHtml(match[1]))
    const transactionCell = cells.find(cell => /^[PS]\s+-/i.test(cell))
    if (!transactionCell) continue

    const valueCell = [...cells].reverse().find(cell => /\$-?[\d,]+/.test(cell))
    const value = valueCell ? parseMoney(valueCell) : 0

    if (/^P\s+-/i.test(transactionCell)) {
      buyCount += 1
      netValue += Math.abs(value)
    } else if (/^S\s+-/i.test(transactionCell)) {
      sellCount += 1
      netValue -= Math.abs(value)
    }
  }

  return { buyCount, sellCount, netValue }
}

export function buildTradingSignal(input: BuildTradingSignalInput): TradingSignal {
  const closes = input.priceHistory.map(point => point.close)
  const volumes = input.priceHistory.map(point => point.volume)
  const currentPrice = input.currentPrice || closes[closes.length - 1] || 0
  const rsi = calculateRsi(closes)
  const macdState = calculateMacdState(closes)
  const averageVolume20 = average(volumes.slice(-20))
  const latestVolume = volumes[volumes.length - 1] ?? 0
  const latestClose = closes[closes.length - 1] ?? currentPrice
  const previousClose = closes[closes.length - 2] ?? latestClose
  const volumeRatio = averageVolume20 > 0 ? latestVolume / averageVolume20 : 1
  const week52Band = input.week52High > input.week52Low
    ? ((currentPrice - input.week52Low) / (input.week52High - input.week52Low))
    : 0.5
  const average6Month = average(closes.slice(-126))
  const diffFromAverage6Month = average6Month > 0 ? ((currentPrice - average6Month) / average6Month) * 100 : 0

  const metrics: TradingSignalMetric[] = [
    buildRsiMetric(rsi),
    buildMacdMetric(macdState),
    buildVolumeMetric(volumeRatio, latestClose - previousClose),
    buildFiftyTwoWeekMetric(week52Band),
    buildSixMonthMetric(diffFromAverage6Month),
    buildInsiderMetric(input.insiderActivity, input.market),
    buildFearGreedMetric(input.fearGreed),
  ]

  const score = metrics.reduce((sum, metric) => sum + scoreSignal(metric.signal), 0)
  const recommendation = score >= 2 ? 'buy' : score <= -2 ? 'sell' : 'neutral'
  const strongestMetric = [...metrics]
    .sort((left, right) => Math.abs(scoreSignal(right.signal)) - Math.abs(scoreSignal(left.signal)))
    .find(metric => metric.signal !== 'neutral')

  return {
    companyName: input.companyName,
    fetchedAt: new Date().toISOString(),
    headline: strongestMetric
      ? `${input.companyName}은(는) 지금 ${strongestMetric.label} 흐름이 가장 두드러져 보여요.`
      : `${input.companyName}은(는) 지금 뚜렷한 과열·과매도 신호가 크지 않아요.`,
    market: input.market,
    marketSymbol: input.marketSymbol,
    metrics,
    recommendation,
    score,
    ticker: input.ticker,
  }
}

export async function fetchTradingSignal(ticker: string, market: TradingMarket): Promise<TradingSignal> {
  const [yahooSnapshot, fearGreed, insiderActivity] = await Promise.all([
    fetchYahooSnapshot(ticker, market),
    fetchFearGreedSnapshot(),
    fetchInsiderActivity(ticker, market),
  ])

  return buildTradingSignal({
    companyName: yahooSnapshot.companyName,
    currentPrice: yahooSnapshot.currentPrice,
    fearGreed,
    insiderActivity,
    market,
    marketSymbol: yahooSnapshot.marketSymbol,
    priceHistory: yahooSnapshot.priceHistory,
    ticker,
    week52High: yahooSnapshot.week52High,
    week52Low: yahooSnapshot.week52Low,
  })
}

export async function fetchFearGreedSnapshot(): Promise<FearGreedSnapshot> {
  const response = await fetch('https://onoff.markets/data/stocks-fear-greed.json', {
    headers: YAHOO_HEADERS,
  })

  if (!response.ok) {
    throw new Error(`Fear & Greed fetch failed: ${response.status}`)
  }

  const data = await response.json() as { label?: string; score?: number }
  return {
    label: typeof data.label === 'string' ? data.label : 'Neutral',
    score: typeof data.score === 'number' ? data.score : 50,
  }
}

export async function fetchInsiderActivity(ticker: string, market: TradingMarket): Promise<InsiderActivitySummary> {
  if (market !== 'US') {
    return { buyCount: 0, sellCount: 0, netValue: 0 }
  }

  const url = new URL('http://openinsider.com/screener')
  url.searchParams.set('s', ticker)
  url.searchParams.set('fd', '30')
  url.searchParams.set('xp', '1')
  url.searchParams.set('xs', '1')
  url.searchParams.set('cnt', '10')
  url.searchParams.set('page', '1')

  const response = await fetch(url, { headers: YAHOO_HEADERS })
  if (!response.ok) {
    return { buyCount: 0, sellCount: 0, netValue: 0 }
  }

  return parseOpenInsiderActivity(await response.text())
}

export async function fetchYahooSnapshot(ticker: string, market: TradingMarket): Promise<YahooSnapshot> {
  const symbols = market === 'KR'
    ? [`${ticker}.KS`, `${ticker}.KQ`]
    : [ticker.toUpperCase()]

  for (const symbol of symbols) {
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`)
    url.searchParams.set('range', '1y')
    url.searchParams.set('interval', '1d')
    url.searchParams.set('includePrePost', 'false')
    url.searchParams.set('events', 'div,splits')

    const response = await fetch(url, { headers: SEC_HEADERS })
    if (!response.ok) continue

    const payload = await response.json() as YahooChartResponse
    const result = payload.chart?.result?.[0]
    const meta = result?.meta
    const quote = result?.indicators?.quote?.[0]
    const closes = quote?.close ?? []
    const volumes = quote?.volume ?? []
    const priceHistory = closes.reduce<PriceHistoryPoint[]>((points, close, index) => {
      if (typeof close !== 'number') return points

      points.push({
        close,
        volume: typeof volumes[index] === 'number' ? volumes[index] ?? 0 : 0,
      })
      return points
    }, [])

    if (priceHistory.length < 35 || !meta) continue

    const lastClose = priceHistory[priceHistory.length - 1]?.close ?? 0
    return {
      companyName: meta.longName || meta.shortName || ticker,
      currentPrice: meta.regularMarketPrice || lastClose,
      marketSymbol: meta.symbol || symbol,
      priceHistory,
      week52High: meta.fiftyTwoWeekHigh || Math.max(...priceHistory.map(point => point.close)),
      week52Low: meta.fiftyTwoWeekLow || Math.min(...priceHistory.map(point => point.close)),
    }
  }

  throw new Error(`Unable to fetch price history for ${market}:${ticker}`)
}

function buildRsiMetric(rsi: number): TradingSignalMetric {
  if (rsi <= 35) {
    return {
      key: 'rsi',
      label: 'RSI',
      signal: 'buy',
      summary: `RSI가 ${formatNumber(rsi)}라 많이 눌린 구간이라, 단기 반등을 노리는 매수 관점으로 볼 수 있어요.`,
      value: `RSI ${formatNumber(rsi)}`,
    }
  }

  if (rsi >= 70) {
    return {
      key: 'rsi',
      label: 'RSI',
      signal: 'sell',
      summary: `RSI가 ${formatNumber(rsi)}라 단기 과열 신호가 강해서, 추격 매수보다 일부 차익 실현을 생각할 수 있어요.`,
      value: `RSI ${formatNumber(rsi)}`,
    }
  }

  return {
    key: 'rsi',
    label: 'RSI',
    signal: 'neutral',
    summary: `RSI가 ${formatNumber(rsi)}라 과열도 과매도도 아닌 중간 구간이라, 방향성이 더 모일 때까지 관망 구간이에요.`,
    value: `RSI ${formatNumber(rsi)}`,
  }
}

function buildMacdMetric(macdState: { histogram: number; macd: number; signal: number }): TradingSignalMetric {
  if (macdState.histogram > 0) {
    return {
      key: 'macd',
      label: 'MACD',
      signal: 'buy',
      summary: `MACD가 시그널선 위로 올라와서, 최근 상승 탄력이 붙기 시작한 흐름으로 해석할 수 있어요.`,
      value: `히스토그램 ${formatSignedNumber(macdState.histogram)}`,
    }
  }

  if (macdState.histogram < 0) {
    return {
      key: 'macd',
      label: 'MACD',
      signal: 'sell',
      summary: `MACD가 시그널선 아래에 있어, 상승 힘보다 하락 압력이 더 강한 구간으로 볼 수 있어요.`,
      value: `히스토그램 ${formatSignedNumber(macdState.histogram)}`,
    }
  }

  return {
    key: 'macd',
    label: 'MACD',
    signal: 'neutral',
    summary: 'MACD가 기준선 근처라 매수세와 매도세가 팽팽해서, 추세 확인이 더 필요한 구간이에요.',
    value: `히스토그램 ${formatSignedNumber(macdState.histogram)}`,
  }
}

function buildVolumeMetric(volumeRatio: number, priceDelta: number): TradingSignalMetric {
  const value = `20일 평균의 ${formatNumber(volumeRatio)}배`

  if (volumeRatio >= 1.3 && priceDelta > 0) {
    return {
      key: 'volume',
      label: '거래량',
      signal: 'buy',
      summary: '거래량이 평소보다 크게 늘면서 가격도 같이 올라, 매수세가 실제로 붙는지 확인되는 장면이에요.',
      value,
    }
  }

  if (volumeRatio >= 1.3 && priceDelta < 0) {
    return {
      key: 'volume',
      label: '거래량',
      signal: 'sell',
      summary: '거래량이 크게 터졌는데 가격이 밀려서, 매도 압력이 강하게 나오는 구간으로 볼 수 있어요.',
      value,
    }
  }

  return {
    key: 'volume',
    label: '거래량',
    signal: 'neutral',
    summary: '거래량이 평소와 비슷해서, 아직은 시장 참여가 폭발적으로 몰린 구간은 아니에요.',
    value,
  }
}

function buildFiftyTwoWeekMetric(week52Band: number): TradingSignalMetric {
  const percentile = week52Band * 100

  if (week52Band <= 0.35) {
    return {
      key: 'fiftyTwoWeek',
      label: '52주 위치',
      signal: 'buy',
      summary: `52주 범위의 하단 ${formatNumber(percentile)}% 근처라, 가격이 바닥권에 가까운지 체크해볼 만해요.`,
      value: `하단에서 ${formatNumber(percentile)}%`,
    }
  }

  if (week52Band >= 0.8) {
    return {
      key: 'fiftyTwoWeek',
      label: '52주 위치',
      signal: 'sell',
      summary: `52주 범위의 상단 ${formatNumber(percentile)}% 근처라, 이미 많이 오른 자리인지 확인이 필요한 구간이에요.`,
      value: `하단에서 ${formatNumber(percentile)}%`,
    }
  }

  return {
    key: 'fiftyTwoWeek',
    label: '52주 위치',
    signal: 'neutral',
    summary: '52주 범위의 중간쯤에 있어서, 아직은 극단적으로 싸거나 비싼 자리라고 보긴 어려워요.',
    value: `하단에서 ${formatNumber(percentile)}%`,
  }
}

function buildSixMonthMetric(diffFromAverage6Month: number): TradingSignalMetric {
  const value = `6개월 평균 대비 ${formatSignedPercent(diffFromAverage6Month)}`

  if (diffFromAverage6Month <= -8) {
    return {
      key: 'sixMonthAverage',
      label: '6개월 평균 대비',
      signal: 'buy',
      summary: '현재가가 6개월 평균보다 꽤 낮아서, 평균 회귀 관점의 저가 구간으로 볼 수 있어요.',
      value,
    }
  }

  if (diffFromAverage6Month >= 10) {
    return {
      key: 'sixMonthAverage',
      label: '6개월 평균 대비',
      signal: 'sell',
      summary: '현재가가 6개월 평균보다 많이 위에 있어, 단기 과열로 되돌림이 나올 수 있는 자리예요.',
      value,
    }
  }

  return {
    key: 'sixMonthAverage',
    label: '6개월 평균 대비',
    signal: 'neutral',
    summary: '현재가가 6개월 평균과 크게 다르지 않아, 추세보다 박스권에 가까운 흐름으로 볼 수 있어요.',
    value,
  }
}

function buildInsiderMetric(activity: InsiderActivitySummary, market: TradingMarket): TradingSignalMetric {
  if (market !== 'US') {
    return {
      key: 'insider',
      label: '내부자 매매',
      signal: 'neutral',
      summary: '국내 종목은 무료 공개 소스가 제한적이라 내부자 매매는 참고용 중립 값으로 보여드려요.',
      value: '무료 공개 데이터 제한',
    }
  }

  if (activity.buyCount === 0 && activity.sellCount === 0) {
    return {
      key: 'insider',
      label: '내부자 매매',
      signal: 'neutral',
      summary: '최근 30일 기준으로 눈에 띄는 내부자 매매가 없어, 경영진 신호는 중립으로 볼 수 있어요.',
      value: '최근 30일 공시 없음',
    }
  }

  if (activity.netValue > 0) {
    return {
      key: 'insider',
      label: '내부자 매매',
      signal: 'buy',
      summary: `최근 30일 내부자 순매수가 보여서, 회사 안쪽 인물들이 주가를 긍정적으로 보는 신호로 읽을 수 있어요.`,
      value: `매수 ${activity.buyCount}건 / 매도 ${activity.sellCount}건`,
    }
  }

  if (activity.netValue < 0) {
    return {
      key: 'insider',
      label: '내부자 매매',
      signal: 'sell',
      summary: `최근 30일 내부자 순매도가 우세해서, 경영진이 일부 차익 실현에 나선 흐름으로 볼 수 있어요.`,
      value: `매수 ${activity.buyCount}건 / 매도 ${activity.sellCount}건`,
    }
  }

  return {
    key: 'insider',
    label: '내부자 매매',
    signal: 'neutral',
    summary: '내부자 매수와 매도가 비슷하게 섞여 있어, 한쪽으로 강한 방향 신호를 주진 않아요.',
    value: `매수 ${activity.buyCount}건 / 매도 ${activity.sellCount}건`,
  }
}

function buildFearGreedMetric(fearGreed: FearGreedSnapshot): TradingSignalMetric {
  if (fearGreed.score <= 35) {
    return {
      key: 'fearGreed',
      label: 'Fear&Greed',
      signal: 'buy',
      summary: `시장 심리가 ${fearGreed.label.toLowerCase()} 쪽이라 겁먹은 매물이 많은 상태라, 역발상 매수 후보로 볼 수 있어요.`,
      value: `${fearGreed.label} ${formatNumber(fearGreed.score)}`,
    }
  }

  if (fearGreed.score >= 70) {
    return {
      key: 'fearGreed',
      label: 'Fear&Greed',
      signal: 'sell',
      summary: `시장 심리가 ${fearGreed.label.toLowerCase()} 쪽이라 모두가 낙관적인 구간이라, 추격보다 리스크 관리를 먼저 볼 수 있어요.`,
      value: `${fearGreed.label} ${formatNumber(fearGreed.score)}`,
    }
  }

  return {
    key: 'fearGreed',
    label: 'Fear&Greed',
    signal: 'neutral',
    summary: '시장 심리가 공포와 탐욕 사이 중간 구간이라, 전체 분위기는 방향성보다 확인 국면에 가까워요.',
    value: `${fearGreed.label} ${formatNumber(fearGreed.score)}`,
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function calculateExponentialMovingAverage(values: number[], period: number): number[] {
  if (values.length === 0) return []

  const multiplier = 2 / (period + 1)
  const [first, ...rest] = values
  const ema = [first]

  for (const value of rest) {
    ema.push((value * multiplier) + (ema[ema.length - 1] * (1 - multiplier)))
  }

  return ema
}

function formatNumber(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '')
}

function formatSignedNumber(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatNumber(value)}`
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatNumber(value)}%`
}

function parseMoney(value: string): number {
  const normalized = value.replace(/[,$]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function scoreSignal(signal: TradingRecommendation): number {
  if (signal === 'buy') return 1
  if (signal === 'sell') return -1
  return 0
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
