A type-safe, maintainable web interface for stock portfolio analysis and rebalancing.

## Definition of Done

- `pnpm verify` passes (lint + typecheck + tests)
- `pnpm` 미설치 시: `COREPACK_ENABLE_AUTO_PIN=0 corepack pnpm@9.15.4 verify`
- no lint/typecheck/test failures
- final response includes: Plan / Files Changed / Commands Run / Test Results / Remaining Risks

Rules:
- Never claim completion without running the verification command.
- Prefer smaller, staged changes over one large rewrite.
- Do not refactor before tests are updated.

## Agent Roles & Execution

| Role | Owner | Description |
|------|-------|-------------|
| Planner | Claude | 이슈 생성 및 수용 기준 작성 |
| Implementer | Codex | 구현 → `pnpm verify` → `discord-review-notify`로 완료+Claude 리뷰 요청 |
| Reviewer | Claude | Codex 구현물 검토 → REVIEW-N.md 작성 → P1 있으면 Codex 재트리거 |
| Git Manager | Claude | APPROVED 후 PR 생성 및 머지 |

- Codex 시작: `omc team 1:codex "..."` (worktree에서 실행)

## Work Unit & Worktree Workflow

**GitHub Issues = 작업 백로그의 단일 진실 공급원.** 모든 작업은 이슈로 먼저 등록한 뒤 구현을 시작한다.

새 작업 시작 / 활성 작업 확인 / PR 머지 후 정리는 `worktree-workflow` 스킬 참고.

Discord 웹훅 수신 → 리뷰 → REVIEW-N.md 작성 → Codex 재트리거 절차는 `review-handoff` 스킬 참고.

### 파일 충돌 방지

이슈 생성 시 수정 대상 파일을 명시한다. 동시 진행 중인 이슈가 같은 파일을 수정하면 하나가 머지될 때까지 대기.

## Tech Stack

- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** CSS Modules
- **Testing:** Vitest
- **External Services:**
  - Anthropic Claude API (`@anthropic-ai/sdk`) — portfolio explanation/analysis
  - Upstash Redis (`@upstash/redis`) — rate limiting (via middleware)

## Directory Structure

```
src/
  app/
    api/explain/route.ts   # Claude API integration
    api/ocr/route.ts       # OCR API integration
    page.tsx               # Main page
    layout.tsx
  components/              # UI components (CSS Modules)
  lib/
    engine.ts              # Core portfolio analysis logic
    types.ts               # Domain types
    sectors.ts             # Sector utilities
  data/
    sectors.json           # Static sector data
```

## Code Standards

**Easy-to-change code:** Readability · Predictability · Cohesion · Coupling

- Separate code that doesn't execute together (split by role/condition)
- Consistent return types across similar hooks
- Single responsibility per component and hook
- Extract only when a pattern repeats 3+ times
- Name complex conditions and magic numbers

**Conventions:**
- Functional components only. No `any`.
- CSS Modules for component-scoped styles.
- Union types for finite states: `'idle' | 'loading' | 'success' | 'error'`

**Tidy First:** structural changes (rename, extract) and behavioral changes (new logic) must be separate commits.
- Commit prefixes: `refactor:` (structural), `feat:` / `fix:` (behavioral)
- Only commit when all Vitest suites pass and TypeScript shows zero errors.

**Commit discipline:**
- **단일 책임:** 한 커밋에 하나의 변경만. 타입 추가, 엔진 수정, UI 수정이 있으면 최소 3개 커밋으로 분리한다.
- **의도 중심 메시지:** "무엇을 바꿨나"가 아니라 "왜 바꿨나 / 무엇을 해결했나"를 적는다.
  - ❌ `feat: AllocationBucket 타입 추가 및 engine.ts 수정`
  - ✅ `feat: 현금을 기타에서 분리해 drift 진단 정확도 개선`
- 커밋 메시지는 Discord 리뷰 요청 알림에 그대로 노출되므로 리뷰어가 구현 의도를 파악할 수 있게 작성한다.

**Refactor when:** file > 200 lines · function > 50 lines · props drill 3+ levels · same code in 3+ places

**Domain rule:** 중복 티커 자동 제거 금지 — 다른 계좌에 동일 종목이 있을 수 있다.

## Review Mandate

**Claude (reviewer):** Codex 구현물을 검토. 관점: Tidy First 준수 · 테스트 커버리지 · `any` 없음 · API route 입력 검증 · architecture & data safety · performance

P1(blocker) → Codex가 수정 후 재검토. P2 → Claude 판단으로 반영 여부 결정.

## Deploy Configuration

- Platform: Vercel / auto-deploy on push to `main`
- Production URL: (Vercel 프로젝트 생성 후 기입)
- Pre-merge: `pnpm verify`

환경변수 (Vercel 대시보드):
- `ANTHROPIC_API_KEY` — Production + Preview 필수
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — Production만 (없으면 rate limiting 비활성화, 정상 동작)

백로그는 GitHub Issues로 관리. 진행 이력은 `PROGRESS.md` 참고.
