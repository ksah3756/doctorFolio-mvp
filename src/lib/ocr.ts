import { autoClassify } from './sectors'
import type { PortfolioPosition } from './types'

export type OcrRaw = {
  name: string
  code: string | null
  sector: string | null
  qty: number | null
  value: number | null
  avgCost: number | null
  currentPrice: number | null
}

type OcrErrorDetails = {
  status: number
  message: string
}

const ETF_SECTOR_ASSET_CLASS = {
  미국ETF: '해외주식',
  국내ETF: '국내주식',
  채권ETF: '채권',
  원자재ETF: '기타',
} as const

export function parseOcrResponse(text: string): OcrRaw[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []

  try {
    return JSON.parse(match[0]) as OcrRaw[]
  } catch {
    return []
  }
}

export function buildOcrPrompt(): string {
  return `다음 증권사 MTS 보유 종목 화면에서 모든 보유 종목 정보를 추출해줘.

추출할 필드:
- name: 종목명
- code: 종목코드 (6자리 숫자 or 알파벳 티커, 없으면 null)
- sector: 아래 25개 중 하나로 분류
  에너지, 소재, 자본재, 전문서비스, 운수, 자동차, 내구소비재, 소비자서비스,
  소매유통, 필수소비재유통, 식음료, 생활용품, 의료기기/서비스, 제약/바이오,
  은행, 금융서비스, 보험, 소프트웨어, 하드웨어, 반도체,
  통신, 미디어/엔터, 유틸리티, 리츠, 부동산
  ETF는 미국ETF, 국내ETF, 채권ETF, 원자재ETF 중 하나로 분류
- qty: 보유수량 (정수)
- value: 평가금액/보유금액/보유평가금액 "총액" (원화 숫자만)
- avgCost: 매입가/평균단가/매입단가 "1주당 단가" (원화 숫자만, 없으면 null)
- currentPrice: 현재가 "1주당 단가" (원화 숫자만, 없으면 null)

중요 규칙:
- value는 반드시 "평가금액/보유금액/보유평가금액" 열의 총액만 사용
- avgCost는 반드시 "매입가/매입단가/평균단가" 열의 1주당 단가만 사용
- currentPrice는 반드시 "현재가" 열의 1주당 단가만 사용
- "평가손익", "손익", "수익률", "%" 열의 숫자는 절대 사용하지 마
- "qty × currentPrice ≈ value" 관계가 성립하도록 읽어줘
- 표가 2줄 숫자 구조라면 보통:
  - 손익/수익률 열: 무조건 무시
  - 잔고수량/보유 수량 열: 윗줄=qty
  - 평가금액/보유금액 열: 아랫줄=value
  - 매입가/매입단가 열: 윗줄=avgCost
  - 현재가 열: 아랫줄=currentPrice
- 종목명 오른쪽에 숫자 블록이 3개라면:
  - 첫 번째 블록 = 손익/수익률 → 항상 무시
  - 두 번째 블록 = qty / value
  - 세 번째 블록 = avgCost / currentPrice
- 헤더가 "평가손익/수익률 | 잔고수량/평가금액 | 매입가/현재가" 또는
  "평가손익/수익률 | 보유/평가금액 | 매입단가/현재가" 형태면 위 규칙을 그대로 적용해
- 값이 헷갈리면 손익/수익률 숫자를 쓰지 말고 null로 남겨
- qty가 1이면 value와 currentPrice가 같을 수 있다
- 필드가 화면에 없으면 null
- 콤마, ₩, 원, %는 제거하고 숫자만 반환
- JSON 배열만 반환, 다른 텍스트 없음

예시:
- {"name":"SK하이닉스","code":"000660","sector":"반도체","qty":4,"value":3500000,"avgCost":270375,"currentPrice":875000}
- {"name":"현대차","code":"005380","sector":"자동차","qty":7,"value":3304000,"avgCost":271242,"currentPrice":472000}
- {"name":"SK하이닉스","code":"000660","sector":"반도체","qty":1,"value":876000,"avgCost":260000,"currentPrice":876000}
- {"name":"TIGER 미국S&P500","code":null,"sector":"미국ETF","qty":24,"value":589680,"avgCost":24892,"currentPrice":24570}
형식: [{"name":"삼성전자","code":"005930","sector":"반도체","qty":3,"value":557400,"avgCost":170400,"currentPrice":185800}]`
}

export function parseOcrErrorResponse(text: string, fallback = '인식 실패'): string {
  const trimmed = text.trim()
  if (!trimmed) return fallback

  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown }
    return typeof parsed.error === 'string' && parsed.error.trim() ? parsed.error : fallback
  } catch {
    return trimmed
  }
}

export function getOcrErrorDetails(error: unknown): OcrErrorDetails {
  const fallback: OcrErrorDetails = {
    status: 502,
    message: 'OCR 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  }

  if (!error || typeof error !== 'object') {
    return fallback
  }

  const apiError = error as {
    status?: number
    error?: { message?: string }
    message?: string
  }

  const message = apiError.error?.message ?? apiError.message ?? ''

  if (message.includes('credit balance is too low')) {
    return {
      status: 503,
      message: 'OCR API 크레딧이 부족합니다. Anthropic 결제 상태를 확인해 주세요.',
    }
  }

  if (apiError.status === 401) {
    return {
      status: 502,
      message: 'OCR API 인증에 실패했습니다. ANTHROPIC_API_KEY를 확인해 주세요.',
    }
  }

  if (apiError.status === 429) {
    return {
      status: 429,
      message: 'OCR 요청이 잠시 많습니다. 잠시 후 다시 시도해 주세요.',
    }
  }

  return fallback
}

export function normalizeOcrItems(
  rawItems: OcrRaw[],
  sourceImage: number,
  createId: () => string = () => crypto.randomUUID(),
): PortfolioPosition[] {
  return rawItems.flatMap(raw => {
    if (!raw.name) return []

    const qty = raw.qty && raw.qty > 0 ? raw.qty : 1
    const parsedCurrentPrice = raw.currentPrice && raw.currentPrice > 0 ? raw.currentPrice : null
    const fallbackValue = parsedCurrentPrice ? parsedCurrentPrice * qty : null
    const valueCandidate = raw.value && raw.value > 0 ? raw.value : null

    let value = valueCandidate ?? fallbackValue
    const currentPrice = parsedCurrentPrice ?? (value ? value / qty : null)

    if (currentPrice && value) {
      const derivedValue = currentPrice * qty
      const driftRatio = Math.abs(value - derivedValue) / Math.max(value, derivedValue)
      if (driftRatio > 0.2) value = derivedValue
    }

    if (!value || !currentPrice) return []

    const avgCost = raw.avgCost && raw.avgCost > 0 ? raw.avgCost : currentPrice
    const fallbackClassification = autoClassify(raw.name, raw.code)
    const normalizedSector = normalizeOcrSector(raw.sector)
    const sector = normalizedSector ?? fallbackClassification.sector
    const assetClass = normalizedSector
      ? resolveAssetClassFromSector(normalizedSector, fallbackClassification.assetClass, raw.code)
      : fallbackClassification.assetClass

    return [{
      id: createId(),
      name: raw.name,
      code: raw.code,
      qty,
      value,
      avgCost,
      currentPrice,
      assetClass,
      sector,
      sourceImage,
    }]
  })
}

function normalizeOcrSector(sector: string | null): string | null {
  if (!sector) return null

  const normalized = sector.trim().replace(/\s*\/\s*/g, '/').replace(/\s+/g, '')
  return normalized || null
}

function resolveAssetClassFromSector(
  sector: string,
  fallbackAssetClass: PortfolioPosition['assetClass'],
  code: string | null,
): PortfolioPosition['assetClass'] {
  const etfAssetClass = ETF_SECTOR_ASSET_CLASS[sector as keyof typeof ETF_SECTOR_ASSET_CLASS]
  if (etfAssetClass) return etfAssetClass
  if (code && /^[A-Z]{1,5}$/.test(code)) return '해외주식'
  if (code && /^\d{6}$/.test(code)) return '국내주식'
  return fallbackAssetClass
}
