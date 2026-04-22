// src/app/diagnosis/page.tsx
'use client'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { ProblemCard } from '@/components/ProblemCard'
import { AllocationBar } from '@/components/AllocationBar'
import { ActionItem } from '@/components/ActionItem'
import { SectorPieChart } from '@/components/SectorPieChart'
import { ImprovementSheet } from '@/components/ImprovementSheet'
import { DIAGNOSIS_DISCLAIMER_LINES } from '@/lib/disclaimers'
import { computeHealthScore, computeIdealScore } from '@/lib/healthScore'
import { inferStyleKey } from '@/lib/investorProfile'
import { getTargetAllocationErrorMessage } from '@/lib/targetAllocation'
import { inferMbtiType, MBTI_PROFILES } from '@/lib/mbti'
import { buildSectorAllocation } from '@/lib/sectorAllocation'
import { prefetchMarketSignals } from '@/lib/marketSignalsClient'
import { prefetchTradingSignals } from '@/lib/tradingSignalsClient'
import { SESSION_KEYS } from '@/lib/types'
import type {
  DiagnosisResult,
  InvestorProfile,
  PortfolioPosition,
  StyleKey,
} from '@/lib/types'
import styles from './page.module.css'

const STYLE_KEYS: StyleKey[] = ['stable', 'balanced', 'growth', 'aggressive']

function readConfirmedPositions(): PortfolioPosition[] {
  if (typeof window === 'undefined') return []

  const raw = sessionStorage.getItem(SESSION_KEYS.CONFIRMED)
  if (!raw) return []

  try {
    return JSON.parse(raw) as PortfolioPosition[]
  } catch {
    return []
  }
}

function subscribeToClientReady() {
  return () => {}
}

function getClientReadySnapshot() {
  return true
}

function getServerReadySnapshot() {
  return false
}

function readStoredDiagnosis(): DiagnosisResult | null {
  if (typeof window === 'undefined') return null

  const raw = sessionStorage.getItem(SESSION_KEYS.DIAGNOSIS)
  if (!raw) return null

  try {
    return JSON.parse(raw) as DiagnosisResult
  } catch {
    return null
  }
}

function isStyleKey(value: unknown): value is StyleKey {
  return typeof value === 'string' && STYLE_KEYS.includes(value as StyleKey)
}

function readDesiredStyle(positions: PortfolioPosition[]): StyleKey {
  const inferredStyle = inferStyleKey(positions)

  if (typeof window === 'undefined') return inferredStyle

  const raw = sessionStorage.getItem(SESSION_KEYS.INVESTOR_PROFILE)
  if (!raw) return inferredStyle

  try {
    const profile = JSON.parse(raw) as Partial<InvestorProfile>
    return isStyleKey(profile.desiredStyle) ? profile.desiredStyle : inferredStyle
  } catch {
    return inferredStyle
  }
}

export default function DiagnosisPage() {
  const router = useRouter()
  const isClient = useSyncExternalStore(
    subscribeToClientReady,
    getClientReadySnapshot,
    getServerReadySnapshot,
  )
  const diagnosis = useMemo(() => (isClient ? readStoredDiagnosis() : null), [isClient])
  const positions = useMemo(() => (isClient ? readConfirmedPositions() : []), [isClient])
  const desiredStyle = useMemo(() => readDesiredStyle(positions), [positions])
  const [copied, setCopied] = useState(false)
  const [explainOpen, setExplainOpen] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainError, setExplainError] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    if (isClient && !diagnosis) router.replace('/')
  }, [diagnosis, isClient, router])

  useEffect(() => {
    if (!isClient) return
    router.prefetch('/signals')
    router.prefetch('/market')
    if (positions.length === 0) return

    void Promise.allSettled([
      prefetchTradingSignals(positions),
      prefetchMarketSignals(),
    ])
  }, [isClient, positions, router])

  async function toggleExplain() {
    if (explainOpen) { setExplainOpen(false); return }
    setExplainOpen(true)
    if (explanation) return

    setExplainLoading(true)
    setExplainError(false)
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagnosis),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setExplanation(data.explanation)
    } catch {
      setExplainError(true)
    } finally {
      setExplainLoading(false)
    }
  }

  const mbtiType = inferMbtiType(positions)
  const mbtiProfile = MBTI_PROFILES[mbtiType]

  async function handleShare() {
    const text = `나의 투자 MBTI는 ${mbtiProfile.emoji} ${mbtiProfile.type} ${mbtiProfile.name}!\nDr.Folio에서 내 투자 성향을 분석해봤어요`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: '투자 MBTI', text }) } catch { /* 취소 */ }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isClient || !diagnosis) return null

  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const isHealthy = diagnosis.problems.length === 0
  const target = diagnosis.targetAllocation
  const targetErrorMessage = getTargetAllocationErrorMessage(target)
  const sectorSlices = buildSectorAllocation(positions)
  const currentScore = computeHealthScore(diagnosis.currentAllocation, target, positions, desiredStyle)
  const idealScore = computeIdealScore(diagnosis.currentAllocation, positions, desiredStyle)
  const hasActions = diagnosis.actions.length > 0
  const scorePreview = idealScore > currentScore
    ? `건강점수 ${currentScore}점 → ${idealScore}점`
    : `건강점수 ${currentScore}점 기준으로 전체 비중 확인`

  return (
    <div className={styles.wrap}>
      {/* 네이비 헤더 */}
      <div className={styles.header}>
        <div className={styles.date}>포트폴리오 진단 결과 · {today}</div>
        {isHealthy ? (
          <div className={styles.healthy}>
            <div className={styles.checkIcon}>✓</div>
            <div className={styles.healthyTitle}>포트폴리오가 양호합니다</div>
          </div>
        ) : (
          <>
            <div className={styles.headline}>최적화할 수 있는</div>
            <div className={styles.bigNum}>{diagnosis.problems.length}<em>가지</em></div>
            <div className={styles.subline}>포인트가 있습니다</div>
          </>
        )}
        <div className={styles.healthScore}>
          <span className={styles.healthScoreLabel}>건강점수</span>
          <strong className={styles.healthScoreValue}>{currentScore}점</strong>
        </div>
        <AllocationBar current={diagnosis.currentAllocation} target={target} />
        {targetErrorMessage && (
          <p className={styles.targetError} role="alert">
            {targetErrorMessage}
          </p>
        )}
      </div>

      <div className={styles.body}>
        <section className={styles.improvementSection} aria-label="포트폴리오 개선 요약">
          {diagnosis.problems.length > 0 && (
            <>
              <div className={styles.sectionLabel}>개선 포인트</div>
              <div className={styles.problemList}>
                {diagnosis.problems.map((p, i) => (
                  <ProblemCard key={i} problem={p} index={i} />
                ))}
              </div>
            </>
          )}

          {hasActions && (
            <>
              <div className={styles.sectionLabel}>권장 조치</div>
              <div className={styles.actionCard}>
                {diagnosis.actions.map(action => (
                  <ActionItem
                    key={`${action.action}-${action.ticker}-${action.quantity}`}
                    action={action}
                  />
                ))}
              </div>
              <p className={styles.fineLine}>
                현재가는 캡처 시점 기준입니다. 실제 주문 전 가격과 세금은 다시 확인하세요.
              </p>
            </>
          )}

          <button
            className={styles.improvementBtn}
            type="button"
            onClick={() => setSheetOpen(true)}
          >
            <div className={styles.improvementBtnText}>
              <span className={styles.improvementBtnTitle}>포트폴리오 개선 보기</span>
              <span className={styles.improvementBtnMeta}>
                {scorePreview} · 현재/목표 비중 상세
              </span>
            </div>
            <span className={styles.improvementBtnArrow} aria-hidden="true">→</span>
          </button>

          <button className={styles.signalBtn} onClick={() => router.push('/signals')}>
            <div className={styles.signalBtnText}>
              <span className={styles.signalBtnTitle}>종목 시그널 분석 보기</span>
              <span className={styles.signalBtnMeta}>
                각 종목별 신호와 오늘 시장 상태를 함께 볼 수 있어요
              </span>
            </div>
            <span className={styles.signalBtnArrow} aria-hidden="true">↗</span>
          </button>
        </section>

        {sectorSlices.length > 0 && <SectorPieChart slices={sectorSlices} />}

        {/* 왜 이 조언인가요? */}
        <button
          className={`${styles.explainBtn} ${explainOpen ? styles.explainOpen : ''}`}
          type="button"
          onClick={toggleExplain}
        >
          왜 이 조언인가요?
          <span className={styles.explainIcon}>▾</span>
        </button>
        {explainOpen && (
          <div className={styles.explainBody}>
            {explainLoading && <p>설명 불러오는 중...</p>}
            {explainError && (
              <p>설명을 불러오지 못했습니다.{' '}
                <button
                  type="button"
                  onClick={() => { setExplanation(null); setExplainError(false); toggleExplain() }}
                >
                  다시 시도
                </button>
              </p>
            )}
            {explanation && explanation.split('\n').filter(Boolean).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        {/* 투자 MBTI 카드 */}
        <div className={`${styles.mbtiCard} ${styles[`mbtiGroup_${mbtiProfile.group}`]}`}>
          <div className={styles.mbtiEyebrow}>나의 투자 MBTI</div>
          <div className={styles.mbtiTop}>
            <span className={styles.mbtiEmoji} aria-hidden="true">{mbtiProfile.emoji}</span>
            <div>
              <div className={styles.mbtiCode}>{mbtiProfile.type}</div>
              <div className={styles.mbtiName}>{mbtiProfile.name}</div>
            </div>
          </div>
          <div className={styles.mbtiTagline}>{mbtiProfile.investorTagline}</div>
          <div className={styles.mbtiDesc}>{mbtiProfile.desc}</div>
          <button
            className={styles.shareBtn}
            type="button"
            onClick={handleShare}
            aria-label="투자 MBTI 공유하기"
          >
            {copied ? '✓ 복사됨' : '공유하기'}
          </button>
        </div>

        <div className={styles.disclaimer} aria-label="진단 결과 유의사항">
          {DIAGNOSIS_DISCLAIMER_LINES.map(line => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <button className={styles.resetBtn} type="button" onClick={() => router.push('/')}>
          ↩ 다시 진단하기
        </button>
      </div>
      <ImprovementSheet
        currentAllocation={diagnosis.currentAllocation}
        targetAllocation={target}
        currentScore={currentScore}
        idealScore={idealScore}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  )
}
