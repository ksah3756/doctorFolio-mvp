import type { PortfolioPosition } from './types'

export type TradingMarket = 'US' | 'KR'
export type TradingRecommendation = 'buy' | 'neutral' | 'sell'
export type TradingConfidence = 'low' | 'medium' | 'high'
export type TradingSignalMetricKey =
  | 'rsi'
  | 'macd'
  | 'volume'
  | 'fiftyTwoWeek'
  | 'sixMonthAverage'
  | 'insider'

export interface TradingSignalTarget {
  market: TradingMarket
  name: string
  ticker: string
}

export interface PriceHistoryPoint {
  close: number
  volume: number
}

export interface InsiderActivitySummary {
  buyCount: number
  netValue: number
  sellCount: number
}

export interface TradingSignalMetric {
  contribution: number
  description: string
  includedInScore: boolean
  key: TradingSignalMetricKey
  label: string
  signal: TradingRecommendation
  strength: number
  summary: string
  value: string
  weight: number
  status: string
}

export interface TradingSignalExpertDetail {
  contribution: string | null
  description: string
  key: TradingSignalMetricKey
  status: string
  title: string
  value: string
}

export interface TradingSignal {
  companyName: string
  confidence: TradingConfidence
  confidenceSummary: string
  currentPrice: number
  expertDetails: TradingSignalExpertDetail[]
  fetchedAt: string
  label: string
  market: TradingMarket
  marketSymbol: string
  metrics: TradingSignalMetric[]
  normalizedScore: number
  recommendation: TradingRecommendation
  referenceMetrics: TradingSignalMetric[]
  score: number
  summary: string
  ticker: string
  week52High: number
  week52Low: number
}

export interface BuildTradingSignalInput {
  companyName: string
  currentPrice: number
  insiderActivity: InsiderActivitySummary
  market: TradingMarket
  marketSymbol: string
  priceHistory: PriceHistoryPoint[]
  ticker: string
  week52High: number
  week52Low: number
}

export interface BuildTradingSignalAnalysisInput {
  diffFromAverage6Month: number
  insiderActivity: InsiderActivitySummary
  market: TradingMarket
  macdState: MacdState
  recentReturn3d: number
  rsi: number
  volumeRatio: number
  week52Band: number
}

export interface TradingSignalAnalysis {
  confidence: TradingConfidence
  confidenceSummary: string
  expertDetails: TradingSignalExpertDetail[]
  label: string
  metrics: TradingSignalMetric[]
  normalizedScore: number
  recommendation: TradingRecommendation
  referenceMetrics: TradingSignalMetric[]
  score: number
  summary: string
}

export interface YahooSnapshot {
  companyName: string
  currentPrice: number
  marketSymbol: string
  priceHistory: PriceHistoryPoint[]
  week52High: number
  week52Low: number
}

export interface MacdState {
  histogram: number
  macd: number
  previousHistogram: number
  signal: number
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

const WEIGHTS = {
  fiftyTwoWeek: 0.9,
  macd: 1.5,
  rsi: 1.2,
  volume: 1.3,
} as const

const TOTAL_WEIGHT = WEIGHTS.rsi + WEIGHTS.macd + WEIGHTS.volume + WEIGHTS.fiftyTwoWeek

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

export function calculateMacdState(closes: number[]): MacdState {
  if (closes.length < 35) {
    return { histogram: 0, macd: 0, previousHistogram: 0, signal: 0 }
  }

  const ema12 = calculateExponentialMovingAverage(closes, 12)
  const ema26 = calculateExponentialMovingAverage(closes, 26)
  const macdSeries = ema12.map((value, index) => value - ema26[index])
  const signalSeries = calculateExponentialMovingAverage(macdSeries, 9)
  const histogramSeries = macdSeries.map((value, index) => value - signalSeries[index])
  const macd = macdSeries[macdSeries.length - 1]
  const signal = signalSeries[signalSeries.length - 1]
  const histogram = histogramSeries[histogramSeries.length - 1]
  const previousHistogram = histogramSeries[histogramSeries.length - 2] ?? histogram

  return {
    histogram,
    macd,
    previousHistogram,
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

export function evaluateRsi(rsi: number): TradingSignalMetric {
  if (rsi < 30) {
    return createCoreMetric({
      description: `RSI ${formatNumber(rsi)}: 최근 상승폭과 하락폭을 비교한 지표예요. 현재는 많이 눌린 저점권으로 해석됩니다.`,
      key: 'rsi',
      label: '단기 과열 여부',
      signal: 'buy',
      status: '저점권',
      strength: 0.85,
      summary: '많이 눌린 구간이라 반등 가능성을 볼 수 있어요.',
      value: `RSI ${formatNumber(rsi)}`,
    })
  }

  if (rsi < 45) {
    return createCoreMetric({
      description: `RSI ${formatNumber(rsi)}: 최근 상승폭과 하락폭을 비교한 지표예요. 현재는 비교적 부담이 낮은 구간으로 해석됩니다.`,
      key: 'rsi',
      label: '단기 과열 여부',
      signal: 'buy',
      status: '완만한 저점권',
      strength: 0.35,
      summary: '과열은 아니고, 비교적 부담이 낮은 구간이에요.',
      value: `RSI ${formatNumber(rsi)}`,
    })
  }

  if (rsi < 60) {
    return createCoreMetric({
      description: `RSI ${formatNumber(rsi)}: 최근 상승폭과 하락폭을 비교한 지표예요. 현재는 과열도 과매도도 아닌 중립 구간입니다.`,
      key: 'rsi',
      label: '단기 과열 여부',
      signal: 'neutral',
      status: '중립',
      strength: 0,
      summary: '가격이 과하게 싸거나 비싼 구간은 아니에요.',
      value: `RSI ${formatNumber(rsi)}`,
    })
  }

  if (rsi < 70) {
    return createCoreMetric({
      description: `RSI ${formatNumber(rsi)}: 최근 상승폭과 하락폭을 비교한 지표예요. 현재는 다소 올라왔지만 아직 극단적 과열은 아닌 중립 구간입니다.`,
      key: 'rsi',
      label: '단기 과열 여부',
      signal: 'neutral',
      status: '중립',
      strength: 0,
      summary: '가격이 과하게 싸거나 비싼 구간은 아니에요.',
      value: `RSI ${formatNumber(rsi)}`,
    })
  }

  if (rsi < 80) {
    return createCoreMetric({
      description: `RSI ${formatNumber(rsi)}: 최근 상승폭과 하락폭을 비교한 지표예요. 현재는 단기 과열 경계 구간으로 해석됩니다.`,
      key: 'rsi',
      label: '단기 과열 여부',
      signal: 'sell',
      status: '과열 경계',
      strength: 0.45,
      summary: '조금 많이 오른 상태라 쉬어갈 수 있어요.',
      value: `RSI ${formatNumber(rsi)}`,
    })
  }

  return createCoreMetric({
    description: `RSI ${formatNumber(rsi)}: 최근 상승폭과 하락폭을 비교한 지표예요. 현재는 단기 과열 구간으로 해석됩니다.`,
    key: 'rsi',
    label: '단기 과열 여부',
    signal: 'sell',
    status: '강한 과열',
    strength: 0.85,
    summary: '단기 과열 구간이라 추격 매수는 주의가 필요해요.',
    value: `RSI ${formatNumber(rsi)}`,
  })
}

export function evaluateMacd(macdState: MacdState): TradingSignalMetric {
  const improving = macdState.histogram > macdState.previousHistogram
  const weakening = macdState.histogram < macdState.previousHistogram
  const aboveBelow = macdState.macd >= macdState.signal ? '위' : '아래'
  const changeDirection = improving ? '개선' : weakening ? '둔화' : '유지'
  const value = `MACD Histogram ${formatSignedNumber(macdState.histogram)}`

  if (macdState.histogram > 0 && improving) {
    return createCoreMetric({
      description: `${value}: MACD가 Signal 선보다 ${aboveBelow}에 있으며, 전일 대비 ${changeDirection}되고 있습니다.`,
      key: 'macd',
      label: '추세 방향',
      signal: 'buy',
      status: '상승 흐름',
      strength: 0.8,
      summary: '상승 흐름이 이어지고 있어요.',
      value,
    })
  }

  if (macdState.histogram > 0 && weakening) {
    return createCoreMetric({
      description: `${value}: MACD가 Signal 선보다 ${aboveBelow}에 있지만, 전일 대비 ${changeDirection}되는 모습입니다.`,
      key: 'macd',
      label: '추세 방향',
      signal: 'buy',
      status: '상승 둔화',
      strength: 0.35,
      summary: '상승 흐름은 있지만 힘은 조금 약해지고 있어요.',
      value,
    })
  }

  if (macdState.histogram < 0 && improving) {
    return createCoreMetric({
      description: `${value}: MACD가 Signal 선보다 ${aboveBelow}에 있지만, 전일 대비 ${changeDirection}되며 반등 조짐을 보이고 있습니다.`,
      key: 'macd',
      label: '추세 방향',
      signal: 'buy',
      status: '반등 조짐',
      strength: 0.45,
      summary: '하락 흐름이 약해지고 반등 조짐이 보여요.',
      value,
    })
  }

  if (macdState.histogram < 0 && weakening) {
    return createCoreMetric({
      description: `${value}: MACD가 Signal 선보다 ${aboveBelow}에 있으며, 전일 대비 ${changeDirection}되고 있습니다.`,
      key: 'macd',
      label: '추세 방향',
      signal: 'sell',
      status: '하락 압력',
      strength: 0.75,
      summary: '아직 하락 압력이 남아 있어요.',
      value,
    })
  }

  return createCoreMetric({
    description: `${value}: MACD가 Signal 선 근처에서 비슷하게 움직여 추세 방향이 뚜렷하지 않습니다.`,
    key: 'macd',
    label: '추세 방향',
    signal: 'neutral',
    status: '중립',
    strength: 0,
    summary: '추세 방향이 뚜렷하지 않아요.',
    value,
  })
}

export function evaluateVolume(volumeRatio: number, recentReturn3d: number): TradingSignalMetric {
  if (volumeRatio < 1.2) {
    return createCoreMetric({
      description: `거래량 ${formatNumber(volumeRatio)}배: 최근 20일 평균 거래량 대비 현재 거래량이에요. 최근 3일 수익률은 ${formatSignedPercent(recentReturn3d)}입니다.`,
      key: 'volume',
      label: '거래 활발도',
      signal: 'neutral',
      status: '평균 수준',
      strength: 0,
      summary: '거래량은 평소와 비슷해서 강한 수급 신호는 없어요.',
      value: `거래량 ${formatNumber(volumeRatio)}배`,
    })
  }

  const strength = Math.min(1, (volumeRatio - 1.2) / 1.3)
  const value = `거래량 ${formatNumber(volumeRatio)}배`
  const description = `${value}: 최근 20일 평균 거래량 대비 현재 거래량이에요. 최근 3일 수익률은 ${formatSignedPercent(recentReturn3d)}입니다.`

  if (recentReturn3d > 0) {
    return createCoreMetric({
      description,
      key: 'volume',
      label: '거래 활발도',
      signal: 'buy',
      status: '관심 증가',
      strength,
      summary: '평소보다 거래가 늘면서 관심이 붙고 있어요.',
      value,
    })
  }

  if (recentReturn3d < 0) {
    return createCoreMetric({
      description,
      key: 'volume',
      label: '거래 활발도',
      signal: 'sell',
      status: '매도 압력',
      strength,
      summary: '거래가 늘었지만 가격은 밀리고 있어 매도 압력이 커 보여요.',
      value,
    })
  }

  return createCoreMetric({
    description,
    key: 'volume',
    label: '거래 활발도',
    signal: 'neutral',
    status: '방향 대기',
    strength: 0,
    summary: '거래량은 늘었지만 가격 방향은 아직 분명하지 않아요.',
    value,
  })
}

export function evaluateWeek52Position(week52Band: number): TradingSignalMetric {
  const normalizedBand = clamp(week52Band, 0, 1)
  const percentile = normalizedBand * 100
  const value = `52주 위치 하위 ${formatNumber(percentile)}%`

  if (normalizedBand <= 0.25) {
    return createCoreMetric({
      description: `${value}: 52주 저가와 고가 사이에서 현재가가 위치한 비율입니다. 최근 1년 기준으로 낮은 가격대에 있어요.`,
      key: 'fiftyTwoWeek',
      label: '가격 위치',
      signal: 'buy',
      status: '저점권 근접',
      strength: 0.75,
      summary: '최근 1년 기준으로 낮은 가격대에 있어요.',
      value,
    })
  }

  if (normalizedBand <= 0.4) {
    return createCoreMetric({
      description: `${value}: 52주 저가와 고가 사이에서 현재가가 위치한 비율입니다. 1년 가격 범위에서 비교적 낮은 편이에요.`,
      key: 'fiftyTwoWeek',
      label: '가격 위치',
      signal: 'buy',
      status: '낮은 가격대',
      strength: 0.35,
      summary: '1년 가격 범위에서 비교적 낮은 편이에요.',
      value,
    })
  }

  if (normalizedBand < 0.75) {
    return createCoreMetric({
      description: `${value}: 52주 저가와 고가 사이에서 현재가가 위치한 비율입니다. 1년 가격 범위에서 중간 구간에 있어요.`,
      key: 'fiftyTwoWeek',
      label: '가격 위치',
      signal: 'neutral',
      status: '중간 구간',
      strength: 0,
      summary: '1년 가격 범위에서 중간 구간에 있어요.',
      value,
    })
  }

  if (normalizedBand < 0.9) {
    return createCoreMetric({
      description: `${value}: 52주 저가와 고가 사이에서 현재가가 위치한 비율입니다. 1년 기준으로 꽤 높은 가격대에 있어요.`,
      key: 'fiftyTwoWeek',
      label: '가격 위치',
      signal: 'sell',
      status: '고점권 경계',
      strength: 0.35,
      summary: '1년 기준으로 꽤 높은 가격대에 있어요.',
      value,
    })
  }

  return createCoreMetric({
    description: `${value}: 52주 저가와 고가 사이에서 현재가가 위치한 비율입니다. 1년 고점에 가까워 단기 부담이 있을 수 있어요.`,
    key: 'fiftyTwoWeek',
    label: '가격 위치',
    signal: 'sell',
    status: '고점권',
    strength: 0.75,
    summary: '1년 고점에 가까워 단기 부담이 있을 수 있어요.',
    value,
  })
}

export function calculateConfidence(
  metrics: Array<Pick<TradingSignalMetric, 'key' | 'signal'>>,
  normalizedScore: number,
): TradingConfidence {
  const core = metrics.filter(metric => ['rsi', 'macd', 'volume'].includes(metric.key))
  const positive = core.filter(metric => metric.signal === 'buy').length
  const negative = core.filter(metric => metric.signal === 'sell').length
  const aligned = positive >= 2 || negative >= 2

  if (aligned && Math.abs(normalizedScore) >= 0.45) {
    return 'high'
  }

  if (aligned && Math.abs(normalizedScore) >= 0.25) {
    return 'medium'
  }

  return 'low'
}

export function analyzeTradingSignalIndicators(input: BuildTradingSignalAnalysisInput): TradingSignalAnalysis {
  const metrics = [
    evaluateRsi(input.rsi),
    evaluateMacd(input.macdState),
    evaluateVolume(input.volumeRatio, input.recentReturn3d),
    evaluateWeek52Position(input.week52Band),
  ]
  const referenceMetrics = [
    buildSixMonthMetric(input.diffFromAverage6Month),
    buildInsiderMetric(input.insiderActivity, input.market),
  ]

  const rawScore = metrics.reduce((sum, metric) => sum + metric.contribution, 0)
  const normalizedScore = clamp(rawScore / TOTAL_WEIGHT, -1, 1)
  const score = Math.round((normalizedScore + 1) * 50)
  const label = resolveScoreLabel(score)
  const recommendation = resolveRecommendation(score)
  const confidence = calculateConfidence(metrics, normalizedScore)
  const confidenceSummary = resolveConfidenceSummary(confidence)

  return {
    confidence,
    confidenceSummary,
    expertDetails: [...metrics, ...referenceMetrics].map(toExpertDetail),
    label,
    metrics,
    normalizedScore,
    recommendation,
    referenceMetrics,
    score,
    summary: buildTradingSummary(metrics, label),
  }
}

export function buildTradingSignal(input: BuildTradingSignalInput): TradingSignal {
  const closes = input.priceHistory.map(point => point.close)
  const volumes = input.priceHistory.map(point => point.volume)
  const currentPrice = input.currentPrice || closes[closes.length - 1] || 0
  const rsi = calculateRsi(closes)
  const macdState = calculateMacdState(closes)
  const averageVolume20 = average(volumes.slice(-20))
  const latestVolume = volumes[volumes.length - 1] ?? 0
  const volumeRatio = averageVolume20 > 0 ? latestVolume / averageVolume20 : 1
  const week52Band = input.week52High > input.week52Low
    ? clamp((currentPrice - input.week52Low) / (input.week52High - input.week52Low), 0, 1)
    : 0.5
  const average6Month = average(closes.slice(-126))
  const diffFromAverage6Month = average6Month > 0 ? ((currentPrice - average6Month) / average6Month) * 100 : 0
  const recentReturn3d = calculateRecentReturn(closes, 3)
  const analysis = analyzeTradingSignalIndicators({
    diffFromAverage6Month,
    insiderActivity: input.insiderActivity,
    macdState,
    market: input.market,
    recentReturn3d,
    rsi,
    volumeRatio,
    week52Band,
  })

  return {
    companyName: input.companyName,
    confidence: analysis.confidence,
    confidenceSummary: analysis.confidenceSummary,
    currentPrice,
    expertDetails: analysis.expertDetails,
    fetchedAt: new Date().toISOString(),
    label: analysis.label,
    market: input.market,
    marketSymbol: input.marketSymbol,
    metrics: analysis.metrics,
    normalizedScore: analysis.normalizedScore,
    recommendation: analysis.recommendation,
    referenceMetrics: analysis.referenceMetrics,
    score: analysis.score,
    summary: analysis.summary,
    ticker: input.ticker,
    week52High: input.week52High,
    week52Low: input.week52Low,
  }
}

export async function fetchTradingSignal(ticker: string, market: TradingMarket): Promise<TradingSignal> {
  const [yahooSnapshot, insiderActivity] = await Promise.all([
    fetchYahooSnapshot(ticker, market),
    fetchInsiderActivity(ticker, market),
  ])

  return buildTradingSignal({
    companyName: yahooSnapshot.companyName,
    currentPrice: yahooSnapshot.currentPrice,
    insiderActivity,
    market,
    marketSymbol: yahooSnapshot.marketSymbol,
    priceHistory: yahooSnapshot.priceHistory,
    ticker,
    week52High: yahooSnapshot.week52High,
    week52Low: yahooSnapshot.week52Low,
  })
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

function buildSixMonthMetric(diffFromAverage6Month: number): TradingSignalMetric {
  const value = `6개월 평균 대비 ${formatSignedPercent(diffFromAverage6Month)}`

  if (diffFromAverage6Month <= -8) {
    return createReferenceMetric({
      description: `${value}: 현재가가 6개월 평균보다 꽤 낮아 평균 회귀 관점의 저가 구간으로 볼 수 있어요.`,
      key: 'sixMonthAverage',
      label: '6개월 평균 대비',
      signal: 'buy',
      status: '평균 대비 낮음',
      summary: '현재가가 6개월 평균보다 꽤 낮아요.',
      value,
    })
  }

  if (diffFromAverage6Month >= 10) {
    return createReferenceMetric({
      description: `${value}: 현재가가 6개월 평균보다 많이 위에 있어 단기 과열로 되돌림이 나올 수 있어요.`,
      key: 'sixMonthAverage',
      label: '6개월 평균 대비',
      signal: 'sell',
      status: '평균 대비 높음',
      summary: '현재가가 6개월 평균보다 많이 위에 있어요.',
      value,
    })
  }

  return createReferenceMetric({
    description: `${value}: 현재가가 6개월 평균과 크게 다르지 않아 중기 기준으로는 중립 구간이에요.`,
    key: 'sixMonthAverage',
    label: '6개월 평균 대비',
    signal: 'neutral',
    status: '중립',
    summary: '현재가가 6개월 평균과 크게 다르지 않아요.',
    value,
  })
}

function buildInsiderMetric(activity: InsiderActivitySummary, market: TradingMarket): TradingSignalMetric {
  if (market !== 'US') {
    return createReferenceMetric({
      description: '국내 종목은 무료 공개 소스가 제한적이라 내부자 매매는 참고용 중립 값으로 보여드려요.',
      key: 'insider',
      label: '내부자 매매',
      signal: 'neutral',
      status: '데이터 제한',
      summary: '국내 종목은 내부자 매매를 참고용 중립 값으로 보여드려요.',
      value: '무료 공개 데이터 제한',
    })
  }

  if (activity.buyCount === 0 && activity.sellCount === 0) {
    return createReferenceMetric({
      description: '최근 30일 기준으로 눈에 띄는 내부자 매매가 없어, 경영진 신호는 중립으로 볼 수 있어요.',
      key: 'insider',
      label: '내부자 매매',
      signal: 'neutral',
      status: '공시 없음',
      summary: '최근 30일 내부자 공시가 뚜렷하지 않아요.',
      value: '최근 30일 공시 없음',
    })
  }

  if (activity.netValue > 0) {
    return createReferenceMetric({
      description: `최근 30일 내부자 순매수가 보여 회사 안쪽 인물들이 주가를 긍정적으로 보는 신호로 읽을 수 있어요.`,
      key: 'insider',
      label: '내부자 매매',
      signal: 'buy',
      status: '순매수 우위',
      summary: '최근 30일 내부자 순매수가 보여요.',
      value: `매수 ${activity.buyCount}건 / 매도 ${activity.sellCount}건`,
    })
  }

  if (activity.netValue < 0) {
    return createReferenceMetric({
      description: `최근 30일 내부자 순매도가 우세해 경영진이 일부 차익 실현에 나선 흐름으로 볼 수 있어요.`,
      key: 'insider',
      label: '내부자 매매',
      signal: 'sell',
      status: '순매도 우위',
      summary: '최근 30일 내부자 순매도가 우세해요.',
      value: `매수 ${activity.buyCount}건 / 매도 ${activity.sellCount}건`,
    })
  }

  return createReferenceMetric({
    description: '내부자 매수와 매도가 비슷하게 섞여 있어 한쪽으로 강한 방향 신호를 주진 않아요.',
    key: 'insider',
    label: '내부자 매매',
    signal: 'neutral',
    status: '혼조',
    summary: '내부자 매수와 매도가 비슷하게 섞여 있어요.',
    value: `매수 ${activity.buyCount}건 / 매도 ${activity.sellCount}건`,
  })
}

function buildTradingSummary(metrics: TradingSignalMetric[], label: string): string {
  const priceMetric = metrics.find(metric => metric.key === 'fiftyTwoWeek')
  const macdMetric = metrics.find(metric => metric.key === 'macd')
  const volumeMetric = metrics.find(metric => metric.key === 'volume')

  const pricePhrase = resolvePricePhrase(priceMetric)
  const trendPhrase = resolveTrendPhrase(macdMetric, volumeMetric)
  const actionGuide = resolveActionGuide(label)

  return `${pricePhrase} ${trendPhrase} ${actionGuide}`
}

function resolvePricePhrase(metric?: TradingSignalMetric): string {
  if (!metric) return '가격은 중간 구간에 있고'
  if (metric.signal === 'buy' && metric.strength >= 0.7) return '가격 부담은 낮고'
  if (metric.signal === 'buy') return '가격도 합리적인 편이고'
  if (metric.signal === 'sell' && metric.strength >= 0.7) return '가격이 1년 고점권에 가까워'
  if (metric.signal === 'sell') return '가격대가 다소 높아졌고'
  return '가격은 중간 구간에 있고'
}

function resolveTrendPhrase(macdMetric?: TradingSignalMetric, volumeMetric?: TradingSignalMetric): string {
  if (macdMetric?.status === '상승 흐름' && volumeMetric?.signal === 'buy') {
    return '상승 신호가 나오고 있어요.'
  }

  if (macdMetric?.status === '반등 조짐') {
    return '하락 흐름이 약해지며 반등 조짐이 보여요.'
  }

  if (macdMetric?.signal === 'sell' && volumeMetric?.signal === 'sell') {
    return '가격 흐름과 수급이 모두 약해 보여요.'
  }

  if (macdMetric?.signal === 'sell') {
    return '아직 하락 압력이 남아 있어요.'
  }

  if (volumeMetric?.signal === 'buy') {
    return '거래도 늘며 관심이 붙고 있어요.'
  }

  return '아직 뚜렷한 방향성은 강하지 않아요.'
}

function resolveActionGuide(label: string): string {
  if (label === '분할매수 고려') {
    return '한 번에 사기보다 조금씩 나눠서 보는 게 좋아요.'
  }

  if (label === '관심 종목') {
    return '조금 더 흐름을 확인하면서 관심 있게 볼 만해요.'
  }

  if (label === '관망 우세') {
    return '성급하게 움직이기보다 흐름을 더 지켜보는 게 좋아요.'
  }

  if (label === '주의 필요') {
    return '반등 확인 전까지는 보수적으로 보는 편이 좋아요.'
  }

  return '새로 들어가기보다 반등 신호가 나올 때까지 기다리는 편이 좋아요.'
}

function resolveConfidenceSummary(confidence: TradingConfidence): string {
  if (confidence === 'high') {
    return '여러 핵심 지표가 같은 방향을 가리키고 있어요.'
  }

  if (confidence === 'medium') {
    return '일부 핵심 지표가 같은 방향을 보이고 있어요.'
  }

  return '지표들이 엇갈려 조금 더 확인이 필요해요.'
}

function resolveScoreLabel(score: number): string {
  if (score >= 75) return '분할매수 고려'
  if (score >= 60) return '관심 종목'
  if (score >= 45) return '관망 우세'
  if (score >= 30) return '주의 필요'
  return '리스크 높음'
}

function resolveRecommendation(score: number): TradingRecommendation {
  if (score >= 60) return 'buy'
  if (score < 45) return 'sell'
  return 'neutral'
}

function createCoreMetric(
  input: Omit<TradingSignalMetric, 'contribution' | 'includedInScore' | 'weight'>,
): TradingSignalMetric {
  const weight = WEIGHTS[input.key as keyof typeof WEIGHTS]
  return {
    ...input,
    contribution: directionScore(input.signal) * input.strength * weight,
    includedInScore: true,
    weight,
  }
}

function createReferenceMetric(
  input: Omit<TradingSignalMetric, 'contribution' | 'includedInScore' | 'strength' | 'weight'>,
): TradingSignalMetric {
  return {
    ...input,
    contribution: 0,
    includedInScore: false,
    strength: 0,
    weight: 0,
  }
}

function toExpertDetail(metric: TradingSignalMetric): TradingSignalExpertDetail {
  return {
    contribution: metric.includedInScore ? formatContribution(metric.contribution) : null,
    description: metric.description,
    key: metric.key,
    status: metric.status,
    title: metric.label,
    value: metric.value,
  }
}

function calculateRecentReturn(closes: number[], days: number): number {
  if (closes.length <= days) return 0

  const latest = closes[closes.length - 1]
  const baseline = closes[closes.length - 1 - days]
  if (!baseline) return 0

  return ((latest - baseline) / baseline) * 100
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

function directionScore(signal: TradingRecommendation): number {
  if (signal === 'buy') return 1
  if (signal === 'sell') return -1
  return 0
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
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

function formatContribution(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}

function parseMoney(value: string): number {
  const normalized = value.replace(/[,$]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
