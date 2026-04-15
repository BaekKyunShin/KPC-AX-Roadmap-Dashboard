# 산인공 공식 양식 정렬 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (권장) 또는 `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드의 로드맵/PBL 산출 흐름을 한국산업인력공단(산인공) 공식 양식에 100% 일치시키고, 한글 파일(HWPX) 자동 생성 기능을 추가한다.

**Architecture:**
- 프로젝트를 **트랙(ROADMAP / PBL)** 단위로 분리하여 각 트랙이 독립적인 인터뷰·산출물·상태 머신을 가지도록 재설계한다.
- HWPX 생성은 **Vercel Python Functions**에서 `python-hwpx` 라이브러리를 통해 수행하고, Next.js Server Action이 이 함수를 호출한다.
- 공지 게시판은 Supabase Storage를 첨부파일 저장소로 사용하는 독립 기능으로 추가한다.

**Tech Stack:**
- Next.js 16 App Router + React 19 + TypeScript 5
- Supabase (Postgres + RLS + Storage)
- Vercel (Node.js + Python 3.13 Fluid Compute)
- `python-hwpx`, `lxml` (HWPX 생성)
- Vitest + Playwright (테스트)
- Zod (스키마 검증), shadcn/ui + Radix + Tailwind (UI)

---

## 🔴 Iron Law: Test-Driven Development 필수

이 계획서의 모든 프로덕션 코드는 **실패하는 테스트를 먼저 작성한 후** 구현한다.

### TDD 사이클 (매 Task 적용)
1. **RED** — 실패하는 테스트를 먼저 작성한다.
2. **Verify RED** — 테스트를 실행해 **올바른 이유로 실패**하는지 확인한다(기능 미구현이 원인, 오타·import 누락이 아닌).
3. **GREEN** — 테스트를 통과하는 **최소한의 코드**를 작성한다. 과잉 설계 금지.
4. **Verify GREEN** — 신규 테스트 통과 + 기존 테스트 회귀 0 확인.
5. **REFACTOR** — 중복 제거, 이름 개선 등 정리. 녹색 유지.

### 테스트 생략 허용 대상 (예외)
- 설정 파일: `vercel.json`, `tsconfig.json`, `.gitignore`, `.python-version`, `requirements.txt`, `package.json`
- 데이터베이스 마이그레이션 DDL (단, 애플리케이션 쪽 스키마/서비스는 테스트 필수)
- HWPX 템플릿 파일 (`templates/hwpx/*.hwpx`)
- 정적 자산(이미지·폰트), 순수 타입 정의 파일

### 위반 시 처리
실패하는 테스트 없이 작성된 프로덕션 코드는 **즉시 삭제 후 TDD로 재작성**한다. "레퍼런스로 남겨두기"·"이미 수작업으로 검증했음" 등 모두 사유로 인정하지 않는다.

### 각 Task의 체크리스트 (모든 구현 Task에 암묵적 적용)
- [ ] RED — 테스트 작성
- [ ] Verify RED — `npm run test <대상>` 실행해 FAIL 확인
- [ ] GREEN — 최소 구현
- [ ] Verify GREEN — `npm run test <대상>` PASS + 기존 테스트 회귀 없음
- [ ] REFACTOR — 정리

---

## 참조 문서

- `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf` · `.hwpx`
- `docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf` · `.hwpx`
- `docs/references/3.2026년 중소기업AI훈련확산센터 업무 매뉴얼(안).pdf` · `.hwpx`
- 외부 스킬: [hwpx-docgen](https://github.com/BaekKyunShin/Automation-Claude-Skills/tree/main/.claude/skills/hwpx-docgen)

---

## 0. 배경 및 확정 결정사항 (브레인스토밍 결과)

| # | 항목 | 결정 |
|---|---|---|
| 1 | PBL 산출물 | 로드맵과 **독립 산출물** |
| 2 | 프로젝트 단위 | **기업 × 트랙** (완전 분리, track 컬럼으로 구분) |
| 3 | 진단 기능 | **현 상태 유지** (처리 방침 추후 결정) |
| 4 | HWPX 생성 인프라 | **Vercel Python Functions** |
| 5 | 기존 실데이터 | **없음** → 재설계 자유 |
| 6 | 결과물 제출 목업 5종 | `/mockup/*` 경로에 **그대로 보존** |
| 7 | 트랙 선택 시점 | **프로젝트 생성 시** |
| 8 | 인터뷰 항목 | **산인공 양식 100% 충실 재설계** |
| 9 | 공지 게시판 | OPS_ADMIN + SYSTEM_ADMIN 작성 / 컨설턴트·운영자 조회 / 20MB / 제목·작성자 필터 검색 / 상단 고정·조회수 지원 |
| 10 | 갤러리·테스트 페이지 | 로드맵·PBL 양쪽 지원, 트랙 라벨·필터 추가 |
| 11 | HRD4U 자동 필드 | **수기 입력** (추후 변경 가능) |

**브랜치 전략:**
- 메인 작업 브랜치: `feature/official-form-alignment`
- 각 Step은 서브 브랜치(`feature/ofa-<번호>-<설명>`)에서 작업 후 메인 작업 브랜치로 PR 병합
- 모든 작업 완료 후 `feature/official-form-alignment` → `main` 최종 병합

**브랜치·배포 안전장치 (절대 위반 금지):**

본 개편은 대규모이며 기존 프로덕션에 직접 영향을 줘서는 안 된다. Claude/에이전트가 자율 실행해도 다음 4가지 보장은 **어떤 상황에서도 깨지 않는다**.

- **(a) 서브 브랜치 PR의 단일 타깃.** 모든 서브 브랜치 PR은 **오직 `feature/official-form-alignment`** 를 base로 생성한다. 서브 브랜치를 `main`으로 직접 PR하는 행위는 금지. `gh pr create --base main` 명령은 Step 12의 최종 머지 PR 단 1회에만 사용한다.
- **(b) main 병합 타이밍 고정.** `feature/official-form-alignment` → `main` 병합 PR은 **Step 12 최종 QA의 모든 체크리스트(§8)가 통과된 후에만** 생성한다. Step 1~11 어느 시점에서도 main 쪽 PR은 존재해서는 안 된다.
- **(c) 서브 브랜치는 Preview 전용.** 각 서브 브랜치 푸시는 Vercel **Preview URL만 생성**하며, 프로덕션 자동 배포가 일어나지 않는다. 이를 위해 Vercel 프로젝트의 "Production Branch" 설정이 `main` 단일로 고정되어 있는지 Step 1에서 반드시 확인한다.
- **(d) 사람 승인 전 자동 머지 금지.** 어떤 PR도 팀장(프로젝트 책임자) 직접 승인 없이 자동 머지 스크립트·`gh pr merge --auto`·봇 라벨링 등으로 머지해서는 안 된다. Squash/Rebase 머지 명령은 인간 승인 코멘트 확인 후에만 Claude가 실행한다.

**위반 탐지·롤백 트리거:**
- Step 1 Task 1 직후, **Vercel 대시보드 → Project Settings → Git → Production Branch** 필드가 `main` 단일로 고정되어 있는지 확인하고 스크린샷 또는 텍스트 기록(§8 배포 체크리스트에 재검증). CLI 대안으로 `vercel git ls`(가능 환경 한정) 또는 `cat .vercel/project.json`(`vercel link` 후) 시도.
- 서브 브랜치 PR 생성 시 Claude는 `gh pr create --base feature/official-form-alignment` 를 **하드코딩**한다. base가 `main`인 PR이 의심되면 즉시 close·재생성.
- `feature/official-form-alignment`의 HEAD는 Step 1~11 동안 원격에 푸시되지만, **태그·릴리스 생성 금지**(프로덕션 트리거 오인 방지).

---

## 1. 전체 파일 구조 (신규·변경 요약)

### 1-1. DB 마이그레이션 (신규 SQL 파일)

```
supabase/migrations/
├── 060_add_project_track.sql          # projects.track 컬럼 + project_track ENUM
├── 061_add_pbl_reports.sql            # pbl_reports 테이블 + pbl_likes 테이블 + 트리거 + RLS + pbl_report_status ENUM
├── 062_add_notices.sql                # notices + notice_attachments + Storage 버킷 + RLS
├── 063_add_interview_pbl_data.sql     # interviews.pbl_data JSONB 컬럼 (PBL 트랙 전용)
└── 064_add_project_status_pbl.sql     # project_status ENUM에 'PBL_DRAFTED' 값 추가
```

### 1-2. 스키마/서비스 레이어 (신규)

```
src/lib/
├── schemas/
│   ├── interview-roadmap.ts           # [신규] 로드맵 트랙 인터뷰 (산인공 양식) + 매핑 헬퍼
│   ├── interview-pbl.ts               # [신규] PBL 트랙 인터뷰 (산인공 양식)
│   └── notice.ts                      # [신규] 공지 게시판 스키마
├── services/
│   ├── pbl/                           # [신규] PBL 생성 서비스 (로드맵 디렉터리와 평행 구조)
│   │   ├── index.ts
│   │   ├── pbl-prompts.ts
│   │   ├── pbl-generator.ts
│   │   ├── pbl-crud.ts
│   │   ├── pbl-validator.ts
│   │   └── pbl-types.ts
│   ├── export/hwpx/                   # [신규] HWPX 내보내기 Node 측 클라이언트
│   │   ├── index.ts
│   │   ├── hwpx-client.ts             # Python 함수 호출 + X-HWPX-Secret 헤더 (Step 7, Step 10에서 리팩터)
│   │   ├── hwpx-payload-roadmap.ts    # 로드맵 데이터 → HWPX JSON (Step 7)
│   │   └── hwpx-payload-pbl.ts        # PBL 데이터 → HWPX JSON (Step 10)
│   ├── export/pdf/                    # [기존 + 신규 PBL 렌더러]
│   │   ├── pdf-generator.ts           # [변경] generatePBLPDF 신규 export 추가 (Step 9 Task 17). 기존 generatePDF 시그니처 유지.
│   │   ├── pdf-pbl-renderer.ts        # [신규] PBL 섹션별 렌더러 (Step 9 Task 17)
│   │   ├── pdf-competency-renderer.ts # [신규] 로드맵 역량 모델링 렌더러 (Step 6 Task 13)
│   │   ├── pdf-structure-renderer.ts  # [신규] 로드맵 훈련체계도 렌더러 (Step 6 Task 13)
│   │   ├── pdf-annual-renderer.ts     # [신규] 로드맵 연간계획 렌더러 (Step 6 Task 13)
│   │   ├── pdf-coursespec-renderer.ts # [신규] 로드맵 명세서 렌더러 (Step 6 Task 13)
│   │   └── index.ts                   # [변경] 신규 entry·타입 export
│   ├── export/xlsx/                   # [기존 + 신규 PBL 빌더]
│   │   ├── xlsx-generator.ts          # [변경] generatePBLXLSX/downloadPBLXLSX 신규 export 추가 (Step 9 Task 17). 기존 generateXLSX 시그니처 유지.
│   │   ├── xlsx-pbl-sheet-builder.ts  # [신규] PBL 시트 빌더 (Step 9 Task 17)
│   │   └── index.ts                   # [변경] 신규 entry export
│   └── notice.ts                      # [신규] 공지 CRUD 서비스
└── constants/
    ├── tracks.ts                      # [신규] PROJECT_TRACKS enum
    ├── interview-steps-roadmap.ts     # [신규] 로드맵 트랙 전용 스텝
    └── interview-steps-pbl.ts         # [신규] PBL 트랙 전용 스텝
```

### 1-3. 앱 라우트 (신규·변경)

```
src/app/(dashboard)/
├── consultant/projects/[id]/
│   ├── interview/page.tsx             # [변경] 트랙별 분기 라우팅
│   ├── pbl/                           # [신규] PBL 트랙 전용 라우트
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── actions.ts
│   │   ├── loading.tsx
│   │   └── _components/ConsultantPBLClient.tsx
├── ops/
│   ├── notices/                       # [신규] 공지 게시판 관리
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   ├── [id]/page.tsx
│   │   ├── [id]/edit/page.tsx
│   │   └── actions.ts
│   └── projects/[id]/
│       └── pbl/                       # [신규] 운영자용 PBL 뷰
├── notices/                           # [신규] 일반(컨설턴트) 조회
│   ├── page.tsx
│   └── [id]/page.tsx
├── gallery/
│   └── page.tsx                       # [변경] 트랙 필터/라벨 추가
└── test-pbl/                          # [신규] PBL 연습 페이지 (test-roadmap 평행)
```

### 1-3-B. UI 컴포넌트·훅·E2E (신규·변경)

```
src/components/
├── pbl/                              # [신규] PBL 산출물 UI (Step 9 + Step 10)
│   ├── PBLStatusBadge.tsx            # Step 9 Task 14 (RoadmapStatusBadge 패턴 + ROADMAP_VERSION_STATUS_CONFIG 재사용)
│   ├── PBLOverview.tsx               # Step 9 Task 8
│   ├── PBLTrainingTargets.tsx        # Step 9 Task 9
│   ├── PBLToolUsagePlan.tsx          # Step 9 Task 10
│   ├── PBLTrainingPlan.tsx           # Step 9 Task 11
│   ├── PBLEvaluationPlan.tsx         # Step 9 Task 12
│   ├── PBLPerformanceMetrics.tsx     # Step 9 Task 13
│   └── DownloadButton.tsx            # Step 9 Task 14 + Step 10 Task 9 (HWPX 추가)
├── notices/                          # [신규] 공지 게시판 UI (Step 4)
│   ├── NoticeList.tsx
│   ├── NoticeForm.tsx
│   ├── AttachmentUploader.tsx
│   └── AttachmentList.tsx
├── gallery/
│   └── TrackFilter.tsx               # [신규] 트랙 필터 토글 (Step 11 Task 3)
└── roadmap/
    ├── CompetencyModelingTable.tsx   # [신규] Step 6 Task 8
    ├── AnnualTrainingPlanTable.tsx   # [신규] Step 6 Task 10
    ├── CourseSpecCard.tsx            # [신규] Step 6 Task 11
    ├── RoadmapMatrix.tsx             # [변경] Step 6 Task 9 (훈련체계도 신구조)
    └── DownloadButton.tsx            # [변경] Step 7 Task 9 (HWPX 항목 추가)

src/hooks/
└── useHwpxDownload.ts                # [신규] Step 7 Task 9 (Step 10에서 PBL 재사용)

src/app/(dashboard)/
├── consultant/projects/[id]/interview/
│   ├── _components/RoadmapInterviewClient.tsx          # [신규] Step 5 Task 9
│   ├── _components/PBLInterviewClient.tsx              # [신규] Step 8 Task 14
│   ├── _components/roadmap/Step{CompanyRequirements,TaskWorkflowAnalysis,TrainingTargets}.tsx  # [신규] Step 5 Task 6~8
│   ├── _components/pbl/StepPBL{CourseOverview,CompanyStatus,TrainingEnvironment,ProblemDefinition,TargetTasks,AILevel,HrdNecessity,Summary}.tsx  # [신규] Step 8 Task 6~13 (8개)
│   └── _hooks/useInterviewAutoSave.ts                  # [신규] Step 5 Task 9 (기존 InterviewClient 인라인 로직 추출)
├── gallery/[id]/_components/
│   ├── GalleryDetailContent.tsx                        # [기존]
│   └── GalleryPBLDetailContent.tsx                     # [신규] Step 11 Task 4
└── test-pbl/                                           # [신규] Step 11 Task 7 (test-roadmap 평행)
    ├── TestPBLClient.tsx                               # 컨테이너는 루트 (test-roadmap 컨벤션)
    ├── _components/TestPBL*.tsx
    └── _hooks/useTestPBL*.ts

e2e/                                                    # [신규 spec 8개, 기존 spec 갱신 1개]
├── ops/notices.spec.ts                                 # [신규] Step 4 Task 9
├── consultant/interview-roadmap.spec.ts                # [신규] Step 5 Task 12
├── consultant/consultant-roadmap.spec.ts               # [변경] Step 6 Task 15 (기존 갱신)
├── consultant/interview-pbl.spec.ts                    # [신규] Step 8 Task 17
├── consultant/pbl-output.spec.ts                       # [신규] Step 9 Task 19
├── gallery/gallery-tracks.spec.ts                      # [신규] Step 11 Task 9
├── consultant/test-pbl.spec.ts                         # [신규] Step 11 Task 9
├── workflow/ofa-smoke.spec.ts                          # [신규] Step 12 Task 4
└── fixtures/pbl-interview-sample.ts                    # [신규] Step 11 Task 7
```

### 1-4. Vercel Python Functions (신규)

```
api/
└── hwpx/
    ├── ping.py                            # [신규] PoC 헬스체크 (Step 3)
    ├── generate.py                        # [신규] POST JSON → HWPX 바이너리 + X-HWPX-Secret 검증 + type 분기 (Step 3·7·10)
    ├── _placeholders_roadmap.py           # [신규] 로드맵 플레이스홀더 매핑 (Step 7)
    ├── _placeholders_pbl.py               # [신규] PBL 플레이스홀더 매핑 (Step 10)
    ├── _hwpx_helpers.py                   # [신규] 표 행 동적 삽입 등 공통 헬퍼 (Step 10에서 추출)
    └── requirements.txt                   # [신규] python-hwpx, lxml (Step 3)
templates/hwpx/                            # [신규] HWPX 템플릿 저장소
├── roadmap.hwpx                           # 산인공 양식 1번 (Step 7)
└── pbl.hwpx                               # 산인공 양식 2번 + 결과보고서 (Step 10)
vercel.json                                # [신규] Python runtime 명시 (Step 3 Task 4)
.python-version                            # [신규] 로컬 Python 버전 고정 (Step 3 Task 2)
.gitignore                                 # [변경] .venv/, __pycache__/, *.pyc 추가 (Step 3 Task 2)
src/app/api/hwpx-test/route.ts             # [신규→삭제] PoC용 일회성 라우트 (Step 3에서 신규, Step 12 Task 3에서 제거)

# 기타 OFA 신규 산출물:
docs/decisions/2026-04-14-hwpx-infrastructure.md   # [신규] HWPX 인프라 ADR (Step 3 Task 10)
docs/references/hwpx-structure-roadmap.md          # [신규] 양식 1번 구조 분석 (Step 7 Task 2)
docs/references/hwpx-structure-pbl.md              # [신규] 양식 2번 구조 분석 (Step 10 Task 2)
docs/references/hwpx-placeholders-pbl.md           # [신규] 양식 2번 플레이스홀더 설계 (Step 10 Task 2)
```

> 환경변수 (Vercel Production + Preview + Development 모두 등록): `HWPX_API_SECRET` (Step 3·7·10에서 사용)

### 1-5. 기존 코드 변경 대상 (중요)

| 파일 | 변경 내용 |
|---|---|
| `src/lib/constants/status.ts` | `PBL_DRAFTED` 상태 추가, 트랙별 상태 맵 분기 |
| `src/lib/schemas/interview.ts` | 기존 스키마는 유지하되 사용 중단 (마이그레이션 플래그), 신규 `interview-roadmap.ts`/`interview-pbl.ts`로 대체 |
| `src/lib/constants/interview-steps.ts` | 분기용 셀렉터로 축소, 스텝 정의는 트랙별 파일로 이관 |
| `src/lib/services/roadmap/roadmap-prompts.ts` | 로드맵 인터뷰 → 로드맵 산출물 프롬프트를 산인공 양식에 맞춤 |
| `src/lib/services/roadmap/roadmap-generator.ts` | Zod 출력 스키마 확장 (역량 모델링, 훈련체계도, 훈련과정 명세서 등) |
| `src/lib/services/roadmap/roadmap-crud.ts` | 기존 `pbl_course` 단일 과정 개념 제거 또는 deprecated 표시 |
| `src/lib/services/roadmap/roadmap-types.ts` | 산인공 양식 구조에 맞춘 타입 재정의 |
| `src/components/roadmap/*.tsx` | 로드맵 산출물 UI를 새 구조에 맞게 재구성 |
| `src/app/(dashboard)/ops/projects/new/page.tsx` | 프로젝트 생성 폼에 `track` 선택 필드 추가 |
| `src/app/(dashboard)/gallery/page.tsx` + `actions/` | 트랙 라벨·필터 추가 |
| `src/app/(dashboard)/test-roadmap/*` | 유지 (트랙 페이지 이름만 `test-roadmap`으로 고정) |
| `src/proxy.ts` | 필요 시 `/notices`, `/pbl` 경로 접근 제어 (Next.js 16 규약: middleware → **proxy**. 프로젝트는 이미 `src/proxy.ts` + `export async function proxy(request)` 구조로 전환됨. `src/middleware.ts`는 존재하지 않음) |
| `src/components/Navigation.tsx` | 공지·PBL 테스트 메뉴 항목 추가 (기존 단일 네비게이션 컴포넌트 — `layout/Sidebar.tsx` 같은 파일은 존재하지 않음) |

---

## 2. 서브 브랜치 로드맵

| Step | 서브 브랜치 | 주제 | 규모 (Task 수) | 독립 실행 가능 |
|---|---|---|---|---|
| 1 | — (메인 브랜치만) | 메인 브랜치 생성 + 계획서 커밋 + hwpx-docgen 스킬 설치 | XS (4) | — |
| 2 | `feature/ofa-02-schema-foundation` | DB 기반 (트랙·PBL 테이블·공지 테이블·상태 enum) + 프로젝트 생성 UI | M (15) | ✅ |
| 3 | `feature/ofa-03-hwpx-poc` | Vercel Python Functions + uv 가상환경 + python-hwpx PoC | S (12) | ✅ |
| 4 | `feature/ofa-04-notices-board` | 공지 게시판 (독립 기능, Step 3과 병렬 가능) | M (10) | ✅ |
| 5 | `feature/ofa-05-interview-roadmap` | 로드맵 인터뷰 산인공 양식 재설계 | L (13) | ⚠️ (Step 2 의존) |
| 6 | `feature/ofa-06-output-roadmap` | 로드맵 산출물 양식 정렬 (LLM 프롬프트 + UI) | L (16) | ⚠️ (Step 5 의존) |
| 7 | `feature/ofa-07-hwpx-roadmap` | 로드맵 HWPX 템플릿 + 내보내기 연결 | M (11) | ⚠️ (Step 3, 6 의존) |
| 8 | `feature/ofa-08-interview-pbl` | PBL 트랙 인터뷰 신규 (8스텝 위저드) | L (18) | ⚠️ (Step 2 + Step 5 의존 — Step 5의 useInterviewAutoSave·InterviewStepper 재사용) |
| 9 | `feature/ofa-09-output-pbl` | PBL 산출물 신규 (LLM, UI, CRUD, 내보내기) | XL (20) | ⚠️ (Step 8 의존) |
| 10 | `feature/ofa-10-hwpx-pbl` | PBL HWPX 템플릿 + 내보내기 연결 | M (11) | ⚠️ (Step 3, 9 의존) |
| 11 | `feature/ofa-11-gallery-test-track` | 갤러리 트랙 라벨·필터, PBL 테스트 페이지 | M (10) | ⚠️ (Step 9 의존) |
| 12 | `feature/ofa-12-final-qa-docs` | E2E, 문서, 배포 점검 | M (10) | ⚠️ (전부 의존) |

**병렬화 가능 구간**: Step 3 + Step 4는 Step 2 머지 후 병렬 시작 가능. `superpowers:dispatching-parallel-agents` 활용.

---

## 3. 스킬·MCP·서브에이전트 활용 지침

### 3-1. 모든 Step 공통 준수 사항

1. **개시 시점**: `superpowers:using-superpowers` (세션 시작 훅으로 자동 로드)
2. **구현 전**: `superpowers:test-driven-development` — RED → Verify RED → GREEN → Verify GREEN → REFACTOR. **위 섹션 "Iron Law" 반드시 준수.**
3. **완료 전**: `superpowers:verification-before-completion` — `npm run validate && npm run build` 통과 확인
4. **브랜치 마무리**: `superpowers:finishing-a-development-branch`
5. **PR 생성**: `superpowers:requesting-code-review` → `code-review:code-review` 스킬로 자가 리뷰

### 3-1-A. 실행 모드 원칙 (서브에이전트 vs team)

- **기본값: `superpowers:subagent-driven-development`** — 각 Task마다 fresh 서브에이전트를 디스패치. 이유:
  - 12단계의 Step 경계가 뚜렷하고 Task 간 공유 상태 거의 없음
  - Context 오염 방지 (긴 대화로 인한 품질 저하 차단)
  - 리뷰 체크포인트가 Task 단위로 깔끔
  - 병렬화 가능 구간(Step 3 ↔ Step 4)에 자연스럽게 적용
- **Team-mode 미사용.** 다만 `prompt-engineer` 같이 **동일 specialist를 여러 Step에서 반복 호출**할 때는 동일 `name` 지정으로 재소환해 맥락 연속성을 확보한다(공식 Team 생성은 하지 않음).
- **자동화 체크**: 독립 가능한 2+ Task가 한 Step 안에 있으면 `superpowers:dispatching-parallel-agents` 평가.

### 3-2. Step별 필수 호출 스킬

| Step | 호출 스킬 | 이유 |
|---|---|---|
| 2 | `supabase-dev`, `security-auditor`(서브에이전트), `postgres-pro`(서브에이전트) | 마이그레이션·RLS·인덱스 |
| 3 | `hwpx-docgen`(외부), Context7 MCP (`python-hwpx` 문서) | HWPX 도구 이해 |
| 4 | `frontend-guide`, `check-server-action`, `web-design-guidelines`, `react-best-practices`, shadcn MCP | 게시판 UI/폼/테이블 |
| 5 | `frontend-guide`, `composition-patterns`, `check-server-action`, `react-best-practices` | 인터뷰 스텝 위저드 설계 |
| 6 | `prompt-engineer`(서브에이전트), `check-server-action`, `frontend-guide`, `react-best-practices` | 로드맵 LLM 프롬프트·UI |
| 7 | `hwpx-docgen`, `supabase-dev`(Storage 사용 시) | HWPX 템플릿 제작 |
| 8 | `frontend-guide`, `composition-patterns`, `check-server-action`, `react-best-practices` | PBL 인터뷰 위저드 |
| 9 | `prompt-engineer`(서브에이전트), `check-server-action`, `frontend-guide`, `composition-patterns`, `react-best-practices` | PBL 산출물 생성 체계 |
| 10 | `hwpx-docgen` | PBL HWPX |
| 11 | `frontend-guide`, `composition-patterns`, `react-best-practices` | 갤러리 트랙 필터 |
| 12 | `test-automator`(서브에이전트), `performance-engineer`(서브에이전트), `security-auditor`(서브에이전트), Playwright MCP | E2E·성능·보안 최종 감사 |

### 3-3. MCP 활용 매트릭스

| MCP | 활용 구간 |
|---|---|
| **sequential-thinking** | 복잡한 설계 결정(예: 상태 머신 변경, RLS 정책 조정) |
| **Context7** | `python-hwpx`, `@vercel/python`, Next.js 16 Cache Components, shadcn 최신 문서 |
| **serena** | 대규모 리팩터링 시 심볼 탐색·edit (예: Step 6 기존 로드맵 서비스 수정) |
| **supabase** | 마이그레이션 적용, 브랜치 생성, SQL 디버깅 |
| **shadcn** | 게시판 테이블, 파일 업로드, 페이지네이션 컴포넌트 설치 |
| **playwright** (plugin) | Step 12에서 E2E 스모크 테스트 자동화 |
| **puppeteer** | dev 서버 시각 확인 필요 시 (보조) |

---

### 3-4. 공통 UI/UX 재사용 원칙 (모든 UI 관련 Step의 기본 계약)

본 개편으로 **신규 페이지·컴포넌트가 대거 추가**된다. 기존 대시보드와 시각·상호작용 일관성을 유지하기 위해 아래 원칙은 **Step 2·4·5·6·7·8·9·10·11·12의 UI 관련 Task 전부에 공통 적용**된다. 각 Step의 완료 조건에 "공통 원칙 체크리스트 통과"가 **암묵적으로 포함**되어 있다고 간주한다.

#### 3-4-1. 스켈레톤·로딩 상태
- **단일 컴포넌트**: 모든 스켈레톤은 `src/components/ui/Skeleton.tsx`만 사용한다 (최근 커밋 `5842a91`에서 shimmer를 이 컴포넌트로 통일). 임의 Tailwind `animate-pulse` 블록으로 스켈레톤을 **인라인 작성하지 않는다**.
- **loading.tsx 배치**: 신규 라우트마다 `loading.tsx`를 배치하고, 실제 UI 구조(헤더/카드/테이블 등)와 1:1로 매핑되는 Skeleton 조합을 렌더한다 (최근 `운영관리 스켈레톤` 커밋 `0277709` 패턴 준수).
- **Suspense fallback**: 동적 import + Suspense 경계에서도 동일 `Skeleton` 사용.

#### 3-4-2. 폼·입력 컴포넌트
- **shadcn/ui 강제**: `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Label`, `Tabs`, `Dialog`, `DropdownMenu`, `Popover`, `Alert`, `Card`, `Separator`, `Table`, `Badge`, `Avatar` — 모두 `src/components/ui/*`에 이미 존재한다. **순수 HTML `<input>`·`<select>`·`<button>`은 사용 금지**. 해당 엘리먼트가 필요하면 shadcn 래퍼를 추가하거나 기존 래퍼를 재사용한다.
- **검증**: Zod + **네이티브 HTML 폼**(`<form action={serverAction}>`) 패턴. **React Hook Form은 사용하지 않는다** (CLAUDE.md 명시, 프로젝트 컨벤션).
- **에러 표시**: 필드 하단에 `src/components/ui/field-error.tsx` 재사용. 빨간 테두리·aria-invalid 동시 적용.
- **동적 배열 UI**(인터뷰 Step 컴포넌트 다수): `TagInput` 또는 프로젝트 내 기존 동적 배열 패턴(`StepJobTasks.tsx`, `StepPainPoints.tsx` 참고)을 재사용. 새 원시 구현 금지.

#### 3-4-3. 토스트·피드백
- **전역 헬퍼만 사용**: `src/lib/utils/toast.ts`의 `showErrorToast`, `showSuccessToast`. 직접 `toast.error(...)` 호출 금지 (로그·i18n 일관성 확보).
- **서버 액션 결과 ↔ 토스트 매핑**: `ActionResult`는 `{ success: true; data } | { success: false; error }` 형태(프로젝트 공식 타입; `src/lib/types/action-result.ts`). `result.success === false`이면 `showErrorToast(result.error)`, 성공이면 고정 성공 메시지 `showSuccessToast(...)`. `.ok` 같은 필드 이름을 도입하지 않는다.

#### 3-4-4. 공용 레이아웃 컴포넌트
- **페이지 상단**: `src/components/ui/page-header.tsx`의 `PageHeader`를 신규 페이지 전부에 사용. 임의의 `<h1>` + 설명 블록 금지.
- **빈 상태**: `src/components/ui/EmptyState.tsx` 재사용 (아이콘·문구·CTA 인터페이스 고정).
- **페이지네이션**: `src/components/ui/Pagination.tsx`. 갤러리·공지·테이블 목록 모두 동일 컴포넌트.
- **검색 입력**: `src/components/ui/SearchInput.tsx` (디바운스·clear 버튼 내장).
- **네비게이션**: 전체 대시보드 네비게이션은 **`src/components/Navigation.tsx` 단일 컴포넌트**가 담당한다. `layout/Sidebar.tsx`는 **존재하지 않는다** — 다른 경로를 가정해 신규 파일을 만들지 말 것.

#### 3-4-5. 디자인 토큰·색상
- **Tailwind 4.x 토큰 우선**: `bg-primary`, `text-muted-foreground`, `border-border` 등 시맨틱 토큰 사용. 임의 HEX(`#3366ff` 등)나 raw Tailwind 색상(`bg-blue-500`)은 **상태 뱃지·카테고리 라벨처럼 의미가 명시적인 경우에만 제한적으로** 허용하며, 반드시 `src/lib/constants/status.ts` 또는 유사 상수 파일에 집중 관리한다.
- **상태 뱃지**: `src/components/roadmap/RoadmapStatusBadge.tsx` 패턴 재사용. PBL 상태 뱃지(`src/components/pbl/PBLStatusBadge.tsx`)도 동일 구조·동일 `status.ts` 색상 맵을 그대로 사용한다.
- **트랙 뱃지**: 로드맵 vs PBL 구분은 **일관된 색상 쌍**을 `src/lib/constants/tracks.ts`에 정의해 갤러리 카드·프로젝트 상단·페이지 헤더 모든 곳에서 동일 색상을 재사용(예: ROADMAP=blue, PBL=purple).

#### 3-4-6. 반응형·모바일
- 기존 프로젝트는 **모바일 반응형 Batch 0~6 완료**(`docs/plans/2026-02-19-mobile-responsive-spec.md`). 신규 페이지·테이블은 해당 문서의 브레이크포인트(sm/md/lg) 규칙을 그대로 따른다.
- 테이블 밀도가 높은 영역(역량 매트릭스·AI도구 활용계획 표 등)은 모바일에서 **가로 스크롤 허용** + 상단 헤더 고정.

#### 3-4-7. 접근성(a11y) — 최종 감사 대상
- 모든 폼 컨트롤은 `<Label htmlFor>` 또는 `aria-labelledby`로 라벨 연결.
- 라디오 그룹(AI 필요도 1~5 등)은 `role="radiogroup"` + 화살표 키 이동 지원.
- Dialog·DropdownMenu 등은 shadcn 기본 포커스 트랩을 그대로 사용(별도 커스텀 금지).
- Step 12 Task 8의 `web-design-guidelines` 스킬이 전체 접근성을 최종 감사한다.

#### 3-4-8. 각 UI Step 완료 체크리스트 (공통)

UI를 추가·변경하는 Task 완료 시 **다음 항목 전부 충족**을 자가 점검한다:

- [ ] 신규 페이지·섹션에 `loading.tsx` 제공 + `Skeleton` 컴포넌트 재사용
- [ ] 모든 인터랙티브 요소가 `src/components/ui/*` 또는 기존 도메인 컴포넌트에서 import
- [ ] 폼 검증은 Zod + 네이티브 HTML + `field-error`
- [ ] 성공/실패 피드백은 `showSuccessToast`/`showErrorToast`
- [ ] `PageHeader`, `EmptyState`, `Pagination`, `SearchInput` 중 해당하는 공용 컴포넌트 사용
- [ ] 색상은 시맨틱 토큰 또는 `status.ts`/`tracks.ts` 상수
- [ ] 모바일 브레이크포인트 확인(sm/md/lg)
- [ ] ARIA·라벨·키보드 이동 동작
- [ ] `web-design-guidelines` 스킬 권고 사항(필요 시) 반영

이 체크리스트가 통과하지 않으면 해당 Task는 **완료로 간주하지 않는다**.

---

## 4. Step별 상세 구현 계획

> 각 Step은 **서브 브랜치 1개 = PR 1개** 단위. Task는 bite-sized(2~5분) 수준으로 세분화.
> Step 진입 전 반드시:
> ```bash
> git checkout feature/official-form-alignment
> git pull
> git checkout -b feature/ofa-<번호>-<설명>
> ```

---

### Step 1: 메인 브랜치 생성 + 계획서 커밋 + hwpx-docgen 스킬 설치

**파일:**
- 신규: 본 계획서 (`docs/plans/2026-04-14-official-form-alignment.md`)
- 신규: `docs/references/` 내 PDF·HWPX (이미 존재)
- 신규: `.claude/skills/hwpx-docgen/` 전체 디렉터리 (외부 레포에서 복사)

- [ ] **Task 1: 메인 브랜치 생성 + Vercel Production Branch 안전 확인**

```bash
git checkout main
git pull origin main
git checkout -b feature/official-form-alignment
git push -u origin feature/official-form-alignment
```

그 직후, **Vercel "Production Branch" 설정이 `main` 단일로 고정**되어 있는지 반드시 확인한다(섹션 0 안전장치 (c) 보장). 이 값이 잘못되어 있으면 서브 브랜치 푸시가 프로덕션에 직접 배포될 수 있다.

확인 방법 (가장 확실한 것은 대시보드):
```bash
# 1순위 (가장 확실): Vercel 대시보드 → 해당 Project → Settings → Git → "Production Branch" 필드 직접 확인
#                    스크린샷 또는 텍스트로 결과 기록
# 2순위 (CLI 가능 환경): vercel git ls   ← 일부 환경에서만 동작
# 3순위 (이미 vercel link 완료 상태): cat .vercel/project.json    ← settings 일부 노출
#
# 주의: `vercel inspect`는 deployment 메타용이며 Production Branch 설정 조회 명령이 아님.
```

기대 결과: `Production Branch = main` (단일). 다른 값이 있으면 **Step 1을 중단**하고 먼저 수정. 확인 결과를 브랜치 커밋 메시지 본문(또는 `docs/decisions/2026-04-14-hwpx-infrastructure.md` 인접 ADR) 에 기록한다.

- [ ] **Task 2: hwpx-docgen 스킬 프로젝트 설치**

외부 레포에서 최신 스킬을 내려받아 프로젝트 로컬에 둔다. **전역(`~/.claude/skills/`)이 아닌 프로젝트 로컬(`.claude/skills/`)로 설치**.

```bash
# 외부 레포를 임시로 얕게 클론
git clone --depth 1 https://github.com/BaekKyunShin/Automation-Claude-Skills.git /tmp/hwpx-repo

# 필요한 스킬 디렉터리만 복사
mkdir -p .claude/skills
cp -r /tmp/hwpx-repo/.claude/skills/hwpx-docgen .claude/skills/

# 임시 레포 삭제
rm -rf /tmp/hwpx-repo

# 설치 확인
ls .claude/skills/hwpx-docgen/
# 기대 항목: SKILL.md, README.md, scripts/, templates/, references/, examples/
```

다음 단계(Step 3, 7, 10)에서 이 경로(`.claude/skills/hwpx-docgen/scripts/`)의 스크립트를 직접 호출한다.

- [ ] **Task 3: 계획서 + 스킬 설치 커밋**

```bash
git add docs/plans/2026-04-14-official-form-alignment.md
git add docs/references/            # 참조 양식(PDF·HWPX)이 아직 미추적이면 포함
git add .claude/skills/hwpx-docgen
git commit -m "docs: 산인공 공식 양식 정렬 구현 계획서 + hwpx-docgen 스킬 설치

- 11개 결정사항 정리
- 12단계 서브 브랜치 로드맵
- 스킬/MCP/서브에이전트 활용 매트릭스
- 리스크·롤백 전략
- hwpx-docgen 스킬을 프로젝트 로컬에 설치 (.claude/skills/hwpx-docgen)"
git push
```

- [ ] **Task 4: 메인 브랜치로 PR을 아직 만들지 않음 확인**

메인 브랜치 `feature/official-form-alignment`는 모든 서브 PR이 머지된 후에만 `main`으로 PR을 생성한다. 지금은 **별도 원격 브랜치로만 존재**.

**커밋 메시지:** `docs: 산인공 공식 양식 정렬 구현 계획서 + hwpx-docgen 스킬 설치`

---

### Step 2: DB 스키마 기반 (마이그레이션)

**브랜치:** `feature/ofa-02-schema-foundation`
**규모:** Medium (15 Task)
**호출 스킬:** `supabase-dev`, `security-auditor`(서브에이전트), `postgres-pro`(서브에이전트), supabase MCP

**프로젝트 기존 자산 준수 (중요):**
- **이미 존재하는 RLS 헬퍼 함수**를 그대로 사용한다:
  - `is_assigned_to_project(p_project_id UUID)` — `projects.assigned_consultant_id` 기반 배정 확인
  - `is_ops_admin_or_higher()` — OPS_ADMIN + SYSTEM_ADMIN 두 역할 포괄 (별도 `is_system_admin()`은 **존재하지 않음**)
  - `is_approved_consultant()` — 승인 컨설턴트 여부
  - `get_user_role()` — 현재 사용자 역할
  - 위 헬퍼 함수들은 마이그 048에서 내부에 `(SELECT auth.uid())` 래핑이 이미 적용되어 있으므로, 정책 본문에서 헬퍼를 호출할 때 추가 래핑이 필요 없다.
- **auth.uid() 패턴 (헬퍼 밖에서 직접 사용 시)**: `auth.uid_cached()` 같은 함수는 프로젝트에 없다. **`(SELECT auth.uid())`** 래핑 패턴 필수(마이그 048 공식 패턴).
- **ENUM 타입명**: 프로젝트 상태 ENUM은 `project_status` (마이그 001에서 `case_status`로 생성 → 마이그 005 `ALTER TYPE case_status RENAME TO project_status`). `case_status`는 더 이상 존재하지 않음.
- **실제 테이블명**: `projects`(= 예전 cases), `project_assignments`(= 예전 case_assignments). 001→005 rename이 완료된 상태.
- **interviews 테이블**은 `project_id`에 UNIQUE 제약 존재 → 프로젝트 1:1. 별도 track 컬럼 불필요.
- **UUID 생성 함수**: 마이그 001은 `uuid_generate_v4()`, 마이그 024 이후 일부는 `gen_random_uuid()`. 본 Step에서는 **`uuid_generate_v4()`로 통일**(기존 core 테이블과 일관). Supabase의 uuid-ossp 확장이 이미 활성화되어 있다.
- **ENUM 값 추가 주의**: `ALTER TYPE ... ADD VALUE`는 PostgreSQL 12+에서 트랜잭션 안에서 실행 가능하지만, **같은 마이그레이션 내에서 새 값을 즉시 사용하는 쿼리를 동반하면 실패**한다(같은 트랜잭션 내 해당 값 가시성 문제). 본 계획서의 ADD VALUE 사용 마이그는 **061(audit_action 9개), 064(project_status PBL_DRAFTED), 065(잔여 audit 값)** — 모두 동일 트랜잭션 내에서 새 값을 사용하지 않으므로 안전(061의 audit 값은 Step 4·7·8·9·10에서 사용; 064는 Step 9 generatePBLAction에서 사용). CREATE TYPE으로 새 ENUM을 만드는 경우(061의 pbl_report_status)는 ADD VALUE와 다른 규칙으로 같은 트랜잭션 내 사용 가능.

**목표:** 트랙 분리·PBL 테이블·공지 테이블·상태 enum을 한 PR에 담아 데이터 기반 완성. 기존 로드맵 흐름 정상 동작 유지.

**파일:**
- 신규: `supabase/migrations/060_add_project_track.sql`
- 신규: `supabase/migrations/061_add_pbl_reports.sql`
- 신규: `supabase/migrations/062_add_notices.sql`
- 신규: `supabase/migrations/063_add_interview_pbl_data.sql`
- 신규: `supabase/migrations/064_add_project_status_pbl.sql`
- 신규: `src/lib/constants/tracks.ts`
- 변경: `src/lib/constants/status.ts`
- 신규: `src/lib/schemas/notice.ts` (타입만, CRUD는 Step 4)
- (PBL 산출물 도메인 타입·검증 스키마는 별도 파일 신설하지 않고 Step 9의 `src/lib/services/pbl/pbl-types.ts`(타입)와 `pbl-validator.ts`(Zod)로 통합 — `schemas/pbl-report.ts`는 작성하지 않음)

- [ ] **Task 1: 브랜치 생성 및 supabase 브랜치 생성**

```bash
git checkout feature/official-form-alignment && git pull
git checkout -b feature/ofa-02-schema-foundation
```

Supabase MCP로 개발용 DB 브랜치 생성:
```
mcp__supabase__create_branch(name="ofa-schema-foundation")
```

- [ ] **Task 2: `tracks.ts` 상수 + 테스트 작성 (RED)**

파일: `src/lib/constants/tracks.ts`
```typescript
export const PROJECT_TRACKS = ['ROADMAP', 'PBL'] as const;
export type ProjectTrack = (typeof PROJECT_TRACKS)[number];

export const TRACK_LABELS: Record<ProjectTrack, string> = {
  ROADMAP: 'AI 훈련로드맵',
  PBL: '문제해결형(PBL) AI+직무 훈련과정',
};

// Tailwind 유틸 클래스 (PROJECT_STATUS_CONFIG 패턴과 동일 — 갤러리 카드·뱃지·페이지 헤더가 공통 참조)
export const TRACK_BADGE_COLORS: Record<ProjectTrack, string> = {
  ROADMAP: 'bg-blue-100 text-blue-800',
  PBL: 'bg-purple-100 text-purple-800',
};
```

파일: `src/lib/constants/tracks.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { PROJECT_TRACKS, TRACK_LABELS, TRACK_BADGE_COLORS } from './tracks';

describe('tracks constants', () => {
  it('ROADMAP과 PBL 두 트랙만 존재한다', () => {
    expect(PROJECT_TRACKS).toEqual(['ROADMAP', 'PBL']);
  });
  it('모든 트랙이 레이블을 가진다', () => {
    for (const t of PROJECT_TRACKS) {
      expect(TRACK_LABELS[t]).toBeTruthy();
    }
  });
  it('모든 트랙이 뱃지 색상 클래스를 가진다', () => {
    for (const t of PROJECT_TRACKS) {
      expect(TRACK_BADGE_COLORS[t]).toBeTruthy();
    }
  });
});
```

- [ ] **Task 3: 마이그레이션 060 — projects.track 컬럼 추가**

파일: `supabase/migrations/060_add_project_track.sql`
```sql
-- 프로젝트 테이블에 track 컬럼 추가 (기본값 ROADMAP — 기존 데이터 호환)
CREATE TYPE project_track AS ENUM ('ROADMAP', 'PBL');

ALTER TABLE projects
  ADD COLUMN track project_track NOT NULL DEFAULT 'ROADMAP';

-- 트랙 기반 필터 인덱스 (대시보드·갤러리에서 트랙별 조회 빈번)
-- 주의: projects 테이블에는 company_id가 없고 company_name 텍스트만 있음(마이그 001 비정규화).
--       회사+트랙 조합 조회는 보통 (company_name, track) 또는 단순 track 단독 인덱스로 충분.
CREATE INDEX idx_projects_track ON projects (track);

COMMENT ON COLUMN projects.track IS '프로젝트 트랙 (ROADMAP/PBL). 한 기업은 트랙별 별도 프로젝트를 가진다(중복 방지는 애플리케이션 레이어에서).';
```

- [ ] **Task 4: 마이그레이션 064 — projects.status enum에 PBL_DRAFTED 추가**

파일: `supabase/migrations/064_add_project_status_pbl.sql`
```sql
-- 기존 status enum을 확인하여 PBL_DRAFTED 상태 추가
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'PBL_DRAFTED' AFTER 'ROADMAP_DRAFTED';

COMMENT ON TYPE project_status IS 'PBL 트랙은 PBL_DRAFTED를 거쳐 FINALIZED로 이동한다.';
```

- [ ] **Task 5: 마이그레이션 061 — pbl_reports 테이블**

파일: `supabase/migrations/061_add_pbl_reports.sql`
```sql
-- ============================================================
-- audit_action ENUM 확장 — Step 4·7·8·9·10에서 사용할 모든 신규 값 일괄 선언
-- 이유: 각 Step 시작 시점에 DB에 해당 enum 값이 이미 존재해야
--       createAuditLog가 실패하지 않는다. Step 12로 미루면 Step 4~10 실행 불가.
--       (Step 12 마이그 065에는 pbl_course DROP COLUMN만 남긴다.)
-- ============================================================
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'NOTICE_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'NOTICE_UPDATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'NOTICE_DELETED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ROADMAP_HWPX_EXPORTED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PBL_INTERVIEW_SAVED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PBL_REPORT_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PBL_REPORT_FINALIZED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PBL_REPORT_SHARED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PBL_HWPX_EXPORTED';

-- PBL 보고서 상태 ENUM (roadmap_version_status와 동일 값이지만 독립 ENUM으로 유지해
-- PBL 상태 확장 시 로드맵 테이블에 영향 없도록 한다)
CREATE TYPE pbl_report_status AS ENUM ('DRAFT', 'FINAL', 'ARCHIVED');

-- NULL 제약은 roadmap_versions(마이그 001 라인 202-226) 패턴을 그대로 준용
CREATE TABLE pbl_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status pbl_report_status NOT NULL DEFAULT 'DRAFT',

  -- 컨설턴트 프로필 스냅샷 (roadmap_versions 패턴 동일: NOT NULL + DEFAULT '{}')
  consultant_profile_snapshot JSONB NOT NULL DEFAULT '{}',
  diagnosis_summary TEXT NOT NULL DEFAULT '',
  -- PBL 보고서 본문 — JSONB. 도메인 타입은 Step 9의 src/lib/services/pbl/pbl-types.ts (PBLContent),
  -- LLM 출력 검증은 src/lib/services/pbl/pbl-validator.ts에서 처리.
  pbl_content JSONB NOT NULL DEFAULT '{}',

  free_tool_validated BOOLEAN NOT NULL DEFAULT false,
  time_limit_validated BOOLEAN NOT NULL DEFAULT false,
  revision_prompt TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  like_count INTEGER NOT NULL DEFAULT 0,  -- 비정규화 캐시, 아래 트리거로 자동 갱신

  -- roadmap_versions 패턴: created_by는 NOT NULL + ON DELETE RESTRICT
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  finalized_by UUID REFERENCES users(id) ON DELETE SET NULL,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (project_id, version_number)
);

CREATE INDEX idx_pbl_reports_project_id ON pbl_reports (project_id);
CREATE INDEX idx_pbl_reports_status_final ON pbl_reports (project_id) WHERE status = 'FINAL';
-- 갤러리 조회 최적화: is_shared=true AND status='FINAL' 복합 인덱스(마이그 055 패턴)
CREATE INDEX idx_pbl_reports_shared_final
  ON pbl_reports (is_shared, status, created_at DESC)
  WHERE is_shared = true AND status = 'FINAL';
CREATE INDEX idx_pbl_reports_like_count ON pbl_reports (like_count DESC);

-- JSONB 크기 제한 (기존 050 패턴 준용: octet_length(col::TEXT))
-- 500KB ≒ roadmap_versions.pbl_course(1MB)의 절반. PBL 보고서 본문은 LLM 생성 JSON 1개이므로 500KB로 충분.
ALTER TABLE pbl_reports
  ADD CONSTRAINT chk_pbl_content_size
    CHECK (octet_length(pbl_content::TEXT) < 524288);

COMMENT ON CONSTRAINT chk_pbl_content_size ON pbl_reports IS 'JSONB 크기 제한: 512KB';

-- RLS
ALTER TABLE pbl_reports ENABLE ROW LEVEL SECURITY;

-- 컨설턴트는 자신에게 배정된 프로젝트의 PBL만 조회/수정
-- 실제 프로젝트 기존 헬퍼 함수 활용 (모두 인자 없음 또는 project_id UUID 하나):
--   is_assigned_to_project(p_project_id UUID)  — 프로젝트 배정 여부 (projects.assigned_consultant_id 기반)
--   is_ops_admin_or_higher()                   — OPS_ADMIN + SYSTEM_ADMIN 포괄
--   is_approved_consultant()                   — 승인된 컨설턴트 여부
-- 모든 정책에서 auth.uid()는 (SELECT auth.uid()) 래핑 금지: 헬퍼 함수가 이미 내부에서 래핑함(마이그 048).
CREATE POLICY pbl_reports_select ON pbl_reports
  FOR SELECT USING (
    is_assigned_to_project(pbl_reports.project_id)
    OR is_ops_admin_or_higher()
    -- 갤러리 공유 조건: FINAL이고 is_shared=true일 때만 로그인 사용자 전체 열람
    -- (roadmap_versions 정책 `is_shared AND status='FINAL' AND auth.uid() IS NOT NULL`와 동일 기조)
    OR (is_shared = true AND status = 'FINAL' AND (SELECT auth.uid()) IS NOT NULL)
  );

CREATE POLICY pbl_reports_insert_consultant ON pbl_reports
  FOR INSERT WITH CHECK (
    is_assigned_to_project(pbl_reports.project_id)
  );

CREATE POLICY pbl_reports_update_consultant ON pbl_reports
  FOR UPDATE USING (
    is_assigned_to_project(pbl_reports.project_id)
    AND status != 'ARCHIVED'
  );

-- ops admin(= OPS_ADMIN + SYSTEM_ADMIN)은 모든 권한
CREATE POLICY pbl_reports_ops_all ON pbl_reports
  FOR ALL USING (is_ops_admin_or_higher());

-- ============================================================
-- pbl_likes 테이블 + 트리거 (roadmap_likes / 마이그 024·056 패턴 복제)
-- like_count 캐시 컬럼을 자동 증감하기 위한 구조.
-- ============================================================
CREATE TABLE pbl_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pbl_report_id UUID NOT NULL REFERENCES pbl_reports(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, pbl_report_id)
);

CREATE INDEX idx_pbl_likes_report ON pbl_likes (pbl_report_id);
CREATE INDEX idx_pbl_likes_user ON pbl_likes (user_id);

ALTER TABLE pbl_likes ENABLE ROW LEVEL SECURITY;

-- 조회: 모든 로그인 사용자 (roadmap_likes와 동일)
CREATE POLICY pbl_likes_select_authenticated ON pbl_likes
  FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- 추가: 본인 좋아요만
CREATE POLICY pbl_likes_insert_own ON pbl_likes
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- 삭제: 본인 좋아요만
CREATE POLICY pbl_likes_delete_own ON pbl_likes
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- like_count 자동 증감 트리거 (마이그 056 패턴 + 026의 search_path = '' 보안 강화)
-- 026 컨벤션: SECURITY DEFINER 함수는 항상 SET search_path = '' (빈 문자열)로
-- 검색 경로 우회 공격 차단. 모든 객체 참조는 public.* 등으로 fully-qualified.
CREATE OR REPLACE FUNCTION public.increment_pbl_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.pbl_reports
    SET like_count = like_count + 1
    WHERE id = NEW.pbl_report_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_pbl_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.pbl_reports
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.pbl_report_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_increment_pbl_like_count
  AFTER INSERT ON pbl_likes
  FOR EACH ROW EXECUTE FUNCTION public.increment_pbl_like_count();

CREATE TRIGGER trg_decrement_pbl_like_count
  AFTER DELETE ON pbl_likes
  FOR EACH ROW EXECUTE FUNCTION public.decrement_pbl_like_count();

COMMENT ON TABLE pbl_reports IS 'PBL 트랙 프로젝트의 산출물(문제해결형 AI+직무 훈련과정 개발보고서). roadmap_versions와 평행 구조.';
COMMENT ON TABLE pbl_likes IS 'PBL 갤러리 좋아요. roadmap_likes와 평행 구조.';

-- ============================================================
-- finalize_pbl RPC — 마이그 036(public.finalize_roadmap)와 정확히 동일한 패턴
-- 함수명 컨벤션: 실제 함수 이름은 atomic 접두사 없이 finalize_pbl (파일명에는 atomic)
-- 반환: JSONB ({success, error, project_id, version_number})
-- 보안: SECURITY INVOKER + search_path = '' (마이그 026·030·036 컨벤션)
-- 잠금: FOR UPDATE로 동시 요청 직렬화
-- 검증: 컨설턴트 배정 + DRAFT 상태 + 트랙=PBL 모두 함수 내부에서
-- 부수 효과: pbl_reports FINAL/ARCHIVED 전환 + projects.status를 FINALIZED로 함께 전환
-- 본 RPC를 Step 9 Task 6의 finalizePBL이 호출. Step 12로 미루면 Step 9 실행 불가.
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_pbl(
  p_pbl_report_id UUID,
  p_actor_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_project_id UUID;
  v_version_number INT;
  v_assigned_consultant_id UUID;
  v_pbl_status TEXT;
  v_track TEXT;
BEGIN
  -- 1. PBL 보고서 + 프로젝트 조회 (FOR UPDATE로 동시 요청 직렬화)
  SELECT pr.project_id, pr.version_number, p.assigned_consultant_id, pr.status::TEXT, p.track::TEXT
  INTO v_project_id, v_version_number, v_assigned_consultant_id, v_pbl_status, v_track
  FROM public.pbl_reports pr
  INNER JOIN public.projects p ON p.id = pr.project_id
  WHERE pr.id = p_pbl_report_id
  FOR UPDATE OF pr;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'PBL 보고서를 찾을 수 없습니다.'
    );
  END IF;

  -- 2. 트랙 검증 (잘못된 트랙으로 finalize 시도 차단)
  IF v_track != 'PBL' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'PBL 트랙 프로젝트의 보고서만 finalize_pbl로 확정할 수 있습니다.'
    );
  END IF;

  -- 3. DRAFT 상태만 확정 가능
  IF v_pbl_status != 'DRAFT' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'DRAFT 상태의 PBL 보고서만 최종 확정할 수 있습니다.'
    );
  END IF;

  -- 4. 배정된 컨설턴트 확인
  IF v_assigned_consultant_id != p_actor_user_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '배정된 컨설턴트만 최종 확정할 수 있습니다.'
    );
  END IF;

  -- 5. 기존 FINAL → ARCHIVED (같은 트랜잭션 내)
  UPDATE public.pbl_reports
  SET status = 'ARCHIVED',
      updated_at = NOW()
  WHERE project_id = v_project_id
    AND status = 'FINAL';

  -- 6. 현재 PBL → FINAL
  UPDATE public.pbl_reports
  SET status = 'FINAL',
      finalized_by = p_actor_user_id,
      finalized_at = NOW(),
      updated_at = NOW()
  WHERE id = p_pbl_report_id;

  -- 7. 프로젝트 상태 → FINALIZED (이미 FINALIZED면 불필요한 UPDATE 방지)
  UPDATE public.projects
  SET status = 'FINALIZED'
  WHERE id = v_project_id
    AND status != 'FINALIZED';

  RETURN jsonb_build_object(
    'success', TRUE,
    'project_id', v_project_id,
    'version_number', v_version_number
  );
END;
$$;

COMMENT ON FUNCTION public.finalize_pbl IS
  '원자적 PBL 보고서 확정. 기존 FINAL→ARCHIVED + 현재→FINAL + 프로젝트 FINALIZED를 단일 트랜잭션으로 실행. 마이그 036 finalize_roadmap과 동일 패턴.';
```

- [ ] **Task 6: 마이그레이션 062 — notices + notice_attachments**

파일: `supabase/migrations/062_add_notices.sql`
```sql
CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body TEXT NOT NULL CHECK (char_length(body) <= 50000),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notices_pinned_created ON notices (is_pinned DESC, created_at DESC);
CREATE INDEX idx_notices_author ON notices (author_id);

CREATE TABLE notice_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE, -- Supabase Storage 경로
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 20971520), -- 20MB
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notice_attachments_notice ON notice_attachments (notice_id);

-- RLS
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_attachments ENABLE ROW LEVEL SECURITY;

-- 참고:
--   is_ops_admin_or_higher()는 OPS_ADMIN + SYSTEM_ADMIN 두 역할을 모두 포괄한다.
--   별도의 is_system_admin() 함수는 프로젝트에 존재하지 않는다.

-- 모든 인증된 컨설턴트·운영자·시스템관리자 조회 가능
CREATE POLICY notices_select ON notices
  FOR SELECT USING (
    is_approved_consultant()
    OR is_ops_admin_or_higher()
  );

-- 작성/수정/삭제는 OPS_ADMIN + SYSTEM_ADMIN만 (is_ops_admin_or_higher가 포괄)
CREATE POLICY notices_mutate_ops_sys ON notices
  FOR ALL USING (is_ops_admin_or_higher())
  WITH CHECK (is_ops_admin_or_higher());

-- 첨부 파일 RLS — notice와 동일한 접근 규칙
CREATE POLICY notice_attachments_select ON notice_attachments
  FOR SELECT USING (
    is_approved_consultant()
    OR is_ops_admin_or_higher()
  );

CREATE POLICY notice_attachments_mutate_ops_sys ON notice_attachments
  FOR ALL USING (is_ops_admin_or_higher())
  WITH CHECK (is_ops_admin_or_higher());

-- 조회수 증가 전용 RPC (RLS 우회를 위한 security definer)
-- 마이그 026 패턴 준수: SECURITY DEFINER + SET search_path = '' + 모든 객체 fully-qualified
CREATE OR REPLACE FUNCTION public.increment_notice_view_count(p_notice_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.notices SET view_count = view_count + 1 WHERE id = p_notice_id;
END;
$$;

COMMENT ON TABLE notices IS '운영자가 양식 파일·공지를 올리는 게시판.';
```

**Supabase Storage bucket 정책 (마이그레이션에 SQL로 삽입 권장)**:
```sql
-- Supabase Storage 버킷 생성 + RLS
-- 대시보드 수동 작업 대신 SQL로 코드 관리 (재현성·감사성 확보)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notice-attachments',
  'notice-attachments',
  false,
  20971520, -- 20MB
  ARRAY[
    'application/pdf',
    'application/vnd.hancom.hwpx',
    'application/x-hwp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
-- 재실행 주의: ON CONFLICT DO UPDATE는 기존 버킷의 public/file_size_limit/allowed_mime_types를
-- 본 마이그의 값으로 덮어쓴다. 운영 중 버킷 정책을 수동으로 조정한 상태라면
-- 재실행 전 현재 값을 백업한다. 본 프로젝트에서는 버킷 설정을 항상 마이그레이션 SQL에서만 관리한다.

-- 업로드/조회는 notices 테이블 RLS와 동일 규칙 (storage.objects RLS)
CREATE POLICY "notice_attachments_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'notice-attachments'
    AND (is_approved_consultant() OR is_ops_admin_or_higher())
  );

CREATE POLICY "notice_attachments_storage_mutate_ops_sys" ON storage.objects
  FOR ALL USING (
    bucket_id = 'notice-attachments'
    AND is_ops_admin_or_higher()
  )
  WITH CHECK (
    bucket_id = 'notice-attachments'
    AND is_ops_admin_or_higher()
  );
```

> 참고: Supabase 일부 환경에서는 storage.objects 정책 생성을 Dashboard에서만 허용한다. 자동 SQL이 실패하면 Dashboard로 폴백하되, 동일 규칙을 재현한다.

- [ ] **Task 7: 마이그레이션 063 — interviews JSONB 컬럼 정리 (선택적)**

> **재검토 결론**: `interviews` 테이블은 `project_id`에 **UNIQUE 제약**이 있어 프로젝트 1건당 인터뷰가 1건으로 고정된다. 따라서 프로젝트의 track(ROADMAP/PBL)을 알면 인터뷰 트랙은 자동으로 정해진다. 별도의 `interviews.track` 컬럼과 일치 트리거는 **중복·불필요**하므로 **추가하지 않는다**.
>
> 대신, 현재 `interviews` 테이블의 JSONB 필드들(`company_details`, `job_tasks`, `pain_points`, `constraints`, `improvement_goals`)은 로드맵 구조에 맞춰 정의된 상태이며, PBL 트랙은 **새로운 구조**가 필요하다.

방안:
1. **기존 JSONB 컬럼을 그대로 두고** 애플리케이션에서 트랙별로 의미 해석 분기 — 기존 로드맵 데이터는 그대로 사용, PBL은 새 컬럼 `pbl_data JSONB` 추가
2. **단일 `data JSONB`로 마이그레이션** — 큰 변경, 데이터 이전 필요

**선택**: 실데이터가 없으므로 **방안 1** 채택. 최소 변경.

파일: `supabase/migrations/063_add_interview_pbl_data.sql`
```sql
-- PBL 인터뷰 전용 JSONB 컬럼 추가 (기본값 빈 객체).
-- 로드맵 인터뷰 데이터는 기존 컬럼(company_details/job_tasks/...)에 저장된다.
-- PBL 인터뷰 데이터는 이 pbl_data 컬럼 하나에 통째로 저장된다(산인공 양식 2번 Ⅰ~Ⅲ장 구조).

ALTER TABLE interviews
  ADD COLUMN pbl_data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- JSONB 크기 제한 (기존 050 패턴 준용: octet_length(col::TEXT))
ALTER TABLE interviews
  ADD CONSTRAINT chk_pbl_data_size
    CHECK (octet_length(pbl_data::TEXT) < 524288);

COMMENT ON CONSTRAINT chk_pbl_data_size ON interviews IS 'JSONB 크기 제한: 512KB (PBL 트랙 인터뷰 JSONB 단일 컬럼)';

COMMENT ON COLUMN interviews.pbl_data IS 'PBL 트랙 인터뷰 데이터. schemas/interview-pbl.ts 스키마로 검증.';
```

> 애플리케이션 레이어에서 `projects.track = 'ROADMAP'`이면 기존 JSONB 컬럼들을 사용, `track = 'PBL'`이면 `pbl_data` 하나만 사용하도록 분기한다. 트랙 불일치 검증은 서비스 레이어에서 수행(트리거 불필요).

- [ ] **Task 8: 마이그레이션 적용 및 검증**

**권장 경로 (Supabase MCP 브랜치 DB):**

Task 1에서 이미 `mcp__supabase__create_branch(name="ofa-schema-foundation")`로 브랜치를 생성했다. 본 Task에서는 **그 브랜치를 재사용**해 마이그레이션을 순차 적용한다(브랜치 중복 생성 금지 — 이름 충돌로 오류).

```
# 기존 브랜치 id 확인 (Task 1 반환값 또는)
mcp__supabase__list_branches

# 반환된 branch DB에 각 마이그레이션 순차 적용:
mcp__supabase__apply_migration(name="060_add_project_track", query=<060 SQL 전체>)
mcp__supabase__apply_migration(name="061_add_pbl_reports", query=<061 SQL 전체>)
mcp__supabase__apply_migration(name="062_add_notices", query=<062 SQL 전체>)
mcp__supabase__apply_migration(name="063_add_interview_pbl_data", query=<063 SQL 전체>)
mcp__supabase__apply_migration(name="064_add_project_status_pbl", query=<064 SQL 전체>)
```

**대안 (로컬 `supabase start` 환경이 있는 경우에만):**
```bash
# ⚠️ 주의: `supabase db reset`은 로컬 DB의 모든 데이터를 제거한다.
#   프로젝트 원칙상 실데이터는 없지만, 로컬 fixture가 있다면 손실됨.
#   프로덕션 DB 또는 원격 Supabase 프로젝트에는 절대 실행하지 않는다.
supabase db reset
```

**프로덕션 DB 금지:** 본 Task에서는 프로덕션 DB에 마이그레이션을 적용하지 않는다. 프로덕션 적용은 Step 12 §8 배포 체크리스트 통과 후 별도 릴리스 절차에서 수행.

검증:
```bash
npm run validate
```

기대: 타입 체크 통과 (DB 타입 재생성 필요 시 `mcp__supabase__generate_typescript_types` 호출 또는 `supabase gen types typescript --linked > src/types/database.ts`).

- [ ] **Task 9: `status.ts`에 PBL_DRAFTED 통합 (실제 파일 구조 기준)**

**실제 파일 구조 확인 (src/lib/constants/status.ts):**
- `PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label, color }>` — **개별 상태의 라벨·색상 맵** (STATUS_LABELS 아님)
- `PROJECT_WORKFLOW_STEPS: WorkflowStep[]` — 단계별 배열 (getWorkflowSteps 함수 아님; 순수 배열)
- `ALL_PROJECT_STATUSES` — PROJECT_WORKFLOW_STEPS에서 파생 (PROJECT_STATUSES 아님)
- `getWorkflowStepIndex(status)`, `getWorkflowStepLabel(status)`, `getStatusFilterOptions()` — 조회 함수
- `EXPORT_ELIGIBLE_STATUSES`, `ROADMAP_ELIGIBLE_STATUSES` — 상태 집합

**변경 방침**: 기존 구조를 파괴하지 않고 PBL_DRAFTED를 추가 + 트랙별 단계 계산 함수를 새로 추가.

```typescript
// 1) PROJECT_STATUS_CONFIG에 PBL_DRAFTED 항목 추가
export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  // ... 기존 7개 유지 ...
  PBL_DRAFTED: { label: 'PBL 초안 완료', color: 'bg-purple-100 text-purple-800' },
};

// 2) 기존 PROJECT_WORKFLOW_STEPS는 로드맵 경로 그대로 유지 (하위 호환).
//    드래프트 단계에 PBL_DRAFTED를 함께 포함시켜 기존 호출부를 깨지 않는다.
export const PROJECT_WORKFLOW_STEPS: WorkflowStep[] = [
  { key: 'new', label: '신규 등록 완료', statuses: ['NEW'] },
  { key: 'diagnosed', label: '진단결과 입력 완료', statuses: ['DIAGNOSED', 'MATCH_RECOMMENDED'] },
  { key: 'assigned', label: '컨설턴트 배정 완료', statuses: ['ASSIGNED'] },
  { key: 'interviewed', label: '현장 인터뷰 완료', statuses: ['INTERVIEWED'] },
  { key: 'drafted', label: '초안 완료', statuses: ['ROADMAP_DRAFTED', 'PBL_DRAFTED'] }, // 라벨 공통화
  { key: 'finalized', label: '최종 확정', statuses: ['FINALIZED'] },
];

// 3) 신규: 트랙별 단계 라벨이 필요한 UI(예: 프로젝트 스테퍼)는 이 헬퍼 사용
import type { ProjectTrack } from './tracks';

export function getProjectWorkflowStepsByTrack(track: ProjectTrack): WorkflowStep[] {
  return PROJECT_WORKFLOW_STEPS.map(step => {
    if (step.key === 'drafted') {
      return track === 'PBL'
        ? { ...step, label: 'PBL 초안 완료', statuses: ['PBL_DRAFTED'] }
        : { ...step, label: '로드맵 초안 완료', statuses: ['ROADMAP_DRAFTED'] };
    }
    return step;
  });
}

// 4) EXPORT_ELIGIBLE_STATUSES에 PBL_DRAFTED 포함
export const EXPORT_ELIGIBLE_STATUSES: readonly ProjectStatus[] = [
  'ROADMAP_DRAFTED',
  'PBL_DRAFTED',      // <-- 추가
  'FINALIZED',
] as const;

// 5) 신규 상수: PBL 생성·편집이 가능한 프로젝트 상태
//    (ROADMAP_ELIGIBLE_STATUSES와 평행 구조 — Step 9 상태 전환 로직에서 사용)
export const PBL_ELIGIBLE_STATUSES: readonly ProjectStatus[] = [
  'INTERVIEWED',
  'PBL_DRAFTED',
  'FINALIZED',
] as const;
```

테스트 갱신(`status.test.ts`): 신규 `PBL_DRAFTED` 라벨·색상, `getProjectWorkflowStepsByTrack` 반환값(ROADMAP vs PBL) 검증 케이스 추가.

- [ ] **Task 10: 타입 재생성 + 타입 체크**

```bash
# Supabase DB에서 타입 재생성 (MCP 또는 CLI)
supabase gen types typescript --linked > src/types/database.ts

npm run typecheck
```

기대: 통과. 실패 시 타입 추가/수정.

- [ ] **Task 11: 프로젝트 생성 UI/액션에 track 필드 추가 (RED → GREEN)**

파일:
- 변경: `src/app/(dashboard)/ops/projects/new/page.tsx` — 트랙 선택 라디오/토글 UI 추가(기본값 ROADMAP)
- 변경: `src/app/(dashboard)/ops/projects/actions/crud.ts` — `createProject` 함수에서 `formData.get('track')` 읽어 검증 후 `projects.track`에 저장
- 갱신: `crud.test.ts` — 신규 필드 테스트 추가(기본값·잘못된 값·각 트랙 정상)

RED 테스트:
- `track` 미지정 → 기본값 'ROADMAP'으로 저장
- `track='PBL'` 지정 → PBL 프로젝트로 저장
- `track='INVALID'` → validation 실패

GREEN 구현:
```typescript
// 신규 Zod 스키마 조각
track: z.enum(PROJECT_TRACKS).default('ROADMAP'),
```
- 기존 `requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN'], ...)` 패턴 유지
- 반환 타입 `ActionResult<{ projectId: string }>` 유지

- [ ] **Task 12: `security-auditor` 서브에이전트로 RLS 감사**

```
Agent(
  subagent_type: "security-auditor",
  description: "OFA Step 2 RLS 감사",
  prompt: "feature/ofa-02-schema-foundation 브랜치의 마이그레이션 060~064를 감사한다. 특히:
  1. pbl_reports RLS가 컨설턴트 배정 여부를 정확히 확인하는지 (`is_assigned_to_project(p_project_id UUID)` 헬퍼 인자 일치 — `projects.assigned_consultant_id` 단일 컬럼 기반)
  2. notices RLS가 OPS_ADMIN과 SYSTEM_ADMIN 모두 허용하는지 (`is_ops_admin_or_higher()` 단일 헬퍼가 두 역할을 포괄 — 별도 `is_system_admin()` 함수는 존재하지 않음)
  3. notice_attachments의 storage_path 누수 위험이 있는지 (signed URL 사용 여부 포함)
  4. increment_notice_view_count RPC가 악용 가능한지 (security definer + search_path 고정 확인)
  5. pbl_data JSONB 크기 제약 및 트랙 불일치 데이터 진입 가능성 (트리거 미사용 — 서비스 레이어 검증에 의존)
  6. (SELECT auth.uid()) 래핑 패턴이 새 정책 전부에 적용됐는지 (마이그 048 패턴)
  발견된 취약점과 수정 제안을 보고하라."
)
```

- [ ] **Task 13: 테스트 실행 및 커밋**

```bash
npm run validate
```

기대: 모든 테스트 통과.

```bash
git add supabase/migrations/060_*.sql supabase/migrations/061_*.sql \
        supabase/migrations/062_*.sql supabase/migrations/063_*.sql \
        supabase/migrations/064_*.sql \
        src/lib/constants/tracks.ts src/lib/constants/tracks.test.ts \
        src/lib/constants/status.ts \
        src/types/database.ts

git commit -m "feat: 트랙·PBL·공지 게시판 DB 기반 추가

- projects.track 컬럼 (ROADMAP/PBL) + 인덱스
- pbl_reports 테이블 + RLS (is_assigned_to_project / is_ops_admin_or_higher 활용)
- notices + notice_attachments 테이블 + RLS + 조회수 RPC
- notice-attachments Storage 버킷 + RLS (20MB 제한, 허용 MIME)
- interviews.pbl_data JSONB 컬럼 (PBL 트랙 인터뷰 전용)
- project_status enum에 PBL_DRAFTED 추가
- tracks.ts 상수 + status.ts 트랙별 분기 + 프로젝트 생성 폼 track 필드"
```

- [ ] **Task 14: PR 생성**

```bash
git push -u origin feature/ofa-02-schema-foundation
gh pr create --base feature/official-form-alignment \
  --title "feat(ofa-02): DB 스키마 기반 추가 (트랙·PBL·공지)" \
  --body "$(cat <<'EOF'
## Summary
- projects에 track 컬럼 (ROADMAP/PBL) + 인덱스
- pbl_reports / notices / notice_attachments 신규 테이블 + RLS
- interviews.pbl_data JSONB 컬럼 (PBL 트랙 전용 — 트리거/track 컬럼 사용 안 함)
- notice-attachments Storage 버킷 + RLS
- PBL_DRAFTED 상태 enum 추가
- tracks.ts 상수 + status.ts 트랙별 분기 + 프로젝트 생성 폼 track 필드

## Test plan
- [ ] `npm run validate` 통과
- [ ] security-auditor 감사 완료
- [ ] Supabase 마이그레이션 순차 적용 확인
EOF
)"
```

- [ ] **Task 15: 리뷰 후 머지**

리뷰 승인 후 Squash merge.

**완료 지표:** `feature/official-form-alignment` 브랜치에 Step 2 병합. DB 스키마 기반이 완성되어 이후 Step이 이를 활용 가능.

---

### Step 3: Vercel Python Functions + python-hwpx PoC

**브랜치:** `feature/ofa-03-hwpx-poc`
**규모:** Small (12 Task)
**호출 스킬:** `hwpx-docgen`(외부), Context7 MCP
**병렬 가능:** Step 4와 병렬 진행 가능

**목표:** Vercel 환경에서 Python 함수가 동작하고, `python-hwpx`로 최소 .hwpx 파일을 생성할 수 있음을 검증. **이 Step이 실패하면 아키텍처를 (B) 별도 서비스로 선회한다.**

**파일:**
- 신규: `api/hwpx/ping.py`
- 신규: `api/hwpx/generate.py` (최소 동작)
- 신규: `api/hwpx/requirements.txt`
- 신규: `.python-version` (로컬 개발용 Python 버전 고정)
- 변경: `.gitignore` (`.venv/`, `__pycache__/`, `*.pyc` 추가)
- 변경: `vercel.json`
- 신규: `src/app/api/hwpx-test/route.ts` (Node 쪽에서 Python 함수 호출 검증용 임시 라우트)
- 신규: `docs/decisions/2026-04-14-hwpx-infrastructure.md` (ADR)

- [ ] **Task 1: 브랜치 생성**

```bash
git checkout feature/official-form-alignment && git pull
git checkout -b feature/ofa-03-hwpx-poc
```

- [ ] **Task 2: 로컬 Python 환경 구축 (uv 기반)**

프로덕션 Vercel은 `requirements.txt`만 있으면 자동 격리하지만, 로컬에서 템플릿 분석·검증·스크립트 실행이 필요하므로 가상환경을 구축한다.

```bash
# uv 설치 (없으면)
brew install uv

# 프로젝트 루트에 가상환경 생성
uv venv .venv --python 3.13
source .venv/bin/activate

# Python 버전 고정 파일
echo "3.13" > .python-version

# .gitignore에 가상환경 제외 항목 추가
cat >> .gitignore <<'EOF'

# Python (HWPX 관련 로컬 도구)
.venv/
__pycache__/
*.pyc
*.pyo
EOF
```

이후 모든 Python 스크립트 실행은 활성화된 `.venv` 안에서 진행한다.

> 주의: `.venv/`는 절대 커밋하지 않는다. `.python-version`과 `requirements.txt`만 커밋한다.

- [ ] **Task 3: Context7 MCP로 Vercel Python runtime 최신 스펙 확인**

```
mcp__plugin_context7_context7__resolve-library-id("vercel python")
→ 반환된 ID로 query-docs(topic="Python runtime configuration")
```

확인 항목:
- 현재 지원 Python 버전 (기대: 3.12 또는 3.13)
- `requirements.txt` 위치 규칙
- `api/` 디렉터리 규약
- 함수 사이즈 한도 (기대: 250MB)

- [ ] **Task 4: Vercel 설정에 Python runtime 명시**

프로젝트에는 현재 `vercel.json`·`vercel.ts` 모두 없다. 신규 생성 시 **두 형식 중 하나 선택**:

(A) 간단한 JSON (기본값·권장):
파일: `vercel.json`
```json
{
  "functions": {
    "api/hwpx/*.py": {
      "runtime": "python3.13"
    }
  }
}
```

(B) TypeScript 설정 (Vercel Knowledge Updates 2026-02-27 권장; 동적 로직 필요 시):
파일: `vercel.ts` (`@vercel/config` 설치 필요)
```typescript
import { type VercelConfig } from '@vercel/config/v1';
export const config: VercelConfig = {
  functions: { 'api/hwpx/*.py': { runtime: 'python3.13' } },
};
```

**결정**: 본 계획서는 단순 runtime 지정만 필요하므로 **(A) `vercel.json` 채택**(추가 의존성 없이 검증 용이). 향후 cron·헤더·리라이트 확장이 필요하면 `vercel.ts`로 전환.

- [ ] **Task 5: 최소 ping 엔드포인트**

파일: `api/hwpx/ping.py`
```python
from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "ok", "runtime": "python"}).encode('utf-8'))
```

파일: `api/hwpx/requirements.txt`
```
python-hwpx==0.1.0
lxml>=5.0.0
```

(버전은 Context7로 확인한 최신으로 정확히 고정)

로컬 가상환경에도 동일 의존성을 설치한다:
```bash
source .venv/bin/activate
uv pip install -r api/hwpx/requirements.txt
python -c "import hwpx; print(hwpx.__version__)"
# 기대: 버전 문자열 출력
```

- [ ] **Task 6: Vercel Preview 배포 + ping 검증**

```bash
git add api/hwpx/ping.py api/hwpx/requirements.txt vercel.json
git commit -m "feat(ofa-03): Vercel Python runtime 초기 설정 + ping 엔드포인트"
git push -u origin feature/ofa-03-hwpx-poc
```

Vercel이 자동 생성한 Preview URL로:
```bash
curl https://<preview-url>/api/hwpx/ping
# 기대: {"status": "ok", "runtime": "python"}
```

실패 시:
1. Vercel 빌드 로그에서 Python runtime 감지 여부 확인
2. `vercel.json` 함수 패턴 재점검
3. 그래도 실패하면 **별도 서비스(B안) 선회 의사결정** → 계획서 수정 필요

**보안 원칙 (Step 3 이후 모든 api/hwpx/ 작업에 적용):**
- `api/hwpx/generate.py`는 Vercel Python Functions로 배포되어 **공개 URL이 된다.** 인증이 없으면 누구나 호출해 HWPX를 대량 생성할 수 있고(DoS·비용), 내부 데이터 유출 위험은 없지만 리소스 남용 위험이 있다.
- **내부 공유 시크릿**으로 헤더 검증을 강제한다:
  - 환경변수: `HWPX_API_SECRET` (Node·Python 양쪽에서 참조, Vercel에 Production/Preview 둘 다 등록)
  - Node 클라이언트(`hwpx-client.ts`)는 요청 시 `X-HWPX-Secret: ${process.env.HWPX_API_SECRET}` 헤더 추가
  - Python 핸들러는 해당 헤더가 일치하지 않으면 401 반환
  - PoC(Task 5의 ping) 단계에서는 체크 생략 가능하나 **generate(Task 7)부터는 필수**
- Step 12 보안 감사(`security-auditor`)에서 이 항목을 재확인한다.

- [ ] **Task 7: python-hwpx로 최소 .hwpx 생성**

파일: `api/hwpx/generate.py`
```python
"""
최소 동작 확인용: POST로 제목만 받아 1페이지 .hwpx 생성
실제 산인공 양식 연결은 Step 7/10에서.
"""
from http.server import BaseHTTPRequestHandler
import json
import io
import tempfile
import os

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 내부 시크릿 검증 (Vercel 환경변수 HWPX_API_SECRET)
        import os
        expected = os.environ.get('HWPX_API_SECRET')
        provided = self.headers.get('X-HWPX-Secret')
        if not expected or provided != expected:
            self._error(401, 'unauthorized')
            return

        content_length = int(self.headers.get('Content-Length', 0))
        try:
            body = json.loads(self.rfile.read(content_length) or b'{}')
        except json.JSONDecodeError:
            self._error(400, 'invalid json')
            return

        title = body.get('title', '테스트 문서')

        try:
            from hwpx import HwpxDocument
        except ImportError as e:
            self._error(500, f'hwpx import failed: {e}')
            return

        try:
            doc = HwpxDocument.new()
            doc.add_paragraph(title)
            with tempfile.NamedTemporaryFile(delete=False, suffix='.hwpx') as f:
                doc.save_to_path(f.name)
                with open(f.name, 'rb') as rf:
                    data = rf.read()
                os.unlink(f.name)
        except Exception as e:
            self._error(500, f'generation failed: {e}')
            return

        self.send_response(200)
        self.send_header('Content-Type', 'application/vnd.hancom.hwpx')
        self.send_header('Content-Disposition', 'attachment; filename="test.hwpx"')
        self.end_headers()
        self.wfile.write(data)

    def _error(self, code, msg):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode('utf-8'))
```

- [ ] **Task 8: Preview에서 generate 검증**

```bash
git add api/hwpx/generate.py
git commit -m "feat(ofa-03): python-hwpx로 최소 HWPX 생성 엔드포인트"
git push
```

```bash
curl -X POST https://<preview-url>/api/hwpx/generate \
  -H "Content-Type: application/json" \
  -d '{"title": "안녕하세요"}' \
  -o /tmp/test.hwpx

file /tmp/test.hwpx
# 기대: ZIP archive data (hwpx는 zip 기반)

# 로컬 가상환경으로 HWPX 검증 (프로젝트 스킬 스크립트 사용)
source .venv/bin/activate
python .claude/skills/hwpx-docgen/scripts/validate_hwpx.py /tmp/test.hwpx
python -c "from hwpx import HwpxDocument; doc = HwpxDocument.open('/tmp/test.hwpx'); print(doc.paragraphs[0].text)"
# 기대: "안녕하세요"
```

- [ ] **Task 9: Node.js 쪽 클라이언트 검증 (일회성)**

파일: `src/app/api/hwpx-test/route.ts`
```typescript
import { NextResponse } from 'next/server';

/**
 * PoC 단계의 일회성 검증 라우트.
 * Step 7에서 정식 클라이언트(src/lib/services/export/hwpx/)로 대체되고 이 라우트는 삭제된다.
 */
export async function GET() {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/hwpx/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Node → Python 통신 확인' }),
    });
    if (!res.ok) return NextResponse.json({ ok: false, status: res.status }, { status: 500 });
    const ab = await res.arrayBuffer();
    return NextResponse.json({ ok: true, bytes: ab.byteLength });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
```

검증:
```bash
curl https://<preview-url>/api/hwpx-test
# 기대: {"ok":true,"bytes": <양의 정수>}
```

- [ ] **Task 10: ADR 작성 (의사결정 기록)**

파일: `docs/decisions/2026-04-14-hwpx-infrastructure.md`
```markdown
# HWPX 생성 인프라: Vercel Python Functions 채택

**Date:** 2026-04-14
**Status:** Accepted

## Context
산인공 공식 양식을 한글 파일(.hwpx)로 생성해야 하며, Python 라이브러리 `python-hwpx`가 사실상 유일한 선택지.

## Decision
Vercel Python Functions (Fluid Compute, python3.13)를 `api/hwpx/` 경로에 둔다. Next.js Server Action에서 이 함수를 호출한다.

## Alternatives
- 별도 마이크로서비스 (Railway/Render): 운영 부담 및 인프라 복잡도로 기각
- 로컬 전용: 프로덕션에서 작동 안 하므로 기각

## Consequences
- 배포는 단일 Vercel 프로젝트로 관리 가능
- 콜드스타트 비용 존재 (Fluid Compute로 완화)
- 함수 사이즈 한도 250MB — python-hwpx + lxml은 여유 있음
- PoC에서 검증 완료 (Step 3)
```

- [ ] **Task 11: 커밋 및 PR**

```bash
git add src/app/api/hwpx-test/route.ts docs/decisions/2026-04-14-hwpx-infrastructure.md
git commit -m "feat(ofa-03): HWPX PoC — Python 런타임 + generate 엔드포인트 동작 확인

- api/hwpx/ping.py 기본 runtime 확인
- api/hwpx/generate.py python-hwpx 최소 동작
- src/app/api/hwpx-test/route.ts Node→Python 연결 확인
- ADR 기록"

git push

gh pr create --base feature/official-form-alignment \
  --title "feat(ofa-03): HWPX 생성 인프라 PoC" \
  --body "Vercel Python Functions + python-hwpx 동작 검증 완료. ADR 첨부."
```

- [ ] **Task 12: 리뷰 후 머지**

**완료 지표:** Preview URL에서 `/api/hwpx-test` 응답 `ok:true` 및 bytes > 0. ADR 커밋됨.

**실패 시 대안:** 별도 Python 서비스 플랜 작성 → 본 계획서 대규모 수정.

---

### Step 4: 공지 게시판

**브랜치:** `feature/ofa-04-notices-board`
**규모:** Medium (약 10개 Task)
**호출 스킬:** `frontend-guide`, `check-server-action`, `web-design-guidelines`, shadcn MCP
**병렬 가능:** Step 3 완료 후 병렬 가능 (독립 기능)

**목표:** 운영자·시스템관리자가 공지를 작성하고 컨설턴트·운영자가 조회하는 게시판. 첨부 파일 업로드/다운로드, 제목·작성자 필터 검색, 상단 고정, 조회수.

**파일:**
- 신규: `src/lib/schemas/notice.ts` (CRUD 스키마 완성)
- 신규: `src/lib/services/notice.ts` (+ `.test.ts`)
- 신규: `src/app/(dashboard)/notices/page.tsx` (목록)
- 신규: `src/app/(dashboard)/notices/[id]/page.tsx` (상세)
- 신규: `src/app/(dashboard)/ops/notices/page.tsx` (운영자 목록/관리)
- 신규: `src/app/(dashboard)/ops/notices/new/page.tsx`
- 신규: `src/app/(dashboard)/ops/notices/[id]/edit/page.tsx`
- 신규: `src/app/(dashboard)/ops/notices/actions.ts` (+ `.test.ts`)
- 신규: `src/components/notices/NoticeList.tsx` (+ `.test.tsx`)
- 신규: `src/components/notices/NoticeForm.tsx` (+ `.test.tsx`)
- 신규: `src/components/notices/AttachmentUploader.tsx` (+ `.test.tsx`)
- 신규: `src/components/notices/AttachmentList.tsx` (+ `.test.tsx`)
- 변경: `src/components/Navigation.tsx` (공지 메뉴 항목 추가 — 프로젝트에는 별도 Sidebar 파일이 없으며, 이 단일 컴포넌트가 전체 네비게이션을 담당)

- [ ] **Task 1: 브랜치 생성 + Storage bucket 검증**

```bash
git checkout feature/official-form-alignment && git pull
git checkout -b feature/ofa-04-notices-board
```

Step 2의 마이그레이션 062에서 `notice-attachments` 버킷이 SQL로 생성되었는지 확인:
```sql
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'notice-attachments';
```
→ 반환이 없으면 Step 2를 먼저 완료하고 재진입.

> Supabase 환경에 따라 storage.objects 정책은 SQL로 만들지 못할 수 있다. 이 경우 Dashboard에서 동일 규칙(접근: 컨설턴트·OPS+ / 변경: OPS+)을 수동 설정한다.

- [ ] **Task 2: 스키마 완성 (RED 테스트 먼저)**

파일: `src/lib/schemas/notice.test.ts` (프로젝트 컨벤션: `<module>.test.ts` — `notice.ts.test.ts` 같은 이중 `.ts`는 사용하지 않음)
```typescript
import { describe, it, expect } from 'vitest';
import { noticeInputSchema, noticeUpdateSchema, attachmentInputSchema } from './notice';

describe('noticeInputSchema', () => {
  it('제목 1~200자만 허용', () => {
    expect(noticeInputSchema.safeParse({ title: '', body: 'x', is_pinned: false }).success).toBe(false);
    expect(noticeInputSchema.safeParse({ title: 'a'.repeat(201), body: 'x', is_pinned: false }).success).toBe(false);
    expect(noticeInputSchema.safeParse({ title: '유효', body: 'x', is_pinned: false }).success).toBe(true);
  });
  it('본문 50000자 초과 불허', () => {
    expect(noticeInputSchema.safeParse({ title: 't', body: 'a'.repeat(50001), is_pinned: false }).success).toBe(false);
  });
});

describe('attachmentInputSchema', () => {
  it('20MB 초과 거부', () => {
    const big = { file_name: 'a.pdf', mime_type: 'application/pdf', file_size: 20 * 1024 * 1024 + 1, storage_path: 'x' };
    expect(attachmentInputSchema.safeParse(big).success).toBe(false);
  });
  it('허용 확장자만 통과', () => {
    const okExts = ['.hwpx', '.hwp', '.pdf', '.docx', '.xlsx', '.txt', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    for (const ext of okExts) {
      const input = { file_name: `file${ext}`, mime_type: 'x', file_size: 100, storage_path: 'x' };
      expect(attachmentInputSchema.safeParse(input).success).toBe(true);
    }
    expect(attachmentInputSchema.safeParse({ file_name: 'bad.exe', mime_type: 'x', file_size: 100, storage_path: 'x' }).success).toBe(false);
  });
});
```

`npm run test -- notice.test.ts` → FAIL 확인.

- [ ] **Task 3: 스키마 구현**

파일: `src/lib/schemas/notice.ts`
```typescript
import { z } from 'zod';

const ALLOWED_EXT = ['.hwpx', '.hwp', '.pdf', '.docx', '.xlsx', '.txt', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.webp'] as const;
const MAX_BYTES = 20 * 1024 * 1024; // 20MB

export const noticeInputSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(200, '제목은 200자 이하'),
  body: z.string().max(50000, '본문은 50,000자 이하'),
  is_pinned: z.boolean().default(false),
});

export const noticeUpdateSchema = noticeInputSchema.partial();

export const attachmentInputSchema = z.object({
  file_name: z.string().refine(
    (n) => ALLOWED_EXT.some((ext) => n.toLowerCase().endsWith(ext)),
    '허용되지 않는 파일 형식'
  ),
  mime_type: z.string(),
  file_size: z.number().int().positive().max(MAX_BYTES, '파일은 20MB 이하여야 합니다.'),
  storage_path: z.string().min(1),
});

export const noticeSearchSchema = z.object({
  q: z.string().optional(),
  filter_by: z.enum(['title', 'author']).default('title'),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(10),
});

export type NoticeInput = z.infer<typeof noticeInputSchema>;
export type AttachmentInput = z.infer<typeof attachmentInputSchema>;
export type NoticeSearch = z.infer<typeof noticeSearchSchema>;
```

`npm run test -- notice.test.ts` → PASS 확인.

- [ ] **Task 4: 서비스 레이어 — `notice.ts` (RED → GREEN, 함수별 반복)**

파일: `src/lib/services/notice.ts` + `notice.test.ts`

각 함수에 대해 다음 순서 반복:

**(a) `listNotices(search, client)`**
- RED: 페이지네이션 파라미터(page=1, per_page=10)로 호출 시 상단 고정 우선 + 생성일 desc 정렬 결과 검증. filter_by='author' + q='홍길동' 케이스도 테스트.
- GREEN: Supabase query builder로 `is_pinned desc, created_at desc` 정렬 + `.ilike('title', '%q%')` 또는 author join 조건부.

**(b) `getNotice(id, client)`**
- RED: 주어진 id로 notice + 연관 attachments 조회. 없으면 null 반환. 조회 시 `increment_notice_view_count` RPC 호출 확인.
- GREEN: `.select('*, notice_attachments(*)').eq('id', id).single()`.

**(c) `createNotice(input, authorId, attachments, client)`**
- RED: notice insert + 각 attachment insert. 일부 실패 시 전체 롤백 확인(가능하면 RPC 또는 adminClient 사용).
- GREEN: 단순 순차 insert + 실패 시 이미 생성된 row 삭제로 수동 롤백.

**(d) `updateNotice(id, patch, client)`** — partial update.
**(e) `deleteNotice(id, adminClient)`** — DB row 삭제 + 스토리지 파일 함께 삭제(adminClient 필수).
**(f) `uploadAttachment(file, noticeId, adminClient)`** — storage upload → path 반환 → attachment row insert용 input 구성.

**storage_path 생성 규칙** (UNIQUE 제약 보장 + 파일명 충돌 방지):
```typescript
const safeName = file.name.replace(/[^\w.\-가-힣]/g, '_');
const storagePath = `${noticeId}/${crypto.randomUUID()}-${safeName}`;
// 예: "a1b2c3.../d4e5f6...-요청서.pdf"
```
- 파일명 sanitize: 공백·특수문자 → _, 한글·영숫자·점·하이픈만 유지
- noticeId 폴더 분리: 공지별 격리 + 삭제 시 prefix delete 가능
- UUID 접두사: 동일 파일명 재업로드 충돌 방지 (UNIQUE storage_path 보장)

각 함수 파일당 최소 3개(성공·빈결과·실패) 테스트 케이스.

Supabase 모킹은 기존 프로젝트의 `src/test/helpers/mock-supabase.ts`(또는 유사) 재사용.

- [ ] **Task 5: Server Actions**

`src/app/(dashboard)/ops/notices/actions.ts` 작성. 5단계 패턴 엄수:
1. 세션 확인 (`createClient()` from `@/lib/supabase/server`)
2. 역할 권한 검사 — `requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN'], {...})` (기존 헬퍼 재사용)
3. Zod 검증 (`noticeInputSchema`, `attachmentInputSchema`)
4. 서비스 호출 (`notice.ts`)
5. `ActionResult<T>` 반환

주요 액션:
- `createNoticeAction(formData: FormData)` — 본문만(첨부는 별도)
- `updateNoticeAction(id: string, formData: FormData)`
- `deleteNoticeAction(id: string)`
- `togglePinAction(id: string, pinned: boolean)`
- `uploadAttachmentAction(noticeId: string, formData: FormData)` — Storage 업로드 + attachment row insert (adminClient 필요, 파일 하나씩)
- `deleteAttachmentAction(attachmentId: string)` — Storage 파일 + row 동시 삭제 (adminClient)

각 액션에 `.test.ts` 파일 작성 (권한 거부·입력 검증·성공 케이스).

각 액션은 `{ success: true, data }` 또는 `{ success: false, error }` 반환 (3-4-3 원칙).

**스킬 호출:** 작성 후 `check-server-action` 스킬로 자가 검사.

- [ ] **Task 6: 운영자 목록/생성/편집 페이지**

shadcn MCP로 사용 가능한 컴포넌트 확인(프로젝트에는 이미 `Table`, `Dialog`, `DropdownMenu` 등이 설치됨. 여기서는 신규 필요 항목만 조회):
```
mcp__shadcn__list_items_in_registries                     # 전체 카탈로그
mcp__shadcn__search_items_in_registries(query="table")     # 테이블 관련
mcp__shadcn__search_items_in_registries(query="dropzone")  # 파일 업로드 드롭존 (있으면 사용, 없으면 자체 구현)
```

> 파일 업로드는 shadcn 기본 registry에 전용 컴포넌트가 없을 수 있다. 그 경우 **네이티브 `<input type="file">`을 shadcn Button으로 래핑 + Zod `attachmentInputSchema` 클라이언트 검증** 방식으로 자체 구현(3-4-2 원칙과 상충하지 않음 — "shadcn 래퍼를 추가"하는 경로에 해당).

파일별 구현:
- `src/app/(dashboard)/ops/notices/page.tsx`: 목록 테이블 (상단 고정/일반 분리) + 신규 버튼
- `src/app/(dashboard)/ops/notices/new/page.tsx`: `NoticeForm` 마운트
- `src/app/(dashboard)/ops/notices/[id]/edit/page.tsx`: 기존 데이터 프리필 + `NoticeForm`
- `src/components/notices/NoticeForm.tsx`: 제목·본문·상단 고정 체크박스 + `AttachmentUploader`
- `src/components/notices/AttachmentUploader.tsx`: 파일 선택·크기·확장자 클라이언트 검증 후 업로드 액션 호출
- `src/components/notices/AttachmentList.tsx`: 이미 업로드된 첨부 목록 (삭제 버튼, 다운로드 링크)

**스킬 호출:** `frontend-guide`로 UI 컨벤션 확인.

- [ ] **Task 7: 일반 조회 페이지 (컨설턴트 시점)**

- `src/app/(dashboard)/notices/page.tsx`: 페이지네이션·검색·필터(제목/작성자) UI
- `src/app/(dashboard)/notices/[id]/page.tsx`: 상세 + 첨부 다운로드 (조회수 증가)

접근 권한:
- `src/proxy.ts` 또는 페이지 서버 컴포넌트 진입 시 역할 체크 (`CONSULTANT_APPROVED || OPS_ADMIN || SYSTEM_ADMIN`). `is_system_admin()` 같은 헬퍼는 존재하지 않으므로 TS 쪽에서는 `profile.role` 분기로 판별, DB 쪽은 `is_ops_admin_or_higher()` + `is_approved_consultant()`.

- [ ] **Task 8: 네비게이션에 공지 메뉴 추가**

`src/components/Navigation.tsx` (프로젝트 유일 네비게이션 컴포넌트 — `layout/Sidebar.tsx` 경로는 존재하지 않으므로 혼동 금지):
- 컨설턴트 역할: `공지사항` 메뉴 항목 추가
- 운영자 역할: `공지 관리` 서브 메뉴 추가
- 역할 기반 조건부 렌더링은 기존 `Navigation.tsx`의 `user.role` 분기 패턴 재사용

- [ ] **Task 9: E2E Playwright 테스트**

`e2e/ops/notices.spec.ts` 작성 (E2E 디렉터리는 프로젝트 루트 `e2e/<카테고리>/`; `tests/e2e/` 경로는 존재하지 않음):
- 운영자가 공지 작성 → 첨부 업로드 → 저장
- 컨설턴트가 공지 목록에서 해당 글 확인
- 상단 고정 작동 확인
- 제목 필터 검색 동작

`test-automator` 서브에이전트 활용 가능.

- [ ] **Task 10: 최종 검증·커밋·PR**

```bash
npm run validate && npm run build && npm run test:e2e
git add <변경파일>
git commit -m "feat(ofa-04): 공지 게시판 추가

- notice CRUD 서비스 + Server Actions
- 운영자 목록/생성/편집 페이지
- 컨설턴트 조회 페이지 + 검색 필터
- 첨부 파일 업로드/다운로드 (Supabase Storage)
- 사이드바 메뉴 추가
- E2E 테스트"
git push -u origin feature/ofa-04-notices-board

gh pr create --base feature/official-form-alignment \
  --title "feat(ofa-04): 공지 게시판 (양식 다운로드)" \
  --body "..."
```

**완료 지표:** Preview URL에서 운영자 로그인 → 공지 작성 → 파일 업로드 → 컨설턴트 로그인 → 공지 조회·다운로드 전체 플로우 동작.

---

### Step 5: 로드맵 인터뷰 산인공 양식 재설계

**브랜치:** `feature/ofa-05-interview-roadmap`
**규모:** Large (13 Task)
**호출 스킬:** `frontend-guide`, `composition-patterns`, `check-server-action`, `refactoring`
**의존:** Step 2

**목표:** 기존 6스텝 인터뷰를 산인공 문서 1 기반 구조로 전면 재작성. 기존 스키마는 `@deprecated`로 표시하고, 새 스키마로 대체.

**산인공 로드맵 인터뷰 요구 필드(docs/references/1 기준):**
1. 기업 요구분석 (4필드 텍스트)
2. 과업·워크플로우 분석표 (배열)
3. 훈련대상 과업 선정 (배열)
4. 수행일지 메타 (기존 유지)

**기존 프로젝트 컨벤션 준수:**
- 컨테이너 컴포넌트 이름: `InterviewClient.tsx` (기존). 신규는 `RoadmapInterviewClient.tsx`, `PBLInterviewClient.tsx`.
- 스텝 컴포넌트 이름: `Step*.tsx` 접두사(기존 `StepBasicInfo`, `StepCompanyDetails`, `StepJobTasks`, `StepPainPoints`, `StepConstraintsGoals`, `StepSummary` 스타일).
- 위저드 진행 UI: **`InterviewStepper.tsx` 재사용** (기존 파일에 이미 존재).
- 스텝 컴포넌트 위치: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/`, `_components/pbl/` 서브폴더. 기존 루트 `_components/`에 있는 legacy Step* 파일은 Step 12에서 제거.
- 자동 저장 로직: 현재 `InterviewClient.tsx` 내부에 인라인(디바운스 3000ms)으로 구현되어 있다. 본 Step에서 공용 훅 `_hooks/useInterviewAutoSave.ts`로 추출해 두 트랙이 공유.

**파일:**
- 신규: `src/lib/schemas/interview-roadmap.ts` (+ `.test.ts`)
- 신규: `src/lib/constants/interview-steps-roadmap.ts` (+ `.test.ts`)
- 변경: `src/lib/constants/interview-steps.ts` (트랙별 분기 디스패처)
- 변경: `src/lib/schemas/interview.ts` (JSDoc `@deprecated` 주석 추가)
- 변경: `src/app/(dashboard)/consultant/projects/[id]/interview/page.tsx` (트랙 분기 라우팅)
- 신규: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/RoadmapInterviewClient.tsx` (+ `.test.tsx`)
- 신규: `src/app/(dashboard)/consultant/projects/[id]/interview/_hooks/useInterviewAutoSave.ts` (+ `.test.ts`)
- 신규: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepCompanyRequirements.tsx` (+ `.test.tsx`)
- 신규: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTaskWorkflowAnalysis.tsx` (+ `.test.tsx`)
- 신규: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTrainingTargets.tsx` (+ `.test.tsx`)

- [ ] **Task 1: 브랜치 생성**

```bash
git checkout feature/official-form-alignment && git pull
git checkout -b feature/ofa-05-interview-roadmap
```

- [ ] **Task 2: 스키마 RED 테스트**

`src/lib/schemas/interview-roadmap.test.ts`에 산인공 양식 필드 검증 테스트 작성. 예:
- `companyRequirements`: 4필드 모두 필수
- `taskWorkflowItems`: 배열, 각 항목에 현행·문제점·데이터·AI필요도(1~5)
- `trainingTargets`: 최소 1개

- [ ] **Task 3: 스키마 구현**

파일: `src/lib/schemas/interview-roadmap.ts` (핵심 구조)
```typescript
import { z } from 'zod';

// Ⅱ-2. 기업 요구분석
export const companyRequirementsSchema = z.object({
  company_status: z.string().min(1, '기업 현황을 입력하세요.'), // 업종·생산품·AI도입·훈련이력
  main_problems: z.string().min(1, '주요 문제를 입력하세요.'),
  push_willingness: z.string().min(1, '추진 의지를 입력하세요.'),
  expected_outcomes: z.string().min(1, '기대 성과를 입력하세요.'),
});

// Ⅱ-3. 과업·워크플로우 분석표 항목
export const taskWorkflowItemSchema = z.object({
  id: z.string(),
  job: z.string().min(1),                 // 직무(생산/품질/설비 등)
  task_name: z.string().min(1),           // 과업
  as_is: z.string().min(1),               // 현행 방식
  problems: z.string().min(1),            // 문제점
  data_availability: z.string().min(1),   // 데이터 발생시점 또는 보유현황
  ai_necessity: z.number().int().min(1).max(5),
});

// Ⅱ-4. 훈련대상 과업 선정
export const trainingTargetSchema = z.object({
  id: z.string(),
  task_name: z.string().min(1),
  selection_reason: z.string().min(1),
  as_is: z.string().min(1),
  to_be: z.string().min(1),
});

// 분석 내용 (텍스트) + 첨부파일 URL 배열
export const analysisNotesSchema = z.object({
  text: z.string().default(''),
  attachment_urls: z.array(z.string().url()).default([]),
});

// 전체 로드맵 인터뷰 스키마
export const roadmapInterviewSchema = z.object({
  interview_date: z.string().min(1),
  interview_round: z.number().int().min(1),
  interview_time: z.string().min(1),
  participants: z.array(z.object({
    id: z.string(),
    name: z.string().min(1),
    position: z.string().optional(),
  })).min(1),

  company_requirements: companyRequirementsSchema,
  task_workflow_items: z.array(taskWorkflowItemSchema).min(1, '최소 1개의 과업을 분석하세요.'),
  analysis_notes: analysisNotesSchema,
  training_targets: z.array(trainingTargetSchema).min(1),

  notes: z.string().default(''),
  stt_insights: z.record(z.unknown()).optional(), // 기존 재사용
});

// 자동저장용 (min 제약 완화)
export const roadmapInterviewAutoSaveSchema = roadmapInterviewSchema.deepPartial();

export type RoadmapInterview = z.infer<typeof roadmapInterviewSchema>;

// 헬퍼
export function createEmptyTaskWorkflowItem() { /* ... */ }
export function createEmptyTrainingTarget() { /* ... */ }
```

- [ ] **Task 4: 로드맵 인터뷰 스텝 상수**

`src/lib/constants/interview-steps-roadmap.ts`
```typescript
import type { InterviewStep } from './interview-steps';

export const ROADMAP_INTERVIEW_STEPS: readonly InterviewStep[] = [
  { id: 1, name: '기본 정보 · 참석자', shortName: '기본' },
  { id: 2, name: '기업 요구분석', shortName: '요구' },
  { id: 3, name: '과업·워크플로우 분석', shortName: '과업' },
  { id: 4, name: '훈련대상 과업 선정', shortName: '대상' },
  { id: 5, name: '확인·제출', shortName: '확인' },
] as const;

export const ROADMAP_REQUIRED_STEP_IDS = [1, 2, 3, 4] as const;
```

`interview-steps.ts`는 track 파라미터를 받아 분기하는 얇은 디스패처로 재작성 (PBL 스텝은 Step 8에서 추가):
```typescript
import { ROADMAP_INTERVIEW_STEPS } from './interview-steps-roadmap';
import type { ProjectTrack } from './tracks';

export function getInterviewSteps(track: ProjectTrack) {
  if (track === 'ROADMAP') return ROADMAP_INTERVIEW_STEPS;
  throw new Error(`PBL steps not yet implemented (planned: Step 8)`);
}
```

- [ ] **Task 5: 기존 `interview.ts` deprecated 마킹 (하지만 삭제는 미루기)**

```typescript
/**
 * @deprecated 산인공 양식 정렬 작업(ofa-05)으로 인터뷰 스키마가
 * interview-roadmap.ts / interview-pbl.ts 로 이전되었습니다.
 * 신규 코드는 트랙별 스키마를 사용하세요. 이 파일은 다음 Step에서 제거됩니다.
 */
```

실제 제거는 Step 8 PBL 완료 후 Step 12에서.

- [ ] **Task 6: `StepCompanyRequirements` 컴포넌트 (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepCompanyRequirements.tsx` + `.test.tsx`

RED 테스트:
- 4개 textarea가 모두 렌더되는지
- 각 필드에 값 입력 시 `onChange` 콜백에 올바른 key로 전달되는지
- 각 필드가 비어 있을 때 제출 시 에러 메시지 노출(또는 `canProceed=false`)

GREEN 구현:
- 4개 textarea (기업 현황·주요 문제·추진 의지·기대 성과)
- Zod 검증·자동 저장 훅 사용(기존 인터뷰 자동 저장 패턴)
- 각 필드 도움말에 산인공 예시 인용(placeholder 또는 aria-describedby)

`composition-patterns` 스킬 참조로 기존 인터뷰 스텝 공통 Wrapper 추출 가능 여부 판단.

- [ ] **Task 7: `StepTaskWorkflowAnalysis` 컴포넌트 (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTaskWorkflowAnalysis.tsx` + `.test.tsx`

RED 테스트:
- 행 추가 버튼 클릭 시 빈 행 추가
- 삭제 버튼 클릭 시 해당 행 제거
- AI필요도가 1~5 외의 값으로 설정될 수 없음
- 최소 1개 행 보장

GREEN 구현:
- 동적 배열 UI (행 추가/삭제 — `createEmptyTaskWorkflowItem` 사용)
- 각 행: 직무 / 과업명 / As-Is / 문제점 / 데이터 보유 / AI필요도(1-5 라디오 버튼 그룹)
- 점수 선택은 접근성 고려한 `role="radiogroup"`

- [ ] **Task 8: `StepTrainingTargets` 컴포넌트 (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTrainingTargets.tsx` + `.test.tsx`

RED 테스트:
- 동적 행 추가/삭제
- 각 행 필드(과업명·선정사유·As-Is·To-Be) 모두 필수
- 최소 1개 행 보장

GREEN 구현:
- 동적 배열 UI
- 각 행: 과업명 / 선정사유 / As-Is(현행) / To-Be(개선)

- [ ] **Task 9: `RoadmapInterviewClient` 오케스트레이터 (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/RoadmapInterviewClient.tsx` + `.test.tsx`

기존 `InterviewClient.tsx`는 로드맵 전용 legacy 흐름을 담고 있으므로, 이 Step에서 `RoadmapInterviewClient.tsx`로 **대체**한다. 기존 파일 삭제는 Step 8·12에서 순차 진행.

RED 테스트:
- 초기 렌더 시 Step 1 표시
- "다음" 버튼 클릭 시 Step 2로 전환
- 필수 필드 미입력 상태에서 "다음" 비활성화
- 마지막 스텝에서 "제출" 버튼 노출 + 클릭 시 제출 액션 호출
- 자동 저장: 각 스텝 편집 후 일정 시간 뒤 draft 저장 액션 호출(디바운스 3000ms)

GREEN 구현:
- 5스텝 전환, 기존 **`InterviewStepper.tsx` 재사용**으로 진행률 표시
- 각 스텝은 동적 import + Suspense로 초기 번들 절감
- 자동 저장은 이 Step에서 신규 분리한 **`_hooks/useInterviewAutoSave.ts`** 사용 (기존 InterviewClient 인라인 로직을 추출)
- 마지막 스텝은 요약/확인 화면 — 기존 `InterviewSummary.tsx`의 공통 부분을 재사용하거나, `StepSummaryRoadmap.tsx`로 신규 작성(기존 스키마 의존성 제거 위해 신규 권장)

- [ ] **Task 10: `interview/page.tsx` 트랙 분기 (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/page.tsx` (변경) + `.test.tsx`(신규)

**현재 page.tsx는 project 객체를 fetch하지 않고 `projectId`만 InterviewClient에 전달**(`fetchInterview(id)`만 호출). 트랙 분기를 위해 project 메타(특히 `track`)를 추가로 fetch해야 함.

RED 테스트:
- `project.track === 'ROADMAP'` → `RoadmapInterviewClient` 렌더
- `project.track === 'PBL'` → placeholder 컴포넌트 렌더 (예: "PBL 인터뷰는 Step 8에서 구현 예정")
- 프로젝트 미존재 → notFound() 또는 404
- 컨설턴트 미배정 → forbidden 처리(기존 패턴 유지)

GREEN 구현:
```typescript
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { fetchInterview } from './actions';
import RoadmapInterviewClient from './_components/RoadmapInterviewClient';

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCachedUser();
  if (!user) redirect('/login');
  const profile = await getCachedProfile();
  if (!profile || profile.role !== 'CONSULTANT_APPROVED') redirect('/dashboard');

  // project.track 메타 조회 (RLS가 배정 컨설턴트만 허용 — 결과 null이면 권한 없음 또는 미존재)
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, track')
    .eq('id', id)
    .single();
  if (!project) notFound();

  const interviewRow = await fetchInterview(id);

  if (project.track === 'PBL') {
    return <div className="p-8 text-muted-foreground">PBL 인터뷰 화면은 곧 제공됩니다 (OFA Step 8).</div>;
  }

  // fetchInterview 반환은 레거시 컬럼 형태(company_details, job_tasks, ...).
  // RoadmapInterviewClient는 신규 RoadmapInterview 타입(interview-roadmap.ts)을 기대 → 매핑 필수.
  const initialData = mapInterviewRowToRoadmapInterview(interviewRow);
  return <RoadmapInterviewClient projectId={project.id} initialData={initialData} />;
}
```

**매핑 함수 `mapInterviewRowToRoadmapInterview`** — `src/lib/schemas/interview-roadmap.ts` 안에 export 헬퍼로 추가 (스키마와 매핑이 한 파일에 있어 변경 시 동기화 용이; `src/lib/services/interview/` 같은 별도 디렉터리는 신설하지 않음):
- 입력: `Interview | null` (`fetchInterview` 반환 타입)
- 출력: `Partial<RoadmapInterview>` (autosave 완화 스키마와 호환되도록 partial)
- 매핑 규칙:
  - `company_details` JSONB → `company_requirements` 4필드 추출 (없으면 빈 문자열)
  - `job_tasks` JSONB(배열) → `task_workflow_items` (필드 명 변환 또는 그대로)
  - `improvement_goals` JSONB(배열) → `training_targets`
  - 메타(interview_date, interview_round, interview_time, participants) → 그대로
  - row 자체가 null → 빈 객체 반환
- 단위 테스트로 매핑 정확성·null 안전성 검증.

> 역방향 매핑(`saveInterview` 안에서 RoadmapInterview → 레거시 컬럼)은 Task 11에서 처리.

Step 8에서 PBL 분기 placeholder를 실제 `PBLInterviewClient`로 교체한다 (project.track === 'PBL'일 때 PBLInterviewClient 렌더).

- [ ] **Task 11: Server Action 수정 (save/finalize) (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` (변경) + 기존 `actions.test.ts` 갱신

RED 테스트:
- 프로젝트 track이 'ROADMAP'이 아닌데 `saveInterview` 호출 → forbidden
- 잘못된 스키마(예: `company_requirements` 누락) → `ActionResult.error` with 상세 메시지
- 성공 케이스 → interviews 테이블 upsert + 상태 INTERVIEWED 전환(최종 제출 경로)

GREEN 구현:
- **함수명 유지 결정**: 기존 `saveInterview`의 **이름은 유지**하고 내부에서 `projects.track` 조회 후 ROADMAP일 때만 실행(PBL은 에러 반환). 이유: 기존 호출부(`InterviewClient.tsx` + 다수 테스트)의 import 경로를 흔들지 않음. Step 8에서 신규 `savePBLInterview`를 별도 함수로 추가하므로 네임스페이스 충돌 없음.
- `saveInterview` 본문에 **선행 가드**를 추가:
  ```typescript
  const { data: project } = await supabase.from('projects').select('track').eq('id', projectId).single();
  if (!project) return { success: false, error: '프로젝트를 찾을 수 없습니다.' };
  if (project.track !== 'ROADMAP') {
    return { success: false, error: 'PBL 트랙은 savePBLInterview를 사용해야 합니다.' };
  }
  ```
- `roadmapInterviewSchema`로 검증 (기존 `interviewSchema` 대신 신규 트랙별 스키마)
- 기존 컬럼 매핑 유지(company_details, job_tasks, pain_points 등) — 산인공 양식으로 재매핑은 아래 서술
- 현행 `interviews` 테이블 컬럼 중 재사용 매핑:
  - `company_details` JSONB ← `company_requirements` (+ 기타 기업 현황 필드)
  - `job_tasks` JSONB ← `task_workflow_items`
  - `pain_points` JSONB ← (신규 스키마의 문제점 배열)
  - `improvement_goals` JSONB ← `training_targets`
  - 기존 `constraints`는 로드맵 양식에 해당 없음 → 빈 배열 유지 or 신규 컬럼 도입 검토
- 원칙: **본 Step에서 신규 DB 마이그레이션을 추가하지 않는다.** 기존 interviews 테이블 컬럼을 애플리케이션 레이어 매핑으로만 재사용. 로드맵 데이터 분리 전용 컬럼(`roadmap_data JSONB`)의 필요성이 확인되면 **Step 12의 마이그레이션 065에 통합**한다(별도 063-b 금지 — Step 2에서 DB 기반이 완성됐다는 계약을 깨지 않기 위해).
- `check-server-action` 스킬 호출

- [ ] **Task 12: E2E 테스트 시나리오 추가**

`e2e/consultant/interview-roadmap.spec.ts` (프로젝트 실제 E2E 루트 = `e2e/<카테고리>/`):
- 컨설턴트 로그인 → 로드맵 프로젝트 배정 확인 → 인터뷰 5스텝 전체 작성 → 제출 → 상태 INTERVIEWED 전환

- [ ] **Task 13: 검증·커밋·PR**

```bash
npm run validate && npm run build
git add <변경>
git commit -m "feat(ofa-05): 로드맵 인터뷰 산인공 양식 재설계

- 기업 요구분석·과업 분석표·훈련대상 선정 구조
- 5스텝 위저드 (기본/요구/과업/대상/확인)
- 기존 interview.ts deprecated 표시
- E2E 커버리지 추가"
git push -u origin feature/ofa-05-interview-roadmap
gh pr create --base feature/official-form-alignment --title "..." --body "..."
```

**완료 지표:** Preview URL에서 로드맵 인터뷰 5스텝 전체 작성·저장·제출 완료.

---

### Step 6: 로드맵 산출물 양식 정렬

**브랜치:** `feature/ofa-06-output-roadmap`
**규모:** Large (16 Task)
**호출 스킬:** `prompt-engineer`(서브에이전트), `check-server-action`, `frontend-guide`, `refactoring`, `composition-patterns`
**의존:** Step 5

**프로젝트 기존 자산 준수 (중요):**
- `src/lib/services/export/pdf/`, `src/lib/services/export/xlsx/`는 신규 정렬된 위치. `src/lib/services/export-pdf.ts`, `export-xlsx.ts`는 **legacy**. Step 6에서 신규 경로만 수정하고 legacy는 Step 12에서 deprecate/삭제.
- 로드맵 서비스 파일들(`src/lib/services/roadmap/*.ts`)은 이미 분리된 상태 — 그대로 사용.
- 상태 배지: `src/components/roadmap/RoadmapStatusBadge.tsx` 재사용 또는 확장.

**목표:** 로드맵 LLM 프롬프트/생성 결과/화면을 산인공 문서 1 Ⅲ장 양식에 정렬. 역량 모델링 / 훈련체계도 / 연간 훈련계획 / 훈련과정 명세서 구조.

**산인공 로드맵 산출물 요구 구조:**
- Ⅰ. 개요: 수립 필요성, 주요활동(수행일지 자동생성), 수립 주요결과 요약
- Ⅱ. 요구분석: 인터뷰에서 자동 반영 (Step 5 데이터)
- Ⅲ-1. 역량 모델링: { 역량명, 역량정의, 지식, 기술, 태도, NCS활용여부 }
- Ⅲ-2. 훈련체계도: { 역량명, 훈련수준(초/중/고급), 훈련내용, 훈련대상, 훈련방법, 훈련목표 }
- Ⅲ-3. 연간 훈련계획: { 역량명, 훈련과정명, 훈련형태, 훈련시간, 비고 } + 활용방안
- Ⅲ-4. 훈련과정 명세서 (최소 3개): { 과정명, 훈련형태, 추천훈련사업, 훈련목표, 주요훈련내용, 훈련대상, 교과목들 }

**파일:**
- 변경: `src/lib/services/roadmap/roadmap-prompts.ts` (신규 프롬프트)
- 변경: `src/lib/services/roadmap/roadmap-types.ts` (신규 타입)
- 변경: `src/lib/services/roadmap/roadmap-generator.ts`
- 변경: `src/lib/services/roadmap/roadmap-validator.ts`
- 변경: `src/lib/services/roadmap/roadmap-crud.ts` (pbl_course 필드 제거)
- 변경: `src/lib/services/roadmap/roadmap-matrix-builder.ts` (새 훈련체계도 구조)
- 변경: 다수의 `src/components/roadmap/*.tsx`
- 변경: `src/app/(dashboard)/consultant/projects/[id]/roadmap/*`

- [ ] **Task 1: 브랜치 생성**

```bash
git checkout feature/official-form-alignment && git pull
git checkout -b feature/ofa-06-output-roadmap
```

- [ ] **Task 2: `roadmap-types.ts` 신규 타입 정의 (RED 테스트 먼저)**

파일: `src/lib/services/roadmap/roadmap-types.ts` + `roadmap-types.test.ts`

산인공 Ⅲ장 구조에 1:1 대응하는 타입 추가:
- `RoadmapCompetency` — { name, definition, knowledge[], skills[], attitudes[], ncsUsage?, ncsMethodology? }
- `RoadmapTrainingStructureItem` — { competencyName, level('BEGINNER'|'INTERMEDIATE'|'ADVANCED'), content, targetGroup, method, goal }
- `RoadmapAnnualPlanItem` — { competencyName, courseName, format, hours, notes }
- `RoadmapCourseSpec` — { courseName, format, recommendedProgram, goal, mainContent, targetGroup, subjects[{name, details, hours}] }
- 기존 `RoadmapRow`에 신규 필드 추가

타입 수준 테스트(`expectTypeOf`로 구조 검증).

- [ ] **Task 3: `roadmap-validator.ts` Zod 스키마 갱신 (RED → GREEN)**

파일: `src/lib/services/roadmap/roadmap-validator.ts` + `.test.ts`
- `competencyModelSchema`, `trainingStructureSchema`, `annualPlanSchema`, `courseSpecSchema` 추가
- `courseSpecsSchema = z.array(courseSpecSchema).min(3, '훈련과정 명세서 최소 3개')`
- 기존 `pbl_course` 필드 제거
- 전체 `roadmapContentSchema` 재조합

기존 테스트를 신규 스키마로 갱신 + 경계값 테스트 추가.

- [ ] **Task 4: `prompt-engineer` 서브에이전트로 신규 프롬프트 작성**

```
Agent(
  subagent_type: "prompt-engineer",
  description: "OFA Step 6 로드맵 LLM 프롬프트 재작성",
  prompt: "docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf 의 Ⅲ장(역량모델링/훈련체계도/연간훈련계획/훈련과정 명세서) 구조에 정확히 맞는 JSON을 출력하는 LLM 프롬프트를 작성하라.
  - 입력: roadmapInterviewSchema 데이터 (src/lib/schemas/interview-roadmap.ts)
  - 출력 JSON: src/lib/services/roadmap/roadmap-validator.ts 의 신규 스키마에 100% 일치
  - 훈련과정 명세서는 반드시 3개 이상
  - NCS 활용 방법/미활용 시 도출 방법 모두 다뤄야 함
  - 토큰 효율·한국어 출력
  기존 roadmap-prompts.ts 톤을 참조해 일관성 유지."
)
```

생성된 프롬프트를 `src/lib/services/roadmap/roadmap-prompts.ts`에 반영 + 프롬프트 구조 테스트.

- [ ] **Task 5: `roadmap-generator.ts` 업데이트**

파일: `src/lib/services/roadmap/roadmap-generator.ts` + `.test.ts`
- 신규 스키마로 LLM 호출·검증·재시도(최대 3회) 로직 갱신
- 스키마 불일치 시 사용자 수동 편집 유도 에러 타입 도입

LLM mock 테스트: 1회 실패 → 2회 성공, 3회 실패 → throw, 최초 성공 경로.

- [ ] **Task 6: `roadmap-matrix-builder.ts` 훈련체계도 빌더 갱신**

파일: `src/lib/services/roadmap/roadmap-matrix-builder.ts` + 기존 `.test.ts` 갱신
- 역량별 수준(초/중/고급) × 훈련내용 매트릭스 생성
- 빈 셀 처리·병합 로직 재작성

- [ ] **Task 7: `roadmap-crud.ts`에서 `pbl_course` 제거**

파일: `src/lib/services/roadmap/roadmap-crud.ts` + `.test.ts`
- `pbl_course` 필드 참조 제거 (타입/쿼리/insert/update/snapshot)
- DB 컬럼 drop은 Step 12에서 마이그레이션 065로 수행(이 Step에서는 코드만 사용 중단)

기존 테스트 스위트 갱신 + 회귀 없음 확인.

- [ ] **Task 8: UI — `CompetencyModelingTable` 컴포넌트**

파일: `src/components/roadmap/CompetencyModelingTable.tsx` + `.test.tsx`
- 역량명·정의·지식·기술·태도 열
- NCS 활용 여부 토글 + 사유 텍스트
- 행 추가/삭제, 인라인 편집

`frontend-guide` 스킬 호출로 테이블 UI 컨벤션 확인.

- [ ] **Task 9: UI — `RoadmapMatrix.tsx` 훈련체계도 구조로 갱신** (기존 파일명 유지)

파일: `src/components/roadmap/RoadmapMatrix.tsx` (기존) + `.test.tsx`
- 훈련체계도 구조로 재구성 (역량·수준·내용·대상·방법·목표 열)
- 기존 매트릭스 레이아웃 유지, 데이터 매핑만 변경
- 컴포넌트 이름·파일명은 기존 그대로(`RoadmapMatrix`) — 호출부 회귀 방지. 내부 구조만 신규 훈련체계도로 변경.

- [ ] **Task 10: UI — `AnnualTrainingPlanTable` 컴포넌트**

파일: `src/components/roadmap/AnnualTrainingPlanTable.tsx` + `.test.tsx`
- 역량별 훈련과정 목록 (과정명·형태·시간·비고)
- 활용방안 섹션 textarea

- [ ] **Task 11: UI — `CourseSpecCard` 컴포넌트 + 명세서 리스트**

파일: `src/components/roadmap/CourseSpecCard.tsx` + `.test.tsx`
- 명세서 1건 카드 (과정명·형태·추천사업·목표·주요내용·대상·교과목 표)
- 기존 `CoursesList.tsx`를 갱신해 최소 3개 카드 렌더, 추가/삭제 가능

`composition-patterns` 스킬로 재사용 단위 설계.

- [ ] **Task 12: 로드맵 페이지 구조 재구성**

파일: `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/ConsultantRoadmapClient.tsx`
- 신규 6개 섹션 순서: 개요 → 요구분석(인터뷰 반영) → 역량 모델링 → 훈련체계도 → 연간계획 → 명세서
- 운영자 뷰(`OpsRoadmapClient.tsx`)도 동일하게 갱신(읽기 전용)

기존 RTL 테스트 갱신 + 신규 섹션 표출 케이스 추가.

- [ ] **Task 13: PDF/XLSX 내보내기 동기화**

파일: `src/lib/services/export/pdf/pdf-generator.ts`, `src/lib/services/export/xlsx/xlsx-generator.ts` + 각 `.test.ts`

**선행 작업 — `RoadmapExportData` 타입 확장**:
- `RoadmapExportData`는 `pdf-generator.ts`에서 export되며 PDF/XLSX가 공유한다.
- Task 2에서 확장한 신규 타입(역량 모델링·훈련체계도·연간계획·명세서)이 `RoadmapExportData`에도 포함되도록 필드를 추가한다.
- `prepareExportData`(`src/lib/actions/roadmap-export.ts`)도 신규 필드를 DB에서 조회·매핑하도록 갱신.

**신규 구조 출력 로직**:
- PDF: 섹션별 렌더러 함수(`pdf-competency-renderer`, `pdf-structure-renderer`, `pdf-annual-renderer`, `pdf-coursespec-renderer` 등)로 분할. 기존 `pdf-course-renderer`는 유지·조정.
- XLSX: 시트 분리(개요 / 요구분석 / 역량모델링 / 훈련체계도 / 연간계획 / 명세서). 기존 `xlsx-sheet-builder`에 신규 시트 빌더 추가.
- `serena` MCP로 심볼 탐색 후 안전하게 수정.
- PDF 한 페이지 per 섹션 + 역량 매트릭스는 가로 배치.

**기존 시그니처 유지**: `generatePDF(data: RoadmapExportData)`, `generateXLSX(data: RoadmapExportData)` 이름은 유지하되 입력 타입이 확장되는 형태. 외부 호출자(`DownloadButton.tsx` 등) 회귀 최소화.

- [ ] **Task 14: 기존 모든 로드맵 테스트 갱신**

`roadmap-*.test.ts`, `RoadmapMatrix.test.tsx`, `CoursesList.test.tsx`, `ConsultantRoadmapClient.test.tsx`, `OpsRoadmapClient.test.tsx`, `CourseEditModal.test.tsx`, `DownloadButton.test.tsx`, `VersionHistoryList.test.tsx` 전부 신규 타입에 맞춰 재작성.

- [ ] **Task 15: E2E 스모크 업데이트**

`e2e/consultant/consultant-roadmap.spec.ts`(기존 파일 — `tests/e2e/` 경로 아님)을 신규 구조에 맞게 갱신:
- 로드맵 생성 → 역량/체계도/계획/명세서 섹션 렌더 확인
- 편집 → 최종 확정 → PDF·XLSX 다운로드

- [ ] **Task 16: 검증·커밋·PR**

```bash
npm run validate && npm run build && npm run test:e2e
git add <변경파일>
git commit -m "feat(ofa-06): 로드맵 산출물 산인공 양식 정렬

- roadmap-types/validator/prompts/generator/matrix 신규 스키마
- pbl_course 코드 사용 중단 (drop은 Step 12)
- 역량 모델링·훈련체계도·연간계획·명세서 UI
- PDF/XLSX 내보내기 동기화
- 전체 테스트 스위트 갱신"
git push -u origin feature/ofa-06-output-roadmap
gh pr create --base feature/official-form-alignment --title "feat(ofa-06): 로드맵 산출물 양식 정렬" --body "..."
```

**완료 지표:** Preview URL에서 신구조 로드맵 생성·편집·PDF/XLSX 내보내기 전체 플로우 동작 + 산인공 양식 구조대로 화면 표출 + 기존 테스트 회귀 0.

---

### Step 7: 로드맵 HWPX 템플릿 + 내보내기 연결

**브랜치:** `feature/ofa-07-hwpx-roadmap`
**규모:** Medium (약 10개 Task)
**호출 스킬:** `hwpx-docgen`(외부 분석), supabase MCP (필요 시)
**의존:** Step 3, 6

**목표:** 산인공 양식 1번 HWPX 원본을 템플릿화하고, 로드맵 데이터 → 템플릿 → HWPX 다운로드 파이프라인 완성.

**파일:**
- 신규: `templates/hwpx/roadmap.hwpx` (산인공 양식 1번 수정본)
- 변경: `api/hwpx/generate.py` (템플릿 기반 치환 로직)
- 신규: `api/hwpx/_placeholders_roadmap.py` (플레이스홀더 매핑)
- 신규: `src/lib/services/export/hwpx/hwpx-client.ts`
- 신규: `src/lib/services/export/hwpx/hwpx-payload-roadmap.ts`
- 신규: `src/lib/services/export/hwpx/index.ts`
- 변경: `src/components/roadmap/DownloadButton.tsx` (HWPX 버튼 추가)
- 변경: `src/app/(dashboard)/consultant/projects/[id]/roadmap/actions.ts` (export 액션)

- [ ] **Task 1: 브랜치 생성 + 로컬 Python 환경 활성화**

```bash
git checkout feature/official-form-alignment && git pull
git checkout -b feature/ofa-07-hwpx-roadmap

# Step 3에서 이미 구축된 가상환경 활성화
source .venv/bin/activate

# python-hwpx가 이미 설치되어 있는지 확인
python -c "import hwpx" || uv pip install -r api/hwpx/requirements.txt
```

프로젝트 로컬에 설치된 스킬(`./.claude/skills/hwpx-docgen/`)을 작업 전반에서 사용한다.

- [ ] **Task 2: 산인공 양식 HWPX 구조 분석**

```bash
source .venv/bin/activate
python .claude/skills/hwpx-docgen/scripts/analyze_template.py \
  "docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx" \
  > docs/references/hwpx-structure-roadmap.md
```

분석 결과를 검토해 **플레이스홀더 삽입 위치** 목록 작성.

- [ ] **Task 3: 템플릿 제작 (수동 편집)**

원본 `.hwpx`를 복사해 `templates/hwpx/roadmap.hwpx`로 저장.
python-hwpx로 텍스트 위치를 찾아 `{{company_name}}`, `{{pm_name}}`, `{{main_problems}}`, `{{task_workflow_table}}`, `{{competency_table}}` 등 플레이스홀더로 치환.

플레이스홀더 매핑(예시):
| 양식 필드 | 플레이스홀더 |
|---|---|
| 기업명 | `{{company_name}}` |
| 컨설팅책임자(PM) | `{{pm_name}}`, `{{pm_affiliation}}` |
| 기업 내부전문가 | `{{internal_expert_name}}`, `{{internal_expert_affiliation}}` |
| 수립 필요성 | `{{establishment_necessity}}` |
| 역량 수준(체크) | `{{level_beginner_check}}`, `{{level_intermediate_check}}`, `{{level_advanced_check}}` |
| 선정 과업 | `{{selected_tasks_text}}` |
| 로드맵 수립 주요내용 요약 | `{{roadmap_summary}}` |
| 기업 현황 | `{{company_status}}` |
| 주요 문제 | `{{main_problems}}` |
| 추진 의지 | `{{push_willingness}}` |
| 기대 성과 | `{{expected_outcomes}}` |
| 과업·워크플로우 분석표 | (표 행 반복 → Python 쪽에서 add_row) |
| 훈련대상 과업 | `{{training_target_name}}` ... |
| 역량 모델링 표 | (행 반복) |
| 훈련체계도 | (행 반복) |
| 연간 훈련계획 | (행 반복) |
| 훈련과정 명세서 | (반복 블록) |

검증:
```bash
source .venv/bin/activate
python .claude/skills/hwpx-docgen/scripts/validate_hwpx.py templates/hwpx/roadmap.hwpx
```

- [ ] **Task 4: `api/hwpx/generate.py` 템플릿 치환 로직 추가**

```python
# POST body: { "track": "ROADMAP", "data": { ... } }
# 처리: templates/hwpx/roadmap.hwpx 열기 → 플레이스홀더 치환 + 동적 표 행 삽입 → 바이트 반환
```

요점:
- `HwpxDocument.open("templates/hwpx/roadmap.hwpx")`
- 단순 필드: `doc.replace_text_in_runs("{{key}}", value)`
- 표 행 반복: 템플릿에 앵커 행을 두고, Python에서 해당 행을 복제·채움
- `doc.save_to_path(...)` → 바이트 반환

- [ ] **Task 5: `_placeholders_roadmap.py` 매핑 모듈 (RED → GREEN)**

파일: `api/hwpx/_placeholders_roadmap.py` + `api/hwpx/test_placeholders_roadmap.py`

RED 테스트(pytest):
- 입력 JSON 샘플로 매핑 결과가 모든 단순 플레이스홀더를 채우는지
- 누락 필드는 빈 문자열로 처리되는지
- 표 반복 대상(과업 분석표·역량 모델링·훈련체계도·연간계획·명세서)의 행 데이터가 올바른 형식인지

GREEN 구현:
- 매핑 함수 `build_placeholder_map(data: dict) -> dict[str, str]`
- 표 행 빌더 `build_table_rows(data: dict, table_key: str) -> list[dict]`

```bash
source .venv/bin/activate
pytest api/hwpx/test_placeholders_roadmap.py -v
```

- [ ] **Task 6: Node 측 클라이언트 (`hwpx-client.ts`) (RED → GREEN)**

URL 구성 주의:
- Node `fetch`는 절대 URL을 요구하지만, Preview·프로덕션 배포에서는 동일 배포 내의 Python 함수를 호출하므로 `VERCEL_URL` 환경변수를 사용해 같은 배포 origin으로 강제해야 안전하다. 로컬 dev에서는 `localhost:3000` 로 fallback.
- `NEXT_PUBLIC_APP_URL`이 설정돼 있으면 이를 우선 사용해 프로덕션 도메인 고정 호출도 가능(환경별 config는 Step 12에서 최종 결정).

```typescript
// Step 7 시점에서는 단일 진입점 generateHwpx 사용. Step 10 Task 7에서
// postToPythonGenerate 공통 헬퍼 + generateRoadmapHwpx/generatePBLHwpx로 분리됨.
// 본 Step의 HwpxPayload는 Step 10에서 RoadmapHwpxPayload로 명시적 리네임.
export async function generateHwpx(payload: RoadmapHwpxPayload): Promise<Buffer> {
  const base =
    process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const secret = process.env.HWPX_API_SECRET;
  if (!secret) throw new Error('HWPX_API_SECRET 환경변수가 설정되지 않았습니다.');

  const res = await fetch(`${base}/api/hwpx/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-HWPX-Secret': secret,  // Step 3 보안 원칙 — 내부 시크릿 검증
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HWPX generation failed: ${res.status} ${err}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
```

환경변수 등록: Vercel Project Settings → Environment Variables에 `HWPX_API_SECRET` 을 Production + Preview + Development 모두에 동일 값으로 등록. `vercel env pull`로 로컬 `.env.local`에 동기화.

- [ ] **Task 7: `hwpx-payload-roadmap.ts` 변환기 (RED → GREEN)**

파일: `src/lib/services/export/hwpx/hwpx-payload-roadmap.ts` + `.test.ts`

RED 테스트:
- 정상 RoadmapRow 입력 → 모든 플레이스홀더 키가 포함된 payload 반환
- 빈 값(undefined / null / 빈 배열) → 빈 문자열 또는 빈 배열로 변환(에러 던지지 않음)
- 체크박스 플래그 변환 정확성(역량 수준 → `level_*_check` 필드)

GREEN 구현:
- 순수 함수 시그니처 (입력 타입 명시 — 실제 프로젝트 컨벤션: `Row` 접미사 없음):
  ```typescript
  import type { Project, Interview, RoadmapVersion } from '@/types/database';

  export interface RoadmapHwpxPayloadInputs {
    roadmap: RoadmapVersion;       // FINAL 또는 DRAFT 버전 row
    project: Project;               // company_name·company_size·industry 등
    interview: Interview | null;    // pbl_data 아님(로드맵은 기존 컬럼 사용)
  }

  export function buildRoadmapHwpxPayload(inputs: RoadmapHwpxPayloadInputs): RoadmapHwpxPayload { ... }
  ```
- 누락 안전 처리 (undefined·null·빈 배열 → 빈 문자열·빈 배열)

- [ ] **Task 8: Server Action `exportRoadmapAsHwpxAction` (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/roadmap/actions.ts` (확장) + `.test.ts`

RED 테스트:
- 세션 없음 → unauthorized
- 비배정 컨설턴트 → forbidden
- 로드맵 없음 → not found
- 성공 → `ActionResult<{ fileName: string; contentBase64: string; mimeType: string }>` 로 `{ success: true, data: { ... } }` 반환 (Buffer는 직렬화 불가 — base64 문자열로 전달; 필드명은 GREEN 구현·Step 9·10·DownloadButton 전부 동일)
- Python 함수 실패(500) → `{ success: false, error: 메시지 }`

GREEN 구현(5단계 패턴, 프로젝트 표준 헬퍼 사용):
1. **인증·역할 확인**: `requireAuthWithRole(['CONSULTANT_APPROVED'], ...)` 호출 ('error' in 결과 분기). 또는 운영자 export 허용 시 `[..., 'OPS_ADMIN', 'SYSTEM_ADMIN']` 추가
2. 배정 확인: `is_assigned_to_project` RLS에 의존(SELECT 결과 null 처리)
3. 입력 검증(없음 — roadmapId만)
4. payload 변환 + `generateHwpx` 호출로 Buffer 획득 → **base64 문자열로 변환** (Server Action은 Buffer 직접 반환 불가 — Next.js 직렬화 제약)
5. `ActionResult<{ fileName: string; contentBase64: string; mimeType: string }>` 반환 + 감사 로그(`createAuditLog({ action: 'ROADMAP_HWPX_EXPORTED', targetType: 'roadmap', targetId: roadmapId, ... })`)

**Server Action에서 Buffer/Blob 반환 금지**(직렬화 실패). 클라이언트는 수신한 base64를 `atob` + `Uint8Array` + `Blob`로 재조립 후 `a.download`로 다운로드.

`check-server-action` 스킬 호출.

- [ ] **Task 9: `DownloadButton.tsx` HWPX 항목 추가 (RED → GREEN)**

파일: `src/components/roadmap/DownloadButton.tsx` (기존) + `.test.tsx` 갱신

RED 테스트:
- 드롭다운에 PDF / XLSX / HWPX 3개 항목 노출
- HWPX 클릭 시 `exportRoadmapAsHwpxAction` 호출
- 로딩 상태 표시
- 실패 시 sonner 토스트 노출

GREEN 구현:
- shadcn `DropdownMenu` 기반 항목 추가 (기존 PDF/XLSX와 동일 컴포넌트)
- HWPX 클릭 → `exportRoadmapAsHwpxAction()` 호출 → `ActionResult<{ fileName, contentBase64, mimeType }>` 수신
- 클라이언트에서 base64 복원 — **공통 훅 `useHwpxDownload`로 추출**:
  - 신규 파일: `src/hooks/useHwpxDownload.ts` + `.test.tsx` (훅 디렉터리는 프로젝트 실제 위치 `src/hooks/` — `src/components/hooks/`는 존재하지 않음).
  - 기존 훅 `src/hooks/useRoadmapDownload.ts`와 병렬 구조. 기존 훅은 PDF/XLSX 전용이고 이를 HWPX로 확장하지 **않는다**(포맷별 서버 액션이 다름). HWPX 전용 신규 훅 추가.
  - 본 Step(7)에서 먼저 작성, Step 10 Task 9에서 PBL DownloadButton이 **동일 훅을 재사용**(신규 작성 금지).
  - 훅 시그니처: `const { download, isLoading, error } = useHwpxDownload({ action: () => Promise<ActionResult<{ fileName, contentBase64, mimeType }>> })`
  - 내부에서 `atob` → `Uint8Array.from` → `Blob` → `URL.createObjectURL` → `<a download>` → `URL.revokeObjectURL` 처리.
  - 실패 시 `showErrorToast(result.error)` (3-4-3 원칙 준수), 성공 시 `showSuccessToast`.
- 파일명: `{company}_로드맵_v{version}.hwpx` (Server Action에서 생성해 `data.fileName` 으로 전달)

- [ ] **Task 10: Preview 스모크 테스트**

Vercel Preview에서:
- 로드맵 1건 생성 → HWPX 다운로드
- 한글 프로그램에서 열어 양식 구조·데이터 일치 확인
- 잔존 플레이스홀더(`{{`)가 있으면 실패로 간주

확인 스크립트:
```bash
source .venv/bin/activate
python -c "
from hwpx import HwpxDocument
doc = HwpxDocument.open('/tmp/roadmap-sample.hwpx')
text = ' '.join(p.text for p in doc.paragraphs)
assert '{{' not in text, 'unfilled placeholders remain'
print('OK')
"
```

- [ ] **Task 11: 검증·커밋·PR**

**완료 지표:** Preview에서 로드맵 HWPX 다운로드 성공 + 한글 프로그램에서 양식이 그대로 열림.

---

### Step 8: PBL 트랙 인터뷰 신규

**브랜치:** `feature/ofa-08-interview-pbl`
**규모:** Large (18 Task)
**호출 스킬:** `frontend-guide`, `composition-patterns`, `check-server-action`
**의존:** Step 2 (DB), Step 5 (인터뷰 위저드 패턴 참조)

**목표:** PBL 트랙 전용 인터뷰 스키마·UI 신규 구축. 산인공 문서 2 기준 모든 필드 수용.

**산인공 PBL 인터뷰 요구 필드:**
1. 훈련과정 개요 (NCS 분류·훈련시간·훈련생수·AI역량수준·훈련목표 체크박스)
2. 기업 현황 분석 (경영이슈, 조직도)
3. 훈련환경 분석 (적정시간·장소·사내강사·AI인프라·As-Is/To-Be)
4. HRD 제안 & AI훈련과정 개발 필요성 (수기 입력)
5. 수행활동 (수행일지)
6. 문제 도출 (문제정의서 — 배경·핵심·범위·제약)
7. 문제 우선순위 결정 (5점 척도)
8. 훈련대상 업무 선정 + 사유
9. 훈련대상 업무 세부내용 (As-Is, To-Be, 요구지식, 기술)
10. AI수준 진단 (현행·향후)

**기존 프로젝트 컨벤션 준수 (Step 5와 동일):**
- 컨테이너: `PBLInterviewClient.tsx`
- 스텝: `Step*.tsx` 접두사, `_components/pbl/` 서브폴더 배치
- 위저드 진행 UI: **`InterviewStepper.tsx` 재사용** (Step 5에서 정리한 공용 컴포넌트)
- 자동 저장: Step 5에서 신규 분리한 `_hooks/useInterviewAutoSave.ts` 재사용

**파일:**
- 신규: `src/lib/schemas/interview-pbl.ts` (+ `.test.ts`)
- 신규: `src/lib/constants/interview-steps-pbl.ts` (+ `.test.ts`)
- 변경: `src/lib/constants/interview-steps.ts` (PBL 분기 완성 — Step 5에서 만든 디스패처 확장)
- 변경: `src/app/(dashboard)/consultant/projects/[id]/interview/page.tsx` (PBL 분기 실제 위저드 연결)
- 신규: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/PBLInterviewClient.tsx` (+ `.test.tsx`)
- 신규: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLCourseOverview.tsx` (+ `.test.tsx`)
- 신규: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLCompanyStatus.tsx` (+ `.test.tsx`)
- 신규: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLTrainingEnvironment.tsx` (+ `.test.tsx`)
- 신규: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLProblemDefinition.tsx` (+ `.test.tsx`) — 문제 정의서 + 우선순위 통합
- 신규: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLTargetTasks.tsx` (+ `.test.tsx`)
- 신규: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLAILevel.tsx` (+ `.test.tsx`)
- 신규: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLHrdNecessity.tsx` (+ `.test.tsx`)
- 신규: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLSummary.tsx` (+ `.test.tsx`)

> 참고: DB는 Step 2에서 추가된 `interviews.pbl_data JSONB` 컬럼을 사용. 로드맵 JSONB 컬럼들은 건드리지 않는다.

**권장 스텝 분할 (8스텝):**
1. 기본정보 + 훈련과정 개요 (NCS 분류·훈련시간·AI역량수준·훈련목표 체크박스)
2. 기업 현황 분석 (경영이슈 + 조직도/부서별 업무)
3. 훈련환경 분석 (적정시간·장소·사내강사·AI인프라·As-Is/To-Be)
4. 문제 도출 + 우선순위 (문제정의서 + 5점 척도)
5. 훈련대상 업무 선정 + 세부내용 (AS-IS/TO-BE/요구지식/기술)
6. AI수준 진단 (현행·향후 등급 + 사유)
7. HRD 제안 + 과정개발 필요성
8. 확인·제출

- [ ] **Task 1: 브랜치 생성**

```bash
git checkout feature/official-form-alignment && git pull
git checkout -b feature/ofa-08-interview-pbl
```

- [ ] **Task 2: PBL 인터뷰 스키마 RED 테스트**

파일: `src/lib/schemas/interview-pbl.test.ts`
- `courseOverview`: NCS 분류, 훈련시간, 훈련생 수, AI역량수준(enum), 훈련목표(배열 선택)
- `companyStatus`: 경영이슈(필수), 조직도 부서 배열
- `trainingEnvironment`: 적정시간, 장소(enum), 대상자 특성, AI인프라
- `problemDefinition`: 배경·핵심·범위·제약 4필드 모두 필수
- `problemPriority`: 배열, 각 항목에 priority(1-5), selected(boolean)
- `targetTasks`: 업무명·As-Is·To-Be·요구지식·기술 배열
- `aiLevelDiagnosis`: 현행 등급·향후 등급·향상 사유

`npm run test -- interview-pbl.test.ts` → FAIL 확인.

- [ ] **Task 3: PBL 인터뷰 스키마 구현 (GREEN)**

파일: `src/lib/schemas/interview-pbl.ts`
- 위 7개 서브 스키마 + 전체 조합 `pblInterviewSchema`
- 자동 저장용 완화 스키마 `pblInterviewAutoSaveSchema`
- 빈 항목 생성 헬퍼(`createEmptyOrgUnit`, `createEmptyProblemItem` 등)
- 타입 export (`PBLInterview`, `PBLCourseOverview`, ...)

`npm run test -- interview-pbl.test.ts` → PASS 확인.

- [ ] **Task 4: PBL 인터뷰 스텝 상수 (RED → GREEN)**

파일: `src/lib/constants/interview-steps-pbl.ts`
```typescript
import type { InterviewStep } from './interview-steps';

export const PBL_INTERVIEW_STEPS: readonly InterviewStep[] = [
  { id: 1, name: '훈련과정 개요', shortName: '개요' },
  { id: 2, name: '기업 현황 분석', shortName: '기업' },
  { id: 3, name: '훈련환경 분석', shortName: '환경' },
  { id: 4, name: '문제 도출·우선순위', shortName: '문제' },
  { id: 5, name: '훈련대상 업무', shortName: '업무' },
  { id: 6, name: 'AI 수준 진단', shortName: 'AI' },
  { id: 7, name: 'HRD 제안·필요성', shortName: 'HRD' },
  { id: 8, name: '확인·제출', shortName: '확인' },
] as const;

export const PBL_REQUIRED_STEP_IDS = [1, 2, 3, 4, 5, 6, 7] as const;
```

테스트 동반(`interview-steps-pbl.test.ts`).

- [ ] **Task 5: `interview-steps.ts` 디스패처 완성**

기존 ROADMAP 분기 옆에 PBL 분기 추가:
```typescript
import { PBL_INTERVIEW_STEPS } from './interview-steps-pbl';

export function getInterviewSteps(track: ProjectTrack) {
  if (track === 'ROADMAP') return ROADMAP_INTERVIEW_STEPS;
  if (track === 'PBL') return PBL_INTERVIEW_STEPS;
  throw new Error(`Unknown track: ${track}`);
}
```

`never` 브랜치가 필요 없도록 `satisfies` 확인 테스트 추가.

- [ ] **Task 6: `StepPBLCourseOverview` 컴포넌트 (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLCourseOverview.tsx` (+ `.test.tsx`)
- NCS 분류 입력(자유 텍스트 + 예시 placeholder `예: 200107 인공지능`)
- 훈련시간/훈련생수 숫자 입력
- AI역량수준 4등급 라디오(AI기초형/탐구형/활용형/선도형)
- 훈련목표 체크박스 그룹(기술문제 해결·공정 최적화·불량률 감소·기술 매뉴얼 개발·기타)
- `useInterviewAutoSave` 훅 사용(Step 5에서 분리한 공용 훅 재사용)

컴포넌트 테스트: RTL로 입력·선택 interaction 검증.

- [ ] **Task 7: `StepPBLCompanyStatus` 컴포넌트 (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLCompanyStatus.tsx` (+ `.test.tsx`)
- 경영 이슈 textarea (힌트: 산업 변화·당면 문제 예시)
- 조직도 동적 배열 (부서명·주요 업무 행 추가)
- `composition-patterns` 스킬 참조: Step 5의 동적 배열 컴포넌트와 구조 공통화 여부 판단

- [ ] **Task 8: `StepPBLTrainingEnvironment` 컴포넌트 (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLTrainingEnvironment.tsx` (+ `.test.tsx`)
- 적정 훈련시간(숫자)
- 훈련장소 (사내/사외 라디오 + 특이사항 textarea)
- 사내강사 활용 여부 (예/아니오 + 강사 이름·직책)
- 대상자 특성(경력·수준)
- AI 인프라 체크(도구 사용 환경 / 네트워크 / PC / 기타 장비)
- As-Is / To-Be 텍스트 영역

- [ ] **Task 9: `StepPBLProblemDefinition` 컴포넌트 (RED → GREEN, 문제 도출 + 우선순위 통합)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLProblemDefinition.tsx` (+ `.test.tsx`)
- 문제정의서: 배경·핵심문제·문제범위·제약조건 textarea 4개
- 문제 우선순위 동적 배열: 각 항목에 문제명 + 5점 척도 + 선정 체크박스
- "AI 해결 가능 여부" 체크 포함

- [ ] **Task 10: `StepPBLTargetTasks` 컴포넌트 (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLTargetTasks.tsx` (+ `.test.tsx`)
- 업무 배열 (업무명 + AI훈련 필요성 1-5 + 선정 여부)
- 선정 업무별 세부내용: 현재(As-Is) / AI활용(To-Be) / 요구지식 / 기술
- 업무명은 Task 7의 조직도 데이터를 `useMemo`로 추천 후보로 제공(선택)

- [ ] **Task 11: `StepPBLAILevel` 컴포넌트 (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLAILevel.tsx` (+ `.test.tsx`)
- 현행 등급 라디오 (4등급) + 등급 설명 툴팁
- 향후 기대 등급 라디오 (4등급)
- 향상 사유 textarea

- [ ] **Task 12: `StepPBLHrdNecessity` 컴포넌트 (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLHrdNecessity.tsx` (+ `.test.tsx`)
- HRD 제안 (훈련 실시 이력·지원 이력 수기 입력 표 — HRD이음 자동 불러옴 대체)
- AI훈련과정 개발 필요성 textarea

- [ ] **Task 13: `StepPBLSummary` 컴포넌트 (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLSummary.tsx` (+ `.test.tsx`)
- 각 스텝 입력 값 요약
- 제출 전 최종 확인용

- [ ] **Task 14: `PBLInterviewClient` 오케스트레이터 (RED → GREEN)**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/PBLInterviewClient.tsx` (+ `.test.tsx`)
- 8스텝 전환, **`InterviewStepper.tsx` 재사용**으로 진행률 표시
- 각 스텝 컴포넌트를 동적 import + Suspense로 감싸고 스켈레톤 제공
- `_hooks/useInterviewAutoSave.ts` (Step 5에서 분리된 공용 훅) 재사용
- `composition-patterns` 스킬로 Step 5 `RoadmapInterviewClient`와 공통 Wrapper 추출 여부 판단

RTL 테스트: 8스텝 전환·최종 제출 성공 경로.

- [ ] **Task 15: `interview/page.tsx` PBL 분기 완성**

Step 5에서 추가된 트랙 분기의 PBL placeholder를 실제 `PBLInterviewClient`로 교체.

**주의: 기존 `fetchInterview` 함수는 pbl_data를 select하지 않음** (`company_details, job_tasks, pain_points, constraints, improvement_goals` 등 로드맵 컬럼만). PBL 트랙은 본 Task 16에서 신설하는 **`fetchPBLInterview(projectId)`**를 호출해 pbl_data를 전용으로 가져온다. fetchInterview를 확장하지 않고 분리하는 이유: 트랙별 select 컬럼이 다르고, 한쪽 데이터만 사용해도 다른 쪽 컬럼 fetch 비용·코드 결합도 증가.

```typescript
import { fetchInterview, fetchPBLInterview } from './actions';

// ... project.track 분기:
if (project.track === 'PBL') {
  // interviews row가 아직 없을 수 있다(INTERVIEWED 상태 이전).
  // pbl_data는 DEFAULT '{}'::jsonb로 생성되므로 row가 있으면 최소한 빈 객체.
  const pblInterview = await fetchPBLInterview(project.id);
  const initialData = (pblInterview?.pbl_data ?? {}) as Record<string, unknown>;
  return (
    <PBLInterviewClient
      projectId={project.id}
      initialData={initialData}
    />
  );
}
```

- [ ] **Task 16: PBL 전용 Server Action**

파일: `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` (확장)
- `savePBLInterview(projectId, formData)` — `interviews.pbl_data`에 저장 (프로젝트 트랙이 'PBL'일 때만 허용)
- `fetchPBLInterview(projectId)` — 조회
- 5단계 패턴 엄수 (프로젝트 표준 헬퍼 사용):
  1) **인증·역할 확인**: `requireAuthWithRole(['CONSULTANT_APPROVED'], { authError, roleError })` 호출 (`@/lib/actions/auth-helpers`). 반환에 `{ user, supabase, role }` 또는 `{ error }` — 'error' in result 분기. 직접 `createClient()` + getUser 호출보다 우선 (DB 추가 조회 없이 role 검증).
  2) 프로젝트 track 조회 → 'PBL'이 아니면 `{ success: false, error: '...' }` 반환 (auth 결과의 supabase 재사용)
  3) `pblInterviewSchema`로 Zod 검증
  4) `interviews` 저장 — 기존 `saveInterview`와 동일하게 **"조회 후 update / 없으면 insert"** 수동 체크 패턴(프로젝트 컨벤션; `project_id` UNIQUE 제약에 의존). `.upsert()` 함수는 기존 코드에서 사용하지 않으므로 도입하지 않는다.
  5) `ActionResult<{ id: string }>` / `SimpleActionResult` 반환(기존 `saveInterview` 패턴 일치)
- 감사 로그: `createAuditLog({ action: 'PBL_INTERVIEW_SAVED', targetType: 'project', targetId: projectId, ... })`. **`PBL_INTERVIEW_SAVED` enum 값은 Step 2 마이그 061에서 이미 ALTER TYPE으로 추가됨**(Step 12로 미루지 않음 — 본 Task 시점에 DB에 존재해야 함).
- `check-server-action` 스킬 호출

각 액션 테스트(권한·검증·성공 경로).

- [ ] **Task 17: E2E 테스트**

파일: `e2e/consultant/interview-pbl.spec.ts` (프로젝트 실제 E2E 루트 = `e2e/<카테고리>/`)
- 운영자 → 기업 A에 PBL 프로젝트 생성 → 컨설턴트 배정
- 컨설턴트 로그인 → 8스텝 작성 → 제출 → 상태 `INTERVIEWED` 전환 확인
- 자동 저장(draft) 상태에서 재진입 시 복원 확인

- [ ] **Task 18: 검증·커밋·PR**

```bash
npm run validate && npm run build
git add <변경파일>
git commit -m "feat(ofa-08): PBL 트랙 인터뷰 신규 (8스텝 위저드)

- pblInterviewSchema (산인공 양식 2번 Ⅰ~Ⅲ장)
- Step* 컴포넌트 8종 + PBLInterviewClient 오케스트레이터
- interviews.pbl_data 컬럼 활용
- 트랙 분기 완성 (ROADMAP/PBL)
- Server Action 5단계 패턴
- InterviewStepper·useInterviewAutoSave 재사용
- E2E 커버리지"
git push -u origin feature/ofa-08-interview-pbl

gh pr create --base feature/official-form-alignment \
  --title "feat(ofa-08): PBL 트랙 인터뷰 신규" \
  --body "..."
```

**완료 지표:** PBL 트랙 프로젝트에서 8스텝 전체 작성·저장·제출 + 재진입 시 draft 복원.

---

### Step 9: PBL 산출물 신규

**브랜치:** `feature/ofa-09-output-pbl`
**규모:** Extra Large (20 Task) — 필요 시 2개 서브 PR로 분할 가능
**호출 스킬:** `prompt-engineer`(서브에이전트), `check-server-action`, `frontend-guide`, `composition-patterns`
**의존:** Step 8

**기존 프로젝트 컨벤션 준수:**
- PBL 서비스 파일들(`src/lib/services/pbl/*.ts`)은 **기존 `roadmap/` 디렉터리와 평행**한 구조로 작성.
- 상태 배지는 `src/components/pbl/PBLStatusBadge.tsx` 신규(기존 `RoadmapStatusBadge` 패턴).
- 내보내기는 `src/lib/services/export/pdf/`, `export/xlsx/` 신규 경로에 PBL 버전 추가(legacy `export-*.ts`는 Step 12에서 deprecate).
- Server Action 파일은 `/consultant/projects/[id]/pbl/actions.ts` 신규.

**목표:** PBL 보고서 생성·편집·버전관리·PDF/XLSX 내보내기. `pbl_reports` 테이블 기반 CRUD + LLM 생성.

**산인공 PBL 산출물 요구 구조:**
- Ⅰ. 훈련과정 개요 (Step 8 인터뷰 데이터에서 반영)
- Ⅱ. 훈련 요구분석 (인터뷰 반영)
- Ⅲ. AI 기반 훈련과제 도출 (인터뷰 반영 + LLM 정리)
- Ⅳ. AI 기반 운영계획 수립:
  - 훈련 목표
  - AI 도구 활용 계획 (단계별: { 단계, 주요활동, AI도구, 활용데이터, 활용목적, 구체적 활용방법 })
  - 훈련 실시 계획 (교과목 프로파일, 학습그룹, 시설·장비, 강사)
  - 평가 계획 (과정평가: 포트폴리오/문제해결시나리오/작업장 평가 + 결과평가 설문)
- Ⅴ. 성과분석 및 확산 전략 (정량·정성 지표, 내재화·전사확산)

**파일 구조는 로드맵과 평행:**
```
src/lib/services/pbl/
├── index.ts
├── pbl-types.ts
├── pbl-prompts.ts
├── pbl-generator.ts
├── pbl-validator.ts
├── pbl-crud.ts
└── pbl-*.test.ts

src/app/(dashboard)/consultant/projects/[id]/pbl/
├── page.tsx
├── layout.tsx
├── loading.tsx
├── actions.ts
└── _components/ConsultantPBLClient.tsx

src/components/pbl/
├── PBLOverview.tsx
├── PBLTrainingTargets.tsx
├── PBLToolUsagePlan.tsx
├── PBLTrainingPlan.tsx
├── PBLEvaluationPlan.tsx
├── PBLPerformanceMetrics.tsx
├── DownloadButton.tsx
└── *.test.tsx
```

- [ ] **Task 1: 브랜치 생성**

```bash
git checkout feature/official-form-alignment && git pull
git checkout -b feature/ofa-09-output-pbl
```

- [ ] **Task 2: `pbl-types.ts` — 산인공 양식 2번 구조에 맞춘 TS 타입**

파일: `src/lib/services/pbl/pbl-types.ts`
- `PBLTrainingGoal`, `PBLAIToolUsagePlanItem`(단계/도구/데이터/목적/방법)
- `PBLTrainingPlan`(교과목 프로파일/학습그룹/시설·장비/강사)
- `PBLEvaluationPlan`(과정평가 방식·평가기준 / 결과평가 설문 3종)
- `PBLPerformanceMetrics`(정량·정성 지표)
- `PBLDisseminationStrategy`(내재화·전사 확산)
- 전체 조합 `PBLContent`

타입만 export. 실제 값 검증은 다음 Task의 validator에서.

- [ ] **Task 3: `pbl-validator.ts` — Zod 출력 스키마 (RED → GREEN)**

파일: `src/lib/services/pbl/pbl-validator.ts` + `.test.ts`

Zod로 `pbl-types.ts` 구조를 그대로 검증. 규칙:
- 훈련목표는 최소 1개
- AI도구 활용계획은 **단계 최소 3개**
- 교과목 프로파일 최소 3개
- 평가 척도 1~5 범위
- 모든 텍스트 필드 빈 문자열 거부

테스트: 각 필드 min/max 경계, 누락 케이스, 성공 케이스.

- [ ] **Task 4: `prompt-engineer` 서브에이전트로 PBL 프롬프트 작성**

```
Agent(
  subagent_type: "prompt-engineer",
  description: "OFA Step 9 PBL LLM 프롬프트 작성",
  prompt: "docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf 의 Ⅳ. AI 기반 운영계획 수립 + Ⅴ. 성과분석·확산 전략 구조를 출력하는 프롬프트를 작성하라.
  - 입력: pblInterviewSchema (src/lib/schemas/interview-pbl.ts)
  - 출력: src/lib/services/pbl/pbl-validator.ts 스키마 100% 준수
  - 필수: AI도구 활용계획 단계 3개+, 교과목 프로파일 3개+
  - 한국어·토큰 효율. src/lib/services/roadmap/roadmap-prompts.ts 톤 참조."
)
```

결과를 `src/lib/services/pbl/pbl-prompts.ts`에 반영 + prompt 단위 테스트(입·출력 구조만 체크).

- [ ] **Task 5: `pbl-generator.ts` (LLM 호출 + 검증 + 재시도)**

파일: `src/lib/services/pbl/pbl-generator.ts` + `.test.ts`
- `generatePBLContent(interview, profile, diagnosisSummary)` 함수
- LLM 응답 → JSON 파싱 → `pbl-validator`로 검증 → 실패 시 재시도(최대 3회)
- 실패 시 표준 에러로 던져 Server Action이 사용자에게 수동 편집 유도
- 기존 `roadmap-generator.ts` 재시도 패턴 재사용

RED 테스트: LLM mock으로 3회 실패 → throw, 성공 케이스 → 유효 객체 반환.

- [ ] **Task 6: `pbl-crud.ts` (save/finalize/archive + 버전 관리)**

파일: `src/lib/services/pbl/pbl-crud.ts` + `.test.ts`

함수 시그니처 (roadmap-crud.ts와 평행):
- `createDraftVersion(projectId, content, userId, supabase)` — 새 DRAFT row insert
  - **`consultant_profile_snapshot` 채우는 방식**: roadmap-crud.ts의 동일 패턴 — 작성 시점에 `consultant_profiles` 테이블에서 해당 컨설턴트 프로필을 조회해 JSONB로 스냅샷. 비어 있으면 `{}` (DEFAULT)로 둠.
  - `diagnosis_summary`: 프로젝트의 진단 요약을 텍스트로 채움(없으면 빈 문자열).
  - `version_number`: `MAX(version_number) + 1` 조회 후 INSERT (UNIQUE(project_id, version_number) 제약 활용).
- `updateDraft(id, patch, supabase)` — DRAFT 상태일 때만 update (RLS가 차단하지만 서비스에서도 가드)
- `finalizePBL(id, userId, supabase)` — **`finalize_pbl` RPC 호출** (마이그 061에서 추가된 함수, 마이그 036 finalize_roadmap과 동일 패턴):
  ```typescript
  const { data, error } = await supabase.rpc('finalize_pbl', {
    p_pbl_report_id: id,
    p_actor_user_id: userId,
  });
  if (error || !data) throw new Error('PBL 보고서 확정에 실패했습니다.');
  const result = data as { success: boolean; error?: string; project_id?: string; version_number?: number };
  if (!result.success) throw new Error(result.error ?? 'PBL 보고서 확정에 실패했습니다.');
  // 부수효과: 감사로그 createAuditLog({ action: 'PBL_REPORT_FINALIZED', ... })
  ```
  - 함수 내부에서 트랙·DRAFT 상태·배정 컨설턴트·project status FINALIZED 전환 모두 처리되므로 호출부 추가 검증 불필요.
- `getLatestFinal(projectId, supabase)` — `status='FINAL'` + 최신
- `listVersions(projectId, supabase)` — 버전 이력 (DRAFT/FINAL/ARCHIVED 모두)
- `sharePBL(id, isShared, supabase)` — `is_shared` 토글 (FINAL 상태만 허용)

Supabase 모킹 팩토리 활용. RPC mocking은 `mockSupabase.rpc.mockResolvedValue(...)` 패턴.

- [ ] **Task 7: PBL Server Actions**

파일: `src/app/(dashboard)/consultant/projects/[id]/pbl/actions.ts` + `.test.ts`

5단계 패턴 (모든 액션 공통, 프로젝트 표준 헬퍼 사용):
1. **인증·역할 확인**: `requireAuthWithRole(['CONSULTANT_APPROVED'], { authError, roleError })` 호출. 'error' in 결과 분기. (auth 결과의 supabase 재사용 — 추가 createClient 호출 불필요)
2. **트랙 가드**: `projects.track === 'PBL'` 검증. 아니면 `{ success: false, error: '...' }` 반환. (RLS는 배정 여부만 보고 트랙은 보지 않으므로 서비스 레이어 가드 필수)
3. **배정 확인**: `is_assigned_to_project` RLS가 자동으로 차단(404로 보임) — Server Action에서는 SELECT 결과 null 처리만으로 충분
4. Zod 검증 (필요 시)
5. 비즈니스 로직 + ActionResult 반환

액션 목록:
- `generatePBLAction(projectId)` — 인터뷰 데이터(`interviews.pbl_data`) 로드 → `generatePBLContent` 호출 → `createDraftVersion` 저장 → `projects.status`를 `PBL_DRAFTED`로 update. 감사로그 `PBL_REPORT_CREATED`.
- `savePBLDraftAction(pblId, patch)` — `updateDraft` 호출. DRAFT 상태만 허용.
- `finalizePBLAction(pblId)` — `finalizePBL` 호출 (RPC 내부에서 트랙·상태·배정 모두 검증). 감사로그 `PBL_REPORT_FINALIZED`.
- `deletePBLAction(pblId)` — DRAFT만 허용 (RLS 정책 반영).
- `togglePBLShareAction(pblId, isShared)` — FINAL 상태만 허용. 감사로그 `PBL_REPORT_SHARED`.

각 액션은 `ActionResult<T>` 또는 `SimpleActionResult` 반환 (`success` 필드 사용, `.ok` 아님).

`check-server-action` 스킬 호출 후 자가 검사.

운영자용 별도 액션 파일: `src/app/(dashboard)/ops/projects/[id]/pbl/actions.ts` (디렉터리 신설 + actions.ts 신규). 운영자는 조회·감사 범위만 (`fetchPBLForOps`, `listPBLVersionsForOps` 등). 권한: `requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN'], ...)`.

- [ ] **Task 8: UI — `PBLOverview` 컴포넌트 (상단 개요)**

파일: `src/components/pbl/PBLOverview.tsx` + `.test.tsx`
- 기업명·훈련과정명·훈련시간·AI역량수준·훈련목표 체크 표시
- 편집 가능(수기 입력 필드)

- [ ] **Task 9: UI — `PBLTrainingTargets` (Ⅲ장 — 요구분석·훈련대상)**

파일: `src/components/pbl/PBLTrainingTargets.tsx` + `.test.tsx`
- 인터뷰 데이터 기반 요약 + LLM 생성 업무 세부내용 표
- 각 항목 편집 가능

- [ ] **Task 10: UI — `PBLToolUsagePlan` (AI 도구 활용 계획)**

파일: `src/components/pbl/PBLToolUsagePlan.tsx` + `.test.tsx`
- 단계별 행 테이블 (단계·주요활동·AI도구·활용데이터·목적·구체방법)
- 행 추가/삭제, 편집 가능

- [ ] **Task 11: UI — `PBLTrainingPlan` (훈련 실시 계획)**

파일: `src/components/pbl/PBLTrainingPlan.tsx` + `.test.tsx`
- 교과목 프로파일(단원별 훈련시간·강사 투입시간)
- 학습그룹 구성 / 시설·장비 / 강사 3개 서브 섹션

- [ ] **Task 12: UI — `PBLEvaluationPlan` (평가 계획)**

파일: `src/components/pbl/PBLEvaluationPlan.tsx` + `.test.tsx`
- 과정평가: 포트폴리오/문제해결시나리오/작업장 평가 선택 + 평가기준
- 결과평가: 만족도·성취도·현업적용도 설문 항목 표시(고정 템플릿)

- [ ] **Task 13: UI — `PBLPerformanceMetrics` (성과분석 + 확산 전략)**

파일: `src/components/pbl/PBLPerformanceMetrics.tsx` + `.test.tsx`
- 정량/정성 지표 입력
- 내재화·전사 확산 방안 입력

- [ ] **Task 14: `ConsultantPBLClient` 오케스트레이터 + `PBLStatusBadge`**

파일:
- `src/app/(dashboard)/consultant/projects/[id]/pbl/_components/ConsultantPBLClient.tsx` + `.test.tsx`
- 신규: `src/components/pbl/PBLStatusBadge.tsx` + `.test.tsx` — `RoadmapStatusBadge.tsx` 패턴 그대로 복제. props: `{ status: 'DRAFT' | 'FINAL' | 'ARCHIVED'; versionNumber?: number }`. **색상·라벨은 기존 `ROADMAP_VERSION_STATUS_CONFIG`(src/lib/constants/status.ts) 그대로 재사용** (PBL 보고서와 로드맵 보고서 모두 동일한 DRAFT/FINAL/ARCHIVED 의미). 별도 `PBL_REPORT_STATUS_CONFIG`는 신설하지 않음 — 추후 PBL 라벨이 갈라져야 할 시점에 분리.

ConsultantPBLClient 구성:
- 상단 PBLStatusBadge (위에서 신규)
- 생성 버튼(DRAFT 없을 때) / 재생성 / 최종 확정 / 공유 토글
- 하위 컴포넌트(Task 8~13) 마운트

`composition-patterns` 스킬로 `ConsultantRoadmapClient`와 공통 Wrapper 추출 검토.

- [ ] **Task 15: `page.tsx`·`layout.tsx`·`loading.tsx`**

파일:
- `src/app/(dashboard)/consultant/projects/[id]/pbl/page.tsx` — 데이터 로드 + ConsultantPBLClient
- `src/app/(dashboard)/consultant/projects/[id]/pbl/layout.tsx`
- `src/app/(dashboard)/consultant/projects/[id]/pbl/loading.tsx` — Skeleton 컴포넌트

- [ ] **Task 16: 운영자 PBL 뷰**

파일: `src/app/(dashboard)/ops/projects/[id]/pbl/page.tsx` + `_components/OpsPBLClient.tsx`
- 읽기 전용 + 최종 확정 버전 조회
- 감사 로그 이벤트 연동

- [ ] **Task 17: PDF/XLSX 내보내기 PBL 버전**

**프로젝트 기존 네이밍 확인**:
- `src/lib/services/export/pdf/pdf-generator.ts` → `export async function generatePDF(data: RoadmapExportData): Promise<Blob>` (현재 로드맵 전용)
- `src/lib/services/export/xlsx/xlsx-generator.ts` → `export async function generateXLSX(data: RoadmapExportData): Promise<Uint8Array>` + `downloadXLSX`
- 공통 데이터 타입: `RoadmapExportData` (PDF 모듈에서 export)

**신규 구조** (기존 회귀 0 원칙):
- 신규 타입: `PBLExportData` (`src/lib/services/export/pdf/pdf-generator.ts` 또는 별도 `pbl-export-types.ts` — 정하고 기록).
- 신규 함수:
  - `export async function generatePBLPDF(data: PBLExportData): Promise<Blob>` (기존 `generatePDF`와 대칭 네이밍)
  - `export async function generatePBLXLSX(data: PBLExportData): Promise<Uint8Array>` + `downloadPBLXLSX`
- 신규 렌더링 파일:
  - `src/lib/services/export/pdf/pdf-pbl-renderer.ts` + `.test.ts` — PBL 섹션별 렌더러(개요/요구분석/훈련과제/운영계획/성과)
  - `src/lib/services/export/xlsx/xlsx-pbl-sheet-builder.ts` + `.test.ts` — PBL 시트 빌더
- 배럴 export 갱신:
  - `export/pdf/index.ts`: `generatePBLPDF`, `PBLExportData` 추가
  - `export/xlsx/index.ts`: `generatePBLXLSX`, `downloadPBLXLSX` 추가

**원칙**:
- 기존 `generatePDF`·`generateXLSX` 시그니처·동작은 **절대 건드리지 않는다**(로드맵 회귀 방지).
- 공통 유틸(`pdf-font-loader`, `pdf-constants`, `pdf-helpers`, `xlsx-styles`, `xlsx-formatter`)은 현 모듈을 그대로 재사용. 필요한 헬퍼가 로드맵 특화되어 있으면 먼저 중립화 리팩터링 후 재사용.
- `serena` MCP로 심볼 탐색·안전 수정.

- [ ] **Task 18: 프로젝트 워크플로우 상태 전환 연결**

- 인터뷰 완료 후 PBL 트랙은 `INTERVIEWED` → `PBL_DRAFTED`로 자동 전환
- `FINALIZED` 전환 조건에 PBL DRAFT 존재 여부 포함

**상태 전환이 이루어지는 실제 위치** (프로젝트에는 별도의 `project-status.ts` 서비스가 없음 — 상태 업데이트가 분산돼 있다):
- `src/lib/services/roadmap/roadmap-crud.ts`의 `finalizeRoadmap` — FINALIZED 전환
- Supabase RPC **`finalize_roadmap`** (마이그레이션 036, 파일명만 atomic_*) — 원자적 확정 패턴, JSONB 반환, SECURITY INVOKER, search_path = ''
- `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` — INTERVIEWED 전환
- 신규 `src/lib/services/pbl/pbl-crud.ts`의 **`finalizePBL` 함수**가 **Step 2 마이그 061에서 미리 추가된 RPC `finalize_pbl(p_pbl_report_id, p_actor_user_id)`** 를 호출 (`finalize_roadmap`과 동일 패턴: JSONB 반환, SECURITY INVOKER, FOR UPDATE 잠금, 트랙·DRAFT·배정 검증, projects.status FINALIZED 자동 전환). 본 Step에서는 RPC 신규 추가 불필요(이미 존재).
- 신규 `src/app/(dashboard)/consultant/projects/[id]/pbl/actions.ts`의 `generatePBLAction` 성공 시 `projects.status`를 `PBL_DRAFTED`로 업데이트.

불변식:
- 트랙이 ROADMAP인 프로젝트는 `PBL_DRAFTED` 상태로 진입 금지 (Server Action·RPC 레벨 가드).
- 트랙이 PBL인 프로젝트는 `ROADMAP_DRAFTED` 상태로 진입 금지.

- [ ] **Task 19: E2E 테스트**

파일: `e2e/consultant/pbl-output.spec.ts`
- 인터뷰 제출 → PBL 생성 → 편집 → 최종 확정 → PDF/XLSX 다운로드

- [ ] **Task 20: 검증·커밋·PR**

```bash
npm run validate && npm run build && npm run test:e2e
git add <변경파일>
git commit -m "feat(ofa-09): PBL 산출물 신규 (LLM 생성·편집·버전관리·내보내기)

- pbl 서비스 모듈 (types/validator/prompts/generator/crud)
- Server Actions 5단계 패턴
- 6개 UI 섹션 컴포넌트
- ConsultantPBLClient·운영자 뷰
- PDF/XLSX 내보내기 PBL 버전
- PBL_DRAFTED 상태 전환
- E2E 커버리지"
git push -u origin feature/ofa-09-output-pbl
gh pr create --base feature/official-form-alignment --title "feat(ofa-09): PBL 산출물 신규" --body "..."
```

**완료 지표:** PBL 트랙 프로젝트에서 LLM 생성·편집·최종 확정·PDF/XLSX 다운로드 전체 플로우 동작.

---

### Step 10: PBL HWPX 템플릿 + 내보내기 연결

**브랜치:** `feature/ofa-10-hwpx-pbl`
**규모:** Medium (약 11개 Task)
**호출 스킬:** `hwpx-docgen`(프로젝트 로컬 스킬)
**의존:** Step 3, 9

**목표:** 산인공 양식 2번 HWPX를 템플릿화하고 PBL 데이터 → HWPX 다운로드 파이프라인 완성. 결과보고서 파트 포함(과정개발보고서 Ⅰ~Ⅴ + 결과보고서 1~4).

**파일:**
- 신규: `templates/hwpx/pbl.hwpx` (산인공 양식 2번 플레이스홀더 삽입본)
- 변경: `api/hwpx/generate.py` (type=pbl 분기 추가)
- 신규: `api/hwpx/_placeholders_pbl.py` (플레이스홀더 매핑 전용 모듈)
- 신규: `src/lib/services/export/hwpx/hwpx-payload-pbl.ts` + `.test.ts`
- 변경: `src/lib/services/export/hwpx/index.ts` (PBL entry point 추가)
- 변경: `src/components/pbl/DownloadButton.tsx` (HWPX 항목 추가)
- 변경: `src/app/(dashboard)/consultant/projects/[id]/pbl/actions.ts` (`exportPBLAsHwpxAction` 추가)

- [ ] **Task 1: 브랜치 생성**

```bash
git checkout feature/official-form-alignment && git pull
git checkout -b feature/ofa-10-hwpx-pbl
source .venv/bin/activate
python -c "import hwpx" || uv pip install -r api/hwpx/requirements.txt
```

- [ ] **Task 2: 산인공 양식 2번 구조 분석**

```bash
source .venv/bin/activate
python .claude/skills/hwpx-docgen/scripts/analyze_template.py \
  "docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx" \
  > docs/references/hwpx-structure-pbl.md
```

산출물 범위:
- Ⅰ. 훈련과정 개요 (기업명·NCS·훈련시간·AI역량수준 등)
- Ⅱ. 훈련 요구분석 (경영이슈·조직도·훈련환경)
- Ⅲ. AI 기반 훈련과제 도출 (수행활동·문제정의·우선순위·훈련대상·AI수준)
- Ⅳ. AI 기반 운영계획 (훈련목표·AI도구 활용계획·실시계획·평가계획)
- Ⅴ. 성과분석·확산 전략
- 결과보고서: 학습활동 수행일지·과정평가 결과·수행 결과물·훈련 결과

플레이스홀더 설계 문서를 `docs/references/hwpx-placeholders-pbl.md`로 작성.

- [ ] **Task 3: 템플릿 제작 (수동 편집)**

원본 `.hwpx`를 복사해 `templates/hwpx/pbl.hwpx`로 저장.

주요 플레이스홀더 예:
| 양식 필드 | 플레이스홀더 |
|---|---|
| 기업명 / 사업장관리번호 | `{{company_name}}`, `{{business_registration_no}}` |
| 주요 업종 / NCS 분류 | `{{industry_code}}`, `{{industry_main}}`, `{{ncs_code}}` |
| AI역량 수준(체크) | `{{level_basic_check}}`, `{{level_inquiry_check}}`, `{{level_utilize_check}}`, `{{level_leading_check}}` |
| 훈련 목표(체크) | `{{goal_tech_check}}`, `{{goal_optimize_check}}`, `{{goal_defect_check}}`, `{{goal_manual_check}}`, `{{goal_etc_check}}` |
| 경영 이슈 | `{{business_issues}}` |
| 조직도 | (부서 행 반복) |
| 훈련환경 (As-Is/To-Be) | `{{as_is}}`, `{{to_be}}` |
| 문제정의서 | `{{problem_background}}`, `{{problem_core}}`, `{{problem_scope}}`, `{{problem_constraints}}` |
| 문제 우선순위 표 | (행 반복) |
| 훈련대상 업무 세부 | (행 반복) |
| AI수준 진단 | `{{current_level}}`, `{{target_level}}`, `{{improvement_reason}}` |
| 훈련 목표 | `{{training_goal}}` |
| AI도구 활용계획 | (행 반복, 단계·도구·데이터·목적·방법) |
| 훈련 교과목 프로파일 | (행 반복) |
| 평가계획(과정/결과 설문) | (표 복제) |
| 성과지표(정량/정성) | `{{quantitative_metrics}}`, `{{qualitative_metrics}}` |
| 확산 전략 | `{{internalization}}`, `{{dissemination}}` |

검증:
```bash
python .claude/skills/hwpx-docgen/scripts/validate_hwpx.py templates/hwpx/pbl.hwpx
```

- [ ] **Task 4: `_placeholders_pbl.py` 매핑 모듈 (RED → GREEN)**

파일: `api/hwpx/_placeholders_pbl.py`
- 입력 JSON 경로 → 템플릿 플레이스홀더 명의 매핑 테이블
- 표 반복 대상(조직도, 문제 우선순위, 훈련대상 업무, AI도구 활용계획, 교과목 프로파일, 평가 체크리스트)의 행 템플릿 식별자

Python 단위 테스트(`api/hwpx/test_placeholders_pbl.py`)로 매핑 정확성 검증.

- [ ] **Task 5: `api/hwpx/generate.py` 분기 확장**

현재 ROADMAP 전용 로직을 `type` 파라미터 분기로 일반화:
```python
pbl_type = body.get('type', 'roadmap')
if pbl_type == 'pbl':
    template_path = 'templates/hwpx/pbl.hwpx'
    placeholder_mod = _placeholders_pbl
else:
    template_path = 'templates/hwpx/roadmap.hwpx'
    placeholder_mod = _placeholders_roadmap
```

동적 표 행 삽입 공통 함수를 `_hwpx_helpers.py`로 추출(리팩터링).

- [ ] **Task 6: Node 변환기 `hwpx-payload-pbl.ts` (RED → GREEN)**

파일: `src/lib/services/export/hwpx/hwpx-payload-pbl.ts` + `.test.ts`

함수 시그니처 (Step 7 Task 7의 `RoadmapHwpxPayload`와 평행, 실제 프로젝트 컨벤션: `Row` 접미사 없음):
```typescript
import type { Project, Interview } from '@/types/database';
// PBLReport 타입은 Step 9 Task 2의 src/lib/services/pbl/pbl-types.ts에서 정의됨
// (또는 supabase gen types 재실행으로 src/types/database.ts에 자동 추가)
import type { PBLReport } from '@/lib/services/pbl/pbl-types';

export interface PBLHwpxPayloadInputs {
  pbl: PBLReport;             // FINAL 또는 DRAFT pbl_reports row
  project: Project;
  interview: Interview;       // pbl_data JSONB 컬럼 사용
}

export function buildPBLHwpxPayload(inputs: PBLHwpxPayloadInputs): PBLHwpxPayload { ... }
```
- 누락/빈 필드 안전 처리 (빈 문자열·기본값)
- 체크박스 플래그 생성 로직 단위 테스트

- [ ] **Task 7: `hwpx-client.ts`에 공통 헬퍼 + PBL 래퍼 추가 (리팩터 영향 명시)**

**변경 영향**:
- Step 7 Task 6에서 만든 `generateHwpx(payload)` 는 로드맵 전용으로 암묵 취급되고 있음. 본 Task에서 **공통 헬퍼 `postToPythonGenerate({type, data})` 로 추출** + 기존 함수를 **`generateRoadmapHwpx`** 로 리네임 + 신규 `generatePBLHwpx` 추가.
- **Step 7에서 만든 `exportRoadmapAsHwpxAction` 호출부를 함께 갱신** (import 이름 변경). `serena` MCP로 심볼 탐색해 안전하게 rename.
- 기존 테스트(`hwpx-client.test.ts`, `hwpx-payload-roadmap.test.ts`)도 이름·import 경로 갱신.

```typescript
// 내부 공통 헬퍼
async function postToPythonGenerate(body: { type: 'roadmap' | 'pbl'; data: unknown }): Promise<Buffer> {
  // 기존 generateHwpx의 URL 구성·시크릿 헤더·fetch 로직을 그대로 이관
}

export async function generateRoadmapHwpx(payload: RoadmapHwpxPayload): Promise<Buffer> {
  return postToPythonGenerate({ type: 'roadmap', data: payload });
}

export async function generatePBLHwpx(payload: PBLHwpxPayload): Promise<Buffer> {
  return postToPythonGenerate({ type: 'pbl', data: payload });
}
```

Server Action 변환(base64 반환)은 Step 7 Task 8과 동일 패턴으로 PBL 쪽에서 수행 (Task 8 참조).

- [ ] **Task 8: Server Action `exportPBLAsHwpxAction`**

파일: `src/app/(dashboard)/consultant/projects/[id]/pbl/actions.ts` (확장)
- 5단계 패턴 엄수: `requireAuthWithRole(['CONSULTANT_APPROVED'], ...)` 호출 → 트랙 가드(`projects.track === 'PBL'`) → 배정 확인(RLS) → Zod 검증(없음 — id만) → 비즈니스 로직
- DB에서 최신 FINAL 또는 DRAFT 조회 → payload 변환 → `generatePBLHwpx()` 호출 → Buffer 획득 → **base64 문자열로 변환**(Server Action은 Buffer 직접 반환 불가)
- 반환 타입: `ActionResult<{ fileName: string; contentBase64: string; mimeType: string }>`
- 감사 로그: `createAuditLog({ action: 'PBL_HWPX_EXPORTED', targetType: 'pbl_report', targetId: pblReportId, ... })`
- `check-server-action` 스킬 호출

테스트: 권한 없음 / PBL 없음 / 성공 케이스 (base64 값 비어있지 않은지).

- [ ] **Task 9: UI — `DownloadButton.tsx` HWPX 항목 추가**

파일: `src/components/pbl/DownloadButton.tsx`
- shadcn `DropdownMenu` 기반 3종(PDF / XLSX / HWPX)
- HWPX 클릭 → `exportPBLAsHwpxAction()` → `ActionResult<{ fileName, contentBase64, mimeType }>` 수신
- base64 복원·다운로드 로직은 Step 7 Task 9의 로드맵 DownloadButton과 동일 패턴 (공통 훅으로 추출 가능 — `useHwpxDownload()` 검토)
- 로딩 상태(Button `disabled` + Spinner 아이콘), 실패 시 `showErrorToast`
- 파일명: `{company}_PBL_v{version}.hwpx` (Server Action에서 생성)

RTL 테스트로 항목 노출·클릭 상호작용·에러 토스트 검증.

- [ ] **Task 10: Preview 스모크 테스트**

```bash
npm run build
git push
```

Vercel Preview에서:
- PBL 프로젝트 1건 생성 → HWPX 다운로드
- 한글 프로그램에서 열어 양식 구조·체크박스·표 데이터 일치 확인
- 플레이스홀더가 **모두 치환**되었는지 확인(`{{` 문자열 남아있으면 실패)

확인용 스크립트(`scripts/check-hwpx-no-placeholders.py`)를 Python으로 작성해 CI 훅에 붙일지 여부는 Step 12에서 결정.

- [ ] **Task 11: 검증·커밋·PR**

```bash
npm run validate && npm run build
git add <변경파일>
git commit -m "feat(ofa-10): PBL HWPX 템플릿 + 내보내기 연결

- templates/hwpx/pbl.hwpx (산인공 양식 2번)
- api/hwpx/generate.py type 분기 일반화
- _placeholders_pbl.py 매핑 모듈
- hwpx-payload-pbl.ts 변환기
- DownloadButton HWPX 항목"
git push -u origin feature/ofa-10-hwpx-pbl
gh pr create --base feature/official-form-alignment --title "feat(ofa-10): PBL HWPX 내보내기" --body "..."
```

**완료 지표:** PBL 프로젝트에서 HWPX 다운로드 → 한글 프로그램에서 양식 그대로 열림 + 플레이스홀더 잔존 없음.

---

### Step 11: 갤러리 트랙 라벨·필터 + PBL 테스트 페이지

**브랜치:** `feature/ofa-11-gallery-test-track`
**규모:** Medium (약 8개 Task)
**호출 스킬:** `frontend-guide`, `composition-patterns`
**의존:** Step 9

**목표:**
- 갤러리가 로드맵·PBL 양쪽 데이터를 통합 표시 + 트랙 라벨/필터 제공
- `/test-pbl` 페이지 신규 (기존 `/test-roadmap`와 평행 구조)

**파일:**
- 변경: `src/app/(dashboard)/gallery/page.tsx` (+ `.test.tsx`)
- 변경: `src/app/(dashboard)/gallery/actions/*.ts`
- 변경: `src/components/gallery/*.tsx` (트랙 라벨, 필터 UI)
- 신규: `src/app/(dashboard)/test-pbl/page.tsx`
- 신규: `src/app/(dashboard)/test-pbl/TestPBLClient.tsx` (테스트용 정적 인터뷰 데이터로 PBL 생성 — **test-roadmap 컨벤션 준수: 컨테이너 컴포넌트는 루트에 배치, `_components/`는 하위 단계 컴포넌트 전용**)
- 신규: `src/app/(dashboard)/test-pbl/_components/TestPBL*.tsx` (단계·보조 컴포넌트)
- 신규: `src/app/(dashboard)/test-pbl/_hooks/useTestPBL*.ts` (폼·검증 훅)
- 신규: `src/app/(dashboard)/test-pbl/layout.tsx`, `loading.tsx`, `actions.ts` + `actions.test.ts`

- [ ] **Task 1: 브랜치 생성**

```bash
git checkout feature/official-form-alignment && git pull
git checkout -b feature/ofa-11-gallery-test-track
```

- [ ] **Task 2: 갤러리 서비스 — 로드맵·PBL 통합 목록 (RED → GREEN)**

파일: `src/app/(dashboard)/gallery/actions/queries.ts` (기존 파일 확장) + `queries.test.ts`

**구현 전략 — SQL UNION이 아닌 "두 번 조회 + TS에서 병합"**:
- `roadmap_versions`와 `pbl_reports`는 컬럼 집합이 다르므로 단일 SQL UNION은 비실용적(공통 컬럼만 남기면 표시에 필요한 메타가 사라짐).
- 권장 방식: **병렬로 두 테이블을 쿼리**한 뒤 TS에서 통합 형태로 매핑:
  ```typescript
  type GalleryItem = {
    id: string;
    track: 'ROADMAP' | 'PBL';
    title: string;              // 로드맵: '{company} 로드맵 v{n}' / PBL: '{company} PBL v{n}'
    companyName: string;
    industry: string | null;
    likeCount: number;
    createdAt: string;
  };

  const [roadmaps, pbls] = await Promise.all([
    supabase.from('roadmap_versions').select('..., projects(...)')
      .eq('is_shared', true).eq('status', 'FINAL'),
    supabase.from('pbl_reports').select('..., projects(...)')
      .eq('is_shared', true).eq('status', 'FINAL'),
  ]);
  ```
- TS에서 `merge([...roadmaps, ...pbls]).sort((a, b) => b.likeCount - a.likeCount || b.createdAt - a.createdAt)` → 페이지네이션은 `.slice(offset, offset+limit)`.
- 필터 파라미터: `track?: 'ROADMAP'|'PBL'|'ALL'`, `industry?: string`, `q?: string`.
  - `track='ROADMAP'` 또는 `'PBL'`이면 해당 테이블만 쿼리(성능 최적화).
- 총 개수(페이지네이션)는 두 쿼리의 count 합.

성능 주의: 트래픽이 커지면 이 방식이 비효율적일 수 있음. **Step 12 `performance-engineer` 감사에서 DB 뷰(`gallery_items_view`) 또는 materialized view 도입 여부 판단**.

Supabase 모킹 팩토리로 두 테이블 데이터 세팅 → 병합·정렬·필터·페이지네이션 결과 검증.

- [ ] **Task 3: 트랙 필터 UI 컴포넌트 (RED → GREEN)**

파일: `src/components/gallery/TrackFilter.tsx` + `.test.tsx`
- 3개 토글: 전체 / 로드맵 / PBL
- URL search params 동기화 (`useSearchParams`)
- 선택 변경 시 목록 재요청

`composition-patterns` 스킬로 기존 필터(예: 산업 필터)와 공통 Wrapper 추출 검토.

- [ ] **Task 4: 카드에 트랙 라벨 뱃지 + 상세 페이지 분기 (RED → GREEN)**

파일: `src/app/(dashboard)/gallery/_components/GalleryContent.tsx` (기존) + `.test.tsx`(기존 갱신)
- 트랙별 색상 뱃지 (`로드맵` = blue, `PBL` = purple) — 색상은 `src/lib/constants/tracks.ts`의 `TRACK_BADGE_COLORS` 상수(Step 2 Task 2에서 추가)를 참조.
- 카드의 `href`는 `/gallery/[id]?track=ROADMAP` 또는 `/gallery/[id]?track=PBL` — 트랙이 명시적으로 쿼리에 포함되어야 UUID 충돌을 피한다 (roadmap_versions.id와 pbl_reports.id는 모두 UUID라 id만으로 테이블 판별 불가).

상세 페이지 분기 (`src/app/(dashboard)/gallery/[id]/page.tsx`):
- 기존 코드는 `fetchRoadmapDetail(id)`만 호출. 본 Task에서 **`?track` 쿼리 파라미터 기반 분기**를 추가한다.
- 신규 서비스 함수: `fetchPBLReportDetail(id)` — `src/app/(dashboard)/gallery/actions/queries.ts`에 추가(기존 `fetchRoadmapDetail` 옆).
- page.tsx props 타입 확장 (기존 `params`만 있던 GalleryDetailPageProps에 `searchParams` 추가 필수):
  ```typescript
  interface GalleryDetailPageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ track?: string }>;  // ← 신규 추가
  }

  export default async function GalleryDetailPage({ params, searchParams }: GalleryDetailPageProps) {
    const { id } = await params;
    const sp = await searchParams;
    const track: 'ROADMAP' | 'PBL' = sp.track === 'PBL' ? 'PBL' : 'ROADMAP';

    // ... 인증 체크 (기존 패턴 유지) ...

    const result = track === 'PBL'
      ? await fetchPBLReportDetail(id)
      : await fetchRoadmapDetail(id);
    if (!result.success) notFound();

    return track === 'PBL'
      ? <GalleryPBLDetailContent detail={result.data} isConsultant={profile.role === 'CONSULTANT_APPROVED'} />
      : <GalleryDetailContent detail={result.data} isConsultant={profile.role === 'CONSULTANT_APPROVED'} />;
  }
  ```
- 렌더는 트랙에 따라 기존 `GalleryDetailContent` 또는 신규 `GalleryPBLDetailContent` 컴포넌트 선택.
- 신규 파일: `src/app/(dashboard)/gallery/[id]/_components/GalleryPBLDetailContent.tsx` + `.test.tsx`.

> 라우트 구조는 유지(`/gallery/[id]`)하되, 내부에서 트랙 분기를 명시적으로 한다. **쿼리 파라미터가 누락된 경우 기본값 'ROADMAP'**으로 기존 동작을 보존.

- [ ] **Task 5: 갤러리 페이지 통합**

파일: `src/app/(dashboard)/gallery/page.tsx` + `.test.tsx`
- 상단 검색·필터 영역에 `TrackFilter` 추가
- 그리드는 union 결과 렌더
- 빈 상태(트랙 필터 결과 없을 때) 메시지 추가

- [ ] **Task 6: 좋아요·공유 액션 트랙별 분기**

파일: `src/app/(dashboard)/gallery/actions/interactions.ts` (기존 — 좋아요/공유 통합 파일) + `interactions.test.ts`

> 주의: 프로젝트의 실제 gallery 액션 구조는 `copy.ts / queries.ts / interactions.ts / gallery-utils.ts / index.ts`. `like.ts`·`share.ts` 분리 파일은 존재하지 않는다.

**중요: 좋아요 저장 구조 (Step 2에서 확정)**
- 로드맵 좋아요: `roadmap_likes` 테이블에 INSERT/DELETE → 트리거가 `roadmap_versions.like_count` 자동 증감(마이그 024·056).
- PBL 좋아요: Step 2 마이그 061에서 **`pbl_likes` 테이블 + 트리거 + RLS를 동일 패턴으로 이미 추가**. 따라서 본 Step에서 **추가 마이그레이션이 필요 없다** — 액션이 `pbl_likes`에 INSERT/DELETE 하면 트리거가 `pbl_reports.like_count`를 자동 갱신.

구현:
- `interactions.ts` 내 기존 좋아요·공유 함수에 트랙 파라미터(또는 PBL 전용 래퍼) 추가.
  - 로드맵 → `roadmap_likes` · `roadmap_versions.is_shared` 대상.
  - PBL → `pbl_likes` · `pbl_reports.is_shared` 대상.
- INSERT 시 `(user_id, <report_id>)` UNIQUE 제약으로 중복 방지. ON CONFLICT DO NOTHING 또는 upsert 체크.
- `index.ts` 배럴 export에 신규 시그니처 반영.

테스트: roadmap 좋아요 / pbl 좋아요 / 공유 토글 각각. like_count 캐시가 트리거로 올바르게 증감되는지 통합 테스트에서 확인.

- [ ] **Task 7: `/test-pbl` 페이지 신규 (test-roadmap 평행 구조)**

파일:
- `src/app/(dashboard)/test-pbl/page.tsx` — 서버 컴포넌트, 샘플 fixture 로드
- `src/app/(dashboard)/test-pbl/TestPBLClient.tsx` + `.test.tsx` — **컨테이너는 루트에 배치** (test-roadmap의 `TestRoadmapClient.tsx` 컨벤션)
- `src/app/(dashboard)/test-pbl/_components/TestPBL*.tsx` — 단계 컴포넌트만 `_components/` 안에
- `src/app/(dashboard)/test-pbl/_hooks/useTestPBL*.ts` — 폼·검증 훅
- `src/app/(dashboard)/test-pbl/layout.tsx`, `loading.tsx`, `actions.ts` + `actions.test.ts`
- 신규 fixture: `e2e/fixtures/pbl-interview-sample.ts` (프로젝트는 `e2e/fixtures/` 사용; `tests/fixtures/`는 존재하지 않음)

동작:
- 정적 PBL 인터뷰 샘플 데이터 로드
- "PBL 생성" 버튼 → LLM 호출 → DRAFT 저장
- 컨설턴트 연습용이므로 실 프로젝트와 격리: **기존 `projects.is_test_mode = true` 컬럼 활용**(마이그 032·034 패턴 — `test-roadmap`에서 사용 중인 동일 메커니즘). RLS 정책은 `is_test_mode = true` 분기로 본인이 만든 테스트 데이터만 조회.
- `pbl_reports` 테이블을 그대로 사용하되 연결되는 `projects.is_test_mode = true`. Step 9의 `pbl-crud.ts`를 공유하되 호출 시 test 모드 컨텍스트 명시.

`composition-patterns` 스킬로 공통 컴포넌트 재사용 여부 판단. **test-roadmap 컴포넌트의 PBL 버전 평행 작성이 목표이지 test-roadmap 코드를 수정하지 않는다.**

- [ ] **Task 8: 네비게이션 갱신**

`src/components/Navigation.tsx` (프로젝트 유일 네비게이션 컴포넌트):
- 컨설턴트 메뉴에 "PBL 테스트" 항목 추가
- 갤러리 메뉴는 그대로 (트랙은 페이지 내 필터)
- Step 4에서 추가된 공지 메뉴와 충돌 없도록 기존 역할 분기 구조 그대로 재사용

- [ ] **Task 9: E2E 시나리오**

파일: `e2e/gallery/gallery-tracks.spec.ts` (기존 `e2e/gallery/` 카테고리 활용)
- 로드맵·PBL 둘 다 공유된 상태로 갤러리 방문 → 전체 표시 → 트랙 필터 → 결과 변화
- 카드 클릭 → 트랙별 상세 페이지 진입

파일: `e2e/consultant/test-pbl.spec.ts`
- 컨설턴트 → /test-pbl 진입 → 샘플 데이터로 PBL 생성 성공

- [ ] **Task 10: 검증·커밋·PR**

```bash
npm run validate && npm run build && npm run test:e2e
git add <변경파일>
git commit -m "feat(ofa-11): 갤러리 트랙 라벨/필터 + PBL 테스트 페이지

- gallery union 쿼리 (roadmap + pbl)
- TrackFilter 컴포넌트 + URL 동기화
- 카드 트랙 라벨 뱃지
- /test-pbl 페이지 신규
- E2E 커버리지"
git push -u origin feature/ofa-11-gallery-test-track
gh pr create --base feature/official-form-alignment --title "feat(ofa-11): 갤러리 트랙 분리 + PBL 테스트" --body "..."
```

**완료 지표:** 갤러리에서 ROADMAP/PBL 카드 혼재 표시·필터 작동, /test-pbl에서 샘플 PBL 생성 성공.

---

### Step 12: 최종 QA, 문서, 배포 점검

**브랜치:** `feature/ofa-12-final-qa-docs`
**규모:** Medium (약 10개 Task)
**호출 스킬:** `test-automator`(서브에이전트), `performance-engineer`(서브에이전트), `security-auditor`(서브에이전트), `web-design-guidelines`, Playwright MCP, `refactoring`

**목표:**
- 전체 E2E 스모크 테스트
- deprecated된 기존 인터뷰 스키마 최종 제거
- `roadmap_versions.pbl_course` 컬럼 drop 마이그레이션
- 문서 갱신 (ARCHITECTURE.md, RLS.md, CLAUDE.md)
- 배포 체크리스트 검증
- 성능·보안 최종 감사

- [ ] **Task 1: 브랜치 + 기존 `interview.ts` 최종 제거** (deprecated 표시된 것을 실제 삭제)

삭제 전 의존성 감사 (필수):
```bash
# src/lib/schemas/interview.ts 를 참조하는 모든 파일 조사
# 프로젝트 실제 E2E 경로는 e2e/ (tests/ 디렉터리는 존재하지 않음)
grep -rn "schemas/interview['\"]" src/ e2e/ --include="*.ts" --include="*.tsx"
grep -rn "from '@/lib/schemas/interview'" src/ e2e/
```

또는 Claude의 Grep 도구 사용 (권장):
```
Grep(pattern: "schemas/interview['\"]|from '@/lib/schemas/interview'", path: "src")
Grep(pattern: "schemas/interview['\"]|from '@/lib/schemas/interview'", path: "e2e")
```

기대: Step 5·8·9의 트랙별 스키마로 이미 완전 이관된 상태. 잔존 import가 있다면 해당 파일부터 교체 후 삭제 진행. 삭제 후 `npm run typecheck` + `npm run test` 회귀 0 확인.
- [ ] **Task 2: 마이그레이션 065 — legacy 정리 + audit 액션 확장**

파일: `supabase/migrations/065_ofa_cleanup.sql`
```sql
-- 1) roadmap_versions의 legacy pbl_course 컬럼 drop
--    (Step 6에서 코드 참조 제거 완료 → 이 시점에 안전하게 drop 가능)
--
-- 참고: 마이그레이션 050에서 chk_pbl_course_size CHECK 제약이 이 컬럼에 부착되어 있다.
--       PostgreSQL의 DROP COLUMN은 기본적으로 해당 컬럼에 딸린 CHECK 제약·기본값·인덱스를
--       함께 제거하므로 별도 DROP CONSTRAINT가 필요하지 않다. 단, 감사 시 혼선 방지를 위해
--       의존 객체를 주석으로 명시한다.
ALTER TABLE roadmap_versions DROP COLUMN IF EXISTS pbl_course;
-- ↑ 동반 제거 대상: chk_pbl_course_size (CHECK 제약, 마이그 050)

-- 2) audit_action ENUM 확장 — 대부분의 신규 값은 **Step 2 마이그 061에서 이미 일괄 선언**됨.
--    (이유: Step 4·7·8·9·10에서 createAuditLog가 해당 enum 값을 참조하려면
--     본 Step 12 이전에 DB에 존재해야 하기 때문.)
--    본 Step에서는 Step 4~11 동안 **추가 발견된 audit 값이 있다면만** 여기서 추가.
--    이 시점에 추가가 없으면 이 블록은 비워둔다.

-- 3) (선택) Step 5·11에서 대기열로 넘긴 잔여 작업이 있다면 이 마이그레이션에 통합한다:
--    - interviews.roadmap_data JSONB 분리가 확정되면 여기서 추가
--    - pbl_reports.like_count 원자 증가 RPC는 마이그 061에서 트리거로 이미 처리됨
--      (roadmap_versions와 동일 패턴). 추가 RPC 불필요.
--    - finalize_pbl RPC는 마이그 061에서 이미 추가됨 (본 Step에서 추가 불필요)
--    (본 Step 진입 전 Step 5·11 결과를 재검토하여 결정)
```

> DDL 적용 후 `supabase gen types typescript` 또는 `mcp__supabase__generate_typescript_types`로 `src/types/database.ts`를 재생성하여 새 audit_action 값을 TS `AuditAction` 유니언에 반영한다.

- [ ] **Task 3: `src/app/api/hwpx-test/route.ts` 제거** (PoC용 일회성 라우트)
- [ ] **Task 4: `test-automator` 서브에이전트로 E2E 스모크 시나리오**

```
Agent(
  subagent_type: "test-automator",
  description: "OFA 최종 E2E 스모크",
  prompt: "다음 시나리오를 Playwright 테스트로 자동화하라:
  1. 운영자 로그인 → 공지 작성 → 파일 첨부 → 저장 → 컨설턴트 로그인 → 조회
  2. 운영자 로그인 → 기업 × ROADMAP 프로젝트 생성 → 컨설턴트 배정
  3. 컨설턴트 → 로드맵 인터뷰 5스텝 작성 → 로드맵 생성 → HWPX 다운로드
  4. 운영자 → 동일 기업에 PBL 프로젝트 생성 → 컨설턴트 배정
  5. 컨설턴트 → PBL 인터뷰 8스텝 작성 → PBL 생성 → HWPX 다운로드
  6. 갤러리 → ROADMAP/PBL 필터 작동 확인
  e2e/workflow/ofa-smoke.spec.ts 에 작성 (프로젝트 실제 경로 = e2e/<카테고리>/, 통합 워크플로우는 e2e/workflow/ 사용). 스크린샷 저장."
)
```

- [ ] **Task 5: `performance-engineer` 서브에이전트로 성능 감사**

```
Agent(
  subagent_type: "performance-engineer",
  description: "OFA 성능 감사",
  prompt: "feature/official-form-alignment 브랜치의 변화가 초래한 성능 영향을 분석하라.
  - 번들 사이즈 차이 (npm run build 전후)
  - 인터뷰 위저드 렌더링 (스텝 수 증가)
  - HWPX 생성 콜드스타트
  - 갤러리 UNION 쿼리 계획
  개선 제안 포함."
)
```

- [ ] **Task 6: `security-auditor` 서브에이전트로 최종 RLS/권한 감사**

```
Agent(
  subagent_type: "security-auditor",
  description: "OFA 최종 보안 감사",
  prompt: "다음을 감사:
  - pbl_reports / notices / notice_attachments RLS 실효성
  - 트랙별 권한 격리 (ROADMAP 프로젝트 담당자가 PBL 데이터 접근 불가한지)
  - HWPX generate 엔드포인트의 `HWPX_API_SECRET` 헤더 검증이 실제로 동작하는지 (시크릿 누락·오타 시 401 반환 확인)
  - notice-attachments Storage bucket의 signed URL 사용 여부
  - 파일 업로드 MIME/확장자 검증이 서버 측에도 있는지"
)
```

- [ ] **Task 7: 문서 갱신**
  - `docs/ARCHITECTURE.md`: 트랙 분리·HWPX·게시판 구조 반영
  - `docs/RLS.md`: 신규 테이블 RLS 정책 문서화
  - `CLAUDE.md`: 아키텍처 섹션 업데이트 (필요 시)

- [ ] **Task 8: `web-design-guidelines` 스킬로 UI 최종 감사**

- [ ] **Task 9: `npm run validate && npm run build && npm run test:e2e` 최종 통과**

- [ ] **Task 10: PR 생성 + 리뷰 + 머지**

**완료 지표:** `feature/official-form-alignment` 브랜치가 모든 Step 머지 완료 상태. 별도 PR(`feature/official-form-alignment` → `main`) 생성 후 Preview QA → 프로덕션 머지.

---

## 5. 테스트 전략

### 5-1. 단위 테스트 (Vitest)
- **모든 스키마**: `.test.ts` 필수 — 경계값(min/max), 필수/선택, 커스텀 validation
- **서비스 레이어**: Supabase 클라이언트 모킹 팩토리(`src/test/helpers/mock-supabase.ts`) 활용. 기존 패턴 유지
- **Server Actions**: 세션 없음·권한 없음·검증 실패·성공의 4가지 케이스 최소 포함
- **LLM 프롬프트**: 출력 스키마 검증용 mock 응답으로 generator 테스트

### 5-2. E2E 테스트 (Playwright)
- 역할별 시나리오 (컨설턴트 / 운영자 / 시스템관리자)
- 트랙별 전체 플로우 (로드맵 생성 / PBL 생성)
- 내보내기 (PDF · XLSX · HWPX)
- 공지 게시판 CRUD
- 갤러리 공유·필터

### 5-3. 테스트 데이터
- `e2e/fixtures/` 아래 **트랙별 인터뷰 샘플 JSON** (산인공 양식에 실제로 맞는 데이터; 프로젝트 실제 경로는 `e2e/fixtures/` — `tests/fixtures/`는 존재하지 않음)
- 운영자/컨설턴트 계정 세션은 기존 `e2e/global-setup.ts` 또는 `e2e/auth/*.spec.ts`의 로그인 헬퍼를 재사용 (신규 `auth.setup.ts` 파일 도입 금지 — 기존 구조 준수)

### 5-4. 서브에이전트 활용
- **test-automator**: E2E 시나리오 설계·작성
- **postgres-pro**: 쿼리 성능 / 인덱스 검증

---

## 6. 리스크·완화 매트릭스

| 리스크 | 발생 Step | 영향 | 완화 | 조기 감지 지표 |
|---|---|---|---|---|
| Vercel Python + python-hwpx 환경 비호환 | 3 | Critical — 전체 계획 변경 | PoC를 맨 앞에. 실패 시 아키텍처 (B) 선회 | Preview의 `/api/hwpx/ping` 500 응답 |
| HWPX 템플릿 치환 실패 (복잡 표·병합) | 7, 10 | High — 양식 미완성 | 원본을 그대로 쓰고 플레이스홀더만 삽입. `validate_hwpx.py` 매 단계 실행 | 템플릿 저장 후 재오픈 시 에러 |
| LLM이 산인공 필수 필드 환각 | 6, 9 | High — 산출물 품질 | Zod 엄격 검증 + 재시도 3회 + 실패 시 사용자 편집 유도. `prompt-engineer` 활용 | 생성 실패율 로그 |
| 트랙 분리로 RLS 정책 누락 | 2, 9 | High — 데이터 누수 | `security-auditor` Step 2, 12 감사. `get-advisors` MCP 활용 | Supabase advisor 경고 |
| 인터뷰 위저드 UX 과부하 | 5, 8 | Medium — 컨설턴트 이탈 | 자동 저장·진행률 표시·재시작. 스텝당 필드 수 제한 | 사용자 피드백 |
| 서브 브랜치 병합 충돌 | 5~11 | Medium — 작업 지연 | 순차 머지 원칙, 메인 브랜치 자주 rebase | PR 머지 지연 |
| LLM 비용 폭증 | 6, 9 | Low — 운영 비용 | 일별 호출 제한 활용 (기존 quota.ts). 생성 전 견적 안내 | 쿼터 초과 알림 |
| Storage 용량 초과 | 4 | Low — 게시판 불가 | 20MB 파일 제한 + Supabase advisor로 사용량 모니터링 | Supabase Storage 경고 |
| 배포 시점 장애 | 12 | High — 사용자 영향 | `main` 병합 전 Preview에서 최소 1주일 상시 테스트 | — |

---

## 7. 롤백 전략

- **PR 단위 롤백**: 각 Step PR은 원자적으로 revert 가능. `gh pr view <id>` → `git revert <merge-sha>` → 재배포
- **DB 마이그레이션 롤백**: 각 마이그레이션에 역-마이그레이션 노트 작성. 단, 데이터 존재 시 drop은 위험하므로 `IF EXISTS` + 백업 선행
- **feature 브랜치 전체 롤백**: `feature/official-form-alignment`을 main에 병합하지 않으면 프로덕션 영향 없음. 필요 시 브랜치 전체 폐기 후 재시작

---

## 8. 배포 체크리스트 (Step 12 완료 후 `main` 머지 전)

- [ ] 모든 서브 브랜치가 `feature/official-form-alignment`에 병합 완료
- [ ] `npm run validate` 통과
- [ ] `npm run build` 통과 (with `feature/official-form-alignment` 최신 상태)
- [ ] `npm run test:e2e` 통과 (전체 시나리오)
- [ ] Preview URL에서 최소 1주간 운영자·컨설턴트 QA
- [ ] 산인공 양식 대비 실제 HWPX 출력물 수기 검수 (3건 이상 샘플)
- [ ] `mcp__supabase__get_advisors`로 RLS/성능 경고 0건
- [ ] 환경변수 확인 (`NEXT_PUBLIC_*`, `SUPABASE_*`, `LLM_*`, **`HWPX_API_SECRET`**)
- [ ] Supabase Storage bucket 프로덕션에도 생성됨
- [ ] 프로덕션 마이그레이션 적용 순서 검증 (060 → 061 → 062 → 063 → 064 → 065)
- [ ] 롤백 스크립트 준비 (`pg_dump` 백업)

---

## 9. 실행 모드 안내

계획서 승인 후 다음 중 하나로 실행합니다:

**1. Subagent-Driven (권장)** — `superpowers:subagent-driven-development` 사용. Task마다 신선한 서브에이전트 디스패치, 2단계 리뷰. 병렬화 가능한 구간(Step 3 ↔ Step 4)에서 동시 진행.

**2. Inline Execution** — `superpowers:executing-plans` 사용. 현 세션에서 순차 실행, 체크포인트에서 검토.

---

## 10. 자체 점검 (Writing-Plans 요구)

**Spec 커버리지 확인:**

| 요청(사용자 메시지) | 해당 Step |
|---|---|
| 진단 기능 보류 | (계획 포함: 현 상태 유지, 변경 없음) |
| 인터뷰 두 트랙 분리 | Step 5(로드맵), Step 8(PBL) |
| 산인공 양식 화면 출력 | Step 6(로드맵), Step 9(PBL) |
| 한글 파일 생성 (HWPX) | Step 3(PoC+가상환경), Step 7(로드맵), Step 10(PBL) |
| 공지 게시판 | Step 4 |
| 결과물 제출 목업 보존 | (계획 반영: 건드리지 않음) |
| 갤러리 라벨·필터 | Step 11 |
| PBL 테스트 페이지 | Step 11 |
| HRD4U 자동 필드 수기 입력 | Step 5, 8 인터뷰 스키마에 포함 |
| 브랜치 전략 | 본 문서 섹션 0, 2 |
| TDD 필수 (Iron Law) | 본 문서 상단 TDD 섹션 + 각 Step Task의 RED→GREEN 명시 |
| 서브에이전트 방식 (team 미사용) | 본 문서 섹션 3-1-A |
| hwpx-docgen 스킬 프로젝트 로컬 설치 | Step 1 Task 2 |
| uv 가상환경 (로컬 Python) | Step 3 Task 2 |

**Placeholder 스캔:** TBD/TODO 없음, 각 Task에 구체 코드·명령·파일 경로 포함.

**타입/시그니처 일관성:** `ProjectTrack`, `RoadmapInterview`, `PBLReport`, `NoticeInput` 등 주요 타입이 Step 전반에 걸쳐 동일 이름으로 유지됨.

---

**계획서 끝.**
