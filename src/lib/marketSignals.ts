export type MacroState = 'risk_on' | 'neutral' | 'risk_off'
export type MarketIndicatorStatus = 'positive' | 'neutral' | 'negative' | 'unavailable'

export interface FearGreedSnapshot {
  label: string
  score: number
}

export interface MarketIndicator {
  guide: string
  key: 'yieldCurve' | 'creditSpread' | 'm2' | 'fearGreed' | 'erp'
  label: string
  status: MarketIndicatorStatus
  summary: string
  value: string
}

export interface MarketResponse {
  fetchedAt: string
  headline: string
  indicators: MarketIndicator[]
  macroScore: number
  macroState: MacroState
}

interface MarketSnapshotInput {
  equityRiskPremium: number | null
  fearGreed: FearGreedSnapshot | null
  fetchedAt?: string
  highYieldSpread: number | null
  m2YearOverYear: number | null
  treasury10YearRate: number | null
  treasury2YearRate: number | null
}

interface FredObservation {
  date: string
  value: string
}

interface FredObservationsResponse {
  observations?: FredObservation[]
}

const DAY_IN_MS = 86_400_000
const MARKET_HEADERS = {
  Accept: 'application/json, text/html;q=0.9',
  'User-Agent': 'Mozilla/5.0 (compatible; DrFolio/1.0; +https://vercel.app)',
}

export async function fetchMarketSignals(): Promise<MarketResponse> {
  const fredDataPromise = fetchFredMacroData(process.env.FRED_API_KEY?.trim() ?? '')
  const fearGreedPromise = fetchFearGreedSnapshot().catch(() => null)

  const fredData = await fredDataPromise
  const [fearGreed, equityRiskPremium] = await Promise.all([
    fearGreedPromise,
    fetchEquityRiskPremium(fredData.treasury10YearRate).catch(() => null),
  ])

  return buildMarketResponse({
    equityRiskPremium,
    fearGreed,
    highYieldSpread: fredData.highYieldSpread,
    m2YearOverYear: fredData.m2YearOverYear,
    treasury10YearRate: fredData.treasury10YearRate,
    treasury2YearRate: fredData.treasury2YearRate,
  })
}

export function buildMarketResponse(input: MarketSnapshotInput): MarketResponse {
  const yieldCurveSpread = input.treasury10YearRate !== null && input.treasury2YearRate !== null
    ? input.treasury10YearRate - input.treasury2YearRate
    : null

  const indicators: MarketIndicator[] = [
    buildYieldCurveIndicator(yieldCurveSpread),
    buildCreditSpreadIndicator(input.highYieldSpread),
    buildM2Indicator(input.m2YearOverYear),
    buildFearGreedIndicator(input.fearGreed),
    buildEquityRiskPremiumIndicator(input.equityRiskPremium),
  ]

  const scoredIndicators = indicators.filter(indicator => indicator.status !== 'unavailable')
  const totalScore = scoredIndicators.reduce((sum, indicator) => sum + scoreIndicator(indicator.status), 0)
  const macroScore = scoredIndicators.length === 0 ? 0 : roundToTwo(totalScore / scoredIndicators.length)
  const macroState = scoredIndicators.length === 0
    ? 'neutral'
    : macroScore >= 0.35
      ? 'risk_on'
      : macroScore <= -0.35
        ? 'risk_off'
        : 'neutral'

  return {
    fetchedAt: input.fetchedAt ?? new Date().toISOString(),
    headline: buildHeadline(macroState, scoredIndicators.length),
    indicators,
    macroScore,
    macroState,
  }
}

export function formatMacroStateLabel(macroState: MacroState): string {
  if (macroState === 'risk_on') return 'Risk-On'
  if (macroState === 'risk_off') return 'Risk-Off'
  return '중립'
}

export function extractSp500PeRatio(html: string): number | null {
  const match = html.match(/Current S&P 500 PE Ratio is ([0-9.]+)/i)
    ?? html.match(/class="[^"]*value[^"]*"[^>]*>\s*([0-9.]+)\s*</i)

  if (!match) return null

  const parsed = Number(match[1])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export async function fetchFearGreedSnapshot(): Promise<FearGreedSnapshot> {
  const response = await fetch('https://onoff.markets/data/stocks-fear-greed.json', {
    headers: MARKET_HEADERS,
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

async function fetchFredMacroData(apiKey: string) {
  if (!apiKey) {
    return {
      highYieldSpread: null,
      m2YearOverYear: null,
      treasury10YearRate: null,
      treasury2YearRate: null,
    }
  }

  const [treasury10YearSeries, treasury2YearSeries, highYieldSeries, m2Series] = await Promise.all([
    fetchFredSeries('DGS10', apiKey, 14).catch(() => []),
    fetchFredSeries('DGS2', apiKey, 14).catch(() => []),
    fetchFredSeries('BAMLH0A0HYM2', apiKey, 14).catch(() => []),
    fetchFredSeries('M2SL', apiKey, 24).catch(() => []),
  ])

  return {
    highYieldSpread: getLatestNumericValue(highYieldSeries),
    m2YearOverYear: computeM2YearOverYear(m2Series),
    treasury10YearRate: getLatestNumericValue(treasury10YearSeries),
    treasury2YearRate: getLatestNumericValue(treasury2YearSeries),
  }
}

async function fetchFredSeries(seriesId: string, apiKey: string, limit: number): Promise<FredObservation[]> {
  const url = new URL('https://api.stlouisfed.org/fred/series/observations')
  url.searchParams.set('series_id', seriesId)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('file_type', 'json')
  url.searchParams.set('sort_order', 'desc')
  url.searchParams.set('limit', String(limit))

  const response = await fetch(url, { headers: MARKET_HEADERS })
  if (!response.ok) {
    throw new Error(`FRED fetch failed for ${seriesId}: ${response.status}`)
  }

  const payload = await response.json() as FredObservationsResponse
  return payload.observations ?? []
}

async function fetchEquityRiskPremium(treasury10YearRate: number | null): Promise<number | null> {
  if (treasury10YearRate === null) return null

  const response = await fetch('https://www.multpl.com/s-p-500-pe-ratio', {
    headers: MARKET_HEADERS,
  })

  if (!response.ok) {
    return null
  }

  const peRatio = extractSp500PeRatio(await response.text())
  if (peRatio === null || peRatio <= 0) return null

  const earningsYield = 100 / peRatio
  return roundToTwo(earningsYield - treasury10YearRate)
}

function getLatestNumericValue(observations: FredObservation[]): number | null {
  for (const observation of observations) {
    const value = Number(observation.value)
    if (Number.isFinite(value)) return value
  }

  return null
}

function computeM2YearOverYear(observations: FredObservation[]): number | null {
  const numericObservations = observations.flatMap(observation => {
    const value = Number(observation.value)
    return Number.isFinite(value)
      ? [{ date: new Date(observation.date), value }]
      : []
  })

  const latest = numericObservations[0]
  if (!latest) return null

  const oneYearAgo = numericObservations.find(observation => (
    latest.date.getTime() - observation.date.getTime()
  ) >= (DAY_IN_MS * 330))

  if (!oneYearAgo || oneYearAgo.value === 0) return null

  return roundToTwo(((latest.value - oneYearAgo.value) / oneYearAgo.value) * 100)
}

function buildYieldCurveIndicator(spread: number | null): MarketIndicator {
  if (spread === null) {
    return buildUnavailableIndicator(
      'yieldCurve',
      '장단기 금리차',
      '장기금리가 단기금리보다 높으면 보통 경기 기대가 더 건강하다고 봐요.',
    )
  }

  if (spread < 0) {
    return {
      guide: '장기금리가 단기금리보다 높으면 보통 경기 기대가 더 건강하다고 봐요.',
      key: 'yieldCurve',
      label: '장단기 금리차',
      status: 'negative',
      summary: '장단기 금리가 뒤집혀 있어 경기 둔화 경고가 커진 구간으로 읽혀요.',
      value: `${formatSignedNumber(spread)}%p`,
    }
  }

  if (spread >= 0.5) {
    return {
      guide: '장기금리가 단기금리보다 높으면 보통 경기 기대가 더 건강하다고 봐요.',
      key: 'yieldCurve',
      label: '장단기 금리차',
      status: 'positive',
      summary: '장기금리가 단기금리보다 충분히 높아 경기 침체 경고는 약한 편이에요.',
      value: `${formatSignedNumber(spread)}%p`,
    }
  }

  return {
    guide: '장기금리가 단기금리보다 높으면 보통 경기 기대가 더 건강하다고 봐요.',
    key: 'yieldCurve',
    label: '장단기 금리차',
    status: 'neutral',
    summary: '금리차가 플러스이긴 하지만 크진 않아 경기를 더 지켜볼 구간이에요.',
    value: `${formatSignedNumber(spread)}%p`,
  }
}

function buildCreditSpreadIndicator(spread: number | null): MarketIndicator {
  if (spread === null) {
    return buildUnavailableIndicator(
      'creditSpread',
      '하이일드 스프레드',
      '위험한 회사채 금리가 국채보다 얼마나 더 비싼지 보면 시장 긴장을 알 수 있어요.',
    )
  }

  if (spread > 5.5) {
    return {
      guide: '위험한 회사채 금리가 국채보다 얼마나 더 비싼지 보면 시장 긴장을 알 수 있어요.',
      key: 'creditSpread',
      label: '하이일드 스프레드',
      status: 'negative',
      summary: '위험한 회사채 금리가 많이 벌어져 시장이 리스크를 크게 경계하는 모습이에요.',
      value: `${formatNumber(spread)}%p`,
    }
  }

  if (spread <= 3.5) {
    return {
      guide: '위험한 회사채 금리가 국채보다 얼마나 더 비싼지 보면 시장 긴장을 알 수 있어요.',
      key: 'creditSpread',
      label: '하이일드 스프레드',
      status: 'positive',
      summary: '스프레드가 낮아 위험자산을 받아들이는 심리가 비교적 편안한 편이에요.',
      value: `${formatNumber(spread)}%p`,
    }
  }

  return {
    guide: '위험한 회사채 금리가 국채보다 얼마나 더 비싼지 보면 시장 긴장을 알 수 있어요.',
    key: 'creditSpread',
    label: '하이일드 스프레드',
    status: 'neutral',
    summary: '스프레드가 살짝 올라와 있어 낙관과 경계가 섞인 구간으로 보여요.',
    value: `${formatNumber(spread)}%p`,
  }
}

function buildM2Indicator(yearOverYear: number | null): MarketIndicator {
  if (yearOverYear === null) {
    return buildUnavailableIndicator(
      'm2',
      'M2 증가율',
      '시중 돈이 늘면 주식시장에 들어올 유동성도 늘 수 있어요.',
    )
  }

  if (yearOverYear < 0) {
    return {
      guide: '시중 돈이 늘면 주식시장에 들어올 유동성도 늘 수 있어요.',
      key: 'm2',
      label: 'M2 증가율',
      status: 'negative',
      summary: '시중 유동성이 작년보다 줄어 위험자산에 우호적인 돈의 흐름은 약한 편이에요.',
      value: `${formatSignedNumber(yearOverYear)}%`,
    }
  }

  if (yearOverYear >= 2) {
    return {
      guide: '시중 돈이 늘면 주식시장에 들어올 유동성도 늘 수 있어요.',
      key: 'm2',
      label: 'M2 증가율',
      status: 'positive',
      summary: '시중 유동성이 다시 늘어나는 흐름이라 주식시장에 숨통이 트일 수 있어요.',
      value: `${formatSignedNumber(yearOverYear)}%`,
    }
  }

  return {
    guide: '시중 돈이 늘면 주식시장에 들어올 유동성도 늘 수 있어요.',
    key: 'm2',
    label: 'M2 증가율',
    status: 'neutral',
    summary: '유동성이 줄진 않지만 강하게 늘지도 않아 중립적인 자금 환경으로 보여요.',
    value: `${formatSignedNumber(yearOverYear)}%`,
  }
}

function buildFearGreedIndicator(snapshot: FearGreedSnapshot | null): MarketIndicator {
  if (!snapshot) {
    return buildUnavailableIndicator(
      'fearGreed',
      'Fear&Greed',
      '시장 참여자들이 공격적인지 방어적인지 보여주는 심리 지표예요.',
    )
  }

  if (snapshot.score <= 40) {
    return {
      guide: '시장 참여자들이 공격적인지 방어적인지 보여주는 심리 지표예요.',
      key: 'fearGreed',
      label: 'Fear&Greed',
      status: 'negative',
      summary: `심리가 ${snapshot.label} 쪽이라 투자자들이 방어적으로 움직이는 분위기예요.`,
      value: `${snapshot.label} ${formatNumber(snapshot.score)}`,
    }
  }

  if (snapshot.score >= 60) {
    return {
      guide: '시장 참여자들이 공격적인지 방어적인지 보여주는 심리 지표예요.',
      key: 'fearGreed',
      label: 'Fear&Greed',
      status: 'positive',
      summary: `심리가 ${snapshot.label} 쪽이라 위험자산을 받아들이는 흐름이 살아 있어요.`,
      value: `${snapshot.label} ${formatNumber(snapshot.score)}`,
    }
  }

  return {
    guide: '시장 참여자들이 공격적인지 방어적인지 보여주는 심리 지표예요.',
    key: 'fearGreed',
    label: 'Fear&Greed',
    status: 'neutral',
    summary: '심리가 한쪽으로 크게 치우치지 않아 시장 참여자들이 서로 눈치를 보는 구간이에요.',
    value: `${snapshot.label} ${formatNumber(snapshot.score)}`,
  }
}

function buildEquityRiskPremiumIndicator(equityRiskPremium: number | null): MarketIndicator {
  if (equityRiskPremium === null) {
    return buildUnavailableIndicator(
      'erp',
      'ERP',
      '주식 기대수익이 채권보다 얼마나 더 매력적인지 보는 값이에요.',
    )
  }

  if (equityRiskPremium < 0) {
    return {
      guide: '주식 기대수익이 채권보다 얼마나 더 매력적인지 보는 값이에요.',
      key: 'erp',
      label: 'ERP',
      status: 'negative',
      summary: '채권 금리 매력이 더 커 보여 주식에 높은 점수를 주기 어려운 구간이에요.',
      value: `${formatSignedNumber(equityRiskPremium)}%p`,
    }
  }

  if (equityRiskPremium >= 2.5) {
    return {
      guide: '주식 기대수익이 채권보다 얼마나 더 매력적인지 보는 값이에요.',
      key: 'erp',
      label: 'ERP',
      status: 'positive',
      summary: '주식 기대수익이 채권보다 충분히 높아 상대가치 측면에선 주식이 괜찮아 보여요.',
      value: `${formatSignedNumber(equityRiskPremium)}%p`,
    }
  }

  return {
    guide: '주식 기대수익이 채권보다 얼마나 더 매력적인지 보는 값이에요.',
    key: 'erp',
    label: 'ERP',
    status: 'neutral',
    summary: '주식과 채권 매력 차이가 크지 않아 밸류에이션만으로 방향을 정하긴 어려워요.',
    value: `${formatSignedNumber(equityRiskPremium)}%p`,
  }
}

function buildUnavailableIndicator(
  key: MarketIndicator['key'],
  label: string,
  guide: string,
): MarketIndicator {
  return {
    guide,
    key,
    label,
    status: 'unavailable',
    summary: '지금은 외부 데이터를 받지 못해 기본값으로 처리했어요.',
    value: '데이터 없음',
  }
}

function buildHeadline(macroState: MacroState, availableCount: number): string {
  if (availableCount === 0) {
    return '외부 시장 데이터를 받지 못해 기본값인 중립으로 보여드려요.'
  }

  if (macroState === 'risk_on') {
    return '지금 시장은 Risk-On 쪽으로 기울어 있어 공격적인 자산이 숨통을 틀 수 있어요.'
  }

  if (macroState === 'risk_off') {
    return '지금 시장은 Risk-Off 쪽이라 방어적으로 확인하면서 움직이는 편이 좋아요.'
  }

  return '지금 시장은 중립 구간이라 서두르기보다 방향 확인이 먼저인 환경이에요.'
}

function scoreIndicator(status: MarketIndicatorStatus): number {
  if (status === 'positive') return 1
  if (status === 'negative') return -1
  return 0
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}

function formatNumber(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '')
}

function formatSignedNumber(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatNumber(value)}`
}
