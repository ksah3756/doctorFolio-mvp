import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_KEYS } from '../../lib/types'
import ConfirmPage from './page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

const originalWindow = globalThis.window
const originalSessionStorage = globalThis.sessionStorage

function installWindowWithStoredPositions() {
  const storage = new Map<string, string>([
    [SESSION_KEYS.RAW_POSITIONS, JSON.stringify([
      {
        id: 'position-1',
        name: '테스트 종목',
        code: '000000',
        qty: 1,
        value: 10000,
        avgCost: 9000,
        currentPrice: 10000,
        assetClass: '국내주식',
        sector: '기타',
        sourceImage: 1,
      },
    ])],
  ])

  const sessionStorageMock = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
    clear: () => {
      storage.clear()
    },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() {
      return storage.size
    },
  } as Storage

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      matchMedia: () => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    },
  })

  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: sessionStorageMock,
  })
}

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: originalSessionStorage,
  })
})

describe('ConfirmPage', () => {
  it('keeps the first render empty even when browser state already exists', () => {
    installWindowWithStoredPositions()

    const html = renderToStaticMarkup(createElement(ConfirmPage))

    expect(html).toBe('')
  })

  it('reserves mobile scroll space for the fixed CTA', () => {
    const css = readFileSync(new URL('./page.module.css', import.meta.url), 'utf8')

    expect(css).toContain('--mobile-fixed-cta-clearance: calc(96px + env(safe-area-inset-bottom));')
    expect(css).toContain('padding: 12px 16px var(--mobile-fixed-cta-clearance);')
    expect(css).toContain('scroll-padding-bottom: var(--mobile-fixed-cta-clearance);')
  })
})
