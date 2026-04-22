import type { MarketIndicator, MarketIndicatorStatus } from '@/lib/marketSignals'
import styles from './MarketCard.module.css'

interface MarketCardProps {
  indicator: MarketIndicator
}

const STATUS_LABEL: Record<MarketIndicatorStatus, string> = {
  negative: '경계',
  neutral: '중립',
  positive: '우호',
  unavailable: '대기',
}

export function MarketCard({ indicator }: MarketCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{indicator.label}</h2>
        <span className={`${styles.badge} ${styles[`badge_${indicator.status}`]}`}>
          {STATUS_LABEL[indicator.status]}
        </span>
      </div>

      <div className={styles.value}>{indicator.value}</div>
      <p className={styles.summary}>{indicator.summary}</p>
      <p className={styles.guide}>초보자 메모: {indicator.guide}</p>
    </article>
  )
}
