'use client'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SESSION_KEYS } from '@/lib/types'
import { ConfirmCard } from '@/components/ConfirmCard'
import { SECTOR_LABELS } from '@/lib/sectors'
import type { AssetClass, PortfolioPosition } from '@/lib/types'
import { EMPTY_DRAFT, createManualPosition, isManualDraftComplete } from './manualPosition'
import styles from './page.module.css'

const ASSET_CLASSES = ['국내주식', '해외주식', '채권', '기타'] as const

export default function ManualInputPage() {
  const router = useRouter()
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [positions, setPositions] = useState<PortfolioPosition[]>([])

  const canAdd = isManualDraftComplete(draft)
  const hasPositions = positions.length > 0
  const totalValue = positions.reduce((sum, position) => sum + position.value, 0)
  const nameCounts: Record<string, number> = {}

  for (const position of positions) {
    nameCounts[position.name] = (nameCounts[position.name] ?? 0) + 1
  }

  function handleAddPosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isManualDraftComplete(draft)) return

    setPositions(currentPositions => [...currentPositions, createManualPosition(draft)])
    setDraft(EMPTY_DRAFT)
  }

  function updatePositions(updater: (currentPositions: PortfolioPosition[]) => PortfolioPosition[]) {
    setPositions(currentPositions => updater(currentPositions))
  }

  function handleDelete(id: string) {
    updatePositions(currentPositions => currentPositions.filter(position => position.id !== id))
  }

  function handleAssetClassChange(id: string, assetClass: AssetClass) {
    updatePositions(currentPositions =>
      currentPositions.map(position => position.id === id ? { ...position, assetClass } : position)
    )
  }

  function handleSectorChange(id: string, sector: string) {
    updatePositions(currentPositions =>
      currentPositions.map(position => position.id === id ? { ...position, sector } : position)
    )
  }

  function handleFieldChange(id: string, field: 'value' | 'avgCost' | 'currentPrice', value: number) {
    updatePositions(currentPositions =>
      currentPositions.map(position => position.id === id ? { ...position, [field]: value } : position)
    )
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
          <h1 className={styles.title}>OCR 없이 종목을 직접 추가해<br />진단을 시작하세요.</h1>
          <p className={styles.description}>확인 화면과 같은 기준으로 금액, 자산군, 섹터를 맞춰 입력한 뒤 바로 진단을 시작할 수 있습니다.</p>
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

            <div className={styles.formGrid}>
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

              <label className={styles.field}>
                <span className={styles.label}>섹터</span>
                <select
                  className={styles.select}
                  value={draft.sector}
                  onChange={event => setDraft(currentDraft => ({ ...currentDraft, sector: event.target.value }))}
                >
                  <option value="">선택해주세요</option>
                  {SECTOR_LABELS.map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.formGridTriple}>
              <label className={styles.field}>
                <span className={styles.label}>보유금액</span>
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
                <span className={styles.label}>매입가</span>
                <div className={styles.moneyField}>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={draft.avgCost}
                    onChange={event => setDraft(currentDraft => ({
                      ...currentDraft,
                      avgCost: event.target.value.replace(/\D/g, ''),
                    }))}
                    placeholder="0"
                  />
                  <span className={styles.moneyUnit}>원</span>
                </div>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>현재가</span>
                <div className={styles.moneyField}>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={draft.currentPrice}
                    onChange={event => setDraft(currentDraft => ({
                      ...currentDraft,
                      currentPrice: event.target.value.replace(/\D/g, ''),
                    }))}
                    placeholder="0"
                  />
                  <span className={styles.moneyUnit}>원</span>
                </div>
              </label>
            </div>

            <p className={styles.helperText}>
              확인 화면과 같은 계산 기준을 쓰기 위해 보유금액, 매입가, 현재가, 자산군, 섹터를 모두 입력합니다.
            </p>

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
                <div key={position.id} className={styles.positionCardWrap}>
                  <ConfirmCard
                    position={position}
                    pct={totalValue > 0 ? Math.round((position.value / totalValue) * 1000) / 10 : 0}
                    isDuplicate={(nameCounts[position.name] ?? 0) > 1}
                    onDelete={handleDelete}
                    onAssetClassChange={handleAssetClassChange}
                    onSectorChange={handleSectorChange}
                    onFieldChange={handleFieldChange}
                  />
                </div>
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
