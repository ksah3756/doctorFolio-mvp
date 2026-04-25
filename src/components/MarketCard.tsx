'use client'

import type { JSX } from 'react'
import { useState } from 'react'
import type { MarketIndicator, MarketIndicatorStatus } from '@/lib/marketSignals'
import styles from './MarketCard.module.css'

interface MarketCardProps {
  indicator: MarketIndicator
}

type IndicatorContent = {
  description: string
  icon: JSX.Element
  title: string
}

const STATUS_LABEL: Record<MarketIndicatorStatus, string> = {
  negative: '주의',
  neutral: '보통',
  positive: '긍정',
  unavailable: '대기',
}

const INDICATOR_CONTENT: Record<MarketIndicator['key'], IndicatorContent> = {
  fearGreed: {
    description: '지금 투자자들이 겁먹고 있나요, 아니면 과하게 낙관하고 있나요?',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M10 3C10 3 4 7 4 12A6 6 0 0 0 16 12C16 7 10 3 10 3Z"
          stroke="currentColor"
          strokeWidth="1.6"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M7 13S8 11 10 11S13 13 13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11" r="1" fill="currentColor" />
        <circle cx="12" cy="11" r="1" fill="currentColor" />
      </svg>
    ),
    title: '시장 심리',
  },
  yieldCurve: {
    description: '앞으로 경기가 좋아질까요, 나빠질까요?',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <rect x="9" y="5" width="2" height="6" rx="1" fill="currentColor" />
        <rect x="9" y="13" width="2" height="2" rx="1" fill="currentColor" />
      </svg>
    ),
    title: '경기 신호등',
  },
  erp: {
    description: '지금 주식이 채권보다 더 매력적인가요?',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="3" y="13" width="5" height="3" rx="1" fill="rgba(226,77,77,0.18)" stroke="currentColor" strokeWidth="1.2" />
        <rect x="12" y="10" width="5" height="6" rx="1" fill="rgba(226,77,77,0.18)" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
    title: '주식 vs 채권 매력도',
  },
  creditSpread: {
    description: '기업들이 돈을 갚지 못할 위험이 높아지고 있나요?',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M10 3L17 7V12C17 15 14 17 10 18C6 17 3 15 3 12V7L10 3Z"
          stroke="currentColor"
          strokeWidth="1.6"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: '기업 부도 위험',
  },
  m2: {
    description: '시장에 돈이 충분히 돌고 있나요?',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <path d="M10 5V3M7 6L5.5 4.5M13 6L14.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path
          d="M8 11C8 9.9 8.9 9 10 9S12 9.9 12 11S11.1 12 10 12S8 12.1 8 13C8 14.1 8.9 15 10 15S12 14.1 12 13"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: '시중 돈의 양',
  },
}

export const MARKET_CARD_TITLES: Record<MarketIndicator['key'], string> = {
  fearGreed: INDICATOR_CONTENT.fearGreed.title,
  yieldCurve: INDICATOR_CONTENT.yieldCurve.title,
  erp: INDICATOR_CONTENT.erp.title,
  creditSpread: INDICATOR_CONTENT.creditSpread.title,
  m2: INDICATOR_CONTENT.m2.title,
}

export function MarketCard({ indicator }: MarketCardProps) {
  const [open, setOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const content = INDICATOR_CONTENT[indicator.key]

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
      >
        <div className={`${styles.iconWrap} ${styles[`iconWrap_${indicator.status}`]}`}>
          <span className={`${styles.icon} ${styles[`icon_${indicator.status}`]}`}>{content.icon}</span>
        </div>

        <div className={styles.copy}>
          <h2 className={styles.title}>{content.title}</h2>
          <p className={styles.description}>{content.description}</p>
        </div>

        <div className={styles.right}>
          <span className={`${styles.badge} ${styles[`badge_${indicator.status}`]}`}>
            {STATUS_LABEL[indicator.status]}
          </span>
          <span className={`${styles.arrow} ${open ? styles.arrowOpen : ''}`}>▾</span>
        </div>
      </button>

      {open && (
        <div className={styles.body}>
          <div className={styles.note}>
            <p className={styles.noteText}>{indicator.summary}</p>
          </div>

          <button
            type="button"
            className={styles.detailToggle}
            onClick={() => setDetailOpen(prev => !prev)}
            aria-expanded={detailOpen}
          >
            <span className={styles.detailArrow}>{detailOpen ? '▾' : '▸'}</span>
            <span>실제 지표 수치 보기</span>
          </button>

          {detailOpen && (
            <div className={styles.metricBox}>
              <div className={styles.metricTitle}>{indicator.detailTitle}</div>
              <div className={styles.metricSource}>{indicator.detailSource}</div>
              <div className={styles.metricValue}>{indicator.detailValue}</div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
