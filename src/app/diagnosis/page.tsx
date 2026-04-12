// src/app/diagnosis/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProblemCard } from '@/components/ProblemCard'
import { AllocationBar } from '@/components/AllocationBar'
import { ActionItem } from '@/components/ActionItem'
import { DIAGNOSIS_DISCLAIMER_LINES } from '@/lib/disclaimers'
import { computeHealthScore } from '@/lib/healthScore'
import { inferStyleKey } from '@/lib/investorProfile'
import { getTargetAllocationErrorMessage } from '@/lib/targetAllocation'
import { inferMbtiType, MBTI_PROFILES } from '@/lib/mbti'
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
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null)
  const [positions] = useState<PortfolioPosition[]>(() => readConfirmedPositions())
  const [desiredStyle] = useState<StyleKey>(() => readDesiredStyle(positions))
  const [copied, setCopied] = useState(false)
  const [explainOpen, setExplainOpen] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainError, setExplainError] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEYS.DIAGNOSIS)
    if (!raw) { router.replace('/'); return }
    try {
      setDiagnosis(JSON.parse(raw) as DiagnosisResult)
    } catch {
      router.replace('/')
    }
  }, [router])

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
    const text = `나의 투자 MBTI는 ${mbtiProfile.emoji} ${mbtiProfile.type} ${mbtiProfile.name}!\n포트폴리오 닥터에서 내 투자 성향을 분석해봤어요`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: '투자 MBTI', text }) } catch { /* 취소 */ }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!diagnosis) return null

  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const isHealthy = diagnosis.problems.length === 0
  const target = diagnosis.targetAllocation
  const targetErrorMessage = getTargetAllocationErrorMessage(target)
  const healthScore = computeHealthScore(diagnosis.currentAllocation, target, positions, desiredStyle)

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
          <strong className={styles.healthScoreValue}>{healthScore}점</strong>
        </div>
        <AllocationBar current={diagnosis.currentAllocation} target={target} />
        {targetErrorMessage && (
          <p className={styles.targetError} role="alert">
            {targetErrorMessage}
          </p>
        )}
      </div>

      <div className={styles.body}>
        {/* 문제 카드 */}
        {diagnosis.problems.map((p, i) => (
          <ProblemCard key={i} problem={p} index={i} />
        ))}

        {/* 권장 조치 */}
        {diagnosis.actions.length > 0 && (
          <>
            <div className={styles.sectionLabel}>권장 조치</div>
            <div className={styles.actionCard}>
              {diagnosis.actions.map((a, i) => <ActionItem key={i} action={a} />)}
            </div>
          </>
        )}

        {/* 왜 이 조언인가요? */}
        <button className={`${styles.explainBtn} ${explainOpen ? styles.explainOpen : ''}`} onClick={toggleExplain}>
          왜 이 조언인가요?
          <span className={styles.explainIcon}>▾</span>
        </button>
        {explainOpen && (
          <div className={styles.explainBody}>
            {explainLoading && <p>설명 불러오는 중...</p>}
            {explainError && (
              <p>설명을 불러오지 못했습니다.{' '}
                <button onClick={() => { setExplanation(null); setExplainError(false); toggleExplain() }}>
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

        <button className={styles.resetBtn} onClick={() => router.push('/')}>
          ↩ 다시 진단하기
        </button>
      </div>
    </div>
  )
}
