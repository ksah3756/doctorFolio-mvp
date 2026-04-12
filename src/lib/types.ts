// src/lib/types.ts

export type AssetClass = '국내주식' | '해외주식' | '채권' | '기타'

export interface PortfolioPosition {
  id: string            // 클라이언트 생성 UUID (확인 화면 key)
  name: string          // 종목명
  code: string | null   // 종목코드 (6자리 숫자 or "AAPL"), OCR 못 찾으면 null
  qty: number           // 보유수량
  value: number         // 평가금액/보유금액 총액 (원)
  avgCost: number       // 매입가/평균단가 (1주당 원가)
  currentPrice: number  // 현재가 (1주당), OCR 직파싱 후 필요 시 보정
  assetClass: AssetClass
  sector: string        // "반도체", "자동차", "채권 ETF" 등
  sourceImage: number   // 어느 이미지에서 추출됐는지 (1-based)
}

export interface TargetAllocation {
  '국내주식': number  // 0-100 (%)
  '해외주식': number
  '채권': number
  '현금': number
  // 합계 = 100
}

export const DEFAULT_TARGET: TargetAllocation = {
  '국내주식': 35,
  '해외주식': 25,
  '채권': 30,
  '현금': 10,
}

export type AllocationBucket = AssetClass | '현금'

export type ProblemType = 'drift' | 'concentration_stock' | 'concentration_sector'
export type Severity = 'high' | 'medium'

export interface Problem {
  type: ProblemType
  severity: Severity
  assetClass?: AllocationBucket   // drift 타입일 때
  ticker?: string            // concentration_stock 타입일 때
  sector?: string            // concentration_sector 타입일 때
  current: number            // 현재 % (소수점 1자리)
  target: number             // 목표 비중 또는 집중 기준선 %
  label: string              // UI 표시용 한국어 제목
  description: string        // 1줄 설명
}

export interface Action {
  ticker: string
  name: string
  action: 'buy' | 'sell'
  quantity: number           // floor() 정수
  estimatedAmount: number    // 원
  taxEstimate?: number       // 해외주식 매도 차익세 (원), 없으면 undefined
}

export interface DiagnosisResult {
  problems: Problem[]        // 빈 배열 → "포트폴리오 양호"
  actions: Action[]
  currentAllocation: Record<AllocationBucket, number>  // 실제 %
  targetAllocation: TargetAllocation
  totalValue: number
}

// sessionStorage keys
export const SESSION_KEYS = {
  RAW_POSITIONS: 'pd_positions',       // OCR 직후 원본 (PortfolioPosition[])
  CONFIRMED: 'pd_confirmed_positions', // 확인 완료 (PortfolioPosition[])
  CASH: 'pd_cash_amount',              // 확인 화면 수동 입력 현금
  TARGET: 'pd_target',                 // TargetAllocation
  DIAGNOSIS: 'pd_diagnosis',           // DiagnosisResult
  INVESTOR_PROFILE: 'pd_investor_profile', // InvestorProfile
} as const

// 투자 성향 위저드
export type StyleKey = 'stable' | 'balanced' | 'growth' | 'aggressive'

export interface InvestorProfile {
  currentStyle: StyleKey  // OCR 포트폴리오에서 추론
  desiredStyle: StyleKey  // 유저가 프리셋 카드로 선택
}
