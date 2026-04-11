'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PRESETS, inferStyleKey } from '@/lib/investorProfile'
import { DEFAULT_TARGET, SESSION_KEYS } from '@/lib/types'
import type { StyleKey, PortfolioPosition } from '@/lib/types'
import styles from './page.module.css'

const STYLE_KEYS: StyleKey[] = ['stable', 'balanced', 'growth', 'aggressive']

function getAllocationDesc(positions: PortfolioPosition[]): string {
  const total = positions.reduce((s, p) => s + p.value, 0)
  if (total === 0) return '포트폴리오를 분석했어요'

  const stockValue = positions
    .filter(p => p.assetClass === '국내주식' || p.assetClass === '해외주식')
    .reduce((s, p) => s + p.value, 0)
  const bondValue = positions
    .filter(p => p.assetClass === '채권')
    .reduce((s, p) => s + p.value, 0)

  const stockPct = Math.round((stockValue / total) * 100)
  const bondPct = Math.round((bondValue / total) * 100)

  if (bondPct >= 60) return `채권 비중 ${bondPct}%, 안정 위주로 운용 중이에요`
  if (stockPct >= 85) return `주식 비중 ${stockPct}%, 공격적으로 투자 중이에요`
  if (stockPct >= 65) return `주식 비중 ${stockPct}%, 성장 중심으로 투자 중이에요`
  return `주식 ${stockPct}% · 채권 ${bondPct}%, 균형 있게 투자 중이에요`
}

export default function StylePage() {
  const router = useRouter()
  const [positions] = useState<PortfolioPosition[]>(() => {
    if (typeof window === 'undefined') return []
    const raw = sessionStorage.getItem(SESSION_KEYS.RAW_POSITIONS)
    return raw ? (JSON.parse(raw) as PortfolioPosition[]) : []
  })
  const [loaded] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(SESSION_KEYS.RAW_POSITIONS) !== null
  })
  const [selected, setSelected] = useState<StyleKey | null>(null)

  useEffect(() => {
    if (!loaded) router.replace('/')
  }, [loaded, router])

  if (!loaded) return null

  const currentStyle = inferStyleKey(positions)
  const currentPreset = PRESETS[currentStyle]
  const allocationDesc = getAllocationDesc(positions)
  const isSameStyle = selected === currentStyle

  function handleNext() {
    if (!selected) return
    sessionStorage.setItem(SESSION_KEYS.TARGET, JSON.stringify(PRESETS[selected].target))
    sessionStorage.setItem(
      SESSION_KEYS.INVESTOR_PROFILE,
      JSON.stringify({ currentStyle, desiredStyle: selected }),
    )
    router.push('/confirm')
  }

  function handleSkip() {
    sessionStorage.setItem(SESSION_KEYS.TARGET, JSON.stringify(DEFAULT_TARGET))
    router.push('/confirm')
  }

  return (
    <div className={styles.wrap}>
      <nav className="nav">
        <span className="logo">포트폴리오<em>·</em>닥터</span>
        <span className="nav-step">1 / 2</span>
      </nav>

      {/* 네이비 헤더 — 현재 성향 */}
      <div className={styles.header}>
        <div className={styles.eyebrow}>포트폴리오 분석 결과</div>
        <div className={styles.bigLabel}>
          <span className={styles.emoji}>{currentPreset.emoji}</span>
          {currentPreset.label}
        </div>
        <div className={styles.desc}>{allocationDesc}</div>
      </div>

      {/* 바디 — 목표 성향 선택 */}
      <div className={styles.body}>
        <div className={styles.sectionLabel}>앞으로 어떻게 투자하고 싶으세요?</div>

        {isSameStyle && (
          <div className={styles.sameBanner} role="status">
            지금 투자 방향이 목표와 일치해요 👍
          </div>
        )}

        <div className={styles.cardWrap}>
        <div
          className={styles.cardTrack}
          role="radiogroup"
          aria-label="투자 성향 선택"
        >
          {STYLE_KEYS.map(key => {
            const p = PRESETS[key]
            const isSelected = selected === key
            return (
              <button
                key={key}
                role="radio"
                aria-checked={isSelected}
                aria-label={`${p.label}: ${p.desc}. 국내 ${p.target['국내주식']}, 해외 ${p.target['해외주식']}, 채권 ${p.target['채권']}`}
                className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                onClick={() => setSelected(key)}
              >
                {isSelected && <span className={styles.check} aria-hidden="true">✓</span>}
                <span className={styles.cardEmoji}>{p.emoji}</span>
                <span className={styles.cardLabel}>{p.label}</span>
                <span className={styles.cardDesc}>{p.desc}</span>
                <span className={styles.cardAlloc}>
                  국내 {p.target['국내주식']} · 해외 {p.target['해외주식']} · 채권 {p.target['채권']}
                </span>
              </button>
            )
          })}
        </div>
        </div>

        <div className="fixed-cta">
          <button
            className="btn-primary"
            disabled={!selected}
            onClick={handleNext}
          >
            다음 →
          </button>
          <button className={styles.skipBtn} onClick={handleSkip}>
            건너뛰기 (기본값 사용)
          </button>
        </div>
      </div>
    </div>
  )
}
