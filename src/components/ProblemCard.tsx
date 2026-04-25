// src/components/ProblemCard.tsx
import type { Problem } from '@/lib/types'
import styles from './ProblemCard.module.css'

interface Props {
  problem: Problem
  index: number
}

function getCategoryLabel(problem: Problem): string {
  if (problem.type === 'drift') return '자산 편중'
  if (problem.type === 'concentration_stock') return '단일 종목 집중'
  return '섹터 집중'
}

function getTargetLabel(problem: Problem): string {
  if (problem.type === 'drift') return '목표'
  if (problem.type === 'concentration_stock') return '이하 권장'
  return '적정 상한'
}


export function ProblemCard({ problem, index }: Props) {
  const num = String(index + 1).padStart(2, '0')
  const isRed = problem.severity === 'high'
  const badgeClass = isRed ? styles.badgeHigh : styles.badgeMedium
  const dotClass = isRed ? styles.dotHigh : styles.dotMedium

  return (
    <article
      className={`${styles.card} ${isRed ? styles.red : styles.amber}`}
      role="article"
      aria-label={`진단 항목 ${index + 1}`}
    >
      <div className={`${styles.badge} ${badgeClass}`}>
        <span className={`${styles.dot} ${dotClass}`} aria-hidden="true" />
        <span>{num} · {getCategoryLabel(problem)}</span>
      </div>
      <div className={styles.title}>{problem.label}</div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>현재</span>
          <strong className={`${styles.metricValue} ${isRed ? styles.currentRed : styles.currentAmber}`}>
            {problem.current}%
          </strong>
        </div>
        <div className={styles.metricDivider} aria-hidden="true" />
        <div className={styles.metric}>
          <span className={styles.metricLabel}>{getTargetLabel(problem)}</span>
          <strong className={styles.metricValue}>{problem.target}%</strong>
        </div>
      </div>

      <p className={styles.desc}>{problem.description}</p>
    </article>
  )
}
