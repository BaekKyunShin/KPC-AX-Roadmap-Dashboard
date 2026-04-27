# Session 01 — Step 1: 메인 브랜치 + hwpx-docgen 스킬 설치 + 계획서 커밋

## 세션 목표
마스터 계획서 §4의 **Step 1** (XS, 4 Task) 수행. 메인 작업 브랜치 `feature/official-form-alignment` 생성, 외부 스킬 `hwpx-docgen`을 프로젝트 로컬에 설치, 계획서·참조 양식·스킬을 커밋.

## 사전 조건
- `main` 브랜치가 최신 (origin/main과 동기화).
- Vercel 프로젝트의 "Production Branch" 설정이 `main` 단일로 고정되어 있음 (Step 1 Task 1에서 명시적 확인).
- `gh` CLI 인증 완료, `git` 원격 push 권한 있음.
- 인터넷 연결 (외부 레포 클론용).

## 실행 모드
**inline** (4 Task로 매우 짧음, subagent 분리 효과 적음). `superpowers:executing-plans` 스킬로 순차 실행.

## 호출 스킬·MCP·서브에이전트
- `superpowers:executing-plans` (또는 직접 진행)
- `superpowers:verification-before-completion` (Task 종료 시)
- 외부 도구: `git`, `gh`, **Vercel 대시보드** (Settings → Git → Production Branch 수동 확인. CLI `vercel inspect`는 deployment 메타용이라 Production Branch 조회에 부적합)

## 예상 소요
**15~25분** (외부 클론·검증 포함)

## 성공 지표
- [ ] `feature/official-form-alignment` 브랜치가 origin에 push됨.
- [ ] Vercel "Production Branch = main" 단일 고정 확인 결과가 기록됨.
- [ ] `.claude/skills/hwpx-docgen/` 디렉터리에 SKILL.md, README.md, scripts/, templates/, references/, examples/ 모두 존재.
- [ ] 계획서·참조 양식·스킬이 모두 단일 커밋으로 push됨.
- [ ] **PR은 아직 생성하지 않음** (메인 작업 브랜치는 Step 12 완료 후에만 main으로 PR).

## 다음 세션 이동 조건
위 4개 성공 지표 모두 충족. 그 다음 → `session-02-step2-db-foundation.md`.

---

## 복사용 프롬프트

```
=== 컨텍스트 ===
- 프로젝트: KPC AI 훈련 로드맵 대시보드 (B2B 내부 도구, Next.js 16 + Supabase + TypeScript)
- 작업 디렉터리: /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
- 마스터 계획서: docs/plans/archive/2026-04-14-official-form-alignment.md (12 Step / 150 Task)
- 본 세션은 OFA(산인공 공식 양식 정렬) 프로젝트의 **첫 세션** — 이전 세션 없음
- Step 1만 수행 (XS, 4 Task). Step 1은 코드 변경 없음 — 브랜치 생성 + 외부 스킬 설치 + 계획서 커밋만

=== 사전 검증 (반드시 첫 번째로 실행, 모두 통과해야 진행) ===
1. cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
2. git status                         → 클린 상태(또는 추적 안 된 docs/* 파일만) 확인
3. git branch --show-current          → "main" 확인
4. git pull origin main               → 최신화
5. ls docs/plans/archive/2026-04-14-official-form-alignment.md  → 계획서 파일 존재 확인
6. ls docs/references/                → PDF·HWPX 참조 양식 3종 존재 확인
7. gh auth status                     → gh CLI 인증 확인
8. git log --oneline -5               → 최근 커밋 5건 확인 (작업 시작 시점의 main HEAD 인지)

검증 실패 시 즉시 중단하고 사용자에게 보고. 단계 건너뛰기 금지.

=== 필수 사전 정독 ===
시작 전 마스터 계획서의 다음 섹션을 Read:
> 계획서 해당 섹션의 정확한 줄 위치는 `grep -n '^## 0\.' docs/plans/archive/2026-04-14-official-form-alignment.md` 같은 명령으로 헤더 위치 재확인 후 Read offset 지정.

- §0: 배경·11개 결정사항·브랜치 전략·**§0 안전장치 (a)~(d)** ← 가장 중요
- §1: 전체 파일 구조 (Step 1에서 변경하는 것 없음, 컨텍스트 파악용)
- §4 Step 1: 본 세션에서 수행할 4개 Task의 정확한 명령

=== 진행 원칙 ===
1. superpowers:executing-plans 스킬로 인라인 진행 (4 Task로 짧음 — subagent 분리 불필요)
2. §0 안전장치 (a)~(d) 절대 위반 금지 — 특히 Vercel "Production Branch = main" 단일 고정을 Task 1 마지막에 확인하고 결과 보고
3. 모든 git 명령은 그대로 실행. 단, 어떤 PR도 생성 금지 (메인 작업 브랜치는 Step 12 완료 후 main으로만 PR)
4. hwpx-docgen 스킬은 전역(~/.claude/skills/)이 아닌 **프로젝트 로컬(.claude/skills/)**에 설치
5. 임시 클론(/tmp/hwpx-repo)은 반드시 삭제

=== 자동 진행 vs 승인 요청 경계 ===
- 자동 진행: 4개 Task 전부 (단순 setup, 분기 결정 없음)
- 승인 요청: 다음 경우에만 즉시 중단 후 사용자 확인
  - Production Branch가 main이 아닌 경우 (안전장치 (c) 위반)
  - hwpx-docgen 외부 레포 클론 실패 (네트워크·권한)
  - .claude/skills/hwpx-docgen/ 내부 구조가 예상과 다를 때 (SKILL.md, scripts/, templates/, references/, examples/ 누락)
  - git push -u 실패 (원격 권한 문제)

=== Task 종료 보고 양식 (각 Task 끝마다) ===
✅ Task N 완료
- 실행 결과: <핵심 1~2줄>
- 검증 결과: <git status, ls 결과 등 1~2줄>
- 다음 Task로 진행

=== 금지 사항 ===
- gh pr create (Step 12에서 단 1회만)
- 기존 코드 파일 수정 (Step 1은 docs·.claude·git만 건드림)
- git push --force, git reset --hard (안전장치 (d))
- main 브랜치 직접 commit·push

=== 종료 시 ===
1. superpowers:verification-before-completion 호출
2. 최종 보고:
   - git log --oneline -3 결과
   - git branch -a 결과 (origin/feature/official-form-alignment 존재 확인)
   - ls .claude/skills/hwpx-docgen/ 결과
   - Production Branch 확인 결과 기록

=== 사용자에게 전달할 검증 안내 (세션 종료 시 반드시 출력) ===
아래 형식 그대로 사용자에게 안내:

────────────────────────────────────────
✅ Step 1 완료. 사용자가 확인할 것:

1. (터미널) `git branch -a` → `remotes/origin/feature/official-form-alignment` 표시되는지
2. (터미널) `ls .claude/skills/hwpx-docgen/SKILL.md` → 파일 존재
3. (Vercel 대시보드) Project → Settings → Git → **Production Branch = main** 확인

**localhost 확인 불필요** (본 Step은 코드 변경 없음).
**PR 없음** (메인 작업 브랜치는 Step 12 완료 후에만 main으로 PR).

3가지 모두 OK면 다음 세션: docs/prompts/archive/session-02-step2-db-foundation.md
────────────────────────────────────────
```
