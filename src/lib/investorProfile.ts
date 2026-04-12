// src/lib/investorProfile.ts
import type { PortfolioPosition, StyleKey, TargetAllocation } from './types'

export interface Preset {
  label: string
  emoji: string
  desc: string
  target: TargetAllocation
}

export interface QuizChoice {
  label: string
  score: number
}

export interface QuizQuestion {
  question: string
  choices: QuizChoice[]
}

export const PRESETS: Record<StyleKey, Preset> = {
  stable: {
    label: '안정형',
    emoji: '🛡️',
    desc: '원금 지키는 게 제일 중요해요',
    target: { '국내주식': 20, '해외주식': 10, '채권': 55, '현금': 15 },
  },
  balanced: {
    label: '균형형',
    emoji: '⚖️',
    desc: '어느 정도 손실은 괜찮아요',
    target: { '국내주식': 30, '해외주식': 20, '채권': 40, '현금': 10 },
  },
  growth: {
    label: '성장형',
    emoji: '🚀',
    desc: '장기적으로 크게 키울래요',
    target: { '국내주식': 40, '해외주식': 30, '채권': 25, '현금': 5 },
  },
  aggressive: {
    label: '공격형',
    emoji: '⚡',
    desc: '리스크 감수하고 최대로',
    target: { '국내주식': 55, '해외주식': 35, '채권': 10, '현금': 0 },
  },
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: '투자한 금액이 -20% 하락했을 때 어떻게 하시겠어요?',
    choices: [
      { label: '추가 매수 기회라고 생각하고 더 투자해요', score: 2 },
      { label: '상황을 지켜보며 일부만 더 담아요', score: 1 },
      { label: '일단 유지하면서 시장을 관찰해요', score: 0 },
      { label: '손실이 더 커지기 전에 빠르게 줄여요', score: -2 },
    ],
  },
  {
    question: '투자의 가장 큰 목적은 무엇인가요?',
    choices: [
      { label: '장기적으로 자산을 크게 불리는 것', score: 2 },
      { label: '물가보다 높은 수익을 꾸준히 얻는 것', score: 1 },
      { label: '원금 보전과 수익의 균형을 맞추는 것', score: 0 },
      { label: '당장 필요한 자금을 안전하게 지키는 것', score: -1 },
    ],
  },
  {
    question: '투자 자금을 언제 사용할 계획인가요?',
    choices: [
      { label: '10년 이상 장기로 둘 수 있어요', score: 2 },
      { label: '3년 이상은 유지할 수 있어요', score: 1 },
      { label: '1~3년 안에는 쓸 수도 있어요', score: 0 },
      { label: '1년 이내에 사용할 가능성이 커요', score: -1 },
    ],
  },
  {
    question: '어떤 포트폴리오가 더 편안하게 느껴지나요?',
    choices: [
      { label: '주식 비중이 높아도 성장 기대가 크면 괜찮아요', score: 2 },
      { label: '주식과 채권이 고르게 섞인 구성이 좋아요', score: 1 },
      { label: '채권과 현금이 많은 안정적인 구성이 좋아요', score: 0 },
    ],
  },
  {
    question: '자산 가치가 자주 크게 변동하는 상황이 어떤가요?',
    choices: [
      { label: '오히려 자연스러운 과정이라 크게 신경 쓰지 않아요', score: 2 },
      { label: '부담은 있지만 감당할 수 있어요', score: 1 },
      { label: '가능하면 변동이 적었으면 좋겠어요', score: 0 },
      { label: '스트레스가 커서 피하고 싶어요', score: -2 },
    ],
  },
]

export function scoreToStyleKey(score: number): StyleKey {
  if (score >= 7) return 'aggressive'
  if (score >= 3) return 'growth'
  if (score >= 0) return 'balanced'
  return 'stable'
}

export function inferStyleKey(positions: PortfolioPosition[]): StyleKey {
  if (positions.length === 0) return 'balanced'

  const total = positions.reduce((s, p) => s + p.value, 0)
  if (total === 0) return 'balanced'

  const bondValue = positions
    .filter(p => p.assetClass === '채권')
    .reduce((s, p) => s + p.value, 0)
  const foreignValue = positions
    .filter(p => p.assetClass === '해외주식')
    .reduce((s, p) => s + p.value, 0)
  const stockValue = positions
    .filter(p => p.assetClass === '국내주식' || p.assetClass === '해외주식')
    .reduce((s, p) => s + p.value, 0)

  const bondPct = bondValue / total
  const foreignPct = foreignValue / total
  const stockPct = stockValue / total

  // 임계값은 각 프리셋 target이 자기 자신으로 round-trip되도록 설정
  // stable(20/10/55/15): bond=55% → stable
  // balanced(30/20/40/10): bond=40% → balanced
  // growth(40/30/25/5): stock=70% → growth
  // aggressive(55/35/10/0): stock=90% → aggressive
  if (bondPct >= 0.55) return 'stable'
  if (stockPct >= 0.85) return 'aggressive'
  if (stockPct >= 0.65) return 'growth'
  return 'balanced'
}
