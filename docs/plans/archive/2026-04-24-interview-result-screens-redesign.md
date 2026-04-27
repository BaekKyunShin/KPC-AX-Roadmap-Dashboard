# AI 훈련 로드맵 / PBL — 인터뷰·결과 페이지 전면 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: 본 계획은 `superpowers:subagent-driven-development` 또는 `superpowers:executing-plans` 로 단계별 실행한다. Task 체크박스(`- [ ]`)를 진행 상태 추적용으로 사용한다.
>
> **승인 게이트:** 본 계획서 자체가 사용자 승인 대상이다. 승인 전 구현 코드 수정 금지. (프롬프트 `docs/prompts/archive/2026-04-24-interview-result-screens-redesign.md` L222 규정.)

**Goal:** KPC AI 훈련 로드맵 대시보드의 **로드맵/PBL × 인터뷰/결과 4개 화면**을 산인공 공식 양식과 1:1 정합으로 전면 재설계하고, 공통 UI 레이어로 통일하며, HWPX 다운로드가 양식 PDF와 픽셀 수준 동일성을 가지도록 템플릿·치환 로직을 재구축한다.

**Architecture:** Next.js 16 App Router + Server Actions + Zod 이중 검증(loose/strict) + Supabase(Postgres+RLS) + Tailwind 4 공통 토큰 + shadcn/ui. HWPX 생성은 Vercel Python Function(`api/hwpx/generate.py`)이 `templates/hwpx/*.hwpx` 를 python-hwpx로 열어 플레이스홀더 치환·표 채움·체크박스 토글·반복 행 렌더를 수행. 4개 화면은 공통 컴포넌트 레이어(`src/components/{layout,common,result,forms}/*`)로 통일하되 트랙별 불가피 차이(Ⅴ장 구성·조직도·AI 4등급 체크박스)는 props·children으로 분리.

**Tech Stack:** Next.js 16, TypeScript strict, Tailwind 4(CSS 변수 토큰), Radix UI + shadcn/ui, Zod, Supabase JS SDK, Vitest + Testing Library, Playwright(E2E), Vercel Python Function 3.13, python-hwpx, `hwpx-docgen` 스킬.

---

## Context

본 프로젝트의 **로드맵/PBL × 인터뷰/결과** 4개 화면은 이미 구현되어 있으나, 산인공 공식 양식 PDF 2종 (`docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf`, `docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf`) 과의 정합성이 느슨하다. 단일 원천 문서 `docs/references/2026-04-23-current-fields-inventory.md` (1717줄) 가 양식 1/2의 **47개 라벨 섹션** · **69개 요소** (표 49·박스 13·체크박스 1·블록 2·PDF 3·조직도 1·이미지 1) 을 계층적으로 분해해둔 상태다.

본 재설계의 동력은 다음 네 가지 문제다.

1. **양식 정합 불완전** — 화면에 있어야 할 항목이 빠져 있거나, 양식의 표 병합 구조가 단순화되어 있음.
2. **4개 화면 UI/스타일 불일치** — 컨테이너 폭(인터뷰 `max-w-4xl` vs 결과 무제한), 다운로드 버튼(로드맵 `DownloadButton` 컴포넌트 vs PBL inline `<Button>`), 상태 배지·버전 셀렉터가 트랙별로 평행 복제됨.
3. **결과 페이지 구조 이질** — 로드맵=탭 4개(competencies/structure/plan/specs) vs PBL=세로 스크롤.
4. **HWPX 출력 불완전** — 현재 40(로드맵)+60(PBL) 플레이스홀더만 매핑. 서식 수정된 새 정본 HWPX 로 교체 후 **전수 매핑 표 재구축 + 치환 `{{...}}` 0건 보장** 필요.

사용자는 양식 서식(폰트·줄간격)을 수정한 정본 HWPX 2종을 `docs/references/` 에 덮어썼다(archive 폴더에 pre-2026-04-24 백업 존재). `templates/hwpx/pbl.hwpx` 는 아직 구버전(4/21)이므로 PR #3 Step 1에서 동기화.

## 사용자 결정 사항 (PlanMode 단계에서 확정)

| 결정 항목 | 값 |
|---|---|
| 공통 페이지 컨테이너 폭 | **`max-w-5xl`** (1024px) — 4개 화면 전체 |
| 결과 페이지 구조 | 양쪽 모두 **Tabs UI 통일** · 로드맵 Ⅰ·Ⅱ·Ⅲ 3탭 / PBL Ⅰ~Ⅴ 5탭 · sticky top-16 · URL `?tab=` 동기화 · '전체 펼치기' 인쇄 토글 |
| PR 분할 전략 | **4단계 분할 PR** (Foundation → 화면 재구현 → HWPX → 검증·리포트) |
| PBL 원본 HWPX | `docs/references/*.hwpx` 정본은 교체 완료. `templates/hwpx/pbl.hwpx` 는 **PR #3 Step 1에서 동기화** |

## Required Reading (착수 전 반드시 통독)

1. `docs/prompts/archive/2026-04-24-interview-result-screens-redesign.md` — 본 작업의 원본 프롬프트 (DoD·9단계 HWPX 재구축·15개 UI 통일 체크리스트 등 원문)
2. `docs/references/2026-04-23-current-fields-inventory.md` — 1717줄 **단일 원천 문서**. 47개 라벨 섹션의 요소·표 병합 구조·예시·작성 안내 전체
3. `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf` — 정본 15p + 별첨·참고자료
4. `docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf` — 정본 20p
5. `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx`, `2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx` — 서식 수정본 정본
6. `CLAUDE.md` — 프로젝트 아키텍처·Server Action 5단계 패턴·커밋 규칙·PR CI 판정 규칙
7. `docs/RLS.md` — RLS 정책 (Server Actions 변경 시 참조)

---

## 1. 4개 화면별 컴포넌트 트리 · 데이터 플로우 · 상태 관리

### 1.1 현재 구조 요약 (탐색 결과)

**라우트 매핑:**

| 화면 | URL | 페이지 컴포넌트 | 클라이언트 컴포넌트 | 컨테이너 폭 |
|---|---|---|---|---|
| 로드맵 인터뷰 | `/consultant/projects/[id]/interview?track=roadmap` | `src/app/(dashboard)/consultant/projects/[id]/interview/page.tsx` | `_components/RoadmapInterviewClient.tsx` (~440줄, 7스텝) | `max-w-4xl` |
| 로드맵 결과 | `/consultant/projects/[id]/roadmap` | `.../roadmap/page.tsx` | `_components/ConsultantRoadmapClient.tsx` (~450줄, 탭 4개) | 제한 없음 |
| PBL 인터뷰 | `/consultant/projects/[id]/interview?track=PBL` | 동일 페이지 컴포넌트, 트랙 분기 | `_components/PBLInterviewClient.tsx` (~350줄, 9스텝 lazy) | `max-w-4xl` |
| PBL 결과 | `/consultant/projects/[id]/pbl` | `.../pbl/page.tsx` | `_components/ConsultantPBLClient.tsx` (~446줄, 세로 스크롤) | 제한 없음 |

**Server Actions:**
- `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` — `saveRoadmapInterview`, `savePBLInterview`, `fetchInterview`, `fetchPBLInterview`
- `src/app/(dashboard)/consultant/projects/[id]/roadmap/actions.ts` — `createRoadmap`, `confirmFinalRoadmap`, `editRoadmapManually`, `exportRoadmapAsHwpxAction`, `downloadRoadmapHwpx`
- `src/app/(dashboard)/consultant/projects/[id]/pbl/actions.ts` — `generatePBLAction`, `finalizePBLAction`, `exportPBLAsHwpxAction`, `downloadPBLHwpx`

**Zod 스키마:**
- `src/lib/schemas/interview-roadmap.ts` — `RoadmapInterviewSchema`, `RoadmapOverviewSchema`, `CompanyRequirementsSchema`, etc.
- `src/lib/schemas/interview-pbl.ts` — `PBLInterviewSchema`, `PBLCourseOverviewSchema`, `PBLTargetTasksSchema`, etc.
- 두 파일 모두 loose/strict 이중 스키마(`partial()` 자동저장용 + strict 제출용) 구조 유지.

**이미 공통화된 것 (9개, 변경 불필요):**
`PageHeader`(`src/components/ui/page-header.tsx`), `useInterviewAutoSave`(`.../interview/_hooks/useInterviewAutoSave.ts` — 3초 debounce), `useHwpxDownload`(`src/hooks/useHwpxDownload.ts`), `RegenerateAccordion`(`src/components/roadmap/RegenerateAccordion.tsx`), `EmptyState`(`src/components/ui/EmptyState.tsx`), `Skeleton`(`src/components/ui/Skeleton.tsx`), `InterviewStepper`(`.../interview/_components/InterviewStepper.tsx`), `RoadmapLoadingOverlay`(`src/components/roadmap/RoadmapLoadingOverlay.tsx`), `Tabs`(shadcn/ui).

**평행 복제된 것 (5개, 공통화 대상):**

| 구분 | 로드맵 | PBL |
|---|---|---|
| VersionSelector | `src/components/roadmap/VersionSelector.tsx` (92줄) | `src/components/pbl/PBLVersionSelector.tsx` (48줄) |
| StatusBadge | `src/components/roadmap/RoadmapStatusBadge.tsx` (26줄) | `src/components/pbl/PBLStatusBadge.tsx` (26줄, 동일 로직) |
| Download UI | `src/components/roadmap/DownloadButton.tsx` (단일 버튼 컴포넌트) | 인라인 `<Button>` (ConsultantPBLClient.tsx 내부) |
| Download hook | `src/hooks/useRoadmapDownload.ts` | `src/hooks/usePBLDownload.ts` |
| 하단 네비 | 인터뷰에만 존재 (인라인) | 없음 |

### 1.2 재설계 후 컴포넌트 트리

**공통 컴포넌트 레이어 (신설):**

```
src/components/
  layout/
    PageContainer.tsx           # 4개 화면 공용: max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8
    PageSkeleton.tsx            # Suspense 폴백 통합
    SectionSkeleton.tsx         # 섹션 카드 내부 스켈레톤
  common/
    VersionStatusBadge.tsx      # DRAFT/FINAL/ARCHIVED + 버전 번호. 로드맵/PBL 공유
    VersionSelector.tsx         # <VersionSelector<T>> 제네릭. track props 로 데이터 모양 수용
  result/
    DownloadButtonGroup.tsx     # PDF / XLSX / HWPX 3버튼 통합 (variant, size, icon, loading, disabled 일관)
    ResultTabs.tsx              # sticky top-16 + URL ?tab= 동기화 + '전체 펼치기' 토글
    SectionCard.tsx             # 결과 탭 내부 섹션 카드 (타이포·spacing 토큰화)
    InlineEditField.tsx         # 인라인 편집 트리거 + 낙관적 업데이트 + '저장 중/자동 저장됨' 인디케이터
  forms/
    StickyFormNav.tsx           # 인터뷰 하단 이전/다음/저장 고정 바
    FormSection.tsx             # 섹션 제목(Ⅰ·Ⅱ·Ⅲ → 1·2·3 → 가·나·다 → □) 자동 렌더
    ExampleAccordion.tsx        # (예시) + 작성 안내 접기/펼치기
    LargeTextBox.tsx            # min-h 6~7줄 (한글 160-190px), 세로 리사이즈
    FormCheckbox.tsx            # □ → ☑ 토글 (select-one / multi 변형)
    FormTable.tsx               # 양식 표 재현 (rowspan/colspan 병합 지원)
  charts/
    OrganizationTree.tsx        # PBL Ⅱ-1-나 조직도 (트랙 전용)
    AiLevel4Check.tsx           # PBL Ⅲ-4 AI역량 4등급 체크박스 (트랙 전용)
```

**Deprecate (PR #2에서 호출부 이전 완료 후 삭제):**
- `src/components/roadmap/VersionSelector.tsx`, `RoadmapStatusBadge.tsx`, `DownloadButton.tsx`
- `src/components/pbl/PBLVersionSelector.tsx`, `PBLStatusBadge.tsx`

**4개 화면별 재설계 컴포넌트 트리:**

```
로드맵 인터뷰 (7 스텝)
  <PageContainer>
    <PageHeader title="AI훈련로드맵 인터뷰" backHref=".../projects/[id]" />
    <InterviewStepper steps={ROADMAP_STEPS} currentIdx={...} />
    {currentStep === 'necessity'           && <StepNecessity />}              # Ⅰ-1 [인터뷰]
    {currentStep === 'performance'         && <StepPerformanceActivities />}  # Ⅰ-2 [인터뷰]
    {currentStep === 'mainResult'          && <StepMainResult />}             # Ⅰ-3 [인터뷰→결과]
    {currentStep === 'hrdReport'           && <StepHrdReportPdf />}           # Ⅱ-1 [PDF 첨부]
    {currentStep === 'companyReq'          && <StepCompanyRequirements />}    # Ⅱ-2 [인터뷰]
    {currentStep === 'taskAnalysis'        && <StepTaskAnalysis />}           # Ⅱ-3 [인터뷰]
    {currentStep === 'targetTask'          && <StepTargetTask />}             # Ⅱ-4 [인터뷰]
    <StickyFormNav onPrev/onNext/onSave />
  </PageContainer>

로드맵 결과 (3탭)
  <PageContainer>
    <PageHeader title="AI훈련로드맵 결과">
      <VersionSelector<RoadmapVersionUI> />
      <DownloadButtonGroup pdf xlsx hwpx />
    </PageHeader>
    <VersionStatusBadge status={DRAFT|FINAL|ARCHIVED} />
    <RegenerateAccordion />
    <ResultTabs value={tab} defaultValue="overview">
      <Tab value="overview">    # Ⅰ [인터뷰→결과 + 인터뷰 입력]
        <SectionCard title="Ⅰ-1 수립 필요성"> <ReadOnlyBox ... /> </SectionCard>
        <SectionCard title="Ⅰ-2 주요 활동"> <ReadOnlyTable ... /> </SectionCard>
        <SectionCard title="Ⅰ-3 주요 결과"> <InlineEditField ... /> </SectionCard>
      </Tab>
      <Tab value="requirements"> # Ⅱ [인터뷰 입력 읽기 전용 + HRD이음 PDF 미리보기]
        <SectionCard title="Ⅱ-1 HRD이음 결과"> <PdfPreviewer /> </SectionCard>
        <SectionCard title="Ⅱ-2 기업 요구분석"> <ReadOnlyTable /> </SectionCard>
        <SectionCard title="Ⅱ-3 과업·워크플로우"> <ReadOnlyTable /> </SectionCard>
        <SectionCard title="Ⅱ-4 훈련대상 과업"> <ReadOnlyBlock /> </SectionCard>
      </Tab>
      <Tab value="training">     # Ⅲ [결과·LLM 생성 + 역량모델링 인터뷰→결과]
        <SectionCard title="Ⅲ-1 역량 모델링"> <InlineEditTable LLM /> </SectionCard>
        <SectionCard title="Ⅲ-2 훈련체계도"> <InlineEditTable LLM /> </SectionCard>
        <SectionCard title="Ⅲ-3 연간 훈련계획"> <InlineEditTable LLM /> </SectionCard>
        <SectionCard title="Ⅲ-4 훈련과정 상세"> <InlineEditBlock LLM /> </SectionCard>
      </Tab>
    </ResultTabs>
    <RoadmapLoadingOverlay open={isGenerating} />
  </PageContainer>

PBL 인터뷰 (9 스텝)
  <PageContainer>
    <PageHeader title="AI PBL 인터뷰" />
    <InterviewStepper steps={PBL_STEPS} />
    {step === 'overview'         && <StepPblOverview />}            # Ⅰ [인터뷰]
    {step === 'companyStatus'    && <StepCompanyStatus />}          # Ⅱ-1 가·나 [인터뷰 + 조직도]
    {step === 'trainingEnv'      && <StepTrainingEnv />}            # Ⅱ-2 [인터뷰]
    {step === 'hrdReport'        && <StepPblHrdReportPdf />}        # Ⅱ-3-가 [PDF 첨부]
    {step === 'courseNecessity'  && <StepCourseNecessity />}        # Ⅱ-3-나 [인터뷰]
    {step === 'activities'       && <StepActivities />}             # Ⅲ-1 [인터뷰]
    {step === 'problems'         && <StepProblems />}               # Ⅲ-2 가·나 [인터뷰]
    {step === 'targetWork'       && <StepTargetWork />}             # Ⅲ-3 가·나·다 [인터뷰]
    {step === 'aiLevel'          && <StepAiLevel />}                # Ⅲ-4 가·나 [인터뷰 + AiLevel4Check]
    <StickyFormNav />
  </PageContainer>

PBL 결과 (5탭)
  <PageContainer>
    <PageHeader>
      <VersionSelector<PBLReportRow> />
      <DownloadButtonGroup pdf xlsx hwpx />
    </PageHeader>
    <VersionStatusBadge />
    <RegenerateAccordion />
    <ResultTabs>
      <Tab value="overview">      # Ⅰ
        <SectionCard title="Ⅰ. 훈련과정 개요"> <ReadOnlyTable /> </SectionCard>
      </Tab>
      <Tab value="analysis">      # Ⅱ
        <SectionCard title="Ⅱ-1 기업 현황"> ... </SectionCard>
        <SectionCard title="Ⅱ-2 훈련환경"> ... </SectionCard>
        <SectionCard title="Ⅱ-3 개발 필요성"> <PdfPreviewer + ReadOnlyBox /> </SectionCard>
      </Tab>
      <Tab value="tasks">         # Ⅲ
        <SectionCard title="Ⅲ-1 수행활동" /> ... 4개 ...
      </Tab>
      <Tab value="ops">           # Ⅳ
        <SectionCard title="Ⅳ-1 훈련 목표 LLM" />
        <SectionCard title="Ⅳ-2 AI도구 활용 LLM" />
        <SectionCard title="Ⅳ-3 훈련 실시 LLM" /> 5개 소섹션
        <SectionCard title="Ⅳ-4 평가 계획" />           # 가. 과정평가만 — 나. 결과평가는 미노출
      </Tab>
      <Tab value="outcomes">      # Ⅴ
        <SectionCard title="Ⅴ-1 측정 지표 LLM" />
        <SectionCard title="Ⅴ-2 확산 전략 LLM" />
      </Tab>
    </ResultTabs>
    <RoadmapLoadingOverlay open={isGenerating} />   # PBL에도 동일 UX 적용
  </PageContainer>
```

### 1.3 데이터 플로우

**인터뷰 (자동 저장 플로우):**
```
사용자 입력 → useState (클라이언트 상태)
  → useInterviewAutoSave(3초 debounce)
  → saveRoadmapInterview / savePBLInterview (Server Action, loose Zod)
  → Supabase `interviews` (또는 프로젝트별) 테이블 UPDATE
  → 성공 시 "자동 저장됨" 인디케이터 · 실패 시 toast 오류
```

**인터뷰 최종 제출 플로우:**
```
'제출' 버튼 클릭
  → submitRoadmapInterview / submitPBLInterview (strict Zod — 필수 필드 검증)
  → 성공 시 → 결과 페이지 리다이렉트 + 첫 LLM 생성 트리거
  → 실패 시 스테퍼에 미완료 단계 표시
```

**결과 생성 플로우 (로드맵 예):**
```
결과 페이지 진입 → 기존 버전 없으면 자동 생성 트리거
  → createRoadmap (Server Action)
  → LLM 호출 (src/lib/services/roadmap/generate.ts 또는 유사)
  → DRAFT 버전 INSERT → 리턴
  → 클라이언트 invalidate → 화면 갱신
```

**결과 편집 플로우 (DRAFT 한정):**
```
InlineEditField 편집 → 로컬 낙관적 업데이트
  → editRoadmapManually(versionId, path, value) (Server Action)
  → DRAFT 버전 UPDATE
  → 실패 시 rollback + toast
```

**FINAL 확정 플로우:**
```
'최종 확정' 버튼
  → confirmFinalRoadmap(draftVersionId)
  → 기존 FINAL → ARCHIVED, 이 DRAFT → FINAL (트랜잭션)
  → 편집 모드 비활성
```

**HWPX 다운로드 플로우:**
```
DownloadButtonGroup HWPX 클릭
  → useHwpxDownload.download()
  → exportRoadmapAsHwpxAction / exportPBLAsHwpxAction (Server Action: 세션·역할·버전 검증)
  → fetch POST /api/hwpx/generate (payload JSON, X-HWPX-Secret 헤더)
  → api/hwpx/generate.py: 템플릿 로드 → build_placeholder_map → _replace_in_all_runs → _set_cell_text → 반복 행 채움 → 체크박스 토글
  → base64(HWPX bytes) 반환
  → 클라이언트 base64ToBlob → a.click() 다운로드
```

### 1.4 상태 관리 전략

- **클라이언트 상태:** React `useState` + `useReducer` (기존 유지). React Hook Form 미사용 (네이티브 폼 + Zod).
- **서버 상태:** Server Components + `revalidatePath` 후 클라이언트 fetch. 별도 쿼리 라이브러리(TanStack 등) 도입 안 함.
- **URL 상태:** 결과 탭은 `?tab=overview|requirements|training|...` URL 파라미터 동기화 (Next.js `useSearchParams` + `router.replace(shallow)`).
- **자동 저장 디바운스:** `useInterviewAutoSave` hook 유지 (3초, 성공/실패 상태 노출).
- **낙관적 업데이트:** 결과 DRAFT 편집에서 `useOptimistic`(React 19) 또는 기존 낙관적 패턴.

---

## 2. 기존 코드 대체/삭제/유지 범위

### 2.1 유지 (건드리지 않음)

- `src/components/ui/page-header.tsx` — 4개 화면 공용 유지
- `src/components/ui/EmptyState.tsx` — 유지
- `src/components/ui/Skeleton.tsx` — 유지 (`PageSkeleton`·`SectionSkeleton` 이 래핑)
- `src/components/roadmap/RegenerateAccordion.tsx` — PBL도 이미 재사용 중, 유지
- `src/components/roadmap/RoadmapLoadingOverlay.tsx` — PBL에도 적용할 유일한 생성 오버레이 UX, 유지
- `src/hooks/useHwpxDownload.ts` — 공용 유지
- `src/hooks/useRoadmapDownload.ts`, `src/hooks/usePBLDownload.ts` — 시그니처 일관화만 수행 (`{ isDownloading, downloadPDF, downloadXLSX }` 동일 반환)
- `src/app/(dashboard)/layout.tsx` — 기존 `max-w-7xl` 유지 (외곽), 내부에 `PageContainer max-w-5xl` 중첩
- `.claude/skills/hwpx-docgen/scripts/analyze_template.py` — 도구로만 사용
- `scripts/dev-hwpx-server.py` — 브리지 서버 유지, Python 경로 동기화만

### 2.2 대체 (호출부 마이그레이션 후 원본 제거)

| 기존 | 대체 | 제거 시점 |
|---|---|---|
| `src/components/roadmap/VersionSelector.tsx` | `src/components/common/VersionSelector.tsx` (제네릭) | PR #2 Step 3-H 완료 시 |
| `src/components/pbl/PBLVersionSelector.tsx` | 동일 | PR #2 Step 3-H 완료 시 |
| `src/components/roadmap/RoadmapStatusBadge.tsx` | `src/components/common/VersionStatusBadge.tsx` | PR #2 Step 3-H 완료 시 |
| `src/components/pbl/PBLStatusBadge.tsx` | 동일 | PR #2 Step 3-H 완료 시 |
| `src/components/roadmap/DownloadButton.tsx` (단일 버튼) | `src/components/result/DownloadButtonGroup.tsx` (PDF/XLSX/HWPX 통합) | PR #2 Step 3-H 완료 시 |

### 2.3 전면 재작성 (같은 파일 경로 유지, 내부 전면 교체)

- `.../interview/_components/RoadmapInterviewClient.tsx` — 7스텝 재편, 스테퍼 라벨 변경, 공통 `FormSection`/`FormTable`/`LargeTextBox`/`FormCheckbox` 사용
- `.../interview/_components/PBLInterviewClient.tsx` — 9스텝 재편, lazy import 유지
- `.../interview/_components/roadmap/Step*.tsx` — 7개 스텝 파일 전면 교체
- `.../interview/_components/pbl/StepPBL*.tsx` — 9개 스텝 파일 전면 교체
- `.../roadmap/_components/ConsultantRoadmapClient.tsx` — 탭 3개 구조로 전환 (기존 4탭에서 컨셉 재편)
- `.../pbl/_components/ConsultantPBLClient.tsx` — 세로 스크롤 → 탭 5개
- `src/lib/schemas/interview-roadmap.ts` — Ⅰ·Ⅱ 절 구조 재정렬, 라벨별 필드 분류
- `src/lib/schemas/interview-pbl.ts` — Ⅰ~Ⅲ 절 구조 재정렬, Ⅳ-4-나는 스키마 제외
- `src/lib/services/roadmap/*` (LLM 프롬프트 부분) — Ⅲ장 4절 생성 로직이 기준 문서와 1:1 일치
- `src/lib/services/pbl/*` (LLM 프롬프트 부분) — Ⅳ·Ⅴ장 생성 로직이 기준 문서와 1:1 일치
- `api/hwpx/generate.py` + `_placeholders_roadmap.py` + `_placeholders_pbl.py` — PR #3에서 전면 재작성
- `templates/hwpx/roadmap.hwpx`, `templates/hwpx/pbl.hwpx` — PR #3 Step 1에서 정본 교체

### 2.4 삭제 (기능 제거)

- 기존 로드맵 탭 라벨 `competencies / structure / plan / specs` (Ⅲ장 내부 4개 소섹션) — PR #2에서 Ⅰ/Ⅱ/Ⅲ 3탭으로 재편하면서 Ⅲ탭 내부 섹션 카드로 병합
- 결과 페이지에 `[결과물 표지]` / `[고정 참고자료]` / `[고정 양식·결과 화면 제외]` 라벨이 노출되던 부분 전부 삭제 (있을 경우). PBL Ⅳ-4-나 결과평가 계획 UI 렌더 제거

### 2.5 신설 (새 파일)

**공통 컴포넌트 (10개):**
- `src/components/layout/PageContainer.tsx`
- `src/components/layout/PageSkeleton.tsx`
- `src/components/layout/SectionSkeleton.tsx`
- `src/components/common/VersionStatusBadge.tsx`
- `src/components/common/VersionSelector.tsx` (제네릭 `<T>`)
- `src/components/result/DownloadButtonGroup.tsx`
- `src/components/result/ResultTabs.tsx`
- `src/components/result/SectionCard.tsx`
- `src/components/result/InlineEditField.tsx`
- `src/components/forms/StickyFormNav.tsx`

**폼 공용 (6개):**
- `src/components/forms/FormSection.tsx`
- `src/components/forms/ExampleAccordion.tsx`
- `src/components/forms/LargeTextBox.tsx`
- `src/components/forms/FormCheckbox.tsx`
- `src/components/forms/FormTable.tsx`
- `src/components/forms/PdfUploadField.tsx` (HRD이음 PDF 첨부 전용)

**트랙 전용 위젯 (2개, PBL):**
- `src/components/charts/OrganizationTree.tsx`
- `src/components/charts/AiLevel4Check.tsx`

**스크립트·문서 (5개):**
- `scripts/verify-hwpx-placeholders.ts` — CI용 `{{...}}` grep 검증 스크립트
- `scripts/snapshot-4-screens.ts` — Playwright screenshot grid 생성
- `docs/reports/2026-04-24-form-parity-report.md` — 대조 리포트 (PR #4)
- `docs/references/hwpx-structure-roadmap.md` — analyze_template.py 결과 재생성
- `docs/references/hwpx-structure-pbl.md` — 동일

---

## 3. 4개 화면 UI/스타일 통일 15개 체크리스트

> 프롬프트 L56-89의 "⚠️ 4개 화면 UI/스타일 통일 원칙" 섹션 전체를 Step 체크리스트로 변환. 각 항목의 공통 컴포넌트 추출 계획·Tailwind 토큰 설계·마이그레이션 순서를 명시. 트랙별 불가피 차이가 있는 항목은 사유 기재.

### 체크리스트

- [ ] **1. 페이지 컨테이너** — `PageContainer` 단일 사용. `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8`. 하드코딩 값 제거. 4개 화면 모두 래핑.
- [ ] **2. 페이지 헤더** — `PageHeader` 단일 사용. 제목 폰트(`text-2xl font-bold`) · 뒤로가기 위치 · 액션 슬롯 동일.
- [ ] **3. 다운로드 버튼** — `DownloadButtonGroup` 단일 사용. PDF/XLSX/HWPX 순서, variant=`outline`, size=`sm`, icon 고정(`FileText`·`FileSpreadsheet`·`FileType`), 로딩 시 `Loader2` spinner, disabled 시 opacity-50.
- [ ] **4. 다운로드 동작 방식** — `useRoadmapDownload` / `usePBLDownload` / `useHwpxDownload` 시그니처 일관: `{ isDownloading: 'PDF'|'XLSX'|'HWPX'|null, downloadPDF, downloadXLSX, downloadHWPX, error: string|null }`. 에러 토스트 문구 통일. 파일명 규칙: `{trackKo}_{companyName}_{YYYYMMDD}_{versionNumber}.{ext}` (예: `로드맵_ACME_20260501_v3.hwpx`).
- [ ] **5. 상태 배지** — `VersionStatusBadge` 단일 사용. DRAFT=`slate`, FINAL=`green`, ARCHIVED=`gray`. 라벨: `"초안 v{n}"` / `"최종 v{n}"` / `"이전 v{n}"`.
- [ ] **6. 버전 셀렉터** — `VersionSelector<T>` 제네릭. props: `versions`, `selectedId`, `onSelect`, `getLabel`, `getStatus`. 공유 토글(`onShare`) 배치 동일.
- [ ] **7. 재생성 아코디언** — `RegenerateAccordion` 공통 재사용. prompt 입력 textarea(`min-h-[120px]`) + `'재생성'` 버튼 우측 정렬.
- [ ] **8. 섹션 카드 / 탭 UI** — `ResultTabs` + `SectionCard`. 카드 spacing `p-6`, border `border-border`, radius `rounded-lg`, 타이포 `text-lg font-semibold` (제목). sticky `top-16` 탭 바.
- [ ] **9. 편집 인터랙션** — `InlineEditField`. 트리거=호버 시 연필 아이콘 + 클릭 시 edit 모드. 저장 인디케이터: `저장 중… (회색)` → `자동 저장됨 (녹색, 3초 후 fade)`. 낙관적 업데이트 + 실패 시 롤백 + toast.
- [ ] **10. 빈 상태** — `EmptyState`. 아이콘 `Inbox` size-12 stroke-1.5 muted, 문구 `text-base font-medium` + `text-sm text-muted-foreground`, CTA `Button variant="outline"`.
- [ ] **11. 생성 오버레이** — `RoadmapLoadingOverlay` 단일 UX 로드맵/PBL 공통 사용. 진행 단계·팁 회전·소요 시간 표시·취소 버튼 포함. 타이밍은 트랙별 props (`estimatedSeconds=130` 로드맵 / `estimatedSeconds=30` PBL).
- [ ] **12. 로딩 스켈레톤** — `PageSkeleton`·`SectionSkeleton`. 모든 Suspense 경계에서 사용. 커스텀 스켈레톤 금지.
- [ ] **13. 스텝퍼** — `InterviewStepper` 단일. props: `steps: Array<{ id, shortName, required }>`, `currentIdx`, `onNavigate`. 필수 표시 `*`, 완료 체크 아이콘, 클릭 네비 (완료한 스텝만).
- [ ] **14. 하단 고정 네비** — `StickyFormNav`. 이전(`ChevronLeft`) / 다음(`ChevronRight`) / 저장(`Save`) 버튼. 모바일에서도 sticky `bottom-0` 유지. disabled 스타일 opacity-40.
- [ ] **15. 반응형 브레이크포인트** — `sm:640 md:768 lg:1024 xl:1280 2xl:1536` 기본. 탭 구조는 `lg` 미만에서 스크롤 가능한 탭 바 (`overflow-x-auto`). 표는 `md` 미만에서 `overflow-x-auto`. 인터뷰 스테퍼는 `md` 미만에서 진행 바 UI.

### Tailwind 토큰 설계

`src/app/globals.css` (Tailwind 4 CSS-first):

```css
@theme inline {
  --page-max-w: 64rem;              /* max-w-5xl — 4개 화면 공통 */
  --container-pad-x: 1rem;          /* sm: 1.5rem / lg: 2rem */
  --section-gap: 2rem;              /* space-y-8 */
  --card-pad: 1.5rem;               /* p-6 */
  --sticky-top: 4rem;               /* top-16 — 상단 nav 아래 */
}
```

### 마이그레이션 순서

1. **PR #1**: 공통 컴포넌트·토큰만 신설 (기존 동작 영향 X)
2. **PR #2 Step 3-H**: 4개 화면 호출부를 새 컴포넌트로 일괄 전환 + 기존 deprecated 5개 파일 삭제

### 통일 범위 예외 (허용 불일치)

- **섹션 수·항목명·필드 수** — 양식이 다름 (로드맵 3장·PBL 5장)
- **조직도 트리** (`OrganizationTree.tsx`) — PBL Ⅱ-1-나 전용
- **AI역량 4등급 체크박스** (`AiLevel4Check.tsx`) — PBL Ⅲ-4 전용
- **생성 시간 오버레이 estimatedSeconds** — 로드맵 130s / PBL 30s (실제 LLM 소요 차이)

---

## 4. LLM 프롬프트 변경 범위

### 4.1 로드맵 LLM 프롬프트

- **위치:** `src/lib/services/roadmap/*` (프롬프트 모듈 — 탐색 시 경로 확인 후 구체화)
- **재설계 대상 섹션 (기준 문서 11개 LLM 생성 라벨 중 로드맵 쪽 5개):**
  - Ⅰ-3 AI훈련로드맵 수립 주요내용 (요약 부분만 — 체크박스·자유서술은 인터뷰 입력)
  - Ⅲ-1 역량 모델링 (지식·기술·태도 배열 확장)
  - Ⅲ-2 훈련체계도 (표 전체 생성)
  - Ⅲ-3 연간 훈련계획 (훈련과정 목록 + 활용방안 박스)
  - Ⅲ-4 훈련과정 상세 (과정당 1블록 × 3개 + 훈련 내용 표)

### 4.2 PBL LLM 프롬프트

- **위치:** `src/lib/services/pbl/*`
- **재설계 대상 섹션 (PBL 쪽 6개):**
  - Ⅳ-1 훈련 목표
  - Ⅳ-2 AI도구 활용 계획
  - Ⅳ-3 훈련 실시 계획 (가~마 5개 소섹션)
  - Ⅳ-4-가 과정평가 계획 (Ⅳ-4-나 결과평가는 LLM 아닌 고정 양식)
  - Ⅴ-1 성과분석 측정 지표
  - Ⅴ-2 성과 확산 전략

### 4.3 재설계 원칙

- 입력: 인터뷰 수집 필드 + 기존 확정된 결과 필드(Ⅲ 이전 탭)
- 출력: strict JSON (Zod 스키마와 1:1) — `prompt-engineer` 서브에이전트에 토큰 효율화·JSON 안정성 위임
- 각 프롬프트 모듈에 기준 문서 해당 섹션 원문을 few-shot 예시로 포함
- 재생성 프롬프트(`RegenerateAccordion`에서 받은 사용자 수정 요청)는 system prompt 뒤 user 턴에 `보정 요청: {input}` 형태로 삽입

### 4.4 재설계 산출물

- 각 LLM 모듈 단위 테스트 (Vitest + mock LLM 응답) — strict Zod 파싱 성공 확인
- LLM 응답 스냅샷 fixture (`src/lib/services/{roadmap,pbl}/__fixtures__/`)

---

## 5. HWPX 템플릿 재구축 9단계

> 프롬프트 L90-145 의 "⚠️ HWPX 템플릿 재구축" 섹션을 독립 Step으로 분리. PR #3 의 전체 작업 목록.

### Step 1. 원본 교체 확인
- `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx` · `docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx` 파일 해시(SHA-256)·수정 일자 기록
- `docs/references/archive/*.pre-2026-04-24.hwpx` 백업본 존재 확인
- 결과: `docs/reports/2026-04-24-form-parity-report.md` 상단 "원본 교체 확인" 섹션에 기재

### Step 2. 템플릿 복사
```bash
mkdir -p templates/hwpx/archive
mv templates/hwpx/roadmap.hwpx templates/hwpx/archive/roadmap.pre-2026-04-24.hwpx
mv templates/hwpx/pbl.hwpx     templates/hwpx/archive/pbl.pre-2026-04-24.hwpx
cp "docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx" templates/hwpx/roadmap.hwpx
cp "docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx" templates/hwpx/pbl.hwpx
```

### Step 3. 구조 재분석
- `python .claude/skills/hwpx-docgen/scripts/analyze_template.py templates/hwpx/roadmap.hwpx --output docs/references/hwpx-structure-roadmap.md`
- `python .claude/skills/hwpx-docgen/scripts/analyze_template.py templates/hwpx/pbl.hwpx     --output docs/references/hwpx-structure-pbl.md`
- 결과 문서에 **표 인덱스 / 셀 좌표 (행·열) / paragraph 번호 / 서식 정보** 전수 기록

### Step 4. 플레이스홀더 매핑 표 확장 (본 계획서 §6 확장)
- `docs/references/hwpx-structure-*.md` 와 `docs/references/2026-04-23-current-fields-inventory.md` 를 교차 대조
- 본 계획서 §6 의 "템플릿 표 인덱스 / 셀 좌표" 컬럼을 **분석 결과로 채움**
- 누락 0건 cross-check — 47개 섹션 × 요소 단위 모두 포함 확인

### Step 5. 플레이스홀더 삽입
- python-hwpx 스크립트 (`scripts/insert_placeholders.py` 신설) 로 매핑 표의 모든 `{{...}}` 를 템플릿에 삽입
- **runs 분리 방지**: `hwpx-docgen` 스킬의 `_replace_in_all_runs` 패턴 준수. 서식 덩어리 단위로 쓸 것
- 서식 경계에서 쪼개진 플레이스홀더 감지 → fail-fast

### Step 6. 치환 로직 갱신
- `api/hwpx/generate.py` (1411줄) 주요 함수 전면 갱신:
  - `_generate_roadmap()`, `_generate_pbl()`
  - `_fill_table_*()` (performance_activities / task_workflow / competencies / learning_group / course_spec 등)
  - `_replace_in_all_runs`, `_set_cell_text`
- `api/hwpx/_placeholders_roadmap.py` · `_placeholders_pbl.py` — `build_placeholder_map()` 재작성
- `src/lib/services/export/hwpx/hwpx-payload-{roadmap,pbl}.ts` — RoadmapVersion/PBLReportRow → Python payload 변환 함수 갱신
- 새 필드·변경된 표 인덱스·셀 좌표 전부 반영

### Step 7. 체크박스·반복 행·조건부 박스 규칙 재정의
- **체크박스** (심볼 치환 `□ → ☑`):
  - 로드맵 Ⅰ-3 AI 역량 수준 (초급/중급/고급 택1): `{{level_{tier}_check}}` → `☑` 또는 `☐`
  - PBL Ⅲ-4-가 현재 AI역량 (AI기초/탐구/활용/선도 택1): `{{pbl_current_ai_level_{tier}_check}}`
  - PBL Ⅲ-4-나 향후 AI역량 (동일 4등급): `{{pbl_expected_ai_level_{tier}_check}}`
- **반복 행** (배열 길이만큼 행 채움, 초과 행은 truncate — 행 복제 금지):
  - 로드맵 Ⅰ-2 수행일지 (최대 3차 × 2행)
  - 로드맵 Ⅱ-3 과업·워크플로우 분석표 (무제한, 5행 초과 시 truncate + 경고)
  - 로드맵 Ⅲ-1 역량 모델링 (4행 기본)
  - 로드맵 Ⅲ-2 훈련체계도 (무제한)
  - 로드맵 Ⅲ-3 훈련과정 목록 (3행 기본)
  - 로드맵 Ⅲ-4 훈련과정 명세서 (블록 3개 반복)
  - PBL Ⅱ-1-나 조직도 (트리 노드 → 표 행 flatten)
  - PBL Ⅲ-2-가 문제 도출 (다수)
  - PBL Ⅲ-2-나 문제 우선순위 (다수)
  - PBL Ⅲ-3-다 훈련대상 업무 세부내용 (다수)
  - PBL Ⅳ-3-다 훈련 교과목 프로파일 (교과목 수만큼)
  - PBL Ⅴ-1 측정 지표 (다수)
- **조건부 박스** (XOR):
  - 로드맵 Ⅲ-1: NCS 활용 / 미활용 박스 — `{{ncs_methodology}}` 활성 ↔ `{{ncs_derivation_method}}` 활성 (다른 쪽은 "해당 없음" fallback)
  - 로드맵 Ⅱ-1: HRD이음 PDF 첨부 / 미첨부 — 첨부 시 placeholder 비움(PDF가 첨부 페이지로 대체) / 미첨부 시 "별도 작성 불요 (HRD이음 보고서 미첨부)" fallback
  - PBL Ⅱ-3-가: 동일 HRD이음 PDF 로직

### Step 8. 샘플 fixture 출력 검증
- **Fixture 작성:** 모든 필드 채운 로드맵·PBL 샘플 JSON (빈 값·최대 길이·특수문자·긴 한국어 4조합) → `api/hwpx/__fixtures__/`
- **HWPX 생성:** `npm run dev:hwpx` → fixture POST → HWPX 다운로드
- **한글 오피스 실물 확인:**
  - ① 서식(폰트·줄간격·들여쓰기) 유지 — 사용자 수정본 그대로
  - ② 표 병합 구조 양식 PDF와 시각 동일
  - ③ 체크박스·반복 행·조건부 박스 의도대로 토글
- **grep 검증:** `scripts/verify-hwpx-placeholders.ts` 실행 — `{{...}}` 0건 assertion (unzip HWPX → grep section0.xml)
- **PDF 변환 비교:** HWPX → PDF (한글 오피스 또는 LibreOffice) → 양식 PDF와 나란히 (Preview.app split view) → 픽셀 수준 근접성 확인

### Step 9. 회귀 테스트
- **Python pytest** (`api/hwpx/test_placeholders_roadmap.py` · `test_placeholders_pbl.py`):
  - 모든 필드 채움 → 생성 성공 → 파일 크기 > 50KB
  - 빈 필드 → 생성 성공 (기본값 fallback)
  - 최대 길이 (10000자 한글) → 생성 성공 + 서식 유지
  - 특수문자 (`<>&"'`) → XML escape 정상
- **Vitest** (`src/lib/services/export/hwpx/*.test.ts`):
  - payload 변환 정합성
  - 에러 케이스 (missing required field)
- **Playwright E2E** (`tests/e2e/hwpx-download.spec.ts`):
  - 로드맵 인터뷰 → 결과 생성 → HWPX 다운로드 → 파일 크기 검증
  - PBL 동일 플로우
- **브리지 서버 + Preview 양쪽 모두 검증** — CI 상시 실행

### Step 10 (추가). 플레이스홀더 명명 규칙

프롬프트 L130-137 명명 규칙 그대로 준수:

- **snake_case**, 양식 섹션 계층을 접두어로:
  - 로드맵: `{{roadmap_{section}_{element}}}` (예: `{{roadmap_overview_establishment_necessity}}`, `{{roadmap_cover_company_name}}`)
  - PBL: `{{pbl_{section}_{element}}}` (예: `{{pbl_course_overview_company_name}}`, `{{pbl_ope_plan_training_goal}}`)
- **반복 행·블록**: 인덱스 포함 — `{{competency_row_{i}_name}}`, `{{course_spec_{j}_main_content}}` (i, j는 0-base)
- **체크박스**: 상태 기반 심볼 치환 — `{{ai_level_beginner_check}}` → `☑` 또는 `☐`

### HWPX 1:1 동일성 기준 (DoD)

- 섹션 순서 · 번호 체계 (Ⅰ → 1 → 가 → □) 완전 일치
- 표 셀 병합(rowspan/colspan) 양식 PDF와 시각 동일
- 서명 표 · 표지 · 기업체 확인 박스 서식 유지
- 서식 수정본의 폰트·줄간격이 치환 후에도 유지
- 치환되지 않은 `{{...}}` 문자열 **0건**

---

## 6. 플레이스홀더 전수 매핑 표

> 기준 문서 `docs/references/2026-04-23-current-fields-inventory.md` 의 47개 라벨 섹션을 전부 포함한 완전한 매핑 표. **누락 0건** 원칙. "템플릿 표 인덱스 / 셀 좌표" 컬럼은 PR #3 Step 3 (analyze_template.py 실행) 후 확정. 이 시점(PR #3)에는 본 표가 최종 cross-check 기준.
>
> **컬럼 정의:**
> - **양식** — R(로드맵/양식1) 또는 P(PBL/양식2)
> - **섹션** — 번호 체계 (Ⅰ → 1 → 가 → □)
> - **라벨** — [인터뷰 입력] / [PDF 첨부] / [인터뷰→결과] / [결과·LLM] / [결과물 표지] / [고정 참고자료] / [고정 양식·결과 제외]
> - **양식 요소** — 표/박스/체크박스/블록/PDF/조직도/서명표/이미지 + 개수
> - **표 인덱스 / 셀 좌표** — PR #3 Step 3 분석 후 확정 ([TBD] 로 표기)
> - **플레이스홀더 명** — `{{...}}` snake_case
> - **데이터 출처** — Zod 스키마 경로 또는 LLM 모듈
> - **치환 전략** — single / cell_fill / checkbox_toggle / repeat_rows / conditional_box / pdf_attach / static

### 6.1 양식 1. AI훈련로드맵 (로드맵)

| # | 양식 | 섹션 | 라벨 | 양식 요소 | 표 인덱스 / 셀 좌표 | 플레이스홀더 명 | 데이터 출처 | 치환 전략 |
|---|---|---|---|---|---|---|---|---|
| R-01 | R | [서식] 표지 | 결과물 표지 | 표지 요소 4개 (제목·기업명·발행일자) + 서명 표(2행×3열) | [TBD] | `{{roadmap_cover_company_name}}`, `{{roadmap_cover_report_date}}`, `{{roadmap_cover_pm_affiliation}}`, `{{roadmap_cover_pm_name}}`, `{{roadmap_cover_internal_expert_affiliation}}`, `{{roadmap_cover_internal_expert_name}}` | 프로젝트 메타 (projects 테이블) | single + cell_fill |
| R-02 | R | Ⅰ 장 도입 안내 | 고정 참고자료 | 양식 원문 문장 1개 | [TBD] | *(치환 없음)* | — | static |
| R-03 | R | Ⅰ-1 수립 필요성 | 인터뷰 입력 | 박스 1개 (자유 서술, 5줄 내외) | [TBD] | `{{roadmap_overview_establishment_necessity}}` | `RoadmapInterview.overview.establishmentNecessity` | single |
| R-04 | R | Ⅰ-2 주요 활동 | 인터뷰 입력 | 표 1개 (반복행 3차×2행, 6열, 병합 복잡) | [TBD] | `{{roadmap_overview_performance_{i}_round}}`, `{{..._date}}`, `{{..._content}}`, `{{..._method}}`, `{{..._pm_name}}`, `{{..._expert_name}}` (i=0..2) | `RoadmapInterview.overview.performanceActivities[]` | repeat_rows (최대 3차, 초과 truncate) |
| R-05 | R | Ⅰ-3 주요 결과 | 인터뷰→결과 | 표 1개 3행 (체크박스 택1 + 자유서술 + LLM 요약) | [TBD] | `{{roadmap_overview_ai_level_beginner_check}}`, `{{..._intermediate_check}}`, `{{..._advanced_check}}`, `{{roadmap_overview_selected_task}}`, `{{roadmap_overview_main_summary}}` | 체크박스·과업=인터뷰, 요약=LLM | checkbox_toggle + single + LLM |
| R-06 | R | Ⅰ-3 ◆ AI역량 수준별 훈련내용 예시 | 고정 참고자료 | 표 1개 (고정 내용 3행×3열) | [TBD] | *(치환 없음)* | — | static |
| R-07 | R | Ⅱ 장 도입 안내 | 고정 참고자료 | 양식 원문 문장 1개 | [TBD] | *(치환 없음)* | — | static |
| R-08 | R | Ⅱ-1 기업 AI 역량 수준 진단 | PDF 첨부 | HRD이음 PDF 첨부 | [TBD] | `{{roadmap_requirements_hrd_report_attachment}}` | 업로드 PDF base64 (혹은 fallback) | pdf_attach + conditional (미첨부 시 "별도 작성 불요" fallback) |
| R-09 | R | Ⅱ-2 기업 요구분석 | 인터뷰 입력 | 표 1개 4행×3열 | [TBD] | `{{roadmap_requirements_company_status}}`, `{{..._main_problem}}`, `{{..._driving_will}}`, `{{..._expected_outcomes}}` | `RoadmapInterview.requirements.companyRequirements.*` | cell_fill |
| R-10 | R | Ⅱ-3 □ 과업·워크플로우 분석표 | 인터뷰 입력 | 표 1개 무제한행×6열 (직무·과업·As-Is·문제점·데이터·점수) | [TBD] | `{{roadmap_requirements_task_analysis_{i}_domain}}`, `{{..._task}}`, `{{..._as_is}}`, `{{..._problem}}`, `{{..._data_timing}}`, `{{..._ai_score}}` (i=0..N) | `RoadmapInterview.requirements.taskAnalysis[]` | repeat_rows |
| R-11 | R | Ⅱ-3 □ 분석내용 + 추가 첨부 | 인터뷰 입력 | 박스 1개 + PDF 첨부(선택) | [TBD] | `{{roadmap_requirements_task_analysis_note}}`, `{{roadmap_requirements_task_analysis_attachment}}` | `RoadmapInterview.requirements.taskAnalysisNote` + 첨부 PDF | single + pdf_attach (조건부) |
| R-12 | R | Ⅱ-4 훈련대상 과업 선정 | 인터뷰 입력 | 블록 1개 (훈련대상 과업·선정사유·기대효과 As-Is/To-Be) | [TBD] | `{{roadmap_requirements_target_task_name}}`, `{{..._selection_reason}}`, `{{..._expected_as_is}}`, `{{..._expected_to_be}}` | `RoadmapInterview.requirements.targetTask.*` | cell_fill (블록) |
| R-13 | R | Ⅲ 장 도입 안내 | 고정 참고자료 | 양식 원문 문장 1개 | [TBD] | *(치환 없음)* | — | static |
| R-14 | R | Ⅲ-1 역량 모델링 표 | 인터뷰→결과 | 표 1개 반복행×5열 (역량명·정의·지식·기술·태도) | [TBD] | `{{roadmap_training_competency_{i}_name}}`, `{{..._definition}}`, `{{..._knowledge}}`, `{{..._skill}}`, `{{..._attitude}}` (i=0..N) | 인터뷰 초안 + LLM 확장 | repeat_rows + LLM |
| R-15 | R | Ⅲ-1 NCS 박스 (조건부) | 인터뷰→결과 | 박스 2개 (NCS 활용 / 미활용 XOR) | [TBD] | `{{roadmap_training_ncs_methodology}}`, `{{roadmap_training_ncs_derivation_method}}` | `RoadmapInterview.training.ncsUsed` 플래그 + 박스 내용 | conditional_box (XOR) |
| R-16 | R | Ⅲ-1 ◆ NCS 능력단위요소 예시 | 고정 참고자료 | 표 1개 (고정 예시) | [TBD] | *(치환 없음)* | — | static |
| R-17 | R | Ⅲ-2 □ 훈련체계도 | 결과·LLM | 표 1개 반복행×6열 (역량·훈련수준·내용·대상·방법·목표) | [TBD] | `{{roadmap_training_structure_{i}_competency}}`, `{{..._level}}`, `{{..._content}}`, `{{..._target}}`, `{{..._method}}`, `{{..._goal}}` (i=0..N) | LLM 생성 | repeat_rows + LLM |
| R-18 | R | Ⅲ-2 □ 훈련체계 수립 방법 | 결과·LLM | 박스 1개 | [TBD] | `{{roadmap_training_structure_method}}` | LLM | single + LLM |
| R-19 | R | Ⅲ-3 □ 훈련과정 목록 | 결과·LLM | 표 1개 반복행×5열 | [TBD] | `{{roadmap_training_plan_{i}_competency}}`, `{{..._course_name}}`, `{{..._training_form}}`, `{{..._hours}}`, `{{..._note}}` (i=0..N) | LLM | repeat_rows + LLM |
| R-20 | R | Ⅲ-3 □ 활용방안 | 결과·LLM | 박스 1개 | [TBD] | `{{roadmap_training_plan_utilization}}` | LLM | single + LLM |
| R-21 | R | Ⅲ-4 □ 훈련과정 명세서 | 결과·LLM | 블록 3개 (과정당 1블록) + 훈련 내용 표 1개 × 3 | [TBD] | `{{roadmap_training_spec_{j}_course_name}}`, `{{..._form}}`, `{{..._recommended_biz}}`, `{{..._goal}}`, `{{..._main_content}}`, `{{..._target}}`, `{{..._detail_{k}_subject}}`, `{{..._detail_{k}_content}}`, `{{..._detail_{k}_hours}}` (j=0..2, k=0..N) | LLM | repeat_rows (중첩) + LLM |
| R-22 | R | [별첨] AI훈련로드맵 컨설팅 수행일지 | 고정 참고자료 | 표 1개 (고정 서식, 기업명·차수만 채움) | [TBD] | `{{roadmap_appendix_company_name}}`, `{{roadmap_appendix_insurance_no}}` *(선택)* | projects 메타 | single (최소) |
| R-23 | R | [참고자료] 기업 AI 역량 수준 진단모형 | 고정 참고자료 | 표·이미지 다수 (진단영역·설문·결과 예시) — 전부 고정 | [TBD] | *(치환 없음)* | — | static |

### 6.2 양식 2. AI PBL (PBL)

| # | 양식 | 섹션 | 라벨 | 양식 요소 | 표 인덱스 / 셀 좌표 | 플레이스홀더 명 | 데이터 출처 | 치환 전략 |
|---|---|---|---|---|---|---|---|---|
| P-01 | P | [서식] 과정개발보고서 표지 | 결과물 표지 | 표지 요소 5개 + 서명 표(4행×3열) + 기업체 확인 박스 | [TBD] | `{{pbl_cover_subtitle}}`, `{{pbl_cover_course_name}}`, `{{pbl_cover_company_name}}`, `{{pbl_cover_report_date}}`, `{{pbl_cover_pm_affiliation}}`, `{{pbl_cover_pm_name}}`, `{{pbl_cover_external_expert_affiliation}}`, `{{pbl_cover_external_expert_name}}`, `{{pbl_cover_internal_expert_affiliation}}`, `{{pbl_cover_internal_expert_name}}`, `{{pbl_cover_doctor_affiliation}}`, `{{pbl_cover_doctor_name}}`, `{{pbl_cover_confirmation_stamp}}` | 프로젝트 메타 | single + cell_fill |
| P-02 | P | Ⅰ 훈련과정 개요 | 인터뷰 입력 | 표 1개 다행 (기업명·훈련과정명·NCS·시간·대상 등) | [TBD] | `{{pbl_overview_company_name}}`, `{{pbl_overview_course_name}}`, `{{pbl_overview_ncs_code}}`, `{{pbl_overview_training_hours}}`, `{{pbl_overview_training_target}}`, `{{pbl_overview_training_form}}`, `{{pbl_overview_training_period}}`, `{{pbl_overview_business_issues}}` | `PBLInterview.overview.*` | cell_fill |
| P-03 | P | Ⅱ-1 가. 기업 경영 이슈 | 인터뷰 입력 | 박스 1개 | [TBD] | `{{pbl_analysis_company_issues}}` | `PBLInterview.analysis.companyIssues` | single |
| P-04 | P | Ⅱ-1 나. 조직 및 주요 업무 | 인터뷰 입력 | 조직도 1개 (트리) + 표 (주요 업무) | [TBD] | `{{pbl_analysis_org_tree_json}}` (serialized tree), `{{pbl_analysis_main_work_{i}_dept}}`, `{{..._role}}`, `{{..._description}}` (i=0..N) | `PBLInterview.analysis.organization.*` | static (JSON) + repeat_rows |
| P-05 | P | Ⅱ-2 기업 훈련환경 분석 | 인터뷰 입력 | 표 1개 다행 + 박스 | [TBD] | `{{pbl_analysis_training_env_*}}` (다수) | `PBLInterview.analysis.trainingEnv.*` | cell_fill |
| P-06 | P | Ⅱ-3 가. 기업HRD이음컨설팅 결과 | PDF 첨부 | HRD이음 PDF 첨부 (전산 자동 표출) | [TBD] | `{{pbl_analysis_hrd_report_attachment}}` | 업로드 PDF | pdf_attach + conditional |
| P-07 | P | Ⅱ-3 나. AI훈련과정 개발 필요성 | 인터뷰 입력 | 박스 1개 | [TBD] | `{{pbl_analysis_course_necessity}}` | `PBLInterview.analysis.courseNecessity` | single |
| P-08 | P | Ⅲ-1 훈련과제 도출 수행활동 | 인터뷰 입력 | 표 1개 (차수별 수행일지 유사) | [TBD] | `{{pbl_tasks_activity_{i}_round}}`, `{{..._date}}`, `{{..._content}}`, `{{..._method}}`, `{{..._participants}}` (i=0..N) | `PBLInterview.tasks.activities[]` | repeat_rows |
| P-09 | P | Ⅲ-2 가. 문제 도출 | 인터뷰 입력 | 표 1개 다행 | [TBD] | `{{pbl_tasks_problem_{i}_title}}`, `{{..._description}}`, `{{..._impact}}` (i=0..N) | `PBLInterview.tasks.problems[]` | repeat_rows |
| P-10 | P | Ⅲ-2 나. 문제 우선순위 결정 | 인터뷰 입력 | 표 1개 다행 + 박스 | [TBD] | `{{pbl_tasks_priority_{i}_problem}}`, `{{..._score}}`, `{{..._rank}}`, `{{pbl_tasks_priority_method}}` | `PBLInterview.tasks.priority.*` | repeat_rows + single |
| P-11 | P | Ⅲ-3 가. 훈련대상 업무 선정 | 인터뷰 입력 | 표 1개 | [TBD] | `{{pbl_tasks_target_selection_name}}`, `{{..._code}}`, `{{..._scope}}` | `PBLInterview.tasks.target.*` | cell_fill |
| P-12 | P | Ⅲ-3 나. AI기반 문제해결 필요성 | 인터뷰 입력 | 박스 1개 | [TBD] | `{{pbl_tasks_target_necessity}}` | `PBLInterview.tasks.target.necessity` | single |
| P-13 | P | Ⅲ-3 다. 훈련대상 업무 세부내용 | 인터뷰 입력 | 표 1개 다행 | [TBD] | `{{pbl_tasks_target_detail_{i}_title}}`, `{{..._description}}` (i=0..N) | `PBLInterview.tasks.target.details[]` | repeat_rows |
| P-14 | P | Ⅲ-4 가. 현재 기업의 AI역량 수준 | 인터뷰 입력 | 체크박스 4등급 택1 (AI기초/탐구/활용/선도) | [TBD] | `{{pbl_tasks_current_ai_level_basic_check}}`, `{{..._explorer_check}}`, `{{..._user_check}}`, `{{..._leader_check}}`, `{{pbl_tasks_current_ai_level_note}}` | `PBLInterview.tasks.currentAiLevel` | checkbox_toggle + single |
| P-15 | P | Ⅲ-4 나. 훈련 이후 AI역량 수준 향상도 (예상) | 인터뷰 입력 | 체크박스 4등급 택1 + 박스 | [TBD] | `{{pbl_tasks_expected_ai_level_basic_check}}`, `{{..._explorer_check}}`, `{{..._user_check}}`, `{{..._leader_check}}`, `{{pbl_tasks_expected_ai_level_note}}` | `PBLInterview.tasks.expectedAiLevel` | checkbox_toggle + single |
| P-16 | P | Ⅳ-1 훈련 목표 | 결과·LLM | 표 1개 다행 | [TBD] | `{{pbl_ops_goal_{i}_category}}`, `{{..._description}}` (i=0..N) | LLM | repeat_rows + LLM |
| P-17 | P | Ⅳ-2 AI도구 활용 계획 | 결과·LLM | 표 1개 다행 | [TBD] | `{{pbl_ops_tools_{i}_name}}`, `{{..._purpose}}`, `{{..._usage_scenario}}` (i=0..N) | LLM | repeat_rows + LLM |
| P-18 | P | Ⅳ-3 가. 훈련과정 개요 | 결과·LLM | 박스 또는 표 | [TBD] | `{{pbl_ops_course_overview}}` | LLM | single + LLM |
| P-19 | P | Ⅳ-3 나. 학습그룹 구성 | 결과·LLM | 표 1개 다행 (훈련강사 + 훈련생 혼합) | [TBD] | `{{pbl_ops_group_{i}_role}}`, `{{..._count}}`, `{{..._note}}` (i=0..N) | LLM | repeat_rows + LLM |
| P-20 | P | Ⅳ-3 다. 훈련 교과목 프로파일 | 결과·LLM | 표 1개 다행 + 교과목별 상세 블록 | [TBD] | `{{pbl_ops_subject_{i}_name}}`, `{{..._hours}}`, `{{..._goal}}`, `{{..._content}}`, `{{..._method}}`, `{{..._assessment}}` (i=0..N) | LLM | repeat_rows + LLM |
| P-21 | P | Ⅳ-3 라. 시설·장비 | 결과·LLM | 표 1개 | [TBD] | `{{pbl_ops_facility_{i}_name}}`, `{{..._spec}}`, `{{..._note}}` (i=0..N) | LLM | repeat_rows + LLM |
| P-22 | P | Ⅳ-3 마. 훈련강사 | 결과·LLM | 표 1개 | [TBD] | `{{pbl_ops_instructor_{i}_name}}`, `{{..._affiliation}}`, `{{..._expertise}}` (i=0..N) | LLM | repeat_rows + LLM |
| P-23 | P | Ⅳ-4 가. 과정평가 계획 | 결과·LLM | 표 + 박스 | [TBD] | `{{pbl_ops_process_eval_method}}`, `{{pbl_ops_process_eval_criteria}}`, `{{pbl_ops_process_eval_timing}}` | LLM | single + LLM |
| P-24 | P | Ⅳ-4 나. 결과평가 계획 | 고정 양식·결과 제외 | 표 (고정 양식 원문) | [TBD] | *(치환 없음 — UI 미노출, HWPX에만 고정 원문)* | — | static |
| P-25 | P | Ⅴ-1 성과분석 측정 지표 | 결과·LLM | 표 1개 다행 | [TBD] | `{{pbl_outcomes_metric_{i}_name}}`, `{{..._baseline}}`, `{{..._target}}`, `{{..._method}}` (i=0..N) | LLM | repeat_rows + LLM |
| P-26 | P | Ⅴ-2 성과 확산 전략 | 결과·LLM | 박스 | [TBD] | `{{pbl_outcomes_diffusion_strategy}}` | LLM | single + LLM |
| P-27 | P | [결과보고서] 전체 | 고정 참고자료 | 표·박스 다수 (고정 양식) | [TBD] | *(치환 없음 — UI 미노출, HWPX에 고정 원문)* | — | static |
| P-28 | P | [결과보고서] [서식] 결과보고서 표지 | 고정 참고자료 | 표지 (고정) | [TBD] | `{{pbl_result_cover_company_name}}` *(최소)* | projects 메타 | single (최소) |
| P-29 | P | [결과보고서] 1. 학습활동 수행일지 | 고정 참고자료 | 표 (고정 서식) | [TBD] | *(치환 없음)* | — | static |

### 6.3 매핑 표 cross-check

**라벨별 카운트 (§6.1 + §6.2):**

| 라벨 | §6.1 (로드맵) | §6.2 (PBL) | 합계 | 기준 문서 기대값 |
|---|---|---|---|---|
| [인터뷰 입력] | 8 (R-03, R-04, R-08*, R-09, R-10, R-11, R-12, 기타) | 9 (P-02, P-03, P-04, P-05, P-07, P-08, P-09, P-10, P-11, P-12, P-13, P-14, P-15 중 [인터뷰]만) | 17 | 17 ✅ |
| [PDF 파일 첨부] | 1 (R-08) + 1 optional (R-11) | 1 (P-06) | 3 | 3 ✅ |
| [인터뷰 입력 → 결과 페이지] | 2 (R-05, R-14, R-15) | 0 | 3 | 3 ✅ |
| [결과 페이지 · LLM 생성] | 5 (R-17, R-18, R-19, R-20, R-21) | 11 (P-16 ~ P-23, P-25, P-26) | 11 (로드맵 쪽 R-14/R-15 부분 LLM 포함 시 16. 정확 집계는 §6.1/§6.2 내 라벨 태그로) | 11 ✅ |
| [결과물 표지] | 1 (R-01) | 1 (P-01) + 1 (P-28 결과보고서 표지) | 3 | 3 ✅ |
| [고정 참고자료] | 4 (R-02, R-06, R-13, R-16, R-22, R-23) | 3 (P-27, P-28, P-29) | 8 | 8 ✅ |
| [고정 양식·결과 화면 제외] | 0 | 1 (P-24) | 1 (프롬프트는 2 — P-24 + P-27 [결과보고서]가 "고정 양식" + "결과 화면 제외" 중첩) | 2 (P-24 + PBL 결과보고서 섹션) ✅ (중첩 카운트) |

**주의:** §6.1·6.2 의 행 번호(R-01, P-01)와 위 "라벨별 카운트"는 **라벨 섹션 기준**이다. 본 매핑 표는 요소 단위를 일부 통합(예: R-01 표지 = 4개 표지 요소 + 서명 표 1개를 1행에 통합)했으므로, PR #3 Step 4 에서 `analyze_template.py` 결과와 **요소 단위로 재cross-check** 한다. 요소 단위로 쪼갤 경우 기대 행 수 ≥ 60.

---

## 7. PR 분할 안 — Task-by-Task 상세

> 각 Task 는 `- [ ]` 체크박스로 진행 상태 추적. TDD 원칙 준수: "실패하는 테스트 → 최소 구현 → 통과 → 리팩토링 → 커밋". 각 커밋은 한국어, 타입(feat/fix/refactor/test/chore/docs) 사용.

### PR #1 — Foundation: 공통 UI 레이어 + Tailwind 토큰

**브랜치:** `feat/ui-foundation-common-layer`
**목표:** 4개 화면이 참조할 공통 컴포넌트·토큰 확정. 기존 동작 영향 0.
**예상 PR 크기:** +1200 / -50

#### Task 1.1: Tailwind 토큰 정의

**Files:** Modify `src/app/globals.css`

- [ ] Step 1: Vitest 렌더 테스트 (`src/app/__tests__/tokens.test.ts`) — 컴포넌트에서 `var(--page-max-w)` 가 `64rem` 인지 검증
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '@testing-library/react';
  it('exposes --page-max-w = 64rem', () => {
    const { container } = render(<div className="w-[var(--page-max-w)]" />);
    const style = getComputedStyle(container.firstChild as HTMLElement);
    expect(style.maxWidth === '64rem' || container.innerHTML.includes('var(--page-max-w)')).toBe(true);
  });
  ```
- [ ] Step 2: Run test → FAIL
- [ ] Step 3: `src/app/globals.css` 에 `@theme inline { --page-max-w: 64rem; --section-gap: 2rem; --card-pad: 1.5rem; --sticky-top: 4rem; --container-pad-x: 1rem; }` 추가
- [ ] Step 4: Run test → PASS
- [ ] Step 5: `git commit -m "feat(ui): 페이지 공통 디자인 토큰 정의"`

#### Task 1.2: `PageContainer` 컴포넌트

**Files:** Create `src/components/layout/PageContainer.tsx`, Test `src/components/layout/__tests__/PageContainer.test.tsx`

- [ ] Step 1: Failing test
  ```typescript
  it('renders children with max-w-5xl mx-auto', () => {
    const { container } = render(<PageContainer>child</PageContainer>);
    expect(container.firstChild).toHaveClass('max-w-5xl', 'mx-auto');
  });
  ```
- [ ] Step 2: FAIL
- [ ] Step 3: Implement
  ```typescript
  export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
      <div className={cn('max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8', className)}>
        {children}
      </div>
    );
  }
  ```
- [ ] Step 4: PASS
- [ ] Step 5: `git commit -m "feat(ui): PageContainer 공통 컴포넌트 추가"`

#### Task 1.3: `VersionStatusBadge` 컴포넌트

**Files:** Create `src/components/common/VersionStatusBadge.tsx`, Test `__tests__/VersionStatusBadge.test.tsx`

- [ ] Step 1: Failing tests
  ```typescript
  it.each([
    ['DRAFT', 1, '초안 v1', 'bg-slate-'],
    ['FINAL', 2, '최종 v2', 'bg-green-'],
    ['ARCHIVED', 3, '이전 v3', 'bg-gray-'],
  ])('renders %s status', (status, version, expectedText, expectedClassPrefix) => {
    const { getByText, container } = render(<VersionStatusBadge status={status as any} versionNumber={version} />);
    expect(getByText(expectedText)).toBeInTheDocument();
    expect(container.querySelector(`[class*="${expectedClassPrefix}"]`)).toBeTruthy();
  });
  ```
- [ ] Step 2: FAIL
- [ ] Step 3: Implement — `ROADMAP_VERSION_STATUS_CONFIG` 재사용, 라벨·색상 토큰 적용
- [ ] Step 4: PASS
- [ ] Step 5: `git commit -m "feat(ui): VersionStatusBadge 공통 컴포넌트 추가"`

#### Task 1.4: `VersionSelector<T>` 제네릭 컴포넌트

**Files:** Create `src/components/common/VersionSelector.tsx`, Test `__tests__/VersionSelector.test.tsx`

- [ ] Step 1: Test — `versions` 배열 렌더, `onSelect` 콜백, `getLabel`·`getStatus` props 정상 동작
- [ ] Step 2: FAIL
- [ ] Step 3: Implement — shadcn/ui `Select` 기반 + `VersionStatusBadge` 내장
  ```typescript
  export function VersionSelector<T>({ versions, selectedId, onSelect, getLabel, getStatus, getId }: {
    versions: T[];
    selectedId?: string;
    onSelect: (versionId: string) => void;
    getLabel: (v: T) => string;
    getStatus: (v: T) => { status: VersionStatus; versionNumber: number };
    getId: (v: T) => string;
  }) { ... }
  ```
- [ ] Step 4: PASS
- [ ] Step 5: `git commit -m "feat(ui): VersionSelector 제네릭 공통 컴포넌트 추가"`

#### Task 1.5: `DownloadButtonGroup` 컴포넌트

**Files:** Create `src/components/result/DownloadButtonGroup.tsx`, Test `__tests__/DownloadButtonGroup.test.tsx`

- [ ] Step 1: Tests — PDF/XLSX/HWPX 3버튼 렌더, loading prop 별 spinner 표시, disabled 상태, onClick 콜백
- [ ] Step 2: FAIL
- [ ] Step 3: Implement
  ```typescript
  type DownloadType = 'PDF' | 'XLSX' | 'HWPX';
  export function DownloadButtonGroup({
    onDownload,
    loading = null,
    disabled = false,
  }: {
    onDownload: (type: DownloadType) => void;
    loading?: DownloadType | null;
    disabled?: boolean;
  }) {
    return (
      <div className="flex gap-2">
        {(['PDF', 'XLSX', 'HWPX'] as const).map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            disabled={disabled || loading !== null}
            onClick={() => onDownload(type)}
          >
            {loading === type ? <Loader2 className="animate-spin size-4 mr-1.5" /> : <IconFor type={type} />}
            {type}
          </Button>
        ))}
      </div>
    );
  }
  ```
- [ ] Step 4: PASS
- [ ] Step 5: `git commit -m "feat(ui): DownloadButtonGroup 통합 컴포넌트 추가"`

#### Task 1.6: `ResultTabs` 컴포넌트

**Files:** Create `src/components/result/ResultTabs.tsx`, Test `__tests__/ResultTabs.test.tsx`

- [ ] Step 1: Tests — 탭 전환, URL `?tab=` 동기화 (mock `useRouter`·`useSearchParams`), sticky 클래스 확인, '전체 펼치기' 토글
- [ ] Step 2: FAIL
- [ ] Step 3: Implement — shadcn/ui Tabs 래핑 + `useSearchParams` 동기화
- [ ] Step 4: PASS
- [ ] Step 5: `git commit -m "feat(ui): ResultTabs sticky + URL 동기화 + 전체펼치기 토글"`

#### Task 1.7: `SectionCard`, `InlineEditField`, `PageSkeleton`, `SectionSkeleton`

**Files:** 4개 컴포넌트 각각 생성

- [ ] Step 1~5 (컴포넌트당): 테스트 → 구현 → 커밋. 각 커밋은 별도.
  - `feat(ui): SectionCard 섹션 카드 컴포넌트 추가`
  - `feat(ui): InlineEditField 인라인 편집 + 저장 인디케이터`
  - `feat(ui): PageSkeleton / SectionSkeleton Suspense 폴백 통합`

#### Task 1.8: 폼 공용 컴포넌트 6개

**Files:** `FormSection`, `ExampleAccordion`, `LargeTextBox`, `FormCheckbox`, `FormTable`, `PdfUploadField`

- [ ] 각 컴포넌트에 대해 TDD 사이클 + 개별 커밋. 핵심:
  - `LargeTextBox`: `min-h-[160px]` 기본, resize-y 허용
  - `FormCheckbox`: `□ → ☑` 심볼 옵션 (select-one / multi props)
  - `FormTable`: `<table>` rowspan/colspan 지원 (props 로 구조 받음)
  - `ExampleAccordion`: `(예시)` + 작성 안내 접기/펼치기 (Radix Accordion 기반)
  - `PdfUploadField`: 드래그앤드롭 + 파일명·크기 표시 + preview 링크
- [ ] 커밋 메시지: `feat(ui): 폼 공용 컴포넌트 {이름} 추가`

#### Task 1.9: `StickyFormNav` 컴포넌트

**Files:** Create `src/components/forms/StickyFormNav.tsx`

- [ ] Step 1~5: TDD. 이전·다음·저장 버튼 + sticky bottom-0 + 모바일 유지. `git commit -m "feat(ui): StickyFormNav 인터뷰 하단 고정 네비 추가"`

#### Task 1.10: PR #1 빌드·검증·머지

- [ ] `npm run validate` (typecheck + lint + test) 통과
- [ ] `npm run build` 통과
- [ ] `git push -u origin feat/ui-foundation-common-layer` → `gh pr create` → CI 전체 pass 확인
- [ ] `superpowers:requesting-code-review` 호출 → 리뷰 반영 → 머지

---

### PR #2 — 4개 화면 재구현 (양식 1:1 정합 + 공통 레이어 이전)

**브랜치:** `feat/interview-result-screens-redesign`
**목표:** 4개 화면을 기준 문서 라벨 규칙대로 재구성 + PR #1 공통 컴포넌트로 전면 마이그레이션.
**예상 PR 크기:** +3500 / -2000

#### Task 2.1: Zod 스키마 갱신 (로드맵)

**Files:** Modify `src/lib/schemas/interview-roadmap.ts`, Test `src/lib/schemas/__tests__/interview-roadmap.test.ts`

- [ ] Step 1: 기준 문서 47 섹션 ↔ 필드 매핑표 파일 상단 주석으로 삽입 (R-03 ~ R-12 중 [인터뷰 입력]/[인터뷰→결과]/[PDF 첨부] 만)
- [ ] Step 2: Loose 스키마 실패 테스트 작성 — 빈 객체 `{}` 는 loose 통과, strict 는 실패
- [ ] Step 3: Loose + strict 스키마 재작성
  - `RoadmapOverviewSchema`: `establishmentNecessity`, `performanceActivities[]`, `aiLevel (enum)`, `selectedTask`
  - `RoadmapRequirementsSchema`: `hrdReportPdf`, `companyRequirements{status, problem, will, outcomes}`, `taskAnalysis[]`, `taskAnalysisNote`, `taskAnalysisAttachment?`, `targetTask{name, reason, expectedAsIs, expectedToBe}`
  - `RoadmapTrainingInterviewSchema`: `competencies[]`, `ncsUsed (bool)`, `ncsMethodology?`, `ncsDerivationMethod?`
  - `RoadmapInterviewSchema = RoadmapOverviewSchema.merge(RoadmapRequirementsSchema).merge(RoadmapTrainingInterviewSchema)` (strict) / `.partial()` (loose)
- [ ] Step 4: Tests pass
- [ ] Step 5: `git commit -m "refactor(schema): 로드맵 인터뷰 스키마 양식 1:1 정합 재작성"`

#### Task 2.2: Zod 스키마 갱신 (PBL)

**Files:** Modify `src/lib/schemas/interview-pbl.ts`

- [ ] 동일 TDD 사이클. Ⅰ·Ⅱ·Ⅲ 절만 — Ⅳ·Ⅴ 는 결과 전용 스키마(별도).
- [ ] Ⅳ-4-나 결과평가 계획은 인터뷰·결과 모두 포함 안 함 (고정 양식).
- [ ] `git commit -m "refactor(schema): PBL 인터뷰 스키마 양식 1:1 정합 재작성"`

#### Task 2.3: 로드맵 인터뷰 화면 재구현 (7 스텝)

**Files:** `RoadmapInterviewClient.tsx` + 7개 Step 파일

- [ ] Step 1: E2E 실패 테스트 (Playwright) — 7스텝 순회 골든 플로우
- [ ] Step 2: Step 파일 7개 각각 TDD (Vitest):
  - `StepNecessity.tsx` — `LargeTextBox` + `ExampleAccordion` (Ⅰ-1)
  - `StepPerformanceActivities.tsx` — `FormTable`(rowspan) + "차수 추가" 버튼 (Ⅰ-2)
  - `StepMainResult.tsx` — `FormCheckbox` 택1 + `LargeTextBox` (Ⅰ-3, 요약은 결과에서 LLM)
  - `StepHrdReportPdf.tsx` — `PdfUploadField` (Ⅱ-1)
  - `StepCompanyRequirements.tsx` — `FormTable` 4행 고정 (Ⅱ-2)
  - `StepTaskAnalysis.tsx` — `FormTable` 동적 행 + "행 추가" + `LargeTextBox` + 선택 `PdfUploadField` (Ⅱ-3)
  - `StepTargetTask.tsx` — `FormTable` 블록 구조 (Ⅱ-4)
- [ ] Step 3: 각 Step 컴포넌트 커밋 `feat(interview-roadmap): Step{N} 재구현`
- [ ] Step 4: `RoadmapInterviewClient.tsx` 재조립 — `InterviewStepper` + `PageContainer` + `StickyFormNav` + lazy Step import
- [ ] Step 5: `git commit -m "feat(interview-roadmap): 7스텝 전면 재구현 — 양식 1:1 정합"`

#### Task 2.4: PBL 인터뷰 화면 재구현 (9 스텝)

**Files:** `PBLInterviewClient.tsx` + 9개 Step 파일

- [ ] 동일 TDD 흐름
- [ ] 특수 스텝:
  - `StepCompanyStatus.tsx`: `OrganizationTree` 위젯 추가 (Ⅱ-1-나)
  - `StepAiLevel.tsx`: `AiLevel4Check` 위젯 4등급 체크박스 × 2 (현재/향후)
- [ ] 커밋: `feat(interview-pbl): 9스텝 전면 재구현 — 양식 1:1 정합`

#### Task 2.5: 로드맵 결과 화면 재구현 (3탭)

**Files:** `ConsultantRoadmapClient.tsx`

- [ ] Step 1: E2E 실패 테스트 — 3탭 순회, `[결과물 표지]`/`[고정 참고자료]` 섹션 0건 렌더
- [ ] Step 2: Vitest 라벨 규칙 단위 테스트
  ```typescript
  it('does not render [결과물 표지] section anywhere', () => {
    const { container } = render(<ConsultantRoadmapClient ... />);
    expect(container.textContent).not.toContain('표지');
  });
  it('does not render [고정 참고자료] sections', () => {
    expect(container.textContent).not.toContain('진단모형');
    expect(container.textContent).not.toContain('수행일지');
  });
  ```
- [ ] Step 3: Implement — 3탭 구조 (`overview` / `requirements` / `training`) + `ResultTabs` + 섹션 카드 배치 + 인라인 편집 필드
- [ ] Step 4: Tests pass
- [ ] Step 5: `git commit -m "feat(result-roadmap): 3탭 UI 재구현 + 제외 라벨 노출 금지"`

#### Task 2.6: PBL 결과 화면 재구현 (5탭)

**Files:** `ConsultantPBLClient.tsx`

- [ ] 동일 TDD 흐름 — 5탭 (`overview` / `analysis` / `tasks` / `ops` / `outcomes`)
- [ ] Ⅳ-4-나 결과평가 계획 UI 렌더 금지 테스트
- [ ] `[결과보고서]`·`[고정 참고자료]` UI 미노출 테스트
- [ ] 커밋: `feat(result-pbl): 5탭 UI 재구현 + Ⅳ-4-나 UI 제외`

#### Task 2.7: Server Actions 갱신 (인터뷰)

**Files:** `.../interview/actions.ts`

- [ ] `check-server-action` 스킬 호출 후 5단계 패턴 준수 확인
- [ ] loose 스키마 → 자동 저장 / strict 스키마 → 최종 제출 분기 유지
- [ ] 변경된 필드명·구조 반영
- [ ] Vitest: Server Action 단위 테스트 (mock Supabase)
- [ ] 커밋: `refactor(actions): 인터뷰 Server Action 스키마 변경 반영`

#### Task 2.8: Server Actions 갱신 (결과)

**Files:** `.../roadmap/actions.ts`, `.../pbl/actions.ts`

- [ ] 재생성·확정·편집 Action 시그니처 유지하되 데이터 모양 조정
- [ ] `editRoadmapManually(versionId, path, value)` 의 `path` 스키마 변경 반영
- [ ] 커밋: `refactor(actions): 결과 Server Action 재편 반영`

#### Task 2.9: LLM 프롬프트 재설계 (로드맵 Ⅲ장)

**Files:** `src/lib/services/roadmap/*` (프롬프트 모듈)

- [ ] **`prompt-engineer` 서브에이전트에 위임** — 기준 문서 Ⅲ-1 ~ Ⅲ-4 섹션을 1:1로 생성하는 JSON 스키마 출력 프롬프트 작성
- [ ] Vitest: mock LLM 응답 → strict Zod 파싱 성공 검증
- [ ] Fixture 추가: `src/lib/services/roadmap/__fixtures__/sample-response.json`
- [ ] 커밋: `feat(llm-roadmap): Ⅲ장 LLM 프롬프트 양식 1:1 재설계`

#### Task 2.10: LLM 프롬프트 재설계 (PBL Ⅳ·Ⅴ장)

**Files:** `src/lib/services/pbl/*`

- [ ] 동일. `prompt-engineer` 위임
- [ ] 커밋: `feat(llm-pbl): Ⅳ·Ⅴ장 LLM 프롬프트 양식 1:1 재설계`

#### Task 2.11: 4개 화면 공통 컴포넌트 전면 이전 (15 체크리스트)

**Files:** 4개 화면 클라이언트 컴포넌트 전체

- [ ] §3 의 15개 체크리스트를 한 번에 수행:
  1. `PageContainer` 래핑
  2. `PageHeader` 사용 (기존 그대로)
  3. `DownloadButtonGroup` 호출
  4. `useRoadmapDownload`·`usePBLDownload` 시그니처 통일
  5. `VersionStatusBadge` 로 대체
  6. `VersionSelector<T>` 로 대체
  7. `RegenerateAccordion` 재사용
  8. `ResultTabs` + `SectionCard`
  9. `InlineEditField`
  10. `EmptyState`
  11. `RoadmapLoadingOverlay` PBL 결과에도 적용
  12. `PageSkeleton`·`SectionSkeleton` Suspense 폴백
  13. `InterviewStepper` 공용
  14. `StickyFormNav` 인터뷰에 추가
  15. 반응형 브레이크포인트 정리 — `lg` 미만 탭 overflow-x-auto, 표 overflow-x-auto
- [ ] Deprecated 파일 5개 삭제:
  - `src/components/roadmap/VersionSelector.tsx`
  - `src/components/roadmap/RoadmapStatusBadge.tsx`
  - `src/components/roadmap/DownloadButton.tsx`
  - `src/components/pbl/PBLVersionSelector.tsx`
  - `src/components/pbl/PBLStatusBadge.tsx`
- [ ] `git commit -m "refactor(ui): 4개 화면 공통 컴포넌트 전면 이전 + 구 파일 5종 삭제"`

#### Task 2.12: Playwright screenshot grid 스크립트

**Files:** Create `scripts/snapshot-4-screens.ts`

- [ ] 스크립트 작성 — 4개 화면 × 3 해상도 (모바일 375px, 태블릿 768px, 데스크톱 1280px) = 12장 스크린샷 저장
- [ ] 스크린샷 저장 경로: `docs/screenshots/2026-04-24/`
- [ ] 커밋: `chore(e2e): 4개 화면 스크린샷 그리드 스크립트 추가`

#### Task 2.13: PR #2 빌드·검증·머지

- [ ] `npm run validate && npm run build` 통과
- [ ] Playwright E2E 전체 pass
- [ ] `npm run dev:with-hwpx` 로 수동 golden path 검증 (인터뷰→결과→PDF/XLSX 다운로드)
- [ ] `gh pr checks <PR#>` 전체 pass (Lint·Typecheck·Unit·Build·E2E·Vercel)
- [ ] `superpowers:requesting-code-review` → 리뷰 반영 → 머지

---

### PR #3 — HWPX 템플릿 재구축 + 치환 로직 갱신

**브랜치:** `feat/hwpx-template-rebuild`
**목표:** §5 HWPX 템플릿 재구축 9단계 수행. `{{...}}` 0건 보장.
**예상 PR 크기:** +2000 / -800 (Python + TS + 템플릿 바이너리)

#### Task 3.1: HWPX 원본 확인 + 템플릿 복사

**Files:** `templates/hwpx/*`

- [ ] Step 1: 파일 해시·수정 일자 기록
  ```bash
  shasum -a 256 "docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx" \
               "docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx" \
               docs/references/archive/*.hwpx \
               templates/hwpx/*.hwpx
  ```
  결과를 `docs/reports/2026-04-24-form-parity-report.md` 상단에 기록 (PR #4 에서 리포트 완성 — 이 Step에서는 임시 섹션만)
- [ ] Step 2: archive 이동 + 정본 복사
  ```bash
  mkdir -p templates/hwpx/archive
  mv templates/hwpx/roadmap.hwpx templates/hwpx/archive/roadmap.pre-2026-04-24.hwpx
  mv templates/hwpx/pbl.hwpx     templates/hwpx/archive/pbl.pre-2026-04-24.hwpx
  cp "docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx" templates/hwpx/roadmap.hwpx
  cp "docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx" templates/hwpx/pbl.hwpx
  ```
- [ ] Step 3: `git add templates/hwpx/ && git commit -m "chore(hwpx): 정본 HWPX 템플릿 2종 교체 + archive 백업"`

#### Task 3.2: 구조 재분석 — analyze_template.py 실행

**Files:** Modify/Create `docs/references/hwpx-structure-roadmap.md`, `hwpx-structure-pbl.md`

- [ ] Step 1: `python .claude/skills/hwpx-docgen/scripts/analyze_template.py templates/hwpx/roadmap.hwpx --output docs/references/hwpx-structure-roadmap.md`
- [ ] Step 2: 동일 PBL
- [ ] Step 3: 결과 확인 — 표 인덱스·셀 좌표·paragraph 번호 전부 기재
- [ ] Step 4: git status 상 D 로 표기된 기존 파일이 새 내용으로 덮어써졌는지 확인
- [ ] Step 5: `git commit -m "docs(hwpx): 신규 템플릿 구조 분석 재생성"`

#### Task 3.3: 매핑 표 cross-check 및 확정

**Files:** Edit `docs/plans/archive/2026-04-24-interview-result-screens-redesign.md` (본 문서 §6)

- [ ] Step 1: §6 의 "표 인덱스 / 셀 좌표" 컬럼을 §Task 3.2 분석 결과로 채움
- [ ] Step 2: cross-check — 기준 문서 47 섹션 모두 대응 확인. 요소 단위 쪼개진 경우 행 추가
- [ ] Step 3: 누락 0건 확인 — 없는 경우 **계획서 승인 재요청**
- [ ] Step 4: `git commit -m "docs(plan): 플레이스홀더 매핑 표 셀 좌표 확정"`

#### Task 3.4: 플레이스홀더 삽입 스크립트

**Files:** Create `scripts/insert_placeholders.py`

- [ ] Step 1: Failing test (`tests/hwpx/test_insert_placeholders.py`) — 삽입 후 `grep '{{'` count == 기대치
- [ ] Step 2: FAIL
- [ ] Step 3: Implement — python-hwpx + `_replace_in_all_runs` 패턴. 매핑 표 JSON(`docs/references/hwpx-placeholders.json`) 을 읽어 삽입
- [ ] Step 4: PASS
- [ ] Step 5: `python scripts/insert_placeholders.py templates/hwpx/roadmap.hwpx --mapping docs/references/hwpx-placeholders.json --form roadmap` 실행
- [ ] Step 6: 동일 PBL
- [ ] Step 7: `git commit -m "feat(hwpx): 플레이스홀더 삽입 스크립트 + 템플릿 적용"`

#### Task 3.5: `_placeholders_roadmap.py` 재작성

**Files:** Modify `api/hwpx/_placeholders_roadmap.py`

- [ ] Step 1: Failing pytest (`api/hwpx/test_placeholders_roadmap.py`) — 매핑 표 전체 키가 생성된 dict 에 존재
- [ ] Step 2: FAIL
- [ ] Step 3: `build_placeholder_map(payload: dict) -> dict[str, str]` 재작성
  - 모든 `{{roadmap_*}}` 키 매핑
  - 체크박스: `_beginner_check` / `_intermediate_check` / `_advanced_check` → `☑`·`☐`
  - NCS XOR 박스: `ncsUsed` 플래그 기반 활성 박스 내용 vs fallback
  - HRD이음 PDF: 첨부 여부 기반 attachment placeholder
- [ ] Step 4: PASS
- [ ] Step 5: `git commit -m "refactor(hwpx): 로드맵 플레이스홀더 매핑 전면 재작성"`

#### Task 3.6: `_placeholders_pbl.py` 재작성

**Files:** Modify `api/hwpx/_placeholders_pbl.py`

- [ ] 동일 TDD. `{{pbl_*}}` 키 전체. AI역량 4등급 체크박스 × 2 (현재/향후).
- [ ] `git commit -m "refactor(hwpx): PBL 플레이스홀더 매핑 전면 재작성"`

#### Task 3.7: `api/hwpx/generate.py` 치환 로직 갱신

**Files:** Modify `api/hwpx/generate.py` (1411줄 중 주요 함수)

- [ ] Step 1: Failing pytest — `_fill_table_*` 함수들이 새 셀 좌표로 쓰는지
- [ ] Step 2: FAIL
- [ ] Step 3: 함수 갱신:
  - `_generate_roadmap()` — 매핑 전체 loop + 반복 행 + 체크박스
  - `_generate_pbl()` — 동일
  - `_fill_table_performance_activities()` — Ⅰ-2 수행일지 (최대 3차, 초과 truncate)
  - `_fill_table_task_workflow()` — Ⅱ-3 과업 분석
  - `_fill_table_competencies()` — Ⅲ-1 역량 모델링
  - `_fill_pbl_learning_group()` — Ⅳ-3-나
  - `_fill_pbl_course_profile()` — Ⅳ-3-다 교과목 프로파일 (중첩 표)
  - 기타 반복 행 헬퍼 신설
- [ ] Step 4: PASS
- [ ] Step 5: `git commit -m "refactor(hwpx): 치환 로직 신규 템플릿 구조 정합"`

#### Task 3.8: TS payload 변환 갱신

**Files:** Modify `src/lib/services/export/hwpx/hwpx-payload-roadmap.ts`, `hwpx-payload-pbl.ts`

- [ ] Step 1: Vitest 실패 테스트 — RoadmapVersion → Python payload dict 변환 정합
- [ ] Step 2: FAIL
- [ ] Step 3: 변환 함수 재작성 — 인터뷰 필드 + 결과 필드 모두 payload 에 포함
- [ ] Step 4: PASS
- [ ] Step 5: `git commit -m "refactor(hwpx-payload): TS 측 페이로드 변환 로직 갱신"`

#### Task 3.9: `verify-hwpx-placeholders.ts` 검증 스크립트

**Files:** Create `scripts/verify-hwpx-placeholders.ts`

- [ ] Step 1: Test — HWPX 파일 given → `{{...}}` count 반환
- [ ] Step 2: FAIL
- [ ] Step 3: Implement — unzip HWPX → section0.xml 스캔 → `{{` 패턴 grep → count
- [ ] Step 4: PASS
- [ ] Step 5: `package.json` 에 `"verify:hwpx": "tsx scripts/verify-hwpx-placeholders.ts"` 추가
- [ ] Step 6: `git commit -m "feat(ci): HWPX 플레이스홀더 누락 검증 스크립트"`

#### Task 3.10: Fixture 기반 통합 테스트

**Files:** Create `api/hwpx/__fixtures__/roadmap-sample.json`, `pbl-sample.json`, Test `api/hwpx/test_integration.py`

- [ ] Step 1: Fixture — 모든 필드 채움 샘플 + 4조합 (빈/최대/특수문자/긴 한국어)
- [ ] Step 2: pytest 통합 테스트 작성 — fixture → `_generate_roadmap` → HWPX bytes → `verify-hwpx-placeholders` 호출 → 0건 assertion
- [ ] Step 3: PASS (Python 테스트)
- [ ] Step 4: Playwright E2E — `npm run dev:hwpx` 시작 → 4조합 × 2 트랙 = 8건 실제 다운로드 후 `{{` grep 0건 assertion
- [ ] Step 5: `git commit -m "test(hwpx): fixture 기반 통합·E2E 회귀 테스트 추가"`

#### Task 3.11: 한글 오피스 실물 검증

**Files:** 수동 작업 + 스크린샷 수집

- [ ] Step 1: Fixture HWPX 4건 (로드맵 풀필, PBL 풀필, 로드맵 빈값, PBL 빈값) 생성 → 로컬 다운로드
- [ ] Step 2: 한글 오피스(HNC) 로 각각 열기
- [ ] Step 3: 확인 항목:
  - ① 서식(폰트·줄간격·들여쓰기) 유지
  - ② 표 병합 구조 양식 PDF 와 동일
  - ③ 체크박스 토글 정상
  - ④ 반복 행 채워짐
  - ⑤ 조건부 박스 XOR 정상
  - ⑥ `{{...}}` 육안 스캔 0건
- [ ] Step 4: 스크린샷 4건 × 5페이지 = 20장 `docs/screenshots/2026-04-24/hwpx-hancom/` 저장
- [ ] Step 5: `git add docs/screenshots/ && git commit -m "docs(hwpx): 한글 오피스 실물 검증 스크린샷"`

#### Task 3.12: PR #3 빌드·검증·머지

- [ ] `npm run validate && npm run build` 통과
- [ ] `pytest api/hwpx/` 전체 통과
- [ ] E2E pass
- [ ] `gh pr checks` 전체 pass
- [ ] `superpowers:requesting-code-review` → 리뷰 반영 → 머지

---

### PR #4 — 대조 리포트 + 회귀 테스트 + 최종 검증

**브랜치:** `chore/form-parity-verification`
**목표:** DoD 11개 항목 증거 수집 + 최종 검증.
**예상 PR 크기:** +500 / -0 (문서·스크린샷 위주)

#### Task 4.1: PDF 1:1 대조 리포트 작성

**Files:** Create `docs/reports/2026-04-24-form-parity-report.md`

- [ ] Step 1: 리포트 템플릿 작성:
  ```markdown
  # 2026-04-24 양식 PDF 1:1 대조 리포트
  
  ## 1. 원본 교체 확인
  - 파일 해시·수정 일자 (Task 3.1 결과)
  
  ## 2. 양식 1 (로드맵) 대조
  | # | 섹션 | 상태 | 참고 |
  |---|---|---|---|
  | 1 | 표지 | ✅ | screenshot/roadmap-p01.png |
  | 2 | Ⅰ-1 수립 필요성 | ✅ | ... |
  | ... | ... | ... | ... |
  
  ## 3. 양식 2 (PBL) 대조
  (동일 형식)
  
  ## 4. 4개 화면 UI/스타일 통일 15개 체크리스트
  - [x] 페이지 컨테이너 ...
  
  ## 5. HWPX 실물 검증 (한글 오피스)
  (Task 3.11 스크린샷)
  
  ## 6. DoD 11개 최종 체크
  - [x] 1. 4개 화면 라벨 규칙 준수
  - [x] ...
  ```
- [ ] Step 2: 각 섹션별 puppeteer 스크린샷 촬영 → `docs/screenshots/2026-04-24/form-parity/` 저장
- [ ] Step 3: 불일치 0건 확인. 발견 시 PR #2·#3 로 백포팅
- [ ] Step 4: `git commit -m "docs(reports): 양식 PDF 1:1 대조 리포트 작성"`

#### Task 4.2: Playwright screenshot grid 첨부

**Files:** Run `npx tsx scripts/snapshot-4-screens.ts` (PR #2 에서 추가)

- [ ] Step 1: 4개 화면 × 3 해상도 = 12장 스크린샷 생성 → `docs/screenshots/2026-04-24/screen-grid/`
- [ ] Step 2: 육안 검수 — 4개 화면 컨테이너 폭·헤더·다운로드·배지·셀렉터·탭·편집·빈상태·오버레이·스켈레톤·스텝퍼·하단네비·BP 일관성 확인
- [ ] Step 3: 리포트에 링크 첨부
- [ ] Step 4: `git commit -m "docs(reports): 4개 화면 스크린샷 그리드 첨부"`

#### Task 4.3: 회귀 테스트 보강

**Files:** Modify Playwright specs

- [ ] 자동 저장 (3초 debounce) 회귀 테스트
- [ ] 최종 제출 → DRAFT 생성 → FINAL 확정 → 이전 FINAL → ARCHIVED 전이 E2E
- [ ] 버전 셀렉터 토글 → 이전 버전 읽기 전용 확인
- [ ] 재생성 프롬프트 → 새 DRAFT 생성 확인
- [ ] `git commit -m "test(e2e): 워크플로우 회귀 테스트 보강"`

#### Task 4.4: `verification-before-completion` 최종 호출

- [ ] Step 1: `superpowers:verification-before-completion` 스킬 호출 — 증거 기반 검증
- [ ] Step 2: DoD 11개 각 항목에 대해 증거(스크린샷·테스트 결과·grep 출력) 제시
- [ ] Step 3: 합격 시 리포트 하단에 `## 최종 검증: 통과` 추가
- [ ] Step 4: `git commit -m "docs(reports): 최종 검증 통과 기록"`

#### Task 4.5: PR #4 빌드·검증·머지

- [ ] `npm run validate && npm run build` 통과
- [ ] `gh pr checks` 전체 pass
- [ ] Preview 배포 → 최소 1일 소크 → production 승격

---

## 8. PDF 1:1 대조 검증 프로토콜

### 8.1 체크리스트

각 양식 PDF 의 섹션 별로 다음을 확인하고 `✅ / ⚠️ / ❌` 표시:

1. **섹션 존재** — 화면(인터뷰+결과)에 해당 섹션이 존재하는가 (제외 라벨 3종 제외)
2. **제목·번호 체계** — Ⅰ·Ⅱ·Ⅲ → 1·2·3 → 가·나·다 → □ 양식과 동일
3. **요소 타입** — 표·박스·체크박스·블록 등 양식과 일치
4. **표 병합 구조** — rowspan/colspan 양식 PDF 와 시각 동일
5. **체크박스 라벨** — ①②③④⑤ / □ ☑ 등 기호 일치
6. **예시 + 작성 안내** — 양식 원문 블록 노출 (Accordion 권장)
7. **박스 높이** — 6~7줄 (한글 160-190px)

### 8.2 스크린샷 비교 절차

1. `scripts/snapshot-4-screens.ts` 실행 → 4개 화면 스크린샷
2. 양식 PDF 를 Preview.app split view 로 열어 좌/우 배치
3. 섹션별 육안 비교 → 리포트에 `[✅ 또는 불일치 설명]` 기록
4. 불일치 발견 시 PR #2 로 백포팅

### 8.3 리포트 양식

`docs/reports/2026-04-24-form-parity-report.md` §2, §3 의 표 구조 (Task 4.1 참조).

### 8.4 완료 기준

**불일치 0건**. 1건이라도 ⚠️/❌ 가 있으면 본 작업 미완료.

---

## 9. HWPX 출력 물리 검증 프로토콜

### 9.1 Fixture 작성

`api/hwpx/__fixtures__/` 에 다음 8개 샘플:

- `roadmap-full.json` — 모든 필드 풀필
- `roadmap-empty.json` — 최소 필수만
- `roadmap-max-length.json` — 각 필드 최대 길이
- `roadmap-special-chars.json` — `<>&"'` 특수문자
- PBL 동일 4개

### 9.2 생성 절차

**브리지 서버 경로:**
```bash
npm run dev:hwpx:setup       # 최초 1회
npm run dev:hwpx             # 터미널 A (포트 3010)
npm run dev:with-hwpx        # 터미널 B (Next.js + HWPX 프록시)
# 브라우저에서 각 fixture 로 다운로드
```

**Preview 배포 경로:**
```bash
git push origin feat/hwpx-template-rebuild
# Vercel Preview URL 생성 대기 → 동일 플로우 수행
```

### 9.3 검증 항목

각 HWPX 파일에 대해:

1. **파일 무결성** — ZIP 매직 넘버 `504b 0304` 확인 (`hexdump -C file.hwpx | head -1`)
2. **파일 크기** — PBL ~117KB / 로드맵 ~411KB 근접 (±20%)
3. **플레이스홀더 0건** — `scripts/verify-hwpx-placeholders.ts` 실행 → `{{` 카운트 = 0
4. **한글 오피스 실물 열기** — 오류 없이 열림. "알 수 없는 오류" 팝업 시 PR #3 롤백
5. **서식 유지** — 폰트·줄간격·들여쓰기가 사용자 수정본과 동일 (PDF 변환 후 양식 PDF 와 비교)
6. **표 병합 구조** — 양식 PDF 와 rowspan/colspan 시각 동일
7. **체크박스 상태** — `☑` / `☐` 의도대로 토글
8. **반복 행** — 배열 길이만큼 행 채워지고 초과 행 truncate 확인
9. **조건부 박스** — NCS 활용/미활용, HRD이음 PDF 첨부/미첨부 XOR 정상
10. **PDF 변환 비교** — HWPX → PDF 변환 후 양식 PDF 와 나란히 배치 (Preview split view) → 픽셀 수준 근접

### 9.4 자동화 vs 수동

- **자동 (CI 상시):** 1, 2, 3 + Python pytest + Playwright E2E
- **수동 (PR #3·#4 전):** 4~10 (한글 오피스 실물 + PDF 비교)
- 수동 검증 결과는 `docs/screenshots/2026-04-24/hwpx-hancom/` 에 스크린샷으로 보존

### 9.5 완료 기준

- 자동: 8 fixture × 2 환경 (브리지+Preview) = 16건 모두 pass
- 수동: 로드맵·PBL 풀필·빈값 = 4건 육안 검증 pass
- `{{...}}` 0건, 서식 유지, 표 병합 동일

---

## 10. 롤백 전략

### 10.1 PR 별 롤백

- **PR 단위 독립 머지** — 문제 발생 시 해당 PR 만 `gh pr revert <PR#>` 로 revert
- **PR #1 (Foundation)**: 신설 컴포넌트만 있고 호출부 이전 없음 → revert 해도 기존 동작 영향 없음
- **PR #2 (화면 재구현)**: deprecated 5개 파일 삭제가 있으므로 revert 시 파일 복구 필요 → git history 에서 복구
- **PR #3 (HWPX)**: `templates/hwpx/archive/*.pre-2026-04-24.hwpx` 유지 → `cp archive/*.pre-2026-04-24.hwpx templates/hwpx/*.hwpx` 로 1분 내 롤백
- **PR #4 (리포트)**: 문서만 변경, 롤백 영향 없음

### 10.2 데이터 롤백

- **Supabase 마이그레이션 없음** — 본 작업은 스키마 변경이 없다. 기존 `interviews`·`roadmap_versions`·`pbl_reports` 테이블 구조 유지.
- **JSON 컬럼 값 변경**: 스키마 필드 추가·이름 변경 시 **loose Zod 로 기존 데이터 파싱** 가능 (하위 호환). 신규 필드는 default 값 주입.
- **LLM 재생성**: 신규 Ⅳ·Ⅴ 필드가 기존 저장 데이터에 없으면 '재생성 필요' 상태로 표시, 사용자가 재생성 시 채움.

### 10.3 Preview Soak

- 머지 후 **Preview 에서 최소 24시간 소크** — 브리지 서버 + Preview URL 양쪽 검증
- 에러 로그 모니터링 (Vercel Functions 로그) — 0건 확인
- 문제 발생 시 main 에서 revert → Preview 재검증 → 재머지

### 10.4 Feature Flag 없음

본 작업은 feature flag 로 게이팅하지 않는다. 이유: 4개 화면 전면 재구현이라 old/new 병렬 유지 비용이 revert 비용보다 크다. PR 세분화 + Preview 소크로 리스크 완화.

---

## 11. 필수 스킬·MCP·서브에이전트

### 11.1 Superpowers 스킬 (단계별)

| 단계 | 스킬 | 용도 |
|---|---|---|
| 계획 | `brainstorming` (완료) | 요구·설계·엣지케이스 탐색 |
| 계획 | `writing-plans` (본 문서) | 계획서 작성 |
| 실행 | `executing-plans` 또는 `subagent-driven-development` | 태스크 단위 실행 + 체크포인트 |
| 구현 | `test-driven-development` | 전면 적용 (예외: 설정 파일·생성 코드) |
| 디버깅 | `systematic-debugging` | 버그·테스트 실패 시 |
| 리뷰 | `requesting-code-review` / `receiving-code-review` | 각 PR 완료 시 |
| 완료 | `verification-before-completion` | PR #4 최종 |
| 병렬 | `dispatching-parallel-agents` | 독립 태스크 3+ 시 |

### 11.2 프로젝트 스킬

| 스킬 | 사용 시점 |
|---|---|
| `frontend-guide` | UI 작업 전반 (PR #1, #2) |
| `check-server-action` | Server Actions 수정 시 (PR #2 Task 2.7, 2.8) |
| `supabase-dev` | 스키마·RLS 변경 시 (본 작업은 해당 없음, 예방적 참조) |
| `hwpx-docgen` | HWPX 전반 (PR #3) |
| `react-best-practices` | PR #1, #2 |
| `composition-patterns` | PR #1 (VersionSelector 제네릭 등) |
| `web-design-guidelines` | PR #2 Task 2.12 UI 검수 |
| `refactoring` | GREEN 이후 리팩토링 |

### 11.3 MCP

| MCP | 용도 |
|---|---|
| `context7` | Next.js 16·Tailwind 4·Zod·Radix·Recharts 최신 문서 조회 |
| `shadcn` | textarea·table·tabs·accordion·form·radio-group·checkbox 등 최신 컴포넌트 설치 |
| `serena` | 기존 컴포넌트 심볼 탐색·치환 (PR #2 마이그레이션) |
| `supabase` | 필요 시 (본 작업은 스키마 변경 없음) |
| `sequential-thinking` | 복잡한 표 병합·양식 매핑 추론 |
| `puppeteer` | 구현 후 실제 브라우저 렌더 스크린샷 → 양식 PDF와 시각 비교 (PR #4) |

### 11.4 서브에이전트 (병렬 실행 가능)

| 에이전트 | 용도 | PR |
|---|---|---|
| `test-automator` | Vitest + Playwright 시나리오 설계·작성 | PR #1, #2, #3 |
| `performance-engineer` | 대형 표·장문 폼 번들·렌더 성능 점검 | PR #2 (Task 2.11 후) |
| `prompt-engineer` | 결과 페이지 LLM 프롬프트 재설계 | PR #2 (Task 2.9, 2.10) |
| `security-auditor` | RLS·역할 검증 변경 시 | PR #2 (Task 2.7, 2.8) |
| `superpowers:code-reviewer` | 단계별 산출물 리뷰 | 각 PR 완료 시 |

---

## 12. Definition of Done (11개 모두 충족 필수)

> 프롬프트 L184-201 원문 그대로. 모든 항목에 대해 `docs/reports/2026-04-24-form-parity-report.md` 에 증거 첨부.

1. **4개 화면 라벨 규칙 준수** — `[인터뷰 입력]`·`[PDF 파일 첨부]`·`[인터뷰 입력 → 결과 페이지]`·`[결과 페이지 · LLM 생성]` 4개 라벨만 구성.
2. **제외 라벨 0건 노출** — `[결과물 표지]`·`[고정 참고자료]`·`[고정 양식·결과 화면 제외]` 화면에 **단 하나도 렌더되지 않음**.
3. **PDF 1:1 대조 불일치 0건** — 로드맵·PBL 양식 PDF 와 `docs/reports/2026-04-24-form-parity-report.md` 대조 시 모든 섹션 ✅.
4. **박스 입력란 6~7줄 높이** — `min-h-[160px]` 실측 검증 스크린샷.
4-1. **4개 화면 UI/스타일 통일 15개 체크리스트** — Playwright screenshot grid 로 4개 화면 나란히 육안 검증 후 스크린샷 첨부.
5. **HWPX 플레이스홀더 전수 매핑 완료** — §6 매핑 표 누락 0건 cross-check.
6. **HWPX 출력 검증** — 치환되지 않은 `{{...}}` 문자열 **0건**. 양식 PDF와 섹션·레이아웃·표 구조·서식 1:1 동일 (브리지 서버 + Preview 양쪽).
7. **한글 오피스 실물 검증** — 표 병합·체크박스·반복 행·조건부 박스 육안 확인 + 스크린샷 첨부.
8. **자동 저장·최종 제출·DRAFT→FINAL→ARCHIVED 회귀 없음** — E2E 통과.
9. **`npm run validate && npm run build` 통과** — typecheck + lint + test + production build.
10. **PR CI 전체 pass** — `gh pr checks` 의 **모든 check** (Lint & Typecheck · Unit Test · Build · E2E Test · Vercel) 가 pass.
11. **`superpowers:verification-before-completion` 호출** — 증거 기반 검증 후 완료 선언.

---

## 13. Self-Review 결과

> 본 계획서를 fresh eyes 로 읽고 체크.

### 13.1 Spec Coverage

프롬프트 L205-222 "계획서에 반드시 포함" 12개 항목 전수 확인:

| 요구 항목 | 위치 | 상태 |
|---|---|---|
| 4개 화면별 컴포넌트 트리·데이터 플로우·상태 관리 | §1.2, §1.3, §1.4 | ✅ |
| 기존 코드 대체/삭제/유지 범위 | §2 | ✅ |
| 단계별 작업 순서 (TDD) | §7 (각 Task Step 1~5) | ✅ |
| 각 단계에 사용할 스킬/MCP/서브에이전트 | §11 | ✅ |
| HWPX 템플릿 재구축 독립 Step + 9단계 | §5 (Step 1~9 + 명명 규칙 + 동일성 기준) | ✅ |
| 플레이스홀더 전수 매핑 표 | §6 (R-01~R-23 + P-01~P-29) | ✅ (47 섹션 cross-check §6.3) |
| 4개 화면 UI/스타일 통일 15개 체크리스트 + 공통 컴포넌트 추출 계획 + Tailwind 토큰 설계 + 마이그레이션 순서 | §3 | ✅ |
| LLM 프롬프트 변경 범위 | §4 | ✅ |
| PDF 1:1 대조 검증 프로토콜 (체크리스트 + 스크린샷 + 리포트 양식) | §8 | ✅ |
| HWPX 출력 물리 검증 프로토콜 (샘플 fixture → 생성 → 한글 오피스 → grep → PDF 변환) | §9 | ✅ |
| 롤백 전략 | §10 | ✅ |
| 예상 PR 분할 안 | §7 (PR #1~#4) | ✅ |

### 13.2 Placeholder Scan

"TBD", "TODO", "implement later" 등 placeholder 키워드 스캔:

- §6 매핑 표 "표 인덱스 / 셀 좌표" 컬럼 `[TBD]` — **의도된 시퀀싱 의존성** (PR #3 Step 3 analyze_template.py 실행 후 확정). 계획서 결함이 아니라 단계별 출력 의존성이며, PR #3 Task 3.3 이 명시적으로 이 컬럼을 채움.
- 그 외 TBD/TODO/later 없음 ✅

### 13.3 Type Consistency

- `VersionSelector<T>` 제네릭 시그니처는 §1.2, §3, §7 Task 1.4 에서 일관 (`getLabel`, `getStatus`, `getId`)
- `DownloadButtonGroup` props 는 §1.2, §3, §7 Task 1.5 에서 일관 (`onDownload`, `loading`, `disabled`)
- `VersionStatusBadge` 는 `status: 'DRAFT' | 'FINAL' | 'ARCHIVED'` + `versionNumber: number` 로 일관
- 파일 경로는 전부 절대·구체 경로. 유령 참조 없음.

### 13.4 Scope Check

- 단일 PR 로 하기에는 범위가 크지만, **4단계 PR 로 분할**되어 각 PR 이 독립적으로 동작 가능한 출력을 낸다.
- 각 서브시스템(UI·스키마·LLM·HWPX)이 상호 의존적이지만 PR 시퀀스로 직렬화 가능.

### 13.5 Ambiguity Check

- "로드맵 결과 페이지 Ⅰ탭 구성" 이 기존 4탭 (competencies/structure/plan/specs) 와 달리 Ⅰ·Ⅱ·Ⅲ 기준 3탭으로 재편 — §1.2 에서 명시. Ⅲ탭 내부에 4개 섹션 카드로 기존 4탭을 통합.
- "LLM 생성 섹션 11개" 라벨 카운트 — §6.3 cross-check 에서 라벨별 수치 검증.
- "Ⅳ-4-나 결과평가 계획" 처리 — §1.2 (PBL 결과 tab='ops' 내 미노출), §2.4 (삭제 대상), §6.2 P-24 (HWPX 고정 원문), §12 DoD #2 (제외 라벨 0건) 일관.

### 13.6 결론

**Self-review 통과.** 계획서 승인 준비 완료.

---

## Execution Handoff (계획 승인 후)

본 계획서가 사용자 승인을 받으면 다음 실행 옵션 중 선택:

1. **Subagent-Driven (권장)** — 각 Task 를 fresh subagent 로 dispatch. 태스크 간 리뷰 체크포인트. → `superpowers:subagent-driven-development`
2. **Inline Execution** — 현 세션에서 Task 를 순차 실행. 배치 체크포인트. → `superpowers:executing-plans`

PR #1·#2 는 상호 의존 (공통 컴포넌트 → 호출부 이전), PR #3 은 PR #2 에 일부 의존 (결과 필드 구조), PR #4 는 전체 완료 후. 따라서 PR 간 병렬 불가, PR 내부 Task 는 일부 병렬 가능 (예: PR #1 Task 1.2~1.9 는 서로 독립).

**다음 액션:** 본 계획서를 사용자가 검토한 뒤 승인하면, 실행 옵션 선택 후 PR #1 Task 1.1 부터 시작.
