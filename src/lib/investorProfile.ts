// src/lib/investorProfile.ts
import type { PortfolioPosition, StyleKey, TargetAllocation } from './types'

export interface Preset {
  label: string
  emoji: string
  desc: string
  target: TargetAllocation
}

export const PRESETS: Record<StyleKey, Preset> = {
  stable: {
    label: '안정형',
    emoji: '🛡️',
    desc: '원금 지키는 게 제일 중요해요',
    target: { '국내주식': 20, '해외주식': 10, '채권': 70 },
  },
  balanced: {
    label: '균형형',
    emoji: '⚖️',
    desc: '어느 정도 손실은 괜찮아요',
    target: { '국내주식': 30, '해외주식': 20, '채권': 50 },
  },
  growth: {
    label: '성장형',
    emoji: '🚀',
    desc: '장기적으로 크게 키울래요',
    target: { '국내주식': 40, '해외주식': 30, '채권': 30 },
  },
  aggressive: {
    label: '공격형',
    emoji: '⚡',
    desc: '리스크 감수하고 최대로',
    target: { '국내주식': 55, '해외주식': 35, '채권': 10 },
  },
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
  // stable(20/10/70): bond>60% → stable
  // balanced(30/20/50): bond=50% → balanced
  // growth(40/30/30): stock=70% → growth
  // aggressive(55/35/10): stock=90% → aggressive
  if (bondPct > 0.6) return 'stable'
  if (stockPct >= 0.85) return 'aggressive'
  if (stockPct >= 0.65) return 'growth'
  return 'balanced'
}
