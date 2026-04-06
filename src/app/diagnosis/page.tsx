// src/app/diagnosis/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProblemCard } from '@/components/ProblemCard'
import { AllocationBar } from '@/components/AllocationBar'
import { ActionItem } from '@/components/ActionItem'
import { DIAGNOSIS_DISCLAIMER_LINES } from '@/lib/disclaimers'
import { SESSION_KEYS, DEFAULT_TARGET } from '@/lib/types'
import type { DiagnosisResult } from '@/lib/types'
import styles from './page.module.css'

export default function DiagnosisPage() {
  const router = useRouter()
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null)
  const [explainOpen, setExplainOpen] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainError, setExplainError] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEYS.DIAGNOSIS)
    if (!raw) { router.replace('/'); return }
    setDiagnosis(JSON.parse(raw))
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

  if (!diagnosis) return null

  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const isHealthy = diagnosis.problems.length === 0
  const target = diagnosis.targetAllocation

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
        <AllocationBar current={diagnosis.currentAllocation} target={target} />
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
