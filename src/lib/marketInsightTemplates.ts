export type MarketZone =
  | 'ideal_entry'
  | 'risk_but_opportunity'
  | 'risk_first'
  | 'stable_but_expensive'
  | 'cautious_opportunity'
  | 'early_risk'
  | 'overheated'
  | 'neutral'
  | 'mixed'

export type MarketInsightResult = {
  zone: MarketZone
  title: string
  message: string
}

type TemplateSet = {
  title: string
  messages: string[]
}

const MARKET_INSIGHT_TEMPLATES: Record<MarketZone, TemplateSet> = {
  ideal_entry: {
    title: '분할 진입 검토',
    messages: [
      '시장 환경이 안정적이고 가격 매력도도 괜찮은 상태예요. 종목별로 분할 진입을 검토하기 좋은 구간이에요.',
      '리스크가 크지 않으면서 투자 기회도 있는 구간이에요. 무리하지 않는 선에서 천천히 접근해볼 수 있어요.',
      '시장 흐름이 안정적인 가운데 일부 종목은 매력적인 가격대를 보이고 있어요. 점진적으로 접근하기 좋아요.',
    ],
  },
  risk_but_opportunity: {
    title: '위험하지만 기회 있음',
    messages: [
      '시장은 불안하지만 가격 매력은 올라온 상태예요. 좋은 종목을 나눠서 접근해볼 수 있는 구간이에요.',
      '시장 변동성은 크지만 일부 지표는 기회를 보여주고 있어요. 한 번에 들어가기보다 분할 전략이 어울려요.',
      '시장 분위기는 좋지 않지만 장기적으로는 기회를 만들 수 있는 구간이에요. 서두르지 말고 천천히 접근해보세요.',
    ],
  },
  risk_first: {
    title: '리스크 관리 우선',
    messages: [
      '시장 불안이 크고 가격 매력도도 부족한 상태예요. 지금은 기회보다 리스크 관리가 더 중요한 구간이에요.',
      '시장과 가격 모두 부담이 있는 구간이에요. 성급한 진입보다는 관망이 더 나은 선택일 수 있어요.',
      '변동성과 리스크가 동시에 높은 상태예요. 신규 투자보다는 상황을 지켜보는 게 좋아요.',
    ],
  },
  stable_but_expensive: {
    title: '안정적이지만 가격 부담',
    messages: [
      '시장은 안정적이지만 가격 부담이 있는 구간이에요. 추격 매수보다는 신중한 접근이 필요해요.',
      '시장 분위기는 나쁘지 않지만 이미 많이 반영된 상태일 수 있어요. 진입 타이밍은 조금 더 기다려도 좋아요.',
      '리스크는 크지 않지만 기대가 많이 반영된 상태예요. 무리한 진입은 피하는 게 좋아요.',
    ],
  },
  cautious_opportunity: {
    title: '조심스러운 기회',
    messages: [
      '시장 방향은 아직 뚜렷하지 않지만 가격 매력은 있는 상태예요. 분할 접근으로 기회를 노려볼 수 있어요.',
      '시장 흐름은 애매하지만 일부 종목은 매력적인 가격대에 있어요. 신중하게 접근해보세요.',
      '확실한 상승장은 아니지만 진입 매력은 조금씩 생기고 있어요. 작은 비중부터 살펴볼 수 있어요.',
    ],
  },
  early_risk: {
    title: '신중한 관망',
    messages: [
      '시장 흐름이 불안정해지는 초기 구간이에요. 지금은 서두르기보다 상황을 지켜보는 게 좋아요.',
      '가격 매력도 부족하고 시장도 방향이 애매한 상태예요. 무리한 진입은 피하는 게 좋아요.',
      '아직 유리한 진입 구간으로 보기는 어려워요. 리스크가 더 커지는지 확인이 필요해요.',
    ],
  },
  overheated: {
    title: '과열 주의',
    messages: [
      '시장이 과하게 낙관적인 상태예요. 가격 부담이 큰 구간이라 추격 매수는 주의가 필요해요.',
      '시장 기대감이 많이 반영된 상태예요. 지금은 진입보다 리스크를 점검하는 게 좋아요.',
      '상승 흐름은 있지만 과열 가능성이 높은 구간이에요. 신중하게 접근해야 해요.',
    ],
  },
  neutral: {
    title: '중립 구간',
    messages: [
      '시장과 가격 모두 뚜렷한 방향이 보이지 않는 구간이에요. 조금 더 흐름을 확인하는 게 좋아요.',
      '지금은 특별히 유리하거나 불리하지 않은 상태예요. 종목별로 신중하게 접근하는 게 중요해요.',
      '전체 시장보다는 개별 종목의 가격 위치와 추세를 더 꼼꼼히 보는 게 좋아요.',
    ],
  },
  mixed: {
    title: '혼합 신호',
    messages: [
      '시장과 가격이 서로 엇갈린 신호를 보이고 있어요. 조금 더 명확한 흐름이 나올 때까지 기다려도 좋아요.',
      '지표들이 같은 방향을 가리키지 않는 구간이에요. 성급한 판단은 피하는 게 좋아요.',
      '일부 지표는 긍정적이지만 다른 지표는 아직 조심스럽다는 신호를 보내고 있어요.',
    ],
  },
}

function pickDeterministic<T>(items: T[], seed: number): T {
  const index = Math.abs(Math.round(seed)) % items.length
  return items[index]
}

export function getMarketZone(entryScore: number, healthScore: number): MarketZone {
  const entryHigh = entryScore >= 75
  const entryGood = entryScore >= 60
  const entryNeutral = entryScore >= 45
  const entryLow = entryScore < 45
  const entryVeryLow = entryScore < 30
  const healthHigh = healthScore >= 75
  const healthGood = healthScore >= 60
  const healthNeutral = healthScore >= 45
  const healthLow = healthScore < 45
  const healthVeryLow = healthScore < 30

  if ((healthHigh || healthGood) && (entryHigh || entryGood)) {
    return 'ideal_entry'
  }

  if ((healthLow || healthVeryLow) && (entryHigh || entryGood)) {
    return 'risk_but_opportunity'
  }

  if ((healthLow || healthVeryLow) && entryLow) {
    return 'risk_first'
  }

  if ((healthHigh || healthGood) && entryLow) {
    if (entryVeryLow) return 'overheated'
    return 'stable_but_expensive'
  }

  if (healthNeutral && (entryHigh || entryGood)) {
    return 'cautious_opportunity'
  }

  if (healthNeutral && entryLow) {
    return 'early_risk'
  }

  if (entryNeutral && healthNeutral) {
    return 'neutral'
  }

  return 'mixed'
}

export function buildMarketInsight(entryScore: number, healthScore: number): MarketInsightResult {
  const zone = getMarketZone(entryScore, healthScore)
  const template = MARKET_INSIGHT_TEMPLATES[zone]

  return {
    zone,
    title: template.title,
    message: pickDeterministic(
      template.messages,
      entryScore * 13 + healthScore * 7,
    ),
  }
}
