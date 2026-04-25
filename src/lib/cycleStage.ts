import type { MarketResponse } from './marketSignals'

const CYCLE_STAGES = ['회복', '확장', '둔화', '침체'] as const

export type CycleStage = {
  accentClassName: 'accentGreen' | 'accentNavy' | 'accentAmber' | 'accentRed'
  caption: string
  description: string
  label: typeof CYCLE_STAGES[number]
  point: { x: number; y: number }
  progress: number
  summary: string
}

export function deriveCycleStage(market: MarketResponse): CycleStage {
  const healthScore = market.overview.health.score
  const entryGuide = market.overview.entry.guide
  const stageIndex = healthScore >= 75 ? 1 : healthScore >= 55 ? 0 : healthScore >= 35 ? 2 : 3
  const label = CYCLE_STAGES[stageIndex]
  const captions = ['회복 초입 국면', '확장 지속 국면', '둔화 초입 국면', '침체 방어 국면'] as const
  const descriptions = [
    '시장 구조가 서서히 회복되며 위험자산을 다시 점검해볼 수 있는 구간입니다.',
    '시장 구조가 비교적 안정적이라 공격 자산이 힘을 받기 쉬운 구간입니다.',
    '현재 시장은 둔화 초입 국면으로 추정됩니다.',
    '시장 전반의 방어 심리가 강해 보수적인 비중 관리가 필요한 구간입니다.',
  ] as const
  const accentClassNames = ['accentGreen', 'accentNavy', 'accentAmber', 'accentRed'] as const
  const progress = [0.22, 0.48, 0.74, 1] as const

  return {
    accentClassName: accentClassNames[stageIndex],
    caption: captions[stageIndex],
    description: descriptions[stageIndex],
    label,
    point: polarToCartesian(progress[stageIndex]),
    progress: progress[stageIndex],
    summary: entryGuide,
  }
}

function polarToCartesian(progress: number) {
  const clamped = Math.min(Math.max(progress, 0), 1)
  const radius = 48
  const centerX = 58
  const centerY = 58
  const angle = Math.PI * (1 - clamped)

  return {
    x: centerX + (radius * Math.cos(angle)),
    y: centerY - (radius * Math.sin(angle)),
  }
}
