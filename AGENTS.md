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
| Decomposer | Claude | 파일 겹침 없는 독립 서브태스크로 분리, Track A/B 배분 |
| Implementer (Track A) | Claude | 구현 → `pnpm verify` → Codex 리뷰 요청 |
| Implementer (Track B) | Codex | 구현 → `pnpm verify` → Claude 리뷰 |
| Reviewer (Track A) | Codex | `/codex review` 또는 `/codex challenge` |
| Reviewer (Track B) | Claude | Codex 구현물 검토 |
| Git Manager | Claude | 리뷰 통과 후 PR 생성 및 머지. 항상 Claude. |

**단일 트랙 (작은 작업):**
```
Claude 구현 → pnpm verify → /codex review → 수정 → PR
```

**병렬 트랙 (큰 작업, 파일 겹침 없을 때):**
```
Decomposer(Claude)
    ├── Track A: Claude 구현 → pnpm verify → Codex 리뷰 → 수정
    └── Track B: Codex 구현 → pnpm verify → Claude 리뷰 → 수정
                    ↓ (양쪽 완료 후)
              Git Manager(Claude) → PR
```

- P1 발견 시 해당 트랙 구현자가 수정 후 재검토.
- Track B 시작: `omc team 1:codex "..."` (tmux worktree에서 실행)
- Role prompts: `prompts/planner.md`, `prompts/implementer.md`, `prompts/tester.md`, `prompts/reviewer.md`, `prompts/git-manager.md`

## Work Unit & Worktree Workflow

**GitHub Issues = 작업 백로그의 단일 진실 공급원.** 모든 작업은 이슈로 먼저 등록한 뒤 구현을 시작한다.

### 새 작업 시작

```bash
gh issue create --title "기능명" --body "수용 기준:\n- ..."
# → Issue #N 생성
git fetch origin main
git branch feat/N-slug origin/main
git worktree add ../worktrees/feat-N-slug feat/N-slug
```

네이밍: `feat/<issue>-<slug>` / `fix/<issue>-<slug>` / `refactor/<issue>-<slug>`

### 활성 작업 확인

```bash
gh issue list        # 전체 백로그
git worktree list    # 활성 worktree
```

### PR 머지 후 정리

```bash
git worktree remove ../worktrees/feat-N-slug
git branch -d feat/N-slug
gh issue close N
```

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

**Refactor when:** file > 200 lines · function > 50 lines · props drill 3+ levels · same code in 3+ places

**Domain rule:** 중복 티커 자동 제거 금지 — 다른 계좌에 동일 종목이 있을 수 있다.

## Review Mandate

**Claude 1차 (self-review):** Tidy First 준수 · 테스트 커버리지 · `any` 없음 · API route 입력 검증

**Codex 2차 (independent):** `/codex review` 또는 `/codex challenge` 실행.
관점: architecture & Tidy First · data safety · performance · test coverage

P1(blocker) → Claude가 수정 후 재검토. P2 → Claude 판단으로 반영 여부 결정.

## Deploy Configuration

- Platform: Vercel / auto-deploy on push to `main`
- Production URL: (Vercel 프로젝트 생성 후 기입)
- Pre-merge: `bun run verify`

환경변수 (Vercel 대시보드):
- `ANTHROPIC_API_KEY` — Production + Preview 필수
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — Production만 (없으면 rate limiting 비활성화, 정상 동작)

백로그는 GitHub Issues로 관리. 진행 이력은 `PROGRESS.md` 참고.
