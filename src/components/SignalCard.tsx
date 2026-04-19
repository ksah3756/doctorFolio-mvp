import type { TradingRecommendation, TradingSignal } from '@/lib/tradingSignals'
import styles from './SignalCard.module.css'

interface SignalCardProps {
  signal: TradingSignal
}

const RECOMMENDATION_LABEL: Record<TradingRecommendation, string> = {
  buy: '매수 관점',
  neutral: '중립',
  sell: '매도 관점',
}

export function SignalCard({ signal }: SignalCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.marketRow}>
            <span className={styles.market}>{signal.market}</span>
            <span className={styles.ticker}>{signal.ticker}</span>
          </div>
          <h2 className={styles.name}>{signal.companyName}</h2>
        </div>
        <span className={`${styles.badge} ${styles[`badge_${signal.recommendation}`]}`}>
          {RECOMMENDATION_LABEL[signal.recommendation]}
        </span>
      </div>

      <p className={styles.headline}>{signal.headline}</p>

      <div className={styles.metricList}>
        {signal.metrics.map(metric => (
          <section key={metric.key} className={styles.metric}>
            <div className={styles.metricTop}>
              <span className={styles.metricLabel}>{metric.label}</span>
              <span className={`${styles.metricSignal} ${styles[`metricSignal_${metric.signal}`]}`}>
                {metric.value}
              </span>
            </div>
            <p className={styles.metricSummary}>{metric.summary}</p>
          </section>
        ))}
      </div>
    </article>
  )
}
