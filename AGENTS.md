A type-safe, maintainable web interface for stock portfolio analysis and rebalancing.

# Mandatory delivery workflow

For any non-trivial code change, follow this order:
1. Design: write a short plan and identify files to inspect.
2. Minimal implementation: make the smallest viable code change.
3. Tests: add or update tests for the change.
4. Refactor: improve structure only after tests pass.
5. Review: require an independent reviewer before git management or completion.

## Agent Division of Labor

### Parallel Track Model

큰 작업은 **독립적인 서브태스크로 분해**한 뒤 두 트랙에 병렬 배분한다.
핵심 제약: **두 트랙이 같은 파일을 동시에 수정하면 충돌 발생** → 분해 시 파일 단위 겹침 없게 나눠야 한다.

```
1. Task Decomposition (Claude)
   └── 독립 서브태스크로 분리 (파일 겹침 없게)
   └── Track A / Track B 배분

Track A (Claude 구현)        Track B (Codex 구현)
────────────────────         ────────────────────
Claude 구현                  Codex 구현
     ↓                            ↓
Codex 리뷰                   Claude 리뷰
(/codex review)                   ↓
     ↓                       Claude 피드백 반영
Claude 피드백 반영                  ↓
     ↓                            ↓
        merge → main (Claude git-manager)
```

### 병렬 실행 방법

- **git worktree 사용** — 두 트랙이 각자 독립 브랜치에서 작업 후 병합
- **Codex 트랙 시작**: `/omc-teams 1:codex "Track B 구현 내용"` 으로 Codex 워커 실행
- Claude는 Track A를 직접 구현하면서 Codex Track B와 병렬 진행

### 단일 트랙 (작은 작업)

작업이 작거나 파일 분리가 불가능한 경우:

```
Claude 구현 → pnpm verify → /codex review → Claude 피드백 반영 → PR
```

### 역할 경계

| 역할 | Claude | Codex |
|------|--------|-------|
| Task decomposition | ✅ 항상 | ✗ |
| 구현 (Track A) | ✅ | ✗ |
| 구현 (Track B) | ✗ | ✅ |
| Track A 리뷰 | ✗ | ✅ (`/codex review`) |
| Track B 리뷰 | ✅ | ✗ |
| git-manager / PR | ✅ 항상 | ✗ |

Definition of done:
- `pnpm verify` passes
- If `pnpm` is unavailable on `PATH`, use `COREPACK_ENABLE_AUTO_PIN=0 corepack pnpm@9.15.4 verify` without mutating `package.json`
- no lint/typecheck/test failures
- final response must include:
  - Plan
  - Files Changed
  - Commands Run
  - Test Results
  - Remaining Risks

Rules:
- Never claim completion without running the verification command.
- Never use natural-language-only validation.
- Prefer smaller, staged changes over one large rewrite.
- Do not refactor before tests are updated.
- The implementer agent must not perform final review on its own changes.

## Role Lanes

- **Decomposer:** 작업을 파일 겹침 없는 독립 서브태스크로 분리하고 Track A/B 배분. Owner: **Claude**.
- **Implementer (Track A):** Claude가 구현. `pnpm verify` 통과 후 Codex 리뷰 요청. Owner: **Claude**.
- **Implementer (Track B):** Codex가 구현. `pnpm verify` 통과 후 Claude 리뷰. Owner: **Codex**.
- **Reviewer (Track A):** `/codex review` 또는 `/codex challenge`. Owner: **Codex**.
- **Reviewer (Track B):** Claude가 Codex 구현물 검토. Owner: **Claude**.
- **Git Manager:** 두 트랙 모두 리뷰 통과 후 병합 및 PR. Owner: **Claude**.

## Role Execution Order

**병렬 (큰 작업):**

```
Decomposer(Claude)
    ├── Track A: Claude 구현 → pnpm verify → Codex 리뷰 → Claude 수정
    └── Track B: Codex 구현 → pnpm verify → Claude 리뷰 → Codex 수정
                    ↓ (양쪽 완료 후)
              git-manager(Claude) → PR
```

**단일 (작은 작업):**

`Claude 구현 → pnpm verify → /codex review → 수정 → git-manager`

Additional rules:
- P1 발견 시 해당 트랙 구현자가 수정 후 재검토.
- Track B Codex 구현은 `/omc-teams 1:codex "..."` 로 실행.
- `git-manager` 는 항상 Claude.

## Role Prompt Files

- `prompts/planner.md`
- `prompts/implementer.md`
- `prompts/tester.md`
- `prompts/reviewer.md`
- `prompts/git-manager.md`

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

## Core Philosophy: Easy-to-Change Code

Code is "easy to change" when it satisfies four criteria: **Readability, Predictability, Cohesion, Coupling**.

### 1. Readability

- **Separate code that doesn't execute together** — split components by role/condition rather than mixing branches
- **Abstract implementation details** — components call named functions, not raw fetch/localStorage
- **Split hooks by logic type** — `usePortfolioData`, `usePortfolioUI`, `usePortfolioForm` instead of one monolithic hook
- **Name complex conditions and magic numbers** — no unexplained numeric literals
- **Top-to-bottom flow** — null checks first, data fetching next, effects last, render at the end
- **Avoid nested ternaries** — extract to named functions when conditions are complex

### 2. Predictability

- **Consistent return types** — similar hooks return the same shape
- **Reveal hidden logic** — no side effects inside functions that appear to only fetch data
- **No name collisions** — if renaming is needed to disambiguate, do it

### 3. Cohesion

- **Related files stay together** — as the project grows, organize by domain (e.g., `features/portfolio/`) rather than file type
- **Single source of truth for constants** — shared values live in `src/lib/` or `src/data/`, never duplicated

### 4. Coupling

- **Single responsibility** — components and hooks do one thing
- **Allow duplication over wrong abstraction** — extract only when a pattern repeats 3+ times
- **Eliminate props drilling beyond 2–3 levels** — use composition or context

## Domain Rules

- **중복 티커 자동 제거 금지:** 같은 티커가 입력되더라도 자동으로 제거하지 않는다. 유저가 직접 판단해야 하며, 다른 계좌에 동일 종목이 존재할 수 있다.

## Coding Conventions

- Functional components only. No `any`.
- Declarative UI: `UI = f(state)`.
- Use CSS Modules for component-scoped styles.
- TypeScript: use type inference where possible, be explicit for function parameters, use union types for finite states (`'idle' | 'loading' | 'success' | 'error'`).

## Tidy First Approach

**Structural changes** (renaming, extracting components, updating types) and **behavioral changes** (new logic, API calls) must never be mixed in the same commit.
- Never mix structural and behavioral changes in the same commit
- Always make structural changes first when both are needed
- Validate structural changes do not alter behavior by running tests before and after

## Commit Discipline

- Only commit when all Vitest suites pass and TypeScript shows zero errors.
- Commit message prefixes: `refactor:` (structural), `feat:` / `fix:` (behavioral).

## Refactoring Signals

Refactor when:
- A file exceeds 200 lines
- A function exceeds 50 lines
- Props pass through 3+ components unchanged
- The same code appears in 3+ places
- A component has 3+ separate responsibilities

## [Review Mandate]

### Claude 1차 리뷰 (self-review)
Claude가 구현 후 스스로 점검하는 항목:
1. **Tidy First 준수**: structural/behavioral 변경 분리 여부
2. **테스트 커버리지**: 변경된 로직에 대한 테스트 존재 여부
3. **타입 안전성**: `any` 사용 여부, 타입 추론 적절성
4. **보안**: API route 입력 검증, 인증 처리

### Codex 2차 리뷰 (independent review)
Claude 1차 리뷰 통과 후 `/codex review` 또는 `/codex challenge` 실행.

Codex 리뷰 관점:
1. **Maintainer**: architecture & Tidy First compliance
2. **Security Officer**: data safety & financial integrity
3. **Performance Engineer**: query optimization & resource usage
4. **QA Engineer**: test coverage & edge cases

P1 (blocker) 발견 시 Claude가 수정 후 재검토. P2는 Claude 판단으로 반영 여부 결정.

## Deploy Configuration

- Platform: Vercel
- Production URL: (Vercel 프로젝트 생성 후 기입)
- Deploy workflow: auto-deploy on push to main
- Health check: production URL
- Pre-merge: `bun run verify`

환경변수 (Vercel 대시보드에서 설정):
- `ANTHROPIC_API_KEY` — Production + Preview 모두 설정 필수
- `UPSTASH_REDIS_REST_URL` — Production만 (없으면 rate limiting 비활성화, 정상 동작)
- `UPSTASH_REDIS_REST_TOKEN` — Production만

## Progress Tracking

작업 단위(계획 → 구현 → 리팩토링 → 테스트 → 리뷰 → PR → 병합)를 `PROGRESS.md`에 기록한다.

형식:
```
## YYYY-MM-DD
- [ ] 작업 한 줄 요약   ← 작업 시작 시 추가
- [x] 작업 한 줄 요약   ← PR 병합 후 체크
```

규칙:
- 작업 시작 시 `- [ ]`로 항목을 추가한다
- PR이 main에 병합되면 `- [x]`로 변경한다
- 파일 단위가 아닌 논리적 변경 단위로 한 줄씩 작성한다
- 한국어로 작성한다
