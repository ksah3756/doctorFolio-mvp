---
name: review-handoff
description: Use when receiving a Discord webhook from Codex, writing REVIEW-N.md, or triggering Codex re-implementation after review
---

# Review Handoff

Discord 웹훅 수신 → Claude 리뷰 → REVIEW-N.md 작성 → Codex 재트리거 절차.

## Claude 자동 플로우 (웹훅 수신 시)

Codex 완료 웹훅 형식:
```
Branch: feat/N-slug
```

수신 시 자동 실행:
1. 브랜치 diff 분석 + `pnpm verify` 실행
2. `REVIEW-{N}.md` 작성 (worktree 루트)
3. **p1_count > 0** → Codex 재트리거:
```bash
omc team 1:codex "Read REVIEW-{N}.md. Fix all unchecked P1 items. Run pnpm verify. If verify fails append failure output under '## Implementer Response' and note VERIFY_FAILED — do not commit. If passes, append what you fixed, commit, then use the discord-review-notify skill/script to complete the task and send the Claude review webhook mention. Do not call raw completed transition separately."
```
4. **p1_count = 0 (APPROVED)** → PR 생성

## REVIEW-N.md 작성 형식

`REVIEW-1.md` → `REVIEW-2.md` 순서로 worktree 루트에 작성:

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

## Implementer Response
<!-- 구현 담당자가 리뷰 반영 후 이 섹션 채움 -->

## Verdict: REVISE
```

## 규칙

- REVIEW-N.md는 채팅으로만 끝내지 말고 반드시 worktree 루트에 파일로 남긴다.
- YAML `status` + `## Verdict` → Claude 작성. `## Implementer Response` → Codex만 갱신.
- 3사이클 후에도 P1 남으면 `status: ESCALATED` → 유저에게 에스컬레이션.
- `REVIEW*.md`는 `.gitignore` 적용 (PR diff 미포함).
