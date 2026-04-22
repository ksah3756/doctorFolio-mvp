import type { MacroState } from './marketSignals'
import type { TradingRecommendation, TradingSignal } from './tradingSignals'

export type FinalJudgmentKey = 'accumulate' | 'wait' | 'caution'

export interface FinalJudgment {
  key: FinalJudgmentKey
  label: '분할매수' | '관망' | '주의'
  summary: string
}

type MicroStrength = 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell'

export function resolveFinalJudgment(
  macroState: MacroState,
  signal: Pick<TradingSignal, 'companyName' | 'recommendation' | 'score'>,
): FinalJudgment {
  const microStrength = resolveMicroStrength(signal.recommendation, signal.score)

  if (macroState === 'risk_on') {
    if (microStrength === 'strong_buy' || microStrength === 'buy') {
      return {
        key: 'accumulate',
        label: '분할매수',
        summary: `${signal.companyName}은(는) 종목 신호와 시장 분위기가 같이 받쳐줘서 한 번에 몰지 말고 나눠 담는 판단이 맞아요.`,
      }
    }

    if (microStrength === 'neutral') {
      return {
        key: 'wait',
        label: '관망',
        summary: `${signal.companyName}은(는) 시장 바람은 괜찮지만 종목 신호가 아직 애매해 조금 더 확인하는 편이 좋아요.`,
      }
    }
  }

  if (macroState === 'neutral') {
    if (microStrength === 'strong_buy') {
      return {
        key: 'accumulate',
        label: '분할매수',
        summary: `${signal.companyName}은(는) 시장은 중립이지만 종목 신호가 강해서 천천히 나눠 접근해볼 수 있어요.`,
      }
    }

    if (microStrength === 'buy' || microStrength === 'neutral') {
      return {
        key: 'wait',
        label: '관망',
        summary: `${signal.companyName}은(는) 종목과 시장 중 하나가 확실히 강하진 않아 서두르지 않는 편이 좋아요.`,
      }
    }
  }

  if (macroState === 'risk_off' && (microStrength === 'strong_buy' || microStrength === 'buy')) {
    return {
      key: 'wait',
      label: '관망',
      summary: `${signal.companyName}은(는) 종목 신호는 괜찮아도 시장이 Risk-Off라 반등 확인 전까지 기다리는 편이 안전해요.`,
    }
  }

  return {
    key: 'caution',
    label: '주의',
    summary: `${signal.companyName}은(는) 지금은 시장 흐름이나 종목 신호가 받쳐주지 않아 진입을 서두르지 않는 편이 좋아요.`,
  }
}

function resolveMicroStrength(recommendation: TradingRecommendation, score: number): MicroStrength {
  if (recommendation === 'buy') {
    return score >= 3 ? 'strong_buy' : 'buy'
  }

  if (recommendation === 'sell') {
    return score <= -3 ? 'strong_sell' : 'sell'
  }

  return 'neutral'
}
