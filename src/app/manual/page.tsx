'use client'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SESSION_KEYS } from '@/lib/types'
import type { PortfolioPosition } from '@/lib/types'
import { EMPTY_DRAFT, createManualPosition, isManualDraftComplete } from './manualPosition'
import styles from './page.module.css'

const ASSET_CLASSES = ['국내주식', '해외주식', '채권', '기타'] as const
const currencyFormatter = new Intl.NumberFormat('ko-KR')

export default function ManualInputPage() {
  const router = useRouter()
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [positions, setPositions] = useState<PortfolioPosition[]>([])

  const canAdd = isManualDraftComplete(draft)
  const hasPositions = positions.length > 0

  function handleAddPosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isManualDraftComplete(draft)) return

    setPositions(currentPositions => [...currentPositions, createManualPosition(draft)])
    setDraft(EMPTY_DRAFT)
  }

  function handleStartDiagnosis() {
    if (!hasPositions) return

    sessionStorage.setItem(SESSION_KEYS.RAW_POSITIONS, JSON.stringify(positions))
    router.push('/confirm')
  }

  return (
    <div className={styles.wrap}>
      <nav className={styles.nav}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.back()}
          aria-label="뒤로가기"
        >
          ←
        </button>
        <span className={styles.brand}>Dr.Folio</span>
      </nav>

      <main className={styles.content}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>직접 입력</p>
          <h1 className={styles.title}>OCR 없이 종목을 직접 추가해 진단을 시작하세요.</h1>
          <p className={styles.description}>종목명, 평가금액, 자산군만 입력하면 확인 화면으로 바로 이동합니다.</p>
        </section>

        <section className={styles.section}>
          <form className={styles.formCard} onSubmit={handleAddPosition}>
            <label className={styles.field}>
              <span className={styles.label}>종목명</span>
              <input
                className={styles.input}
                type="text"
                value={draft.name}
                onChange={event => setDraft(currentDraft => ({ ...currentDraft, name: event.target.value }))}
                placeholder="예: 삼성전자"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>평가금액</span>
              <div className={styles.moneyField}>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={draft.value}
                  onChange={event => setDraft(currentDraft => ({
                    ...currentDraft,
                    value: event.target.value.replace(/\D/g, ''),
                  }))}
                  placeholder="0"
                />
                <span className={styles.moneyUnit}>원</span>
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>종목코드</span>
              <input
                className={styles.input}
                type="text"
                value={draft.code}
                onChange={event => setDraft(currentDraft => ({ ...currentDraft, code: event.target.value }))}
                placeholder="예: 005930 또는 AAPL"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>자산군</span>
              <select
                className={styles.select}
                value={draft.assetClass}
                onChange={event => setDraft(currentDraft => ({
                  ...currentDraft,
                  assetClass: event.target.value as typeof currentDraft.assetClass,
                }))}
              >
                <option value="">선택해주세요</option>
                {ASSET_CLASSES.map(assetClass => (
                  <option key={assetClass} value={assetClass}>{assetClass}</option>
                ))}
              </select>
            </label>

            <button type="submit" className={`btn-primary ${styles.addButton}`} disabled={!canAdd}>
              종목 추가
            </button>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>추가한 종목</h2>
            <span className={styles.sectionMeta}>{positions.length}개</span>
          </div>

          {hasPositions ? (
            <div className={styles.positionList}>
              {positions.map(position => (
                <article key={position.id} className={styles.positionCard}>
                  <div className={styles.positionMain}>
                    <div>
                      <h3 className={styles.positionName}>{position.name}</h3>
                      {position.code && <p className={styles.positionCode}>{position.code}</p>}
                    </div>
                    <p className={styles.positionValue}>{currencyFormatter.format(position.value)}원</p>
                  </div>

                  <div className={styles.positionFooter}>
                    <span className={styles.assetBadge}>{position.assetClass}</span>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => setPositions(currentPositions =>
                        currentPositions.filter(currentPosition => currentPosition.id !== position.id)
                      )}
                      aria-label={`${position.name} 삭제`}
                    >
                      삭제
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>아직 종목이 없습니다. 위 폼에서 추가해주세요.</div>
          )}
        </section>
      </main>

      <div className="fixed-cta">
        <button
          type="button"
          className={`btn-primary ${styles.ctaButton}`}
          onClick={handleStartDiagnosis}
          disabled={!hasPositions}
        >
          진단 시작
        </button>
      </div>
    </div>
  )
}
