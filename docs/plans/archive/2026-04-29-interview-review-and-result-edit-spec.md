# PR5 (R6) 설계 명세 — 결과 직접 수정 + 인터뷰 검토 페이지

- **작성일**: 2026-04-30
- **라운드**: R6 (설계 단계, 구현은 R7)
- **출처**: `docs/plans/2026-04-29-roadmap-review-findings.md`
- **대상 결함**: #19 결과 직접 수정 + 공통-B 인터뷰 검토 페이지
- **적용 범위**: 로드맵·PBL 동등 적용

---

## Context

**왜 이 변경이 필요한가**

`docs/plans/2026-04-29-roadmap-review-findings.md` 검수에서 확인된 두 결함을 R6 라운드에서 함께 해결한다.

- **#19 결과 직접 수정 불가** — 컨설턴트가 LLM 으로 도출된 로드맵·PBL 결과를 결과 페이지에서 수정할 수 없다. 현재는 `setup_necessity` / `outcome_summary.main_content` / `company_requirements` 등 **일부 필드**에만 `InlineEditField` 가 적용되어 있고, 표(연간 훈련계획·교과목 명세서·과업 분석표)·셀렉트·복합 객체 필드는 편집 인프라가 없어 LLM 결과를 그대로 다운로드해야 한다.
- **공통-B 인터뷰 제출 후 검토 페이지 부재** — 인터뷰 최종 제출 직후 `/roadmap` 또는 `/pbl` 결과 페이지로 즉시 redirect 되어 EmptyState + `AI 로드맵 생성` 버튼만 노출된다. 사용자가 제출 직전·직후 8~9 단계의 입력 내용을 한 페이지에서 검토하거나 직접 수정할 수단이 없어 UX 가 매끄럽지 않다.

**의도한 결과**

1. 컨설턴트가 결과 페이지의 모든 콘텐츠를 인라인으로 직접 수정 가능 (로드맵·PBL 동등 적용).
2. 인터뷰 제출 직후 모든 항목을 한 페이지에서 검토하고 직접 수정 가능한 신규 라우트 제공.
3. 인터뷰 변경이 결과 신선도를 깨뜨리는 경우 사용자가 인지할 수 있는 배너 안내.
4. 모든 직접 수정은 `audit_logs` 에 기록되어 추적 가능.

---

## 사용자 의사결정 요약 (R6 브레인스토밍)

| 결정 사항 | 채택안 |
|---|---|
| 결과 직접 수정 UX | **인라인 편집 확장** (기존 `InlineEditField` 패턴을 모든 텍스트 필드 + 표 행 단위로 확장. 표는 행 추가/삭제 버튼) |
| 검토 페이지 위치 | **신규 라우트** `/consultant/projects/[id]/interview/review` (로드맵·PBL 트랙 공용) |
| FINAL 결과 편집 정책 | **In-place 수정 허용** (FINAL 도 직접 수정. 변경 이력은 `audit_logs` 만 기록) |
| 인터뷰 stale 처리 | **배너 안내** (`interviews.updated_at` > 결과 `created_at` 시 결과·검토 페이지 상단에 안내 + 재생성 버튼) |

---

## 본 라운드 범위 (R6 설계)

| 항목 | 출처 | 적용 범위 |
|---|---|---|
| #19 결과 직접 수정 | findings.md L161-165 | 로드맵 결과 + PBL 결과 (동등 적용) |
| 공통-B 인터뷰 검토 페이지 | findings.md L198-201 | 로드맵 인터뷰 + PBL 인터뷰 (동등 적용) |

---

## 1. 데이터 모델 영향

### 1.1 결과 직접 수정 (#19)

**테이블 변경 없음.** 기존 `roadmap_versions` (DRAFT/FINAL/ARCHIVED 3 상태) + `pbl_reports` (동일 패턴) 의 jsonb 컬럼을 부분 업데이트한다.

**FINAL in-place 수정 정책**

- DRAFT 든 FINAL 든 동일하게 `editRoadmapManually` / `updatePblReport` 류 Server Action 으로 patch.
- `version_number` 변경 없음. `finalized_at` 변경 없음 (확정 시점 보존).
- 즉 "v3 FINAL 의 일부 필드를 수정해도 그 자리에 그대로 v3 FINAL".
- 이력은 `audit_logs.meta` 에 `{ field, before, after }` 로 누적 (감사로그 절 참조).

**기존 인프라 재사용**

- `src/lib/schemas/roadmap.ts` 의 `editRoadmapUpdatesSchema` (loose) → 모든 텍스트·셀렉트·표 행 필드를 포함하도록 확장.
- `src/lib/schemas/roadmap.ts` 의 `editableCompetencySchema` / `editableCourseSubjectSchema` (DRAFT 완화) 패턴을 PBL 측에도 도입 (`src/lib/services/pbl/pbl-types.ts` `editablePblContentSchema` 신설).
- `src/components/result/InlineEditField.tsx` 컴포넌트를 그대로 재사용 + 표 행 단위 편집 컴포넌트 신설 (`InlineEditTableRow.tsx` 또는 `EditableTable.tsx`).

**표 행 추가/삭제 경로**

- 영향 받는 표 영역: Ⅱ-3 과업 분석표, Ⅱ-4 훈련대상 과업, Ⅲ-3 연간 훈련계획, Ⅲ-4 교과목 명세서 (로드맵) / PBL 측 Ⅲ-1 수행활동·Ⅲ-2 문제 도출 표.
- 각 표는 jsonb 배열로 저장됨 (예: `roadmap_versions.annual_plan: [{...row}]`). 행 추가 = 배열 push, 행 삭제 = splice.
- Server Action `editRoadmapManually(roadmapId, { annual_plan: [...newArray] })` 형태로 통째로 교체 (delta 가 아닌 full array). 이는 기존 `editRoadmapUpdatesSchema` 검증 흐름과 일치.

### 1.2 인터뷰 검토 페이지 + 직접 수정 (공통-B)

**테이블 변경 없음.** 기존 `interviews` 테이블 (단일 row per project)·`projects.company_details` jsonb 의 부분 업데이트.

**버전 관리 — 단일 row 갱신**

- 인터뷰는 본질적으로 **현재 시점 데이터** 라 `roadmap_versions` 같은 다중 버전 모델을 두지 않는다.
- 이력은 `audit_logs` 에만 기록 (별도 `interview_history` 테이블 도입 X — 현재 패턴 유지).
- `interviews.updated_at` 트리거가 자동으로 갱신되어 결과 stale 배너 판단의 근거가 된다.

**검토 페이지 데이터 흐름**

```
GET /consultant/projects/[id]/interview/review
  ├ Server Component:
  │  ├ requireConsultantProjectAccess(projectId)  (기존 헬퍼)
  │  ├ fetchProjectMetaForInterview(projectId)    (track 판별: ROADMAP / PBL)
  │  ├ ROADMAP: fetchRoadmapInterviewV2(projectId)  → mapDbToRoadmapInterview() → camelCase Partial
  │  ├ PBL:     fetchPBLInterviewV2(projectId)     → mapDbToPBLInterview()     → camelCase Partial
  │  └ fetchLatestResultMeta(projectId, track)   → 신규 헬퍼: 최신 roadmap_version / pbl_report 의
  │                                                 created_at·status 만 select
  └ Client Component (InterviewReviewClient.tsx):
     ├ track 별 ReviewSection 렌더 (8 또는 9 Step 데이터를 접힘식으로)
     ├ InlineEditField + 인터뷰 변환 헬퍼 양방향 호출
     ├ 결과 stale 배너 (interviews.updated_at > result.created_at 비교)
     └ [AI 로드맵 생성] 또는 [결과 페이지로 이동] CTA
```

**인터뷰 직접 수정 Server Action**

기존 `submitRoadmapInterviewV2` / `submitPBLInterviewV2` 는 status 전이 (`INTERVIEWED`) 와 admin 알림을 동반하므로 검토 페이지 직접 수정에는 부적절. **권장: 기존 `saveRoadmapInterviewV2(..., autoSave: true)` 경로 재사용 + audit log 만 분기 추가.** autoSave 모드는 status 전이 없이 partial 저장만 수행하므로 적합.

대안: 단일 필드 patch 전용 신규 Server Action `editInterviewFieldRoadmap(projectId, fieldPath, value)` / `editInterviewFieldPbl(...)` 신설 — 구현 시 양쪽 비용 비교 후 결정.

---

## 2. RLS 정책 영향

### 2.1 결과 페이지 직접 수정 (#19)

**기존 정책 충분, 변경 불필요.**

- `roadmap_versions` UPDATE 정책: `is_approved_consultant() AND is_assigned_to_project(project_id)` (마이그 002 + 033)
- `pbl_reports` UPDATE 정책: 동일 (마이그 061)
- FINAL in-place 수정도 위 정책 범위 내라 별도 분기 없음.
- OPS_ADMIN 은 결과 편집 불가 — **현 정책 유지**. 컨설턴트만 자기 배정 프로젝트 편집.

### 2.2 인터뷰 검토 페이지 직접 수정 (공통-B)

**기존 정책 충분, 변경 불필요.**

- `interviews` UPDATE 정책: `is_approved_consultant() AND is_assigned_to_project()` (마이그 002 계열)
- `projects.company_details` 변경도 동일 정책 적용.
- 새 라우트 `/interview/review` 의 권한 체크는 기존 `requireConsultantProjectAccess()` 헬퍼 그대로 사용.

### 2.3 audit_logs INSERT 정책

- 현재 `createAuditLog()` 가 admin 클라이언트 (서비스 역할 키) 로 INSERT 하므로 RLS 우회. 변경 불요.

---

## 3. 마이그레이션 필요 여부

### 3.1 필요한 마이그 — `audit_action` enum 확장 1건

신규 audit action 4 종을 추가한다.

```sql
-- supabase/migrations/0XX_audit_actions_pr5.sql
-- 목적: PR5 (R6) 결과 직접 수정·인터뷰 검토 페이지에서 발생하는 4 가지 신규 audit action 등록
-- 영향: audit_logs.action 컬럼 enum 확장. 기존 데이터 무영향. 멱등 (DO 블록으로 중복 추가 방지)

DO $$
BEGIN
  -- 결과 직접 수정 (로드맵·PBL 통합)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ROADMAP_RESULT_EDITED'
      AND enumtypid = 'audit_action'::regtype
  ) THEN
    ALTER TYPE audit_action ADD VALUE 'ROADMAP_RESULT_EDITED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'PBL_REPORT_EDITED'
      AND enumtypid = 'audit_action'::regtype
  ) THEN
    ALTER TYPE audit_action ADD VALUE 'PBL_REPORT_EDITED';
  END IF;

  -- 인터뷰 검토 페이지 직접 수정 (제출 후 단일 필드 patch)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'INTERVIEW_FIELD_EDITED'
      AND enumtypid = 'audit_action'::regtype
  ) THEN
    ALTER TYPE audit_action ADD VALUE 'INTERVIEW_FIELD_EDITED';
  END IF;

  -- 검토 페이지에서 결과 재생성 트리거 (배너 → 재생성 버튼)
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'RESULT_REGENERATED_FROM_REVIEW'
      AND enumtypid = 'audit_action'::regtype
  ) THEN
    ALTER TYPE audit_action ADD VALUE 'RESULT_REGENERATED_FROM_REVIEW';
  END IF;
END $$;
```

> 주의: `ALTER TYPE ... ADD VALUE` 는 같은 트랜잭션 내 즉시 사용 불가. 마이그 적용 후 별도 트랜잭션에서 사용해야 함. CLAUDE.md 마이그 규칙대로 `apply_migration` → `list_migrations` 검증.

### 3.2 마이그 불요 — 스키마 변경 없는 항목

- 결과 jsonb 컬럼 부분 업데이트 — 컬럼 추가 없음.
- 인터뷰 jsonb 부분 업데이트 — 컬럼 추가 없음.
- RLS 정책 — 기존 정책 그대로.
- 인덱스 — `interviews.updated_at` 은 기존 trigger·기본 인덱스로 충분 (배너 비교는 단일 row 조회).

---

## 4. 감사로그 기재 방식

### 4.1 결과 직접 수정 (#19)

**기록 시점**: `editRoadmapManually` / `updatePblReport` Server Action 의 비즈니스 로직 직후, return 직전.

**액션**: `ROADMAP_RESULT_EDITED` 또는 `PBL_REPORT_EDITED`

**meta 페이로드**:

```ts
{
  project_id: string,
  version_id: string,            // roadmap_versions.id 또는 pbl_reports.id
  version_number: number,
  status: 'DRAFT' | 'FINAL',     // FINAL in-place 수정 추적용
  fields_changed: string[],      // ex) ['outcome_summary.main_content', 'annual_plan']
  diff: {                        // 필드별 before/after (긴 텍스트는 SHA-256 해시 + 미리보기 100자)
    [path: string]: { before: any, after: any }
  }
}
```

**diff 정책**:
- 텍스트 필드 ≤ 200자: before/after 원문 저장
- 텍스트 필드 > 200자: `{ before_hash, after_hash, before_preview, after_preview }` (개인정보 영향 최소화)
- 배열 (표 행): 길이 변화 + 변경된 인덱스만 기록

### 4.2 인터뷰 검토 페이지 직접 수정 (공통-B)

**액션**: `INTERVIEW_FIELD_EDITED`

**meta 페이로드**:

```ts
{
  project_id: string,
  track: 'ROADMAP' | 'PBL',
  field_path: string,           // ex) 'roadmap_overview.establishmentNecessity'
  before: any,
  after: any,
  source: 'REVIEW_PAGE'         // 검토 페이지에서의 수정만 분리 추적
}
```

> 인터뷰 페이지 (`/interview`) 의 자동 저장은 별도 추적 안 함 (지금까지 패턴). 검토 페이지에서의 의도적 수정만 audit 에 누적.

### 4.3 결과 재생성 트리거 (배너 → 재생성 버튼)

**액션**: `RESULT_REGENERATED_FROM_REVIEW`

**meta 페이로드**:

```ts
{
  project_id: string,
  track: 'ROADMAP' | 'PBL',
  triggered_from: 'REVIEW_BANNER' | 'RESULT_BANNER',
  previous_version_id: string,
  previous_version_status: 'DRAFT' | 'FINAL' | 'ARCHIVED'
}
```

### 4.4 감사로그 헬퍼 사용

기존 `createAuditLog()` (`src/lib/services/audit.ts`) 그대로 호출. admin 클라이언트로 INSERT.

---

## 5. UI/UX 와이어프레임 (텍스트 기반)

### 5.1 결과 페이지 직접 수정 — 로드맵 (#19)

**Ⅰ. 개요 탭 — 인라인 편집 확장**

```
┌─ Ⅰ. 개요 ────────────────────────────── [DRAFT v3]/[FINAL v3] ─┐
│                                                                 │
│ Ⅰ-1 수립 필요성                                                │
│   [기존 InlineEditField 그대로]                                │
│                                                                 │
│ Ⅰ-2 주요 활동                                                  │
│   ┌──────┬───────┬────────────┬────────────┐                  │
│   │ 차수 │ 일시  │ 내용       │ 방법       │ ✏ 호버시 행 편집 │
│   ├──────┼───────┼────────────┼────────────┤                  │
│   │ 1차  │ ✏     │ ✏          │ ✏          │ [✂ 행 삭제]      │
│   │ 2차  │ ✏     │ ✏          │ ✏          │                  │
│   └──────┴───────┴────────────┴────────────┘                  │
│   [➕ 차수 추가] (현재 행 < MAX_ROUNDS 일 때만 활성)            │
│                                                                 │
│ Ⅰ-3 수립 주요 결과 (LLM 자동 생성, 직접 수정 가능)            │
│   ├ 역량 수준: [셀렉트: 초급/중급/고급] (편집 가능)            │
│   ├ 선정 과업: [InlineEditField]                               │
│   └ 요약:      [InlineEditField multiline]                     │
└─────────────────────────────────────────────────────────────────┘
```

**Ⅲ. 훈련체계 탭 — 표 행 추가/삭제**

```
┌─ Ⅲ-3 연간 훈련계획 ──────────────────────────────────────┐
│ ┌──────┬──────────┬──────────┬──────────┬──────────┐    │
│ │ 차수 │ 교과목   │ 훈련시간 │ 대상     │ 비고     │    │
│ ├──────┼──────────┼──────────┼──────────┼──────────┤    │
│ │ 1차  │ ✏ AI…    │ ✏ 8h     │ ✏ 신입   │ ✏ ""     │ ✂ │
│ │ 2차  │ ✏ ML…    │ ✏ 16h    │ ✏ 경력   │ ✏ 1·2이수│ ✂ │
│ └──────┴──────────┴──────────┴──────────┴──────────┘    │
│ [➕ 행 추가]                                              │
│                                                            │
│ * 모든 셀: 호버 시 ✏ 표시 → 클릭 → 인라인 편집 → Enter 저장 │
│ * 최우상단 [💾 일괄 저장] 버튼: 한 탭 내 변경 한 번에 commit │
│ * Ⅲ-4 교과목 명세서 (subjects[].details 배열) 도 동일 패턴 │
│   - details 항목별 InlineEditField + [➕ 항목 추가] / ✂   │
│   - 2~5개 제약은 클라이언트 가이드만, 저장은 loose 스키마   │
└────────────────────────────────────────────────────────────┘
```

**FINAL 상태 직접 수정 — In-place**

```
┌─ Ⅰ. 개요 [FINAL v3 — 2026-04-20 확정] ────────────────────┐
│                                                              │
│ ⚠️ 확정된 결과를 수정하면 동일 버전(v3)에 그대로 반영됩니다. │
│    수정 이력은 감사로그(audit_logs)에 기록됩니다.            │
│                                                              │
│ [기존 인라인 편집 UI 그대로 활성]                            │
│                                                              │
│ * 우측 상단 [📜 수정 이력] 버튼 (선택)                       │
│   클릭 시 audit_logs 의 최근 ROADMAP_RESULT_EDITED 표시      │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 결과 페이지 — PBL (#19)

로드맵과 동일 패턴. `pbl_reports.pbl_content` jsonb 의 5탭 (Ⅰ Overview / Ⅱ Analysis / Ⅲ Tasks / Ⅳ Ops / Ⅴ Outcomes) 모든 텍스트·셀렉트·표 영역에 동등 적용.

**예외**: PBL Ⅴ 성과분석 탭은 `PBL-자체-05` 메모대로 현재 placeholder 상태. R6 PR 범위는 "이미 렌더되는 영역의 직접 수정" 으로 한정. Ⅴ 탭 LLM 결과 + 컴포넌트 신설은 R7+ 별도 PR.

### 5.3 인터뷰 검토 페이지 (공통-B)

```
URL: /consultant/projects/[id]/interview/review
권한: CONSULTANT_APPROVED + 배정된 컨설턴트 (requireConsultantProjectAccess)
```

```
┌─ AI훈련로드맵 인터뷰 검토 ──────────── [전체 펼치기] [전체 접기] ─┐
│                                                                    │
│ ⚠️ 인터뷰가 로드맵 생성 이후 변경되었습니다. (2026-04-30 14:23)  │
│    결과 재생성을 권장합니다. 마지막 로드맵: 2026-04-29 09:15      │
│    [🔄 재생성] [✕ 무시]                                           │
│  (배너는 result.created_at < interviews.updated_at 일 때만)       │
│                                                                    │
│ ▼ Ⅰ-1 수립 필요성                                                │
│   [InlineEditField multiline]                                     │
│                                                                    │
│ ▼ Ⅰ-2 주요 활동 (3 차수)                                         │
│   ┌──────┬───────┬────────────┐                                  │
│   │ 차수 │ 일시  │ 내용 ...   │                                  │
│   └──────┴───────┴────────────┘                                  │
│   [➕ 차수 추가] / ✂ 행 삭제                                     │
│                                                                    │
│ ▶ Ⅰ-3 AI 수준·선정 과업                  (접힘 상태)             │
│ ▶ Ⅱ-1 HRD이음 PDF                                                │
│ ▶ Ⅱ-2 기업 요구분석                                              │
│ ▶ Ⅱ-3 과업·워크플로우 분석                                       │
│ ▶ Ⅱ-4 훈련대상 과업·워크플로우 선정                              │
│ ▶ Ⅲ-1 역량모델링                                                 │
│                                                                    │
│ ────────────────────────────────────────────────────────────────  │
│ [📝 인터뷰 페이지로 돌아가기]   [🚀 AI 로드맵 생성]               │
│  (왼쪽: 단계별 폼으로 / 오른쪽: 결과 페이지로 이동·생성)          │
└────────────────────────────────────────────────────────────────────┘
```

**PBL 트랙도 동일 레이아웃** — Step 9 개를 모두 접힘식 표시.

**제출 직후 redirect 변경**:

| 시나리오 | 현재 | 변경 후 |
|---|---|---|
| 인터뷰 최초 제출 | `/roadmap` 또는 `/pbl` (EmptyState) | `/interview/review` (검토) |
| 검토 페이지 → 결과 생성 CTA | — | `/roadmap` 또는 `/pbl` 로 이동 + LLM 트리거 |
| 결과 페이지에서 인터뷰 재진입 | `/interview` | `/interview/review` (Step 폼은 별도 진입) |

**컴포넌트 트리**

```
src/app/(dashboard)/consultant/projects/[id]/interview/review/
├── page.tsx                       (Server Component: track 판별 + 데이터 페치)
├── InterviewReviewClient.tsx      (track 분기)
├── _components/
│   ├── ReviewSectionRoadmap.tsx   (8 Step 접힘식)
│   ├── ReviewSectionPbl.tsx       (9 Step 접힘식)
│   ├── ReviewItemTextarea.tsx     (단일 InlineEditField)
│   ├── ReviewItemTable.tsx        (행 단위 편집 + 추가/삭제)
│   ├── StaleResultBanner.tsx      (interviews.updated_at vs result.created_at)
│   └── ReviewActions.tsx          (CTA: 폼으로 돌아가기 / 결과 생성)
└── actions.ts                     (editInterviewField + triggerResultRegeneration)
```

---

## 6. 추정 공수 + 분리 가능한 PR 단위

### PR-A — 결과 페이지 직접 수정 (로드맵) (#19 로드맵)

**범위**

- `editRoadmapUpdatesSchema` 확장 (모든 jsonb 컬럼 loose 스키마)
- DRAFT 완화 스키마 (editableXxx) 모든 표 행 모델에 적용
- `editRoadmapManually` Server Action 의 patch 영역 확장 + audit 기록
- `result-v2/Tab*.tsx` 모든 표시 필드를 `InlineEditField` 또는 `EditableTable` 로 교체
- 신규 컴포넌트: `EditableTable.tsx`, `InlineSelectField.tsx`
- 표 행 추가/삭제 UX (Ⅰ-2, Ⅱ-3, Ⅱ-4, Ⅲ-3, Ⅲ-4)
- FINAL in-place 수정 안내 배너
- 마이그: `audit_action` enum 에 4종 일괄 추가 (PR-A 에서 함께 적용. PR-B·PR-C 는 enum 만 참조)
- TDD: 회귀 테스트 — DRAFT/FINAL 양쪽에서 in-place 수정·표 행 추가/삭제·loose 스키마 검증·audit 기록

**공수**: 3 일 (테스트 포함)

### PR-B — 결과 페이지 직접 수정 (PBL) (#19 PBL)

**범위**

- `pbl_content` 의 5탭 jsonb 구조에 PR-A 와 동일 패턴 적용
- `editablePblContentSchema` 신설 + `updatePblReport` Server Action audit 기록
- `result-v2/TabPBL*.tsx` 인라인 편집 적용 (Ⅴ Outcomes 는 placeholder 그대로 — R7+ 별도 PR)
- TDD: PBL 결과 in-place 수정 회귀

**공수**: 2 일 (PR-A 패턴 재사용)

### PR-C — 인터뷰 검토 페이지 (공통-B 로드맵·PBL)

**범위**

- 신규 라우트 `/consultant/projects/[id]/interview/review` (page.tsx + Client + actions.ts)
- track 분기 (ROADMAP / PBL) — 기존 `fetchProjectMetaForInterview` 재사용
- 8 또는 9 Step 데이터 접힘식 렌더 + 인라인 편집 (`saveRoadmapInterviewV2(autoSave: true)` 재사용)
- StaleResultBanner — `fetchLatestResultMeta` 헬퍼 신설
- 제출 직후 redirect 흐름 변경: `submitRoadmapInterviewV2` / `submitPBLInterviewV2` 성공 후 `/interview/review` 로
- 검토 페이지 CTA: `[AI 로드맵 생성]` 클릭 시 결과 페이지로 이동 + 자동 LLM 트리거
- 신규 audit action 2종 (`INTERVIEW_FIELD_EDITED`, `RESULT_REGENERATED_FROM_REVIEW`) 호출 (마이그은 PR-A 가 이미 추가)
- TDD: 검토 페이지 렌더·인라인 편집·stale 배너·CTA 동작·redirect 흐름

**공수**: 3 일 (페이지 신설 + redirect 흐름 변경)

### 합계

| 단위 | 공수 | 분리 가능성 |
|---|---|---|
| PR-A 로드맵 결과 직접 수정 | 3 일 | 독립 (마이그 포함) |
| PR-B PBL 결과 직접 수정 | 2 일 | PR-A 머지 후 시작 권장 (`EditableTable` 공유) |
| PR-C 인터뷰 검토 페이지 | 3 일 | PR-A 와 병렬 가능 (의존 X) |
| **합계** | **8 일 (≈ 1.5 주)** | PR-A↔PR-C 병렬 시 **6 일** 단축 가능 |

> 의존 관계: PR-A 가 신규 컴포넌트 (`EditableTable`, `InlineSelectField`) 와 audit_action 마이그를 포함하므로 PR-B 는 PR-A 머지 후. PR-C 는 audit_action 마이그만 의존 → PR-A 마이그 분리 시 동시 착수 가능.

---

## 7. 검증 (R7 구현 후 end-to-end 테스트)

### 7.1 자동 검증

```bash
npm run validate     # typecheck + lint + test (Vitest 회귀)
npm run build        # 프로덕션 빌드
npm run test:e2e     # Playwright — 신규 시나리오 5건
```

### 7.2 신규 회귀 테스트 (Vitest)

- `editRoadmapManually` — FINAL 상태 in-place 수정 시 status·version_number 불변, audit 기록
- `editRoadmapManually` — 표 행 추가/삭제 시 jsonb 배열 길이 변화
- `editablePblContentSchema` — DRAFT 완화 시 1항목 details 통과·6항목 거부
- `editInterviewField` — 검토 페이지 patch 시 `interviews.updated_at` 갱신 + audit 기록
- StaleResultBanner — `interviews.updated_at > roadmap_versions.created_at` 조건만 true

### 7.3 신규 E2E 시나리오 (Playwright)

1. 컨설턴트 로그인 → 프로젝트 → 인터뷰 → 모든 Step 입력 → 최종 제출 → `/interview/review` 자동 redirect 확인
2. `/interview/review` 에서 Ⅰ-1 항목 수정 → 자동 저장 토스트 → DB `interviews.company_details.roadmap_overview.establishmentNecessity` 갱신 확인
3. 결과 생성 → 결과 페이지에서 Ⅲ-3 연간계획 행 추가 → 저장 → 다시 진입 시 추가 행 표시 확인
4. FINAL 확정 후 결과 페이지에서 Ⅰ-1 수정 → 동일 version_number 유지 + audit_logs 에 `ROADMAP_RESULT_EDITED` 기록 확인
5. 결과 생성 후 인터뷰 재수정 → 결과 페이지·검토 페이지 상단 stale 배너 노출 확인 → [재생성] 클릭 시 새 DRAFT 생성

### 7.4 수동 검증 (사용자 확인용)

- 로드맵·PBL 결과 페이지 모든 탭에서 호버 시 ✏ 표시 + 클릭 시 편집 모드 진입
- 표 영역 [➕ 행 추가] / ✂ 행 삭제 정상 동작 + 일괄 저장 후 새로고침 데이터 보존
- 검토 페이지 접힘/펼침·인라인 편집·CTA 정상 동작
- HWPX 다운로드 — 직접 수정한 내용이 출력에 반영되는지 (`hwpx-payload-roadmap.ts` 매퍼는 jsonb 그대로 읽으므로 자동 반영 예상, 회귀 1건)

---

## 8. 향후 영향 (다른 라운드 메모)

### 다른 라운드에 영향 줄 수 있는 사실

- **PBL-자체-05 (Ⅴ 성과분석 placeholder)**: R6 PR-B 범위에서 제외. R7+ 별도 PR 권고 (메모 유지).
- **#23 메모 (Ⅰ-3 LLM 자동 생성 안내)**: R6 PR-A 의 FINAL 안내 배너와 함께 description 위치·문구 일관성 점검 필요. PR-A 에서 함께 정합 정정.

### 발견된 신규 이슈 (R6 설계 중)

> 2026-04-30 R6 설계 중에는 신규 결함 없음. 구현 단계(R7) 진입 시 추가 식별되면 findings.md `## 추가 발견 사항` 섹션에 기재.

---

## 9. R7 진입 절차

1. R7 라운드 시작 시 PR-A → PR-C 병렬 → PR-B 순서로 착수.
2. 각 PR 머지 후 findings.md 의 #19·공통-B 항목에 `[해결됨][PR #N]` 표기 + 변경 요약 메모 추가.
3. R6 단계는 본 spec 파일 작성·승인까지로 종료. 코드·브랜치·PR 절대 생성하지 않음.
