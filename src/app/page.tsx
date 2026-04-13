// src/app/page.tsx
'use client'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SESSION_KEYS } from '@/lib/types'
import { parseOcrErrorResponse } from '@/lib/ocr'
import styles from './page.module.css'

type LoadingStep = { name: string; done: boolean; active: boolean }

export default function UploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<LoadingStep[]>([])
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')

  async function resizeImage(file: File): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 1200
        const scale = img.width > MAX ? MAX / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(b => resolve(b!), file.type, 0.88)
      }
      img.src = url
    })
  }

  async function handleFiles(files: FileList) {
    if (files.length === 0) return
    setError(null)
    setLoading(true)
    setProgress(0)

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      const resized = await resizeImage(files[i])
      formData.append('images', resized, files[i].name)
      setProgressLabel(`이미지 ${i + 1} 처리 중 (${i + 1}/${files.length})`)
      setProgress(((i + 1) / files.length) * 50)
    }

    try {
      const res = await fetch('/api/ocr', { method: 'POST', body: formData })
      if (!res.ok) {
        throw new Error(parseOcrErrorResponse(await res.text()))
      }
      const positions = await res.json()

      // 로딩 애니메이션: 종목 하나씩
      for (let i = 0; i < positions.length; i++) {
        setSteps(prev => {
          const next = [...prev]
          if (i > 0) next[i - 1] = { ...next[i - 1], active: false, done: true }
          next.push({ name: positions[i].name, done: false, active: true })
          return next
        })
        setProgress(50 + ((i + 1) / positions.length) * 50)
        await new Promise(r => setTimeout(r, 200))
      }

      setSteps(prev => prev.map(s => ({ ...s, active: false, done: true })))
      sessionStorage.setItem(SESSION_KEYS.RAW_POSITIONS, JSON.stringify(positions))
      await new Promise(r => setTimeout(r, 400))
      router.push('/confirm')
    } catch (e) {
      setError((e as Error).message)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.wrap}>
        <nav className="nav"><span className="logo">Dr.Folio</span><span className="nav-step">1 / 2</span></nav>
        <div className={styles.loadingBody}>
          <div className={styles.eyebrow}>분석 중</div>
          <h1 className={styles.loadingTitle}>포트폴리오<br />읽는 중...</h1>
          <p className={styles.loadingSub}>종목 정보를 확인하고 있습니다</p>
          <div className={styles.stepList}>
            {steps.map((s, i) => (
              <div key={i} className={`${styles.stepRow} ${styles.stepVisible}`}>
                <div className={`${styles.check} ${s.done ? styles.done : s.active ? styles.spinning : ''}`}>
                  {s.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span className={styles.stepName}>{s.name}</span>
              </div>
            ))}
          </div>
          <div className={styles.progWrap}>
            <div className={styles.progTrack}><div className={styles.progFill} style={{ width: `${progress}%` }} /></div>
            <p className={styles.progLabel}>{progressLabel}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <nav className="nav"><span className="logo">Dr.Folio</span></nav>
      <div className={styles.body}>
        <div className={styles.intro}>
          <h1 className={styles.headline}>건강검진은 챙기시면서,<br />포트폴리오 검진은<br />언제 받으셨나요?</h1>
          <p className={styles.sub}>MTS 캡처 한 장이면<br />3분 안에 진단 결과를 드립니다.</p>
        </div>

        <div
          className={styles.dropZone}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        >
          <div className={styles.iconWrap}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <h2 className={styles.zoneTitle}>MTS 주식잔고 캡처 올리기</h2>
          <p className={styles.zoneDesc}>키움·삼성·미래에셋·NH 지원<br />여러 장 한번에 업로드 가능</p>
          <button className="btn-primary" style={{ pointerEvents: 'none' }}>이미지 선택하기</button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />

        <p className={styles.privacy}>🔒 이미지는 AI 분석 목적으로 Anthropic Claude API에 전송되며, 분석 후 저장되지 않습니다.</p>

        {error && <p className={styles.error}>⚠️ {error} — <a href="#" onClick={() => setError(null)}>다시 시도</a></p>}

        <p className={styles.manual}>또는 <Link href="/manual">종목을 직접 입력하기</Link></p>
      </div>
    </div>
  )
}
