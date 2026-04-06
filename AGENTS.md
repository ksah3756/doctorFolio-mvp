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

### 병렬 트랙 시작

이슈를 파일 겹침 없는 쌍으로 고른다 (`track:claude` / `track:codex` 라벨 확인).

```bash
# Claude 트랙: 현재 디렉터리에서 작업 후 pnpm verify
# Codex 트랙:
cd ../worktrees/feat-N-slug
omc team 1:codex "<이슈 제목 + 수용 기준 전문>"
```

양쪽 완료 후 cross-review:
- Claude → Codex 워크트리 리뷰
- Codex → Claude 워크트리 `/codex review`

P1 없으면 Git Manager(Claude)가 각각 PR 생성 및 순차 머지.

### Review Handoff (REVIEW-N.md 컨벤션)

**완료 신호:** `pnpm verify` 통과 → `git commit` → Claude가 `git log main..HEAD`로 감지

**Claude 리뷰 작성 형식** (`REVIEW-1.md` → `REVIEW-2.md` 순서로 워크트리 루트에 작성):
```
---
cycle: 1
branch: feat/N-slug
status: NEEDS_REVISION  # NEEDS_REVISION | APPROVED | ESCALATED
p1_count: 2
p2_count: 1
---

## P1 (must fix)
- [ ] ...

## P2 (optional)
- [ ] ...

## Codex Response
<!-- Codex가 P1 수정 후 이 섹션 채움 -->

## Verdict: REVISE
```

**Codex 재구현 트리거 (유저가 실행):**
```bash
omc team 1:codex "Read REVIEW-{N}.md. Fix all unchecked P1 items. Run pnpm verify. If verify fails append failure output under '## Codex Response' and note VERIFY_FAILED — do not commit. If passes, append what you fixed then commit."
```

**규칙:**
- YAML `status` + `## Verdict` 는 Claude만 작성
- Codex는 `## Codex Response` 섹션만 추가
- 다만 이슈 라벨/트랙 배정상 Codex가 리뷰 담당이면, 채팅만으로 끝내지 말고 Claude 리뷰와 동일한 `REVIEW-N.md` 형식으로 리뷰 결과를 남긴다.
- 이 경우 Codex 리뷰도 worktree 루트의 `REVIEW-N.md`가 공식 기록이다.
- 3사이클 후에도 P1 남으면 `status: ESCALATED` → 유저에게 에스컬레이션
- `REVIEW*.md`는 `.gitignore` 적용 (PR diff에 포함되지 않음)

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
