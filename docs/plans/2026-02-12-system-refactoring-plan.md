# 시스템 전반 리팩터링 계획서

> 작성일: 2026-02-12
> 원칙: **기능 변화 없음 (behavior-preserving)**
> 접근법: 테스트 안전망 → 구조 리팩터링 → 일관성 정리

---

## 목차

1. [전체 구조](#1-전체-구조)
2. [대상 파일 분석표](#2-대상-파일-분석표)
3. [의존성 맵](#3-의존성-맵)
4. [Phase 1: 테스트 안전망 구축](#4-phase-1-테스트-안전망-구축)
5. [Phase 2: 구조 리팩터링](#5-phase-2-구조-리팩터링)
6. [Phase 3: 일관성 정리](#6-phase-3-일관성-정리)
7. [세션 체크리스트 템플릿](#7-세션-체크리스트-템플릿)
8. [진행 추적표](#8-진행-추적표)

---

## 1. 전체 구조

### 3단계 접근법

```
Phase 1: 테스트 안전망 구축 (8~12세션)
    │  리팩터링 대상 파일에 대해 먼저 테스트 작성
    │  → 기능 보존을 검증할 수 있는 기반 확보
    ▼
Phase 2: 구조 리팩터링 (10~15세션)
    │  대형 파일 분해, 관심사 분리, 중복 제거
    │  → 매 변경 후 기존 테스트 통과 확인
    ▼
Phase 3: 일관성 정리 (5~8세션)
    │  패턴 통일, 네이밍, import 정리
    │  → 코드베이스 전반의 일관성 확보
```

### 핵심 원칙

1. **기능 변화 없음**: 모든 변경은 동작을 보존해야 함
2. **테스트가 증명**: "안 바뀌었다"는 테스트가 증명함
3. **한 세션 = 1~2 파일**: 변경 범위를 제한하여 위험 최소화
4. **커밋 먼저**: 리팩터링 전에 반드시 현재 상태 커밋
5. **validate 통과**: 매 세션 종료 시 `npm run validate` 통과 필수

### 세션 프롬프트

매 세션에서 다음과 같이 요청:

```
리팩터링 계획서에서 다음 항목을 진행해줘.
```

---

## 2. 대상 파일 분석표

### 서비스 레이어 (src/lib/services/)

| 파일 | 줄 수 | 함수 수 | 테스트 | 분해 대상 | 난이도 |
|------|--------|---------|--------|-----------|--------|
| `roadmap.ts` | 1,387 | 25+ | - | 6개 모듈로 분리 | 높음 |
| `export-pdf.ts` | 733 | 18 | - | 5개 모듈로 분리 | 중간 |
| `matching.ts` | 711 | 15 | - | 레거시 제거 + 3개 분리 | 중간 |
| `export-xlsx.ts` | 655 | 24 | - | 4개 모듈로 분리 | 중간 |
| `quota.ts` | 332 | 7 | - | 통계 분리 가능 | 낮음 |
| `llm.ts` | 176 | 3 | - | 분리 불필요 | 낮음 |
| `audit.ts` | 133 | 2 | - | 분리 불필요 | 낮음 |
| `stt.ts` | 111 | 2 | - | 분리 불필요 | 낮음 |
| `notification.ts` | 99 | 2 | - | 분리 불필요 | 낮음 |

### Server Actions (src/app/**/actions.ts)

| 파일 | 줄 수 | 함수 수 | 분해 방향 | 난이도 |
|------|--------|---------|-----------|--------|
| `ops/projects/actions.ts` | 1,241 | 15 | 4개 파일 (CRUD/조회/통계/필터) | 중간 |
| `(auth)/actions.ts` | 741 | 11+4 | 4개 파일 (인증/프로필/계정/관리자) | 중간 |
| `gallery/actions.ts` | 697 | 8 | 3개 파일 (조회/상호작용/복제) | 낮음 |
| `messages/actions.ts` | 532 | 7 | 2개 파일 (조회/변경) | 낮음 |
| `ops/templates/actions.ts` | 511 | 6 | 유지 (응집도 높음) | - |
| `consultant/.../actions.ts` | 468 | 7+2 | 2개 파일 (활동일지/인터뷰가이드) | 낮음 |
| 기타 7개 | 88~329 | - | 유지 (적정 크기) | - |

### 대형 컴포넌트

| 파일 | 줄 수 | 분해 방향 | 난이도 |
|------|--------|-----------|--------|
| `AssignmentTabSection.tsx` | 857 | 유틸 추출 + 커스텀 훅 + 서브 컴포넌트 분리 | 중간 |
| `Skeleton.tsx` | 769 | 이미 모듈화됨, 유지 가능 | 낮음 |
| `ProjectDashboard.tsx` | 749 | 4개 섹션 컴포넌트 + 데이터 훅 | 중간 |
| `TestRoadmapClient.tsx` | 700 | 상태 훅 + 액션 훅 + 네비게이션 분리 | 높음 |
| `SelfAssessmentForm.tsx` | 636 | 질문 타입별 컴포넌트 + 네비게이션 | 중간 |
| `RoadmapLoadingOverlay.tsx` | 588 | 이미 훅 분리됨, 유지 가능 | 낮음 |
| `ActivityLog.tsx` | 536 | LogItem 분리 + useActivityLogs 훅 | 낮음 |

---

## 3. 의존성 맵

### 서비스 간 의존관계

```
roadmap.ts ──────→ llm.ts ──────→ LLM API (외부)
    │                 ↑
    ├──→ quota.ts     │
    ├──→ audit.ts     │
    ├──→ notification.ts
    │
    └──→ stt.ts ──────┘

matching.ts ─────→ llm.ts
    ├──→ audit.ts

export-pdf.ts ───→ (roadmap 타입만 참조)
export-xlsx.ts ──→ (roadmap 타입만 참조)
```

### 분해 시 안전한 순서

아래 순서대로 작업하면 의존성 충돌 없음:

1. **독립 모듈 먼저**: `llm.ts`, `quota.ts`, `audit.ts`, `notification.ts`, `stt.ts`
2. **내보내기 모듈**: `export-pdf.ts`, `export-xlsx.ts` (타입 참조만)
3. **핵심 모듈**: `matching.ts` → `roadmap.ts` (의존성 최다)

### Actions → Services 의존관계

```
ops/projects/actions.ts ──→ matching.ts, audit.ts, notification.ts
(auth)/actions.ts ─────────→ (Supabase Auth 직접)
gallery/actions.ts ────────→ audit.ts
messages/actions.ts ───────→ notification.ts, email.ts
consultant/.../actions.ts ─→ audit.ts, stt.ts
consultant/.../roadmap/ ───→ roadmap.ts, audit.ts, notification.ts
```

---

## 4. Phase 1: 테스트 안전망 구축

> 목표: Phase 2에서 분해할 파일의 현재 동작을 테스트로 고정

### 테스트 전략

| 레이어 | 테스트 유형 | 모킹 대상 |
|--------|------------|-----------|
| 순수 함수 | 단위 테스트 (모킹 불필요) | 없음 |
| LLM 의존 | 단위 테스트 + LLM 응답 모킹 | `callLLM`, `callLLMForJSON` |
| DB 의존 | 단위 테스트 + Supabase 모킹 | `createClient`, `createAdminClient` |
| 컴포넌트 | RTL 렌더링 + 인터랙션 | Server Actions, fetch |

### 세션별 작업

#### Session 1-1: roadmap.ts — 순수 함수 테스트

- **대상**: `sumModuleHours`, `normalizeCoursesHours`, `normalizePBLHours`, `normalizeRoadmapHours`, `buildRoadmapMatrixFromCourses`
- **파일**: `src/lib/services/roadmap.test.ts`
- **이유**: 모킹 불필요, 입력→출력 명확, 시간 보정 로직 검증
- [x] 완료

#### Session 1-2: roadmap.ts — 검증 함수 테스트

- **대상**: `validateToolFreeTier`, `validateCourseTools`, `validatePBLTools`, `validateCourseHours`, `validatePBLHours`, `validatePBLCourseSelection`, `validatePBLSelectionRationale`, `validatePBLDetailFields`, `validateRoadmap`
- **파일**: `src/lib/services/roadmap-validator.test.ts` (분리 전이라도 import 경로만 변경하면 됨)
- **이유**: 순수 함수, 경계값 테스트 필요, 9개 함수의 검증 규칙 고정
- [x] 완료

#### Session 1-3: roadmap.ts — 프롬프트 빌더 테스트

- **대상**: `buildSystemPrompt`, `buildUserPrompt`, `buildSttInsightsSection`, `formatSttInsights`
- **파일**: `src/lib/services/roadmap-prompts.test.ts`
- **이유**: 프롬프트 구조가 변경되면 LLM 출력이 달라짐, 스냅샷 테스트 권장
- [x] 완료

#### Session 1-4: matching.ts — 레거시 점수 계산 테스트

- **대상**: `calculateMatchingScore`, `calculateIndustryScore`, `calculateSubIndustryScore`, `calculateExpertiseScore`, `calculateSkillScore`, `calculateLevelScore`, `calculateExperienceScore`, `generateRationale`
- **파일**: `src/lib/services/matching.test.ts`
- **이유**: 레거시 삭제 전 동작 기록, 점수 범위(0~100) 경계값 검증
- **참고**: 레거시 제거 결정 시 이 테스트도 함께 삭제
- [ ] 완료

#### Session 1-5: llm.ts + quota.ts 테스트

- **대상 (llm)**: `getModelCapabilities`, `callLLM` (모킹), `callLLMForJSON` (JSON 파싱, 재시도)
- **대상 (quota)**: `getKSTDateTime`, `checkQuotaExceeded` (모킹), `recordLLMUsage` (모킹)
- **파일**: `src/lib/services/llm.test.ts`, `src/lib/services/quota.test.ts`
- **이유**: 모든 LLM 서비스의 기반, 모킹 패턴 확립
- [ ] 완료

#### Session 1-6: export-pdf.ts 테스트

- **대상**: `extractPBLExtendedFields`, `extractModuleDeliverables`, `formatBulletList`, `checkPageBreak`
- **파일**: `src/lib/services/export-pdf.test.ts`
- **이유**: 순수 함수 위주 테스트, PDF 렌더링은 스냅샷 불가하므로 데이터 변환 중심
- [ ] 완료

#### Session 1-7: export-xlsx.ts 테스트

- **대상**: `getStatusLabel`, `formatDate`, `buildCourseNumberMap`, `formatMatrixCell`, `sumMatrixHours`, `formatTools`, `calcRowHeight`, `formatHours`
- **파일**: `src/lib/services/export-xlsx.test.ts`
- **이유**: 포맷 유틸리티는 순수 함수, 한글 폭 계산 등 경계값 중요
- [ ] 완료

#### Session 1-8: stt.ts + notification.ts + audit.ts 테스트

- **대상 (stt)**: `validateSttTextSize`
- **대상 (notification)**: `createNotification` (모킹), `createNotificationForAdmins` (모킹)
- **대상 (audit)**: `createAuditLog` (모킹)
- **파일**: 각각 `.test.ts`
- **이유**: 작은 파일 묶어서 처리, DB 모킹 패턴 재활용
- [ ] 완료

#### Session 1-9~1-10: 주요 Server Actions 테스트 (선택)

- **대상**: `ops/projects/actions.ts`의 주요 함수 (createProject, assignConsultant)
- **전략**: Supabase 클라이언트 모킹 + ActionResult 반환값 검증
- **이유**: Phase 2에서 파일 분리 시 기능 보존 확인용
- [ ] 완료 (선택적)

#### Session 1-11~1-12: 대형 컴포넌트 테스트 (선택)

- **대상**: `AssignmentTabSection`, `ProjectDashboard` 등 렌더링 테스트
- **전략**: RTL로 주요 UI 요소 존재 확인 + 인터랙션 테스트
- **이유**: Phase 2에서 컴포넌트 분해 시 UI 보존 확인용
- [ ] 완료 (선택적)

---

## 5. Phase 2: 구조 리팩터링

> 목표: 대형 파일을 관심사별로 분해하여 유지보수성 향상

### 분해 후 목표 구조

#### 서비스 레이어

```
src/lib/services/
├── roadmap/
│   ├── index.ts                    # re-export (기존 import 경로 호환)
│   ├── roadmap-generator.ts        # generateRoadmap, generateTestRoadmap 등
│   ├── roadmap-validator.ts        # validate* 함수 9개
│   ├── roadmap-prompts.ts          # buildSystemPrompt, buildUserPrompt
│   ├── roadmap-time-utils.ts       # sumModuleHours, normalize* 함수
│   ├── roadmap-matrix-builder.ts   # buildRoadmapMatrixFromCourses
│   ├── roadmap-stt-formatter.ts    # STT 인사이트 포맷 5개 함수
│   ├── roadmap-test-helpers.ts     # buildTestProjectData 등 테스트 전용
│   └── roadmap-crud.ts             # finalizeRoadmap, getRoadmapVersions 등
├── matching/
│   ├── index.ts
│   ├── matching-llm.ts             # LLM 기반 매칭 (프로덕션)
│   └── matching-helpers.ts         # saveRecommendations 등 공통 헬퍼
├── export/
│   ├── pdf/
│   │   ├── index.ts
│   │   ├── pdf-generator.ts        # generatePDF 메인 (오케스트레이터)
│   │   ├── pdf-font-loader.ts      # 폰트 로딩
│   │   ├── pdf-helpers.ts          # 문서 헬퍼 13개 함수
│   │   ├── pdf-course-renderer.ts  # drawCourseDetail
│   │   └── pdf-constants.ts        # 레이아웃/스타일 상수
│   └── xlsx/
│       ├── index.ts
│       ├── xlsx-generator.ts       # generateXLSX, downloadXLSX
│       ├── xlsx-sheet-builder.ts   # createCtx 등 시트 빌더 13개 함수
│       ├── xlsx-formatter.ts       # 포맷 유틸 8개 함수
│       └── xlsx-styles.ts          # 색상/폰트/테두리 상수
├── llm.ts                          # 유지 (176줄, 적정 크기)
├── quota.ts                        # 유지 (332줄, 적정 크기)
├── stt.ts                          # 유지 (111줄)
├── notification.ts                 # 유지 (99줄)
├── audit.ts                        # 유지 (133줄)
└── email.ts                        # 유지
```

#### Server Actions

```
src/app/(dashboard)/ops/projects/
├── actions/
│   ├── index.ts                    # re-export (기존 import 호환)
│   ├── crud.ts                     # createProject, assignConsultant, createSelfAssessment
│   ├── queries.ts                  # fetchProjects, fetchProjectsWithTimeline, fetchProjectTimeline
│   ├── dashboard.ts                # fetchProjectStats, fetchMonthlyCompletions, fetchConsultantProgress, fetchStalledProjects
│   └── filters.ts                  # fetchProjectFilters, fetchConsultantCandidates, fetchConsultantFilterOptions

src/app/(auth)/
├── actions/
│   ├── index.ts
│   ├── auth.ts                     # registerUser, loginUser, logoutUser, getCurrentUser
│   ├── profile.ts                  # saveConsultantProfile, getConsultantProfile, updateConsultantProfile
│   ├── account.ts                  # changePassword, deleteAccount
│   └── admin.ts                    # updateUserStatus

src/app/(dashboard)/gallery/
├── actions/
│   ├── index.ts
│   ├── queries.ts                  # fetchGalleryRoadmaps, fetchRoadmapDetail, fetchEligibleProjects, fetchConsultantOptions
│   ├── interactions.ts             # toggleLike, toggleShare
│   └── copy.ts                     # copyRoadmapToProject
```

### 세션별 작업

#### Session 2-1: roadmap.ts — 순수 유틸리티 추출

- **추출 대상**:
  - `roadmap-time-utils.ts`: `sumModuleHours`, `normalizeCoursesHours`, `normalizePBLHours`, `normalizeRoadmapHours` (35줄)
  - `roadmap-matrix-builder.ts`: `buildRoadmapMatrixFromCourses` (39줄)
  - `roadmap-stt-formatter.ts`: `isSttInsights`, `hasItems`, `toMarkdownList`, `formatSttInsights`, `buildSttInsightsSection` (76줄)
- **검증**: 기존 테스트 통과 + `npm run validate`
- **위험도**: 낮음 (순수 함수, 의존성 없음)
- [ ] 완료

#### Session 2-2: roadmap.ts — 검증/프롬프트 추출

- **추출 대상**:
  - `roadmap-validator.ts`: `validate*` 함수 9개 (194줄)
  - `roadmap-prompts.ts`: `buildSystemPrompt`, `buildUserPrompt` (246줄)
- **검증**: 기존 테스트 통과
- **위험도**: 낮음 (자체 완결적 함수들)
- [ ] 완료

#### Session 2-3: roadmap.ts — 생성/CRUD 분리 + index.ts

- **추출 대상**:
  - `roadmap-generator.ts`: `generateRoadmap`, `generateTestRoadmap`, `reviseTestRoadmap` + 테스트 헬퍼
  - `roadmap-crud.ts`: `finalizeRoadmap`, `getRoadmapVersions`, `getRoadmapVersion`, `updateRoadmapManually`
  - `index.ts`: 모든 public 함수 re-export
- **검증**: 기존 테스트 통과 + 기존 import 경로 호환 확인
- **위험도**: 중간 (import 경로 변경 영향)
- [ ] 완료

#### Session 2-4: matching.ts — 레거시 제거 + 분리

- **작업**:
  1. 레거시 함수 사용처 확인 (`generateMatchingRecommendations` 등)
  2. 사용처 없으면 레거시 코드 삭제 (322줄 감소)
  3. `matching-llm.ts`, `matching-helpers.ts` 분리
  4. `index.ts` re-export
- **검증**: 기존 테스트 통과 + grep으로 사용처 재확인
- **위험도**: 중간 (레거시 삭제는 되돌리기 어려움 → 별도 커밋)
- [ ] 완료

#### Session 2-5: export-pdf.ts — 헬퍼/상수 추출

- **추출 대상**:
  - `pdf-constants.ts`: 레이아웃/스타일 상수 (84줄)
  - `pdf-font-loader.ts`: 폰트 로딩 3개 함수 (38줄)
  - `pdf-helpers.ts`: 문서 헬퍼 13개 함수 (131줄)
- **검증**: `npm run validate`
- **위험도**: 낮음 (독립적 함수들)
- [ ] 완료

#### Session 2-6: export-pdf.ts — 렌더러 분리 + index.ts

- **추출 대상**:
  - `pdf-course-renderer.ts`: `drawCourseDetail` + PBL 관련 렌더링
  - `pdf-generator.ts`: `generatePDF` (오케스트레이터 역할로 축소)
  - `index.ts`: re-export
- **검증**: PDF 생성 결과가 동일한지 수동 확인 권장
- **위험도**: 중간 (렌더링 순서/상태 의존)
- [ ] 완료

#### Session 2-7: export-xlsx.ts — 분리

- **추출 대상**:
  - `xlsx-styles.ts`: 스타일 상수 (155줄)
  - `xlsx-sheet-builder.ts`: 시트 빌더 13개 함수 (109줄)
  - `xlsx-formatter.ts`: 포맷 유틸 8개 함수 (71줄)
  - `xlsx-generator.ts`: 시트 생성 + 메인 함수
  - `index.ts`: re-export
- **검증**: XLSX 생성 결과 수동 확인 권장
- **위험도**: 낮음~중간
- [ ] 완료

#### Session 2-8: ops/projects/actions.ts 분리

- **분리 방향**:
  - `crud.ts`: createProject, assignConsultant, createSelfAssessment (3개, ~303줄)
  - `queries.ts`: fetchProjects, fetchProjectsWithTimeline, fetchProjectTimeline (3개, ~330줄)
  - `dashboard.ts`: fetchProjectStats, fetchMonthlyCompletions, fetchConsultantProgress, fetchStalledProjects (4개, ~225줄)
  - `filters.ts`: fetchProjectFilters, fetchConsultantCandidates, fetchConsultantFilterOptions (3개, ~160줄)
  - `index.ts`: re-export
- **주의**: `'use server'` 디렉티브를 각 파일 최상단에 추가
- **검증**: `npm run validate` + 관련 페이지 import 확인
- **위험도**: 중간 (Server Action 디렉티브 주의)
- [ ] 완료

#### Session 2-9: (auth)/actions.ts 분리

- **분리 방향**:
  - `auth.ts`: registerUser, loginUser, logoutUser, getCurrentUser + translateAuthError
  - `profile.ts`: saveConsultantProfile, getConsultantProfile, updateConsultantProfile + parseConsultantProfileFormData
  - `account.ts`: changePassword, deleteAccount + getVerifiedUser
  - `admin.ts`: updateUserStatus
  - `index.ts`: re-export
- **검증**: 로그인/회원가입 플로우 수동 테스트 권장
- **위험도**: 중간 (인증 관련 → 신중하게)
- [ ] 완료

#### Session 2-10: gallery/actions.ts 분리

- **분리 방향**:
  - `queries.ts`: fetchGalleryRoadmaps, fetchRoadmapDetail, fetchEligibleProjects, fetchConsultantOptions
  - `interactions.ts`: toggleLike, toggleShare
  - `copy.ts`: copyRoadmapToProject + extractTags
  - `index.ts`: re-export
- **검증**: `npm run validate`
- **위험도**: 낮음
- [ ] 완료

#### Session 2-11: 공통 Actions 헬퍼 추출

- **새 파일**: `src/lib/actions/auth-helpers.ts`
- **추출 대상** (3개 이상 파일에서 중복):
  - `requireAuth()` — 세션 확인 공통 패턴
  - `requireRole(userId, allowedRoles)` — 역할 검사 공통 패턴
  - `requireConsultantProjectAccess(projectId, userId)` — 컨설턴트 접근 검증
- **적용**: 기존 actions 파일에서 중복 코드를 공통 헬퍼로 교체
- **주의**: 기존 에러 메시지/반환 형식 동일하게 유지
- **검증**: `npm run validate`
- **위험도**: 중간 (다수 파일 동시 변경)
- [ ] 완료

#### Session 2-12: AssignmentTabSection.tsx 분리

- **추출 대상**:
  - 유틸 함수 → `utils/assignment.ts` (`parseRationale`, `getScoreColorClass` 등)
  - `SelectableCard` → 별도 파일
  - `RecommendationResults` → 별도 파일
  - API 호출 로직 → `useAssignmentMatching` 커스텀 훅
- **검증**: UI 수동 확인
- **위험도**: 중간
- [ ] 완료

#### Session 2-13: ProjectDashboard.tsx 분리

- **추출 대상**:
  - `StatusDistributionChart` → 별도 파일
  - `MonthlyCompletionChart` → 별도 파일
  - `ConsultantProgressTable` → 별도 파일
  - `StalledProjectsSection` → 별도 파일
  - 데이터 fetch → `useProjectDashboard` 커스텀 훅
- **검증**: UI 수동 확인
- **위험도**: 중간
- [ ] 완료

#### Session 2-14: TestRoadmapClient.tsx 분리

- **추출 대상**:
  - 24개 useState → `useTestRoadmapForm` 커스텀 훅 (useReducer 도입 검토)
  - 액션 함수 → `useTestRoadmapActions` 커스텀 훅
  - 스텝 검증 → `useStepValidator` 커스텀 훅
  - 네비게이션 → `TestRoadmapNavigation` 별도 컴포넌트
- **검증**: 테스트 로드맵 전체 플로우 수동 확인
- **위험도**: 높음 (상태 24개, 상호의존 복잡)
- [ ] 완료

#### Session 2-15: SelfAssessmentForm.tsx + ActivityLog.tsx (선택)

- **SelfAssessmentForm**:
  - 질문 타입별 컴포넌트 (Scale5Input, Scale10Input, MultipleChoiceInput, TextInput) 추출
  - `NavigationButtons` 별도 컴포넌트
- **ActivityLog**:
  - `LogItem` → 별도 파일
  - `useActivityLogs` 커스텀 훅
- **위험도**: 낮음~중간
- [ ] 완료 (선택적)

---

## 6. Phase 3: 일관성 정리

> 목표: 코드베이스 전반의 패턴, 네이밍, 구조를 통일

### 세션별 작업

#### Session 3-1: Server Action 패턴 통일

- **작업**: 15개 actions 파일의 공통 패턴을 확인하고 통일
  - 세션 확인 → 공통 헬퍼 사용 (Session 2-11에서 추출한 것)
  - 에러 처리 → `try-catch` + `ActionResult` 반환 형식 통일
  - 캐시 무효화 → `revalidatePath` 패턴 통일
- [ ] 완료

#### Session 3-2: 에러 처리 패턴 통일

- **작업**: 에러 메시지 형식, console.error 로깅 형식 통일
  - `[FunctionName Error]` 로깅 패턴 적용
  - `error instanceof Error ? error.message : '기본 메시지'` 패턴 통일
  - 에러 메시지 상수화 검토
- [ ] 완료

#### Session 3-3: import 정리 + 미사용 코드 제거

- **작업**: 전체 프로젝트 대상
  - `npm run lint` 경고 중 미사용 import 제거
  - import 순서 통일 (외부 → 내부 → 상대경로)
  - 미사용 변수/함수 제거
- [ ] 완료

#### Session 3-4: 타입 정리

- **작업**:
  - actions 파일 내 인라인 타입 → 별도 types 파일로 추출
  - 중복 타입 정의 통합
  - `as` 타입 단언 최소화 검토
- [ ] 완료

#### Session 3-5: 네이밍 일관성

- **작업**:
  - 함수명: `fetch*` vs `get*` 통일 (DB 조회 = `fetch`, 동기 계산 = `get`)
  - 파일명: kebab-case 통일 확인
  - 컴포넌트명: PascalCase 확인
  - 상수명: UPPER_SNAKE_CASE 확인
- [ ] 완료

#### Session 3-6~3-8: 세부 정리 (필요시)

- **후보 작업**:
  - 매직 넘버 상수화 (추가 발견분)
  - JSDoc 정리 (핵심 public 함수에만)
  - 린트 규칙 강화 검토
  - README/문서 업데이트
- [ ] 완료

---

## 7. 세션 체크리스트 템플릿

매 세션에서 아래 순서를 따릅니다:

```markdown
### Session X-Y: [작업명]

#### 시작 전
- [ ] 계획서에서 이번 작업 확인
- [ ] 해당 파일 현재 상태 읽기
- [ ] 기존 테스트 실행 (있는 경우)
- [ ] 현재 상태 커밋 (uncommitted 변경이 있다면)

#### 작업 중
- [ ] 관련 스킬 호출 (TDD, check-server-action, frontend-guide 등)
- [ ] (Phase 1) 테스트 작성 / (Phase 2~3) 리팩터링 수행
- [ ] 변경 범위가 계획을 넘지 않는지 확인

#### 완료 전
- [ ] `npm run validate` 통과 (typecheck + lint + test)
- [ ] 기존 테스트 전체 통과 확인
- [ ] verification-before-completion 스킬 호출
- [ ] 커밋 (refactor: / test: 타입)
- [ ] 계획서 체크 표시 업데이트
```

---

## 8. 진행 추적표

| Phase | Session | 작업 | 상태 |
|-------|---------|------|------|
| 1 | 1-1 | roadmap.ts 순수 함수 테스트 | 완료 |
| 1 | 1-2 | roadmap.ts 검증 함수 테스트 | 완료 |
| 1 | 1-3 | roadmap.ts 프롬프트 빌더 테스트 | 완료 |
| 1 | 1-4 | matching.ts 레거시 점수 계산 테스트 | - |
| 1 | 1-5 | llm.ts + quota.ts 테스트 | - |
| 1 | 1-6 | export-pdf.ts 테스트 | - |
| 1 | 1-7 | export-xlsx.ts 테스트 | - |
| 1 | 1-8 | stt.ts + notification.ts + audit.ts 테스트 | - |
| 1 | 1-9~10 | Server Actions 테스트 (선택) | - |
| 1 | 1-11~12 | 컴포넌트 테스트 (선택) | - |
| 2 | 2-1 | roadmap.ts 순수 유틸리티 추출 | - |
| 2 | 2-2 | roadmap.ts 검증/프롬프트 추출 | - |
| 2 | 2-3 | roadmap.ts 생성/CRUD 분리 | - |
| 2 | 2-4 | matching.ts 레거시 제거 + 분리 | - |
| 2 | 2-5 | export-pdf.ts 헬퍼/상수 추출 | - |
| 2 | 2-6 | export-pdf.ts 렌더러 분리 | - |
| 2 | 2-7 | export-xlsx.ts 분리 | - |
| 2 | 2-8 | ops/projects/actions.ts 분리 | - |
| 2 | 2-9 | (auth)/actions.ts 분리 | - |
| 2 | 2-10 | gallery/actions.ts 분리 | - |
| 2 | 2-11 | 공통 Actions 헬퍼 추출 | - |
| 2 | 2-12 | AssignmentTabSection.tsx 분리 | - |
| 2 | 2-13 | ProjectDashboard.tsx 분리 | - |
| 2 | 2-14 | TestRoadmapClient.tsx 분리 | - |
| 2 | 2-15 | SelfAssessmentForm + ActivityLog (선택) | - |
| 3 | 3-1 | Server Action 패턴 통일 | - |
| 3 | 3-2 | 에러 처리 패턴 통일 | - |
| 3 | 3-3 | import 정리 + 미사용 코드 제거 | - |
| 3 | 3-4 | 타입 정리 | - |
| 3 | 3-5 | 네이밍 일관성 | - |
| 3 | 3-6~8 | 세부 정리 (선택) | - |

> **상태 표기**: `-` 미시작 / `진행중` / `완료` / `건너뜀`
