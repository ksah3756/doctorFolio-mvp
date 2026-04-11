// src/lib/mbti.ts
import type { PortfolioPosition } from './types'

export type MbtiType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP'

export type MbtiGroup = 'analyst' | 'diplomat' | 'sentinel' | 'explorer'

export interface MbtiProfile {
  type: MbtiType
  name: string
  group: MbtiGroup
  emoji: string
  desc: string
  investorTagline: string
}

export const MBTI_PROFILES: Record<MbtiType, MbtiProfile> = {
  INTJ: {
    type: 'INTJ', name: '전략가', group: 'analyst', emoji: '🦅',
    desc: '독립적이고 완벽주의적이며, 미래를 설계하는 데 능숙함.',
    investorTagline: '독립적 판단으로 장기 수익을 설계하는 전략적 투자자',
  },
  INTP: {
    type: 'INTP', name: '논리술사', group: 'analyst', emoji: '🔬',
    desc: '비판적인 관점을 가진 아이디어 뱅크, 조용하지만 분석적임.',
    investorTagline: '데이터와 논리로 최적 포트폴리오를 탐구하는 분석가',
  },
  ENTJ: {
    type: 'ENTJ', name: '통치자', group: 'analyst', emoji: '👑',
    desc: '결단력 있고 목표 지향적이며, 대담하게 팀을 이끄는 리더.',
    investorTagline: '높은 리스크를 감수하며 수익을 주도하는 공격적 투자 리더',
  },
  ENTP: {
    type: 'ENTP', name: '변론가', group: 'analyst', emoji: '⚡',
    desc: '지적 도전과 토론을 즐기며, 임기응변에 강한 혁신가.',
    investorTagline: '새로운 투자 아이디어로 시장 기회를 선점하는 혁신가',
  },
  INFJ: {
    type: 'INFJ', name: '옹호자', group: 'diplomat', emoji: '🌿',
    desc: '신비롭고 이상주의적이며, 통찰력이 깊고 원칙을 중시함.',
    investorTagline: '원칙과 신념에 따라 미래 가치에 투자하는 이상주의자',
  },
  INFP: {
    type: 'INFP', name: '중재자', group: 'diplomat', emoji: '🌙',
    desc: '상상력이 풍부하고 배려심이 깊으며, 자신의 가치관을 소중히 여김.',
    investorTagline: '성장 가능성을 꿈꾸며 가치 있는 기업을 찾는 낭만 투자자',
  },
  ENFJ: {
    type: 'ENFJ', name: '선도자', group: 'diplomat', emoji: '🌟',
    desc: '사교적이며 타인을 돕는 것에 보람을 느끼는 열정적인 리더.',
    investorTagline: '다양한 의견을 수렴해 균형 잡힌 포트폴리오를 구성하는 리더',
  },
  ENFP: {
    type: 'ENFP', name: '활동가', group: 'diplomat', emoji: '🎨',
    desc: '에너지가 넘치고 창의적이며, 사람들과 어울리는 것을 좋아함.',
    investorTagline: '직감과 열정으로 다양한 기회를 탐색하는 창의적 투자자',
  },
  ISTJ: {
    type: 'ISTJ', name: '청렴결백한 도덕주의자', group: 'sentinel', emoji: '🏛️',
    desc: '현실적이고 책임감이 강하며, 원칙과 질서를 철저히 지킴.',
    investorTagline: '검증된 자산에만 투자하는 원칙적 장기 투자자',
  },
  ISFJ: {
    type: 'ISFJ', name: '수호자', group: 'sentinel', emoji: '🛡️',
    desc: '온화하고 헌신적이며, 주변 사람들을 조용히 챙기는 따뜻한 성격.',
    investorTagline: '자산을 지키며 안정적으로 운용하는 든든한 수호자',
  },
  ESTJ: {
    type: 'ESTJ', name: '경영자', group: 'sentinel', emoji: '📊',
    desc: '실용적이고 추진력이 좋으며, 체계적인 관리에 탁월함.',
    investorTagline: '목표 수익률을 향해 체계적으로 관리하는 실용주의 투자자',
  },
  ESFJ: {
    type: 'ESFJ', name: '집정관', group: 'sentinel', emoji: '🤝',
    desc: '사교성이 뛰어나고 협동을 중시하며, 공동체의 조화를 추구함.',
    investorTagline: '시장 흐름을 따라 안정적인 선택을 하는 사교적 투자자',
  },
  ISTP: {
    type: 'ISTP', name: '장인', group: 'explorer', emoji: '🔧',
    desc: '도구 사용에 능하고 관찰력이 좋으며, 해결사 기질이 있음.',
    investorTagline: '기회가 왔을 때 집중적으로 투자하는 실용적 해결사',
  },
  ISFP: {
    type: 'ISFP', name: '모험가', group: 'explorer', emoji: '🎭',
    desc: '예술적인 감각이 있고 겸손하며, 현재의 삶을 즐기는 타입.',
    investorTagline: '리스크를 최소화하며 현재 가치에 집중하는 유연한 투자자',
  },
  ESTP: {
    type: 'ESTP', name: '사업가', group: 'explorer', emoji: '🚀',
    desc: '활동적이고 스릴을 즐기며, 문제를 즉각 해결하는 능력이 뛰어남.',
    investorTagline: '빠른 판단력으로 시장 기회를 포착하는 행동파 투자자',
  },
  ESFP: {
    type: 'ESFP', name: '연예인', group: 'explorer', emoji: '🎉',
    desc: '즉흥적이고 에너지가 넘치며, 주변 사람들을 즐겁게 만드는 분위기 메이커.',
    investorTagline: '시장의 흥미로운 종목을 쫓아 즐겁게 투자하는 자유로운 투자자',
  },
}

// 성장형 섹터 키워드 — 해당 섹터는 N(직관형) 축에 기여
const GROWTH_SECTOR_KEYWORDS = [
  '반도체', '인터넷', '바이오', '배터리', '신재생에너지',
  '전자', '소프트웨어', '테크', 'IT', 'AI', '클라우드',
]

function isGrowthSector(sector: string): boolean {
  return GROWTH_SECTOR_KEYWORDS.some(kw => sector.includes(kw))
}

export interface MbtiAxes {
  EI: 'E' | 'I'
  NS: 'N' | 'S'
  TF: 'T' | 'F'
  JP: 'J' | 'P'
}

export function inferMbtiAxes(positions: PortfolioPosition[]): MbtiAxes {
  if (positions.length === 0) {
    return { EI: 'I', NS: 'N', TF: 'F', JP: 'P' } // 빈 배열 → INFP
  }

  const total = positions.reduce((s, p) => s + p.value, 0)
  if (total === 0) return { EI: 'I', NS: 'N', TF: 'F', JP: 'P' }

  const foreignValue = positions
    .filter(p => p.assetClass === '해외주식')
    .reduce((s, p) => s + p.value, 0)
  const stockValue = positions
    .filter(p => p.assetClass === '국내주식' || p.assetClass === '해외주식')
    .reduce((s, p) => s + p.value, 0)

  const stockPositions = positions.filter(
    p => p.assetClass === '국내주식' || p.assetClass === '해외주식',
  )
  const growthCount = stockPositions.filter(p => isGrowthSector(p.sector)).length

  const foreignPct = (foreignValue / total) * 100
  const stockPct = (stockValue / total) * 100
  const growthRatio = stockPositions.length > 0 ? growthCount / stockPositions.length : 0

  return {
    EI: foreignPct >= 30 ? 'E' : 'I',
    NS: growthRatio >= 0.4 ? 'N' : 'S',
    TF: stockPct >= 60 ? 'T' : 'F',
    JP: positions.length <= 7 ? 'J' : 'P',
  }
}

export function inferMbtiType(positions: PortfolioPosition[]): MbtiType {
  const { EI, NS, TF, JP } = inferMbtiAxes(positions)
  return `${EI}${NS}${TF}${JP}` as MbtiType
}
