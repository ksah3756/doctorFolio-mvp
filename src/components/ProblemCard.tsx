// src/components/ProblemCard.tsx
import type { Problem } from '@/lib/types'
import styles from './ProblemCard.module.css'

interface Props {
  problem: Problem
  index: number
}

function getCategoryLabel(problem: Problem): string {
  if (problem.type === 'drift') return '자산 배분'
  if (problem.type === 'concentration_stock') return '단일 종목'
  return '섹터 집중'
}

function getTargetLabel(problem: Problem): string {
  return problem.type === 'drift' ? '목표' : '기준선'
}

function formatPercent(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

function getDeltaCopy(problem: Problem): string {
  const diff = Math.round(Math.abs(problem.current - problem.target))

  if (problem.type === 'drift') {
    return problem.current > problem.target
      ? `목표보다 ${diff}%p 높음`
      : `목표보다 ${diff}%p 낮음`
  }

  return `${getTargetLabel(problem)}보다 ${diff}%p 높음`
}

function getAssetLabel(problem: Problem): string {
  if (problem.type === 'drift' && problem.assetClass) {
    return problem.assetClass
  }

  if (problem.type === 'concentration_stock') {
    return '단일 종목'
  }

  return '단일 섹터'
}

function getRecommendationLines(problem: Problem): string[] {
  const current = formatPercent(problem.current)
  const target = formatPercent(problem.target)

  if (problem.type === 'drift') {
    const assetLabel = getAssetLabel(problem)

    if (problem.current < problem.target) {
      const followUp = assetLabel === '채권'
        ? '신규 자금을 우선 배분하거나 변동성이 큰 자산 일부를 줄여 천천히 맞추는 방법이 있습니다.'
        : `${assetLabel} 노출을 신규 자금이나 분할 매수로 보완하는 방법이 있습니다.`

      return [
        `${assetLabel} 비중을 현재 ${current}% → 약 ${target}% 수준까지 늘리는 것이 적절합니다.`,
        followUp,
      ]
    }

    const followUp = assetLabel.includes('주식')
      ? '주식 비중이 높은 상태이므로 일부를 줄이거나 신규 자금을 활용하는 방법이 있습니다.'
      : `${assetLabel} 비중이 높은 상태이므로 다른 자산군으로 천천히 분산하는 것이 좋습니다.`

    return [
      `${assetLabel} 비중을 현재 ${current}% → 약 ${target}% 수준까지 낮추는 것이 적절합니다.`,
      followUp,
    ]
  }

  if (problem.type === 'concentration_stock') {
    return [
      `단일 종목 비중을 현재 ${current}% → ${target}% 이하 수준으로 낮추는 것이 적절합니다.`,
      '비슷한 역할의 ETF나 다른 종목으로 나눠 담아 변동성을 줄이는 방법이 있습니다.',
    ]
  }

  return [
    `단일 섹터 비중을 현재 ${current}% → ${target}% 이하 수준으로 낮추는 것이 적절합니다.`,
    '같은 주식 비중 안에서도 다른 섹터로 분산하면 편중을 줄일 수 있습니다.',
  ]
}

export function ProblemCard({ problem, index }: Props) {
  const num = String(index + 1).padStart(2, '0')
  const isRed = problem.severity === 'high'
  const recommendationLines = getRecommendationLines(problem)

  return (
    <article
      className={`${styles.card} ${isRed ? styles.red : styles.amber}`}
      role="article"
      aria-label={`진단 항목 ${index + 1}`}
    >
      <div className={styles.top}>
        <div>
          <div className={styles.num}>{num} · {getCategoryLabel(problem)}</div>
          <div className={styles.title}>{problem.label}</div>
        </div>
        <span className={`${styles.severityBadge} ${isRed ? styles.severityHigh : styles.severityMedium}`}>
          {isRed ? '고위험' : '주의'}
        </span>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>현재</span>
          <strong className={`${styles.metricValue} ${isRed ? styles.currentRed : styles.currentAmber}`}>
            {problem.current}%
          </strong>
        </div>
        <div className={`${styles.deltaBadge} ${isRed ? styles.deltaHigh : styles.deltaMedium}`}>
          {getDeltaCopy(problem)}
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>{getTargetLabel(problem)}</span>
          <strong className={styles.metricValue}>{problem.target}%</strong>
        </div>
      </div>

      <p className={styles.desc}>{problem.description}</p>
      <ul className={styles.recommendations} aria-label={`${getAssetLabel(problem)} 개선 방향`}>
        {recommendationLines.map(line => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </article>
  )
}
