'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { runDiagnosis } from '@/lib/engine'
import { PRESETS, QUIZ_QUESTIONS, inferStyleKey, scoreToStyleKey } from '@/lib/investorProfile'
import { DEFAULT_TARGET, SESSION_KEYS } from '@/lib/types'
import type { StyleKey, PortfolioPosition, TargetAllocation } from '@/lib/types'
import styles from './page.module.css'

const STYLE_KEYS: StyleKey[] = ['stable', 'balanced', 'growth', 'aggressive']
const TARGET_FIELDS: Array<keyof TargetAllocation> = ['국내주식', '해외주식', '채권', '현금']

function findStyleKeyByTarget(target: TargetAllocation): StyleKey | null {
  return STYLE_KEYS.find(styleKey =>
    TARGET_FIELDS.every(assetClass => PRESETS[styleKey].target[assetClass] === target[assetClass]),
  ) ?? null
}

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

function readStoredTarget(): TargetAllocation {
  if (typeof window === 'undefined') return { ...DEFAULT_TARGET }

  const raw = sessionStorage.getItem(SESSION_KEYS.TARGET)
  if (!raw) return { ...DEFAULT_TARGET }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof TargetAllocation, unknown>>
    return {
      '국내주식': typeof parsed['국내주식'] === 'number' ? parsed['국내주식'] : DEFAULT_TARGET['국내주식'],
      '해외주식': typeof parsed['해외주식'] === 'number' ? parsed['해외주식'] : DEFAULT_TARGET['해외주식'],
      '채권': typeof parsed['채권'] === 'number' ? parsed['채권'] : DEFAULT_TARGET['채권'],
      '현금': typeof parsed['현금'] === 'number' ? parsed['현금'] : DEFAULT_TARGET['현금'],
    }
  } catch {
    return { ...DEFAULT_TARGET }
  }
}

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
  const [positions] = useState<PortfolioPosition[]>(() => readConfirmedPositions())
  const [loaded] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(SESSION_KEYS.CONFIRMED) !== null
  })
  const [selected, setSelected] = useState<StyleKey | null>(() => findStyleKeyByTarget(readStoredTarget()))
  const [target, setTarget] = useState<TargetAllocation>(() => readStoredTarget())
  const [quizMode, setQuizMode] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<Array<number | null>>(() => QUIZ_QUESTIONS.map(() => null))
  const [quizResult, setQuizResult] = useState<StyleKey | null>(null)

  useEffect(() => {
    if (!loaded) router.replace('/confirm')
  }, [loaded, router])

  if (!loaded) return null

  const currentStyle = inferStyleKey(positions)
  const currentPreset = PRESETS[currentStyle]
  const allocationDesc = getAllocationDesc(positions)
  const targetSum = TARGET_FIELDS.reduce((sum, assetClass) => sum + target[assetClass], 0)
  const isTargetBalanced = targetSum === 100
  const canProceed = selected !== null && isTargetBalanced
  const isSameStyle = TARGET_FIELDS.every(assetClass => target[assetClass] === currentPreset.target[assetClass])
  const activeQuestion = QUIZ_QUESTIONS[currentQuestion]
  const selectedChoice = quizAnswers[currentQuestion]

  function handleSelectStyle(styleKey: StyleKey) {
    setSelected(styleKey)
    setTarget({ ...PRESETS[styleKey].target })
  }

  function handleStartQuiz() {
    setQuizMode(true)
    setCurrentQuestion(0)
    setQuizAnswers(QUIZ_QUESTIONS.map(() => null))
    setQuizResult(null)
  }

  function handleQuizChoice(score: number) {
    setQuizAnswers(prev => prev.map((value, index) => (index === currentQuestion ? score : value)))
  }

  function handleQuizComplete() {
    const totalScore = quizAnswers.reduce<number>((sum, score) => sum + (score ?? 0), 0)
    const styleKey = scoreToStyleKey(totalScore)
    handleSelectStyle(styleKey)
    setQuizResult(styleKey)
    setQuizMode(false)
    setCurrentQuestion(0)
  }

  function moveToDiagnosis(target: typeof DEFAULT_TARGET) {
    sessionStorage.setItem(SESSION_KEYS.TARGET, JSON.stringify(target))
    const diagnosis = runDiagnosis(positions, target)
    sessionStorage.setItem(SESSION_KEYS.DIAGNOSIS, JSON.stringify(diagnosis))
    router.push('/diagnosis')
  }

  function handleTargetChange(assetClass: keyof TargetAllocation, value: number) {
    setTarget(prev => ({ ...prev, [assetClass]: value }))
  }

  function handleNext() {
    if (!selected || !isTargetBalanced) return

    sessionStorage.setItem(
      SESSION_KEYS.INVESTOR_PROFILE,
      JSON.stringify({ currentStyle, desiredStyle: selected }),
    )

    moveToDiagnosis(target)
  }

  return (
    <div className={styles.wrap}>
      <nav className="nav">
        <span className="logo">Dr.Folio</span>
        <span className="nav-step">2 / 2</span>
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

        {quizResult && !quizMode && (
          <div className={styles.quizResult} role="status">
            {PRESETS[quizResult].label}이에요 {PRESETS[quizResult].emoji} — 결과가 반영됐어요
          </div>
        )}

        <div className={styles.quizEntry}>
          <div>
            <strong className={styles.quizEntryTitle}>어떤 성향인지 확인해볼까요?</strong>
            <p className={styles.quizEntryDesc}>5개의 질문에 답하면 추천 성향을 바로 반영해드려요.</p>
          </div>
          <button className={styles.quizEntryButton} type="button" onClick={handleStartQuiz}>
            투자 성향 퀴즈
          </button>
        </div>

        {quizMode && (
          <section className={styles.quizWrap} aria-labelledby="quiz-title">
            <div className={styles.quizProgress}>
              <span id="quiz-title" className={styles.quizProgressLabel}>투자 성향 퀴즈</span>
              <span className={styles.quizProgressStep}>{currentQuestion + 1} / {QUIZ_QUESTIONS.length}</span>
            </div>

            <h2 className={styles.quizQuestion}>{activeQuestion.question}</h2>

            <div className={styles.quizChoices} role="radiogroup" aria-label={activeQuestion.question}>
              {activeQuestion.choices.map(choice => {
                const isActive = selectedChoice === choice.score
                return (
                  <button
                    key={`${activeQuestion.question}-${choice.label}`}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={`${styles.quizChoice} ${isActive ? styles.quizChoiceSelected : ''}`}
                    onClick={() => handleQuizChoice(choice.score)}
                  >
                    {choice.label}
                  </button>
                )
              })}
            </div>

            <div className={styles.quizNav}>
              <button
                type="button"
                className={styles.quizNavButton}
                onClick={() => setCurrentQuestion(prev => Math.max(prev - 1, 0))}
                disabled={currentQuestion === 0}
              >
                이전
              </button>

              {currentQuestion < QUIZ_QUESTIONS.length - 1 ? (
                <button
                  type="button"
                  className={styles.quizNavButtonPrimary}
                  onClick={() => setCurrentQuestion(prev => prev + 1)}
                  disabled={selectedChoice === null}
                >
                  다음
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.quizNavButtonPrimary}
                  onClick={handleQuizComplete}
                  disabled={selectedChoice === null}
                >
                  완료
                </button>
              )}
            </div>
          </section>
        )}

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
                  aria-label={`${p.label}: ${p.desc}. 국내 ${p.target['국내주식']}, 해외 ${p.target['해외주식']}, 채권 ${p.target['채권']}, 현금 ${p.target['현금']}`}
                  className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                  onClick={() => handleSelectStyle(key)}
                >
                  {isSelected && <span className={styles.check} aria-hidden="true">✓</span>}
                  <span className={styles.cardEmoji}>{p.emoji}</span>
                  <span className={styles.cardLabel}>{p.label}</span>
                  <span className={styles.cardDesc}>{p.desc}</span>
                  <span className={styles.cardAlloc}>
                    국내 {p.target['국내주식']} · 해외 {p.target['해외주식']} · 채권 {p.target['채권']} · 현금 {p.target['현금']}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {!selected && (
          <p className={styles.selectionRequired} role="status">
            투자 성향을 먼저 선택하거나 퀴즈를 완료해주세요.
          </p>
        )}

        <section className={styles.targetSection}>
          <div className={styles.targetHeader}>
            <h2 className={styles.targetTitle}>목표 배분 설정</h2>
            <p className={styles.targetHint}>원하는 비중으로 조정하세요.</p>
          </div>

          <div className={styles.sliderList}>
            {TARGET_FIELDS.map(assetClass => (
              <label key={assetClass} className={styles.sliderRow}>
                <div className={styles.sliderMeta}>
                  <span className={styles.sliderLabel}>{assetClass}</span>
                  <span className={styles.sliderValue}>{target[assetClass]}%</span>
                </div>
                <input
                  className={styles.slider}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={target[assetClass]}
                  onChange={e => handleTargetChange(assetClass, Number(e.target.value))}
                />
              </label>
            ))}
          </div>

          <div
            className={`${styles.targetSummary} ${
              isTargetBalanced ? styles.targetSummaryValid : styles.targetSummaryInvalid
            }`}
          >
            <span className={styles.targetSummaryLabel}>합계</span>
            <strong className={styles.targetSummaryValue}>{targetSum}%</strong>
            <span className={styles.targetSummaryMessage}>
              {isTargetBalanced ? '합계가 100%입니다.' : '합계가 100%가 되도록 조정해주세요.'}
            </span>
          </div>
        </section>

        <div className="fixed-cta">
          <button
            className="btn-primary"
            disabled={!canProceed}
            onClick={handleNext}
          >
            다음 →
          </button>
        </div>
      </div>
    </div>
  )
}
