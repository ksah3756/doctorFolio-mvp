// src/components/ProblemCard.tsx
import type { Problem } from '@/lib/types'
import styles from './ProblemCard.module.css'

interface Props {
  problem: Problem
  index: number
}

export function ProblemCard({ problem, index }: Props) {
  const num = String(index + 1).padStart(2, '0')
  const isRed = problem.severity === 'high'

  return (
    <article
      className={`${styles.card} ${isRed ? styles.red : styles.amber}`}
      role="article"
      aria-label={`진단 항목 ${index + 1}`}
    >
      <div className={styles.num}>{num} · {problem.type === 'drift' ? '자산 배분' : problem.type === 'concentration_stock' ? '단일 종목' : '섹터 집중'}</div>
      <div className={styles.title}>{problem.label}</div>
      <div className={styles.numbers}>
        <span className={`${styles.current} ${isRed ? styles.currentRed : styles.currentAmber}`}>
          {problem.current}%
        </span>
        <span className={styles.arrow}>→</span>
        <span className={styles.target}>{problem.target}%</span>
        <span className={styles.targetNote}>{problem.type === 'concentration_stock' ? '이하 권장' : '목표'}</span>
      </div>
      <p className={styles.desc}>{problem.description}</p>
    </article>
  )
}
