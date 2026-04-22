import Link from 'next/link'
import { formatMacroStateLabel, type MarketResponse } from '@/lib/marketSignals'
import styles from './MarketBanner.module.css'

interface MarketBannerProps {
  error?: string | null
  loading?: boolean
  market: MarketResponse | null
}

export function MarketBanner({ error = null, loading = false, market }: MarketBannerProps) {
  const macroState = market?.macroState ?? 'neutral'
  const headline = error
    ? '거시 지표를 바로 불러오진 못했지만 /market 페이지에서 다시 확인할 수 있어요.'
    : market?.headline ?? '거시 지표를 모으는 중이라 잠시만 기다려 주세요.'

  return (
    <section className={styles.banner}>
      <div className={styles.copy}>
        <div className={styles.eyebrow}>Macro Overlay</div>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>오늘 시장 온도</h2>
          <span className={`${styles.badge} ${styles[`badge_${loading ? 'loading' : macroState}`]}`}>
            {loading ? '불러오는 중' : formatMacroStateLabel(macroState)}
          </span>
        </div>
        <p className={styles.summary}>{headline}</p>
      </div>

      <Link className={styles.link} href="/market">
        거시 지표 자세히 보기
      </Link>
    </section>
  )
}
