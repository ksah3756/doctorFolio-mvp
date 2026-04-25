export type MacroState = 'risk_on' | 'neutral' | 'risk_off'
export type MarketIndicatorStatus = 'positive' | 'neutral' | 'negative' | 'unavailable'

export interface FearGreedSnapshot {
  label: string
  score: number
}

export interface MarketIndicator {
  detailSource: string
  detailTitle: string
  detailValue: string
  guide: string
  key: 'yieldCurve' | 'creditSpread' | 'm2' | 'fearGreed' | 'erp'
  label: string
  status: MarketIndicatorStatus
  summary: string
  value: string
}

export interface MarketEntryKPI {
  guide: string
  label: string
  score: number
  summary: string
}

export interface MarketOverview {
  entry: MarketEntryKPI
  health: MarketEntryKPI
}

export interface MarketResponse {
  fetchedAt: string
  headline: string
  indicators: MarketIndicator[]
  macroScore: number
  macroState: MacroState
  overview: MarketOverview
}

export interface MarketInput {
  equityRiskPremium: number | null
  fearGreed: number | null
  highYieldSpread: number | null
  m2GrowthYoY: number | null
  yieldSpread: number | null
}

type MarketKPIContent = Pick<MarketEntryKPI, 'guide' | 'summary'>

interface MarketSnapshotInput {
  equityRiskPremium: number | null
  peRatio?: number | null
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
    peRatio: await fetchPeRatio().catch(() => null),
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
    buildYieldCurveIndicator(yieldCurveSpread, input.treasury10YearRate, input.treasury2YearRate),
    buildCreditSpreadIndicator(input.highYieldSpread),
    buildM2Indicator(input.m2YearOverYear),
    buildFearGreedIndicator(input.fearGreed),
    buildEquityRiskPremiumIndicator(input.equityRiskPremium, input.peRatio ?? null, input.treasury10YearRate),
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
    overview: buildOverview({
      equityRiskPremium: input.equityRiskPremium,
      fearGreed: input.fearGreed?.score ?? null,
      highYieldSpread: input.highYieldSpread,
      m2GrowthYoY: input.m2YearOverYear,
      yieldSpread: yieldCurveSpread,
    }),
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

  const peRatio = await fetchPeRatio()
  if (peRatio === null || peRatio <= 0) return null

  const earningsYield = 100 / peRatio
  return roundToTwo(earningsYield - treasury10YearRate)
}

async function fetchPeRatio(): Promise<number | null> {
  const response = await fetch('https://www.multpl.com/s-p-500-pe-ratio', {
    headers: MARKET_HEADERS,
  })

  if (!response.ok) {
    return null
  }

  const peRatio = extractSp500PeRatio(await response.text())
  return peRatio === null || peRatio <= 0 ? null : peRatio
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

function buildYieldCurveIndicator(
  spread: number | null,
  treasury10YearRate: number | null,
  treasury2YearRate: number | null,
): MarketIndicator {
  if (spread === null) {
    return buildUnavailableIndicator(
      'yieldCurve',
      '장단기 금리차',
      '장기금리가 단기금리보다 높으면 보통 경기 기대가 더 건강하다고 봐요.',
    )
  }

  if (spread < -0.5) {
    return {
      guide: '장기금리가 단기금리보다 높으면 보통 경기 기대가 더 건강하다고 봐요.',
      key: 'yieldCurve',
      label: '장단기 금리차',
      status: 'negative',
      summary: '단기 금리가 장기 금리보다 높아요. 과거에는 경기 둔화 전에 자주 나타났던 신호예요. 시장 전반의 리스크를 조금 더 신중하게 보는 게 좋아요.',
      ...buildDetailBox(
        '장단기 금리차 (10Y−2Y)',
        `출처: FRED | DGS10 ${formatPercent(treasury10YearRate)} − DGS2 ${formatPercent(treasury2YearRate)} = ${formatSignedNumber(spread)}%p`,
        `실제 값: ${formatSignedNumber(spread)}%p`,
      ),
      value: `${formatSignedNumber(spread)}%p`,
    }
  }

  if (spread < 0) {
    return {
      guide: '장기금리가 단기금리보다 높으면 보통 경기 기대가 더 건강하다고 봐요.',
      key: 'yieldCurve',
      label: '장단기 금리차',
      status: 'negative',
      summary: '금리 구조가 일부 뒤집힌 상태예요. 경기 흐름에 대한 불확실성이 있는 구간이에요. 지금은 공격적인 투자보다는 안정적인 접근이 어울려요.',
      ...buildDetailBox(
        '장단기 금리차 (10Y−2Y)',
        `출처: FRED | DGS10 ${formatPercent(treasury10YearRate)} − DGS2 ${formatPercent(treasury2YearRate)} = ${formatSignedNumber(spread)}%p`,
        `실제 값: ${formatSignedNumber(spread)}%p`,
      ),
      value: `${formatSignedNumber(spread)}%p`,
    }
  }

  if (spread < 0.5) {
    return {
      guide: '장기금리가 단기금리보다 높으면 보통 경기 기대가 더 건강하다고 봐요.',
      key: 'yieldCurve',
      label: '장단기 금리차',
      status: 'neutral',
      summary: '장단기 금리 차이가 거의 없는 상태예요. 시장이 방향을 잡는 중일 수 있어요. 조금 더 지켜보면서 대응하는 게 좋아요.',
      ...buildDetailBox(
        '장단기 금리차 (10Y−2Y)',
        `출처: FRED | DGS10 ${formatPercent(treasury10YearRate)} − DGS2 ${formatPercent(treasury2YearRate)} = ${formatSignedNumber(spread)}%p`,
        `실제 값: ${formatSignedNumber(spread)}%p`,
      ),
      value: `${formatSignedNumber(spread)}%p`,
    }
  }

  if (spread < 1.5) {
    return {
      guide: '장기금리가 단기금리보다 높으면 보통 경기 기대가 더 건강하다고 봐요.',
      key: 'yieldCurve',
      label: '장단기 금리차',
      status: 'positive',
      summary: '장기 금리가 단기 금리보다 높아 정상적인 구조예요. 경기 흐름도 비교적 안정적인 편이에요. 시장 전반의 리스크는 크지 않은 상태로 볼 수 있어요.',
      ...buildDetailBox(
        '장단기 금리차 (10Y−2Y)',
        `출처: FRED | DGS10 ${formatPercent(treasury10YearRate)} − DGS2 ${formatPercent(treasury2YearRate)} = ${formatSignedNumber(spread)}%p`,
        `실제 값: ${formatSignedNumber(spread)}%p`,
      ),
      value: `${formatSignedNumber(spread)}%p`,
    }
  }

  return {
    guide: '장기금리가 단기금리보다 높으면 보통 경기 기대가 더 건강하다고 봐요.',
    key: 'yieldCurve',
    label: '장단기 금리차',
    status: 'positive',
    summary: '금리 차이가 크게 벌어진 상태예요. 경기 기대가 반영된 흐름이에요. 다만 금리 부담도 함께 커질 수 있어 주의가 필요해요.',
    ...buildDetailBox(
      '장단기 금리차 (10Y−2Y)',
      `출처: FRED | DGS10 ${formatPercent(treasury10YearRate)} − DGS2 ${formatPercent(treasury2YearRate)} = ${formatSignedNumber(spread)}%p`,
      `실제 값: ${formatSignedNumber(spread)}%p`,
    ),
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

  if (spread < 3.5) {
    return {
      guide: '위험한 회사채 금리가 국채보다 얼마나 더 비싼지 보면 시장 긴장을 알 수 있어요.',
      key: 'creditSpread',
      label: '하이일드 스프레드',
      status: 'positive',
      summary: '기업 신용 위험이 낮은 상태예요. 시장이 안정적으로 평가되고 있어요. 리스크 부담은 크지 않은 구간이에요.',
      ...buildDetailBox(
        '하이일드 스프레드',
        `출처: FRED | BAMLH0A0HYM2 ${formatNumber(spread)}%p`,
        `실제 값: ${formatNumber(spread)}%p`,
      ),
      value: `${formatNumber(spread)}%p`,
    }
  }

  if (spread < 5) {
    return {
      guide: '위험한 회사채 금리가 국채보다 얼마나 더 비싼지 보면 시장 긴장을 알 수 있어요.',
      key: 'creditSpread',
      label: '하이일드 스프레드',
      status: 'positive',
      summary: '기업 부도 위험이 크게 높지 않은 상태예요. 시장 전반은 비교적 안정적인 흐름을 보이고 있어요.',
      ...buildDetailBox(
        '하이일드 스프레드',
        `출처: FRED | BAMLH0A0HYM2 ${formatNumber(spread)}%p`,
        `실제 값: ${formatNumber(spread)}%p`,
      ),
      value: `${formatNumber(spread)}%p`,
    }
  }

  if (spread < 7) {
    return {
      guide: '위험한 회사채 금리가 국채보다 얼마나 더 비싼지 보면 시장 긴장을 알 수 있어요.',
      key: 'creditSpread',
      label: '하이일드 스프레드',
      status: 'neutral',
      summary: '기업 신용에 대한 불안이 조금씩 반영되고 있어요. 시장 변동성이 커질 수 있는 구간이에요.',
      ...buildDetailBox(
        '하이일드 스프레드',
        `출처: FRED | BAMLH0A0HYM2 ${formatNumber(spread)}%p`,
        `실제 값: ${formatNumber(spread)}%p`,
      ),
      value: `${formatNumber(spread)}%p`,
    }
  }

  if (spread < 10) {
    return {
      guide: '위험한 회사채 금리가 국채보다 얼마나 더 비싼지 보면 시장 긴장을 알 수 있어요.',
      key: 'creditSpread',
      label: '하이일드 스프레드',
      status: 'negative',
      summary: '기업 부도 위험이 높아지고 있는 상태예요. 시장 리스크를 우선적으로 관리하는 것이 중요해요.',
      ...buildDetailBox(
        '하이일드 스프레드',
        `출처: FRED | BAMLH0A0HYM2 ${formatNumber(spread)}%p`,
        `실제 값: ${formatNumber(spread)}%p`,
      ),
      value: `${formatNumber(spread)}%p`,
    }
  }

  return {
    guide: '위험한 회사채 금리가 국채보다 얼마나 더 비싼지 보면 시장 긴장을 알 수 있어요.',
    key: 'creditSpread',
    label: '하이일드 스프레드',
    status: 'negative',
    summary: '기업 신용 위험이 크게 확대된 상태예요. 시장이 위기 상황을 반영하고 있어요. 지금은 기회보다 리스크 관리가 중요한 구간이에요.',
    ...buildDetailBox(
      '하이일드 스프레드',
      `출처: FRED | BAMLH0A0HYM2 ${formatNumber(spread)}%p`,
      `실제 값: ${formatNumber(spread)}%p`,
    ),
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
      summary: '시중에 도는 돈이 줄어들고 있어요. 시장 유동성이 위축된 상태예요. 위험자산에는 부담이 될 수 있어요.',
      ...buildDetailBox(
        'M2 증가율 (YoY)',
        `출처: FRED | M2SL 전년동월 대비 ${formatSignedNumber(yearOverYear)}%`,
        `실제 값: ${formatSignedNumber(yearOverYear)}%`,
      ),
      value: `${formatSignedNumber(yearOverYear)}%`,
    }
  }

  if (yearOverYear < 3) {
    return {
      guide: '시중 돈이 늘면 주식시장에 들어올 유동성도 늘 수 있어요.',
      key: 'm2',
      label: 'M2 증가율',
      status: 'neutral',
      summary: '유동성 증가가 둔화된 상태예요. 시장에 자금 유입이 제한적이에요. 상승 동력이 약해질 수 있어요.',
      ...buildDetailBox(
        'M2 증가율 (YoY)',
        `출처: FRED | M2SL 전년동월 대비 ${formatSignedNumber(yearOverYear)}%`,
        `실제 값: ${formatSignedNumber(yearOverYear)}%`,
      ),
      value: `${formatSignedNumber(yearOverYear)}%`,
    }
  }

  if (yearOverYear < 7) {
    return {
      guide: '시중 돈이 늘면 주식시장에 들어올 유동성도 늘 수 있어요.',
      key: 'm2',
      label: 'M2 증가율',
      status: 'positive',
      summary: '시중 유동성이 안정적인 수준이에요. 시장에 특별한 부담이나 과열 신호는 없어요.',
      ...buildDetailBox(
        'M2 증가율 (YoY)',
        `출처: FRED | M2SL 전년동월 대비 ${formatSignedNumber(yearOverYear)}%`,
        `실제 값: ${formatSignedNumber(yearOverYear)}%`,
      ),
      value: `${formatSignedNumber(yearOverYear)}%`,
    }
  }

  return {
    guide: '시중 돈이 늘면 주식시장에 들어올 유동성도 늘 수 있어요.',
    key: 'm2',
    label: 'M2 증가율',
    status: 'positive',
    summary: yearOverYear < 12
      ? '시장에 돈이 비교적 충분히 공급되고 있어요. 위험자산에 우호적인 환경이에요.'
      : '유동성이 과도하게 증가한 상태예요. 시장에 자금이 많이 풀린 구간이에요. 장기적으로는 인플레이션 부담도 함께 고려해야 해요.',
    ...buildDetailBox(
      'M2 증가율 (YoY)',
      `출처: FRED | M2SL 전년동월 대비 ${formatSignedNumber(yearOverYear)}%`,
      `실제 값: ${formatSignedNumber(yearOverYear)}%`,
    ),
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

  if (snapshot.score < 20) {
    return {
      guide: '시장 참여자들이 공격적인지 방어적인지 보여주는 심리 지표예요.',
      key: 'fearGreed',
      label: 'Fear&Greed',
      status: 'negative',
      summary: '투자자들이 많이 위축된 상태예요. 시장에 대한 불안이 큰 구간이에요. 이런 시기에는 단기 변동성이 크지만, 장기적으로는 기회가 생기기도 해요.',
      ...buildDetailBox(
        'Fear & Greed Index',
        `출처: onoff.markets | ${snapshot.label} ${formatNumber(snapshot.score)}`,
        `실제 값: ${snapshot.label} ${formatNumber(snapshot.score)}`,
      ),
      value: `${snapshot.label} ${formatNumber(snapshot.score)}`,
    }
  }

  if (snapshot.score < 40) {
    return {
      guide: '시장 참여자들이 공격적인지 방어적인지 보여주는 심리 지표예요.',
      key: 'fearGreed',
      label: 'Fear&Greed',
      status: 'negative',
      summary: '투자자들이 조심스럽게 움직이고 있어요. 시장에 대한 불안이 남아 있는 상태예요. 지금은 서두르기보다 천천히 접근하는 전략이 어울려요.',
      ...buildDetailBox(
        'Fear & Greed Index',
        `출처: onoff.markets | ${snapshot.label} ${formatNumber(snapshot.score)}`,
        `실제 값: ${snapshot.label} ${formatNumber(snapshot.score)}`,
      ),
      value: `${snapshot.label} ${formatNumber(snapshot.score)}`,
    }
  }

  if (snapshot.score < 60) {
    return {
      guide: '시장 참여자들이 공격적인지 방어적인지 보여주는 심리 지표예요.',
      key: 'fearGreed',
      label: 'Fear&Greed',
      status: 'neutral',
      summary: '투자 심리가 크게 치우치지 않은 상태예요. 낙관도 비관도 강하지 않아요. 이런 구간에서는 종목별 흐름이 더 중요해요.',
      ...buildDetailBox(
        'Fear & Greed Index',
        `출처: onoff.markets | ${snapshot.label} ${formatNumber(snapshot.score)}`,
        `실제 값: ${snapshot.label} ${formatNumber(snapshot.score)}`,
      ),
      value: `${snapshot.label} ${formatNumber(snapshot.score)}`,
    }
  }

  if (snapshot.score < 80) {
    return {
      guide: '시장 참여자들이 공격적인지 방어적인지 보여주는 심리 지표예요.',
      key: 'fearGreed',
      label: 'Fear&Greed',
      status: 'positive',
      summary: '투자자들이 점점 낙관적으로 바뀌고 있어요. 시장에 기대감이 커지고 있어요. 너무 빠르게 오른 종목은 단기 부담을 함께 확인하는 게 좋아요.',
      ...buildDetailBox(
        'Fear & Greed Index',
        `출처: onoff.markets | ${snapshot.label} ${formatNumber(snapshot.score)}`,
        `실제 값: ${snapshot.label} ${formatNumber(snapshot.score)}`,
      ),
      value: `${snapshot.label} ${formatNumber(snapshot.score)}`,
    }
  }

  return {
    guide: '시장 참여자들이 공격적인지 방어적인지 보여주는 심리 지표예요.',
    key: 'fearGreed',
    label: 'Fear&Greed',
    status: 'positive',
    summary: '투자자들이 과하게 낙관적인 상태예요. 시장이 많이 달아오른 구간이에요. 이런 시기에는 추격 매수보다 과열 여부를 꼭 점검해야 해요.',
    ...buildDetailBox(
      'Fear & Greed Index',
      `출처: onoff.markets | ${snapshot.label} ${formatNumber(snapshot.score)}`,
      `실제 값: ${snapshot.label} ${formatNumber(snapshot.score)}`,
    ),
    value: `${snapshot.label} ${formatNumber(snapshot.score)}`,
  }
}

function buildEquityRiskPremiumIndicator(
  equityRiskPremium: number | null,
  peRatio: number | null,
  treasury10YearRate: number | null,
): MarketIndicator {
  if (equityRiskPremium === null) {
    return buildUnavailableIndicator(
      'erp',
      'ERP',
      '주식 기대수익이 채권보다 얼마나 더 매력적인지 보는 값이에요.',
    )
  }

  if (equityRiskPremium < 1) {
    return {
      guide: '주식 기대수익이 채권보다 얼마나 더 매력적인지 보는 값이에요.',
      key: 'erp',
      label: 'ERP',
      status: 'negative',
      summary: '주식이 채권이나 예금 대비 충분히 매력적이지 않은 구간이에요. 지금은 무리하게 주식 비중을 늘리기보다 신중한 접근이 좋아요.',
      ...buildDetailBox(
        'ERP (주식−채권 상대매력)',
        buildErpSourceLine(peRatio, treasury10YearRate, equityRiskPremium),
        `실제 값: ${formatSignedNumber(equityRiskPremium)}%p`,
      ),
      value: `${formatSignedNumber(equityRiskPremium)}%p`,
    }
  }

  if (equityRiskPremium < 2.5) {
    return {
      guide: '주식 기대수익이 채권보다 얼마나 더 매력적인지 보는 값이에요.',
      key: 'erp',
      label: 'ERP',
      status: 'neutral',
      summary: '주식의 상대 매력도가 다소 낮은 상태예요. 가격 부담을 함께 고려하면서 투자하는 게 좋아요.',
      ...buildDetailBox(
        'ERP (주식−채권 상대매력)',
        buildErpSourceLine(peRatio, treasury10YearRate, equityRiskPremium),
        `실제 값: ${formatSignedNumber(equityRiskPremium)}%p`,
      ),
      value: `${formatSignedNumber(equityRiskPremium)}%p`,
    }
  }

  if (equityRiskPremium < 4) {
    return {
      guide: '주식 기대수익이 채권보다 얼마나 더 매력적인지 보는 값이에요.',
      key: 'erp',
      label: 'ERP',
      status: 'neutral',
      summary: '주식과 채권의 매력도가 크게 차이나지 않는 구간이에요. 종목 선택이 중요한 시기예요.',
      ...buildDetailBox(
        'ERP (주식−채권 상대매력)',
        buildErpSourceLine(peRatio, treasury10YearRate, equityRiskPremium),
        `실제 값: ${formatSignedNumber(equityRiskPremium)}%p`,
      ),
      value: `${formatSignedNumber(equityRiskPremium)}%p`,
    }
  }

  if (equityRiskPremium < 6) {
    return {
      guide: '주식 기대수익이 채권보다 얼마나 더 매력적인지 보는 값이에요.',
      key: 'erp',
      label: 'ERP',
      status: 'positive',
      summary: '주식이 채권보다 더 높은 보상을 기대할 수 있는 구간이에요. 분할로 접근해볼 수 있는 환경이에요.',
      ...buildDetailBox(
        'ERP (주식−채권 상대매력)',
        buildErpSourceLine(peRatio, treasury10YearRate, equityRiskPremium),
        `실제 값: ${formatSignedNumber(equityRiskPremium)}%p`,
      ),
      value: `${formatSignedNumber(equityRiskPremium)}%p`,
    }
  }

  return {
    guide: '주식 기대수익이 채권보다 얼마나 더 매력적인지 보는 값이에요.',
    key: 'erp',
    label: 'ERP',
    status: 'positive',
    summary: '주식의 기대 수익이 크게 높은 구간이에요. 시장이 리스크를 반영하고 있을 수 있어요. 기회가 있을 수 있지만, 리스크도 함께 확인하는 게 중요해요.',
    ...buildDetailBox(
      'ERP (주식−채권 상대매력)',
      buildErpSourceLine(peRatio, treasury10YearRate, equityRiskPremium),
      `실제 값: ${formatSignedNumber(equityRiskPremium)}%p`,
    ),
    value: `${formatSignedNumber(equityRiskPremium)}%p`,
  }
}

function buildUnavailableIndicator(
  key: MarketIndicator['key'],
  label: string,
  guide: string,
): MarketIndicator {
  return {
    detailSource: '출처: 외부 데이터 연결 실패',
    detailTitle: label,
    detailValue: '실제 값: 데이터 없음',
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

function formatPercent(value: number | null): string {
  return value === null ? '-' : `${formatNumber(value)}%`
}

function buildEntryKPI(score: number): MarketEntryKPI {
  if (score >= 75) return {
    ...buildEntryKPIContent('high'),
    label: '분할 진입 매력 높음',
    score,
  }
  if (score >= 60) return {
    ...buildEntryKPIContent('midHigh'),
    label: '진입 검토 가능',
    score,
  }
  if (score >= 45) return {
    ...buildEntryKPIContent('mid'),
    label: '신중한 관망',
    score,
  }
  if (score >= 30) return {
    ...buildEntryKPIContent('midLow'),
    label: '진입 부담 높음',
    score,
  }
  return {
    ...buildEntryKPIContent('low'),
    label: '리스크 우선 관리',
    score,
  }
}

function buildHealthKPI(score: number): MarketEntryKPI {
  if (score >= 75) return {
    ...buildHealthKPIContent('high'),
    label: '안정',
    score,
  }
  if (score >= 60) return {
    ...buildHealthKPIContent('midHigh'),
    label: '양호',
    score,
  }
  if (score >= 45) return {
    ...buildHealthKPIContent('mid'),
    label: '중립',
    score,
  }
  if (score >= 30) return {
    ...buildHealthKPIContent('midLow'),
    label: '불안',
    score,
  }
  return {
    ...buildHealthKPIContent('low'),
    label: '공포',
    score,
  }
}

type KPIBand = 'high' | 'midHigh' | 'mid' | 'midLow' | 'low'

function buildEntryKPIContent(band: KPIBand): Pick<MarketEntryKPI, 'guide' | 'summary'> {
  if (band === 'high') {
    return {
      guide: '천천히 분할로 접근해도 좋아요.',
      summary: '시장 리스크가 크지 않고 주식의 상대 매력도도 괜찮은 편이에요. 종목별로 분할 접근을 검토하기 좋은 구간이에요.',
    }
  }

  if (band === 'midHigh') {
    return {
      guide: '분할 진입을 전제로만 살펴보세요.',
      summary: '시장 불안 요소가 일부 있지만, 분할로 접근하면 기회를 노려볼 수 있는 구간이에요.',
    }
  }

  if (band === 'mid') {
    return {
      guide: '한 템포 지켜보는 편이 좋아요.',
      summary: '시장 방향이 뚜렷하지 않아 조금 더 지켜보는 전략이 좋아요.',
    }
  }

  if (band === 'midLow') {
    return {
      guide: '신규 진입은 속도를 늦추세요.',
      summary: '변동성이 커질 수 있는 구간이라 신규 진입은 신중하게 접근하는 게 좋아요.',
    }
  }

  return {
    guide: '지금은 리스크 관리가 먼저예요.',
    summary: '시장 리스크가 높은 구간이에요. 지금은 기회보다 리스크 관리가 더 중요한 시점이에요.',
  }
}

function buildHealthKPIContent(band: KPIBand): Pick<MarketEntryKPI, 'guide' | 'summary'> {
  if (band === 'high') {
    return {
      guide: '시장 환경을 안정적으로 볼 수 있어요.',
      summary: '시장 환경이 전반적으로 안정적인 상태예요.',
    }
  }

  if (band === 'midHigh') {
    return {
      guide: '일부 변수는 계속 확인하세요.',
      summary: '시장 리스크는 크지 않지만 일부 변수는 확인이 필요해요.',
    }
  }

  if (band === 'mid') {
    return {
      guide: '방향이 잡힐 때까지 기다려도 돼요.',
      summary: '시장 방향성이 뚜렷하지 않은 구간이에요.',
    }
  }

  if (band === 'midLow') {
    return {
      guide: '변동성 확대를 먼저 의식하세요.',
      summary: '시장 변동성이 커지고 있는 구간이에요.',
    }
  }

  return {
    guide: '방어적으로 보는 편이 맞아요.',
    summary: '시장 불안이 큰 상태로 리스크 관리가 중요한 구간이에요.',
  }
}

function buildOverview(input: MarketInput): MarketOverview {
  const entryScore = calculateEntryAttractiveness(input)
  const healthScore = calculateMarketHealth(input)

  return {
    entry: buildEntryKPI(entryScore),
    health: buildHealthKPI(healthScore),
  }
}

export function calculateEntryAttractiveness(input: MarketInput): number {
  const contrarian = scoreContrarian(input.fearGreed)
  const equity = scoreERP(input.equityRiskPremium)
  const safety = scoreCredit(input.highYieldSpread)
  const liquidity = scoreLiquidity(input.m2GrowthYoY)

  const base = (
    contrarian * 0.35
    + equity * 0.25
    + safety * 0.25
    + liquidity * 0.15
  )

  const penalty = getCyclePenalty(input.yieldSpread) + getOverheatingPenalty(input.fearGreed)
  return clamp(Math.round(base - penalty), 0, 100)
}

export function calculateMarketHealth(input: MarketInput): number {
  return weightedAverage([
    [scoreFearGreed(input.fearGreed), 1.2],
    [scoreYieldSpread(input.yieldSpread), 1.3],
    [scoreERP(input.equityRiskPremium), 1.2],
    [scoreCredit(input.highYieldSpread), 1.5],
    [scoreLiquidity(input.m2GrowthYoY), 0.8],
  ])
}

export function scoreContrarian(fg: number | null): number {
  if (fg === null) return 50
  if (fg < 10) return 70
  if (fg < 25) return 85
  if (fg < 40) return 75
  if (fg < 60) return 55
  if (fg < 75) return 35
  return 20
}

export function scoreFearGreed(fg: number | null): number {
  if (fg === null) return 50
  if (fg < 10) return 15
  if (fg < 25) return 25
  if (fg < 40) return 40
  if (fg < 60) return 55
  if (fg < 75) return 75
  return 90
}

export function scoreERP(erp: number | null): number {
  if (erp === null) return 50
  if (erp < 1) return 20
  if (erp < 2.5) return 40
  if (erp < 4) return 60
  if (erp < 6) return 80
  return 70
}

export function scoreCredit(spread: number | null): number {
  if (spread === null) return 50
  if (spread < 3.5) return 90
  if (spread < 5) return 75
  if (spread < 7) return 50
  if (spread < 10) return 25
  return 10
}

export function scoreLiquidity(m2: number | null): number {
  if (m2 === null) return 50
  if (m2 < 0) return 25
  if (m2 < 3) return 45
  if (m2 < 7) return 70
  if (m2 < 12) return 80
  return 65
}

export function scoreYieldSpread(spread: number | null): number {
  if (spread === null) return 50
  if (spread < -1) return 10
  if (spread < -0.3) return 25
  if (spread < 0.2) return 45
  if (spread < 1) return 70
  return 85
}

export function getCyclePenalty(spread: number | null): number {
  if (spread === null) return 0
  if (spread < -1) return 18
  if (spread < -0.3) return 12
  if (spread < 0.2) return 5
  return 0
}

export function getOverheatingPenalty(fg: number | null): number {
  if (fg === null) return 0
  if (fg >= 85) return 25
  if (fg >= 75) return 18
  if (fg >= 65) return 8
  return 0
}

function weightedAverage(entries: Array<[number, number]>): number {
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
  if (totalWeight === 0) return 50

  const weightedTotal = entries.reduce((sum, [score, weight]) => sum + (score * weight), 0)
  return clamp(Math.round(weightedTotal / totalWeight), 0, 100)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function buildErpSourceLine(peRatio: number | null, treasury10YearRate: number | null, erp: number): string {
  const earningsYield = peRatio && peRatio > 0 ? roundToTwo(100 / peRatio) : null

  return `출처: multpl.com + FRED | Earnings Yield ${formatPercent(earningsYield)} − DGS10 ${formatPercent(treasury10YearRate)} = ${formatSignedNumber(erp)}%p`
}

function buildDetailBox(detailTitle: string, detailSource: string, detailValue: string) {
  return {
    detailSource,
    detailTitle,
    detailValue,
  }
}
