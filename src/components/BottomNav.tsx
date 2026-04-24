'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './BottomNav.module.css'

type NavItem = {
  href: string
  icon: ReactNode
  key: 'diagnosis' | 'market' | 'signals'
  label: string
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'diagnosis',
    href: '/diagnosis',
    label: '진단',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="3" y="10" width="3" height="7" rx="1" fill="currentColor" />
        <rect x="8.5" y="6" width="3" height="11" rx="1" fill="currentColor" />
        <rect x="14" y="3" width="3" height="14" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: 'market',
    href: '/market',
    label: '시장',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8" fill="none" />
        <path d="M10 3C10 3 13 7 13 10C13 13 10 17 10 17" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M3 10H17" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 7H16M4 13H16" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
    ),
  },
  {
    key: 'signals',
    href: '/signals',
    label: '종목',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <polyline
          points="2,14 6,9 9,12 13,6 18,8"
          stroke="currentColor"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="6" cy="9" r="1.5" fill="currentColor" />
        <circle cx="9" cy="12" r="1.5" fill="currentColor" />
        <circle cx="13" cy="6" r="1.5" fill="currentColor" />
        <circle cx="18" cy="8" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className={styles.nav} aria-label="하단 주요 탐색">
      {NAV_ITEMS.map(item => {
        const active = pathname === item.href

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`${styles.item} ${active ? styles.itemActive : ''}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
            {active && <span className={styles.dot} aria-hidden="true" />}
          </Link>
        )
      })}
    </nav>
  )
}
