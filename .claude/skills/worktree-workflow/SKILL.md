---
name: worktree-workflow
description: Use when starting a new feature/fix, checking active work, or cleaning up after a PR merge in this project
---

# Worktree Workflow

이 프로젝트의 worktree 기반 작업 시작/확인/정리 절차.

## 새 작업 시작

```bash
gh issue create --title "기능명" --body "수용 기준:\n- ..."
# → Issue #N 생성
git fetch origin main
git branch feat/N-slug origin/main
git worktree add ../worktrees/feat-N-slug feat/N-slug
cd ../worktrees/feat-N-slug
omc team 1:codex "<이슈 제목 + 수용 기준 전문>"
```

네이밍: `feat/<issue>-<slug>` / `fix/<issue>-<slug>` / `refactor/<issue>-<slug>`

## 활성 작업 확인

```bash
gh issue list        # 전체 백로그
git worktree list    # 활성 worktree
```

## PR 머지 후 정리

```bash
git worktree remove ../worktrees/feat-N-slug
git branch -d feat/N-slug
gh issue close N
```
