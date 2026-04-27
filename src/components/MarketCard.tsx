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
          fill="currentColor"
          d="M8.127 13.6c-.689 1.197-.225 2.18.732 2.732.956.553 2.041.465 2.732-.732.689-1.195 5.047-11.865 4.668-12.084-.379-.219-7.442 8.888-8.132 10.084zM10 6c.438 0 .864.037 1.281.109.438-.549.928-1.154 1.405-1.728A9.664 9.664 0 0 0 10 4C4.393 4 0 8.729 0 14.766c0 .371.016.742.049 1.103.049.551.54.955 1.084.908.551-.051.957-.535.908-1.086A10.462 10.462 0 0 1 2 14.766C2 9.85 5.514 6 10 6zm7.219 1.25c-.279.75-.574 1.514-.834 2.174C17.4 10.894 18 12.738 18 14.766c0 .316-.015.635-.043.943a1.001 1.001 0 0 0 1.992.182c.033-.37.051-.748.051-1.125 0-2.954-1.053-5.59-2.781-7.516z"
        />
      </svg>
    ),
    title: '시장 심리',
  },
  yieldCurve: {
    description: '앞으로 경기가 좋아질까요, 나빠질까요?',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M16.2429 5.75708C18.586 8.10023 18.586 11.8992 16.2429 14.2424M7.75758 14.2424C5.41443 11.8992 5.41443 8.10023 7.75758 5.75708M4.92893 17.0708C1.02369 13.1656 1.02369 6.83395 4.92893 2.92871M19.0715 2.92871C22.9768 6.83395 22.9768 13.1656 19.0715 17.0708M12.0002 11.9998C13.1048 11.9998 14.0002 11.1043 14.0002 9.99976C14.0002 8.89519 13.1048 7.99976 12.0002 7.99976C10.8957 7.99976 10.0002 8.89519 10.0002 9.99976C10.0002 11.1043 10.8957 11.9998 12.0002 11.9998ZM12.0002 11.9998V20.9998"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
    title: '경기 신호',
  },
  erp: {
    description: '지금 주식이 채권보다 더 매력적인가요?',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 16l3-8 3.001 8A5.002 5.002 0 0116 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M2 16l3-8 3.001 8A5.002 5.002 0 012 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M7 21h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: '주식 vs 채권 매력도',
  },
  creditSpread: {
    description: '기업들이 돈을 갚지 못할 위험이 높아지고 있나요?',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 8V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="15" r="1" fill="currentColor" />
        <path
          d="M3 10.4167C3 7.21907 3 5.62028 3.37752 5.08241C3.75503 4.54454 5.25832 4.02996 8.26491 3.00079L8.83772 2.80472C10.405 2.26824 11.1886 2 12 2C12.8114 2 13.595 2.26824 15.1623 2.80472L15.7351 3.00079C18.7417 4.02996 20.245 4.54454 20.6225 5.08241C21 5.62028 21 7.21907 21 10.4167C21 10.8996 21 11.4234 21 11.9914C21 14.4963 20.1632 16.4284 19 17.9041M3.19284 14C4.05026 18.2984 7.57641 20.5129 9.89856 21.5273C10.62 21.8424 10.9807 22 12 22C13.0193 22 13.38 21.8424 14.1014 21.5273C14.6796 21.2747 15.3324 20.9478 16 20.5328"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: '기업 부도 위험',
  },
  m2: {
    description: '시장에 돈이 충분히 돌고 있나요?',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M11.7255 17.1019C11.6265 16.8844 11.4215 16.7257 11.1734 16.6975C10.9633 16.6735 10.7576 16.6285 10.562 16.5636C10.4743 16.5341 10.392 16.5019 10.3158 16.4674L10.4424 16.1223C10.5318 16.1622 10.6239 16.1987 10.7182 16.2317L10.7221 16.2331L10.7261 16.2344C11.0287 16.3344 11.3265 16.3851 11.611 16.3851C11.8967 16.3851 12.1038 16.3468 12.2629 16.2647L12.2724 16.2598L12.2817 16.2544C12.5227 16.1161 12.661 15.8784 12.661 15.6021C12.661 15.2955 12.4956 15.041 12.2071 14.9035C12.062 14.8329 11.8559 14.7655 11.559 14.6917C11.2545 14.6147 10.9987 14.533 10.8003 14.4493C10.6553 14.3837 10.5295 14.279 10.4161 14.1293C10.3185 13.9957 10.2691 13.7948 10.2691 13.5319C10.2691 13.2147 10.3584 12.9529 10.5422 12.7315C10.7058 12.5375 10.9381 12.4057 11.2499 12.3318C11.4812 12.277 11.6616 12.1119 11.7427 11.8987C11.8344 12.1148 12.0295 12.2755 12.2723 12.3142C12.4751 12.3465 12.6613 12.398 12.8287 12.4677L12.7122 12.8059C12.3961 12.679 12.085 12.6149 11.7841 12.6149C10.7848 12.6149 10.7342 13.3043 10.7342 13.4425C10.7342 13.7421 10.896 13.9933 11.1781 14.1318L11.186 14.1357L11.194 14.1393C11.3365 14.2029 11.5387 14.2642 11.8305 14.3322C12.1322 14.4004 12.3838 14.4785 12.5815 14.5651L12.5856 14.5669L12.5897 14.5686C12.7365 14.6297 12.8624 14.7317 12.9746 14.8805L12.9764 14.8828L12.9782 14.8852C13.0763 15.012 13.1261 15.2081 13.1261 15.4681C13.1261 15.7682 13.0392 16.0222 12.8604 16.2447C12.7053 16.4377 12.4888 16.5713 12.1983 16.6531C11.974 16.7163 11.8 16.8878 11.7255 17.1019Z"
          fill="currentColor"
        />
        <path
          d="M11.9785 18H11.497C11.3893 18 11.302 17.9105 11.302 17.8V17.3985C11.302 17.2929 11.2219 17.2061 11.1195 17.1944C10.8757 17.1667 10.6399 17.115 10.412 17.0394C10.1906 16.9648 9.99879 16.8764 9.83657 16.7739C9.76202 16.7268 9.7349 16.6312 9.76572 16.5472L10.096 15.6466C10.1405 15.5254 10.284 15.479 10.3945 15.5417C10.5437 15.6262 10.7041 15.6985 10.8755 15.7585C11.131 15.8429 11.3762 15.8851 11.611 15.8851C11.8129 15.8851 11.9572 15.8628 12.0437 15.8181C12.1302 15.7684 12.1735 15.6964 12.1735 15.6021C12.1735 15.4929 12.1158 15.411 12.0004 15.3564C11.8892 15.3018 11.7037 15.2422 11.4442 15.1777C11.1104 15.0933 10.8323 15.0039 10.6098 14.9096C10.3873 14.8103 10.1936 14.6514 10.0288 14.433C9.86396 14.2096 9.78156 13.9092 9.78156 13.5319C9.78156 13.095 9.91136 12.7202 10.1709 12.4074C10.4049 12.13 10.7279 11.9424 11.1401 11.8447C11.2329 11.8227 11.302 11.7401 11.302 11.6425V11.2C11.302 11.0895 11.3893 11 11.497 11H11.9785C12.0862 11 12.1735 11.0895 12.1735 11.2V11.6172C12.1735 11.7194 12.2487 11.8045 12.3471 11.8202C12.7082 11.8777 13.0255 11.9866 13.2989 12.1469C13.3765 12.1924 13.4073 12.2892 13.3775 12.3756L13.0684 13.2725C13.0275 13.3914 12.891 13.4417 12.7812 13.3849C12.433 13.2049 12.1007 13.1149 11.7841 13.1149C11.4091 13.1149 11.2216 13.2241 11.2216 13.4425C11.2216 13.5468 11.2773 13.6262 11.3885 13.6809C11.4998 13.7305 11.6831 13.7851 11.9386 13.8447C12.2682 13.9192 12.5464 14.006 12.773 14.1053C12.9996 14.1996 13.1953 14.356 13.3602 14.5745C13.5291 14.7929 13.6136 15.0908 13.6136 15.4681C13.6136 15.8851 13.4879 16.25 13.2365 16.5628C13.0176 16.8354 12.7145 17.0262 12.3274 17.1353C12.2384 17.1604 12.1735 17.2412 12.1735 17.3358V17.8C12.1735 17.9105 12.0862 18 11.9785 18Z"
          fill="currentColor"
        />
        <path
          d="M9.59235 5H13.8141C14.8954 5 14.3016 6.664 13.8638 7.679L13.3656 8.843L13.2983 9C13.7702 8.97651 14.2369 9.11054 14.6282 9.382C16.0921 10.7558 17.2802 12.4098 18.1256 14.251C18.455 14.9318 18.5857 15.6958 18.5019 16.451C18.4013 18.3759 16.8956 19.9098 15.0182 20H8.38823C6.51033 19.9125 5.0024 18.3802 4.89968 16.455C4.81587 15.6998 4.94656 14.9358 5.27603 14.255C6.12242 12.412 7.31216 10.7565 8.77823 9.382C9.1696 9.11054 9.63622 8.97651 10.1081 9L10.0301 8.819L9.54263 7.679C9.1068 6.664 8.5101 5 9.59235 5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M13.2983 9.75C13.7125 9.75 14.0483 9.41421 14.0483 9C14.0483 8.58579 13.7125 8.25 13.2983 8.25V9.75ZM10.1081 8.25C9.69391 8.25 9.35812 8.58579 9.35812 9C9.35812 9.41421 9.69391 9.75 10.1081 9.75V8.25ZM15.9776 8.64988C16.3365 8.44312 16.4599 7.98455 16.2531 7.62563C16.0463 7.26671 15.5878 7.14336 15.2289 7.35012L15.9776 8.64988ZM13.3656 8.843L13.5103 9.57891L13.5125 9.57848L13.3656 8.843ZM10.0301 8.819L10.1854 8.08521L10.1786 8.08383L10.0301 8.819ZM8.166 7.34357C7.80346 7.14322 7.34715 7.27469 7.1468 7.63722C6.94644 7.99976 7.07791 8.45607 7.44045 8.65643L8.166 7.34357ZM13.2983 8.25H10.1081V9.75H13.2983V8.25ZM15.2289 7.35012C14.6019 7.71128 13.9233 7.96683 13.2187 8.10752L13.5125 9.57848C14.3778 9.40568 15.2101 9.09203 15.9776 8.64988L15.2289 7.35012ZM13.2209 8.10709C12.2175 8.30441 11.1861 8.29699 10.1854 8.08525L9.87486 9.55275C11.0732 9.80631 12.3086 9.81521 13.5103 9.57891L13.2209 8.10709ZM10.1786 8.08383C9.47587 7.94196 8.79745 7.69255 8.166 7.34357L7.44045 8.65643C8.20526 9.0791 9.02818 9.38184 9.88169 9.55417L10.1786 8.08383Z"
          fill="currentColor"
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
