'use client'

import { useState } from 'react'
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
  const [open, setOpen] = useState(false)
  const [techOpen, setTechOpen] = useState(false)

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className={styles.toggleLeft}>
          <h2 className={styles.title}>{indicator.label}</h2>
          <p className={`${styles.summary} ${open ? '' : styles.summaryClamp}`}>
            {indicator.summary}
          </p>
        </div>
        <div className={styles.toggleRight}>
          <span className={`${styles.badge} ${styles[`badge_${indicator.status}`]}`}>
            {STATUS_LABEL[indicator.status]}
          </span>
          <span className={`${styles.arrow} ${open ? styles.arrowOpen : ''}`}>▾</span>
        </div>
      </button>

      {open && (
        <div className={styles.body}>
          <p className={styles.guide}>{indicator.guide}</p>
          <button
            type="button"
            className={styles.techToggle}
            onClick={() => setTechOpen(o => !o)}
          >
            <span className={`${styles.techArrow} ${techOpen ? styles.techArrowOpen : ''}`}>▸</span>
            <span>실제 지표 수치 보기 (금리차, 스프레드 등)</span>
          </button>
          {techOpen && (
            <div className={styles.techBox}>
              <div className={styles.techValue}>{indicator.value}</div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
