# 산인공 공식 양식 정렬 (OFA) — 세션 이어가기 프롬프트

> 이 문서는 `/clear` 또는 새 세션 시작 직후 **첫 메시지로 붙여넣을 프롬프트**입니다.
> 목적: 이전 세션에서 작성한 구현 계획서(`docs/plans/2026-04-14-official-form-alignment.md`)를 **검증·보완**하고, 실제 구현에 쓸 **세션별 프롬프트 가이드**를 만드는 것입니다. **구현 코드는 아직 작성하지 않습니다.**

---

## 📋 복사해서 붙여넣을 프롬프트

```
안녕. 지난 세션에서 작성한 구현 계획서를 검증·보완하는 작업을 이어가려고 해.

## 배경 (이전 세션 요약)
- 프로젝트: /Users/baekkyunshin/Desktop/AI-roadmap-dashboard (KPC AI 훈련 로드맵 대시보드, Next.js 16 + Supabase)
- 작성된 계획서: docs/plans/2026-04-14-official-form-alignment.md (약 3000줄, 169 Task, 12 Step)
- 작업 내용: 한국산업인력공단(산인공) 공식 양식(1번 로드맵·2번 PBL)에 시스템을 정렬하고, 한글 파일(HWPX) 생성 기능을 추가하는 대규모 개편
- 참조 양식: docs/references/ 내 PDF·HWPX 3종
- 브레인스토밍 결과 11개 결정사항은 계획서 섹션 0에 요약되어 있음

## 이번 세션 목표 (구현은 아직 X, 계획서 완성도 UP)

### 1. 계획서 전수조사 (최우선)
지난 세션에서 발견된 치명적 오류(auth.uid_cached 함수 없음, is_ops_admin→is_ops_admin_or_higher 등)는 수정했지만, 컨텍스트가 많이 차서 추가 오류 가능성이 높다. 새 세션의 신선한 시각으로 계획서를 다시 전수조사해줘.

**검증 방법:**
- 계획서를 섹션별로 Read
- 각 Step의 파일 경로·함수 이름·타입 이름이 실제 프로젝트 코드베이스에 존재하는지 Glob/Grep으로 확인
- RLS 정책, 마이그레이션 SQL이 기존 헬퍼 함수·테이블명·enum 값과 일치하는지 검증
- TDD Red→Green 패턴이 모든 Task에 일관되게 적용되었는지 확인
- Task 번호 누락·중복·시프트 오류 확인
- 서브 브랜치 로드맵 표의 Task 수와 각 Step 실제 Task 수 일치 확인
- 중요: sequential-thinking MCP를 활용해 체계적으로 검토

**실제 프로젝트 기존 자산 (혼동 방지):**
- 테이블명: projects, project_assignments, interviews, roadmap_versions, users, audit_logs (모두 마이그레이션 005에서 cases → projects 로 rename됨)
- RLS 헬퍼 함수: is_assigned_to_project(UUID), is_ops_admin_or_higher(), is_approved_consultant(), get_user_role() — **인자 없음**
- auth.uid() 패턴: (SELECT auth.uid()) 로 래핑 (마이그레이션 048 패턴)
- DB 타입 파일: src/types/database.ts
- 테스트 유틸: src/test/helpers/mock-supabase.ts, mock-llm.ts
- 인터뷰 컴포넌트 컨벤션: StepBasicInfo/StepCompanyDetails/StepJobTasks/StepPainPoints/StepConstraintsGoals/StepSummary.tsx (Step* 접두)
- 인터뷰 위저드 컨테이너: InterviewClient.tsx (Wizard가 아닌 Client)
- 인터뷰 진행 UI: InterviewStepper.tsx 재사용 가능
- 상태 배지: RoadmapStatusBadge.tsx (PBL용도 동일 패턴)
- 갤러리 카드: GalleryContent.tsx
- Export 신규 경로: src/lib/services/export/pdf/ 와 export/xlsx/ (legacy: src/lib/services/export-*.ts)
- Supabase 클라이언트: admin.ts, client.ts, server.ts, middleware.ts, cached.ts (모두 src/lib/supabase/ 아래)
- createAuditLog 시그니처: { actorUserId, action(AuditAction enum), targetType, targetId, meta, success?, errorMessage? }
- audit_action enum 값은 CASE_CREATE 등 옛 이름이 남아있을 수 있음 (005 rename에서 손대지 않았을 가능성 — 반드시 실제 확인)
- ActionResult<T>, SimpleActionResult 타입: src/lib/types/action-result.ts

**발견 시 처리 방식:**
각 이슈는 심각도(🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low)로 분류해서 보고하고, 내가 "수정 승인"하면 계획서를 수정해. 이슈 발견과 수정을 분리할 것.

### 2. 기존 로직/UI 재사용 원칙을 계획서에 추가 반영
계획서에 다음 원칙이 모든 Step에 일관되게 적용되었는지 확인하고, 누락된 곳에 명시해줘:
- **스켈레톤 로딩**: 최근 커밋(5842a91)에서 `Skeleton` 컴포넌트로 통일됨. 새 페이지·로딩 경계는 반드시 이 컴포넌트 사용
- **필터/폼 UI**: shadcn/ui 컴포넌트(Select, Input, Button, Checkbox, Tabs 등) 사용. 순수 HTML `<input>`·`<select>` 금지
- **폼 검증**: Zod + native HTML 폼 (React Hook Form 미사용 — CLAUDE.md 명시)
- **토스트**: sonner (`showErrorToast`, `showSuccessToast` 헬퍼)
- **공용 컴포넌트**: `PageHeader`, `Card`, `Alert`, `Dialog`, `Table` 등 기존 UI 컴포넌트 재사용
- **loading.tsx 패턴**: 각 라우트에 동일 Skeleton 구조
- **색상·토큰**: Tailwind 4.x 기준. 임의 hex 대신 디자인 토큰 사용
- **접근성**: ARIA, 키보드 포커스, 라벨 연결 — web-design-guidelines 스킬이 최종 감사

이 원칙을 계획서 상단에 전용 섹션으로 추가하거나, 각 UI 관련 Step에 체크리스트로 삽입해.

### 3. main 브랜치에 바로 반영되지 않음을 계획서에 재확인
- 메인 작업 브랜치(feature/official-form-alignment)와 서브 브랜치 구조가 이미 계획서에 있지만, 다음 보장이 명시되어 있는지 확인:
  (a) 서브 브랜치 PR은 feature/official-form-alignment에만 머지
  (b) feature/official-form-alignment → main 병합은 Step 12 최종 QA 완료 후에만 수행
  (c) 각 서브 브랜치는 Vercel Preview URL만 생성 (프로덕션 자동 배포 없음)
  (d) 팀장님이 직접 승인하기 전에는 어떤 PR도 자동 머지하지 않음
- 누락·모호한 부분은 계획서 섹션 0(배경·결정사항) 또는 섹션 2(서브 브랜치 로드맵) 아래에 명시 섹션을 추가해.

### 4. 세션별 실행 프롬프트 가이드 작성
실제 구현 단계에서 내가 새 세션마다 복사해서 붙여넣을 프롬프트를 작성해. 경로: `docs/prompts/`

**파일명 규칙:** `session-<번호>-<주제>.md`
예:
- session-01-step1-setup.md      (Step 1: 브랜치 생성 + 스킬 설치 + 계획서 커밋)
- session-02-step2-db-foundation.md  (Step 2: DB 마이그레이션)
- session-03-step3-4-parallel.md  (Step 3·4 병렬: HWPX PoC + 게시판)
- session-04-step5-roadmap-interview.md
- session-05-step6-roadmap-output.md
- session-06-step7-roadmap-hwpx.md
- session-07-step8-pbl-interview.md
- session-08-step9-pbl-output.md
- session-09-step10-pbl-hwpx.md
- session-10-step11-gallery.md
- session-11-step12-final-qa.md

(세션을 이 정도로 나누는 것이 이전 세션에서 합의한 방식. 수정 가능)

**각 파일에 포함할 내용:**
1. 세션 목표 (어느 Step을 수행하는지)
2. 사전 조건 (직전 Step 완료 확인)
3. 복사해서 붙여넣을 프롬프트 (자체 포함, 계획서 섹션 참조 명시)
4. 이 세션에서 Claude가 호출할 주요 스킬·서브에이전트·MCP 목록
5. 예상 소요 시간
6. 성공 지표 (PR 생성·Preview 동작 등)
7. 다음 세션 이동 조건

**프롬프트 작성 스타일:**
- "계획서 docs/plans/2026-04-14-official-form-alignment.md 의 Step N을 subagent-driven-development 방식으로 실행해줘"로 시작
- 병렬 가능 구간은 dispatching-parallel-agents 활용 명시
- 중간 체크포인트(예: HWPX PoC 성공 여부) 명시
- 주요 결정 분기에서만 승인 요청, 나머지는 자율 진행

## 작업 순서
1. 먼저 **TodoWrite**로 이번 세션 4개 목표를 관리 가능한 Task로 쪼개 추적 시작
2. 목표 1 (전수조사) 먼저 수행 → 이슈 리포트만 생성 (수정은 승인 후)
3. 내가 수정 승인 → 계획서 수정
4. 목표 2, 3은 계획서 보완 작업 (수정과 함께 진행)
5. 목표 4 (세션 프롬프트 가이드) 최종 작성
6. 완료 후 간단 보고 (변경 요약 + 다음 단계 안내)

## 금지 사항
- 구현 코드 작성 금지 (이번 세션은 계획서·프롬프트 문서 작업만)
- main 브랜치 조작 금지
- 계획서 수정 전 반드시 내 승인 요청
- 확신 없는 부분은 추측 대신 Glob/Grep/Read로 확인

시작해줘. 첫 행동으로 TodoWrite로 Task 분할 후, 계획서 전수조사부터 진행.
```

---

## 💡 사용법

### 새 세션 시작 방법 (둘 중 선택)

**방법 A — `/clear`로 현재 세션 초기화**
1. 현재 세션에서 `/clear` 입력
2. 위 프롬프트(상단 코드블록)를 복사해서 첫 메시지로 붙여넣기

**방법 B — 터미널에서 새 세션 시작**
1. 현재 세션 종료
2. 터미널에서 `claude` 실행(또는 IDE에서 새 세션 열기)
3. 위 프롬프트를 첫 메시지로 붙여넣기

### 권장 모델
- Opus 4.6 (긴 컨텍스트 감당), `claude-opus-4-6[1m]` variant

### 세션 운영 팁
- 위 프롬프트 처리가 끝나면 Claude가 **세션별 프롬프트 가이드**를 `docs/prompts/session-*.md`에 생성해 둘 것
- 이후 실제 구현은 **새 세션마다 `session-NN-*.md`의 프롬프트를 복사 붙여넣기**로 시작
- 각 세션이 끝나면 또 `/clear` 하고 다음 session 프롬프트로 넘어감

---

## 📎 참조 경로 (새 세션에서 빠른 확인용)

| 문서 | 경로 |
|---|---|
| 구현 계획서 | `docs/plans/2026-04-14-official-form-alignment.md` |
| 산인공 양식 원본 | `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf` · `.hwpx` |
| PBL 양식 원본 | `docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf` · `.hwpx` |
| 업무 매뉴얼 | `docs/references/3.2026년 중소기업AI훈련확산센터 업무 매뉴얼(안).pdf` |
| 프로젝트 규칙 | `CLAUDE.md` (루트) |
| 사용자 메모리 | `~/.claude/projects/-Users-baekkyunshin-Desktop-AI-roadmap-dashboard/memory/MEMORY.md` |

---

**마지막 수정**: 2026-04-14
