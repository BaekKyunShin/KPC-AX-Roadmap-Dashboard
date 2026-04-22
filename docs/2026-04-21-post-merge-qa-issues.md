# 2026-04-21 OFA 머지 후 QA 이슈 수집

**대상 배포**: 프로덕션 main `4ab91dd` (PR #14 OFA 머지)
**도메인**: https://kpc-ax-roadmap-dashboard.vercel.app
**QA 기간**: 2026-04-21 ~ 2026-04-28 (1주, 분산 진행)
**참조 계획서**: `docs/plans/2026-04-20-ofa-post-merge-deployment.md` §4 + §5
**스모크 리포트**: `docs/2026-04-21-prod-smoke-report.md`

---

## 작성 방식 (자동화)

**이 문서는 Claude 가 대신 기록합니다.** 사용자는 이슈 발견 시 스크린샷 + 3줄 요약만 Claude 에 공유.

### 사용자가 공유할 내용 (3요소)
1. **스크린샷**: 채팅에 드래그 또는 "바탕화면에 저장했어" 로 알리기 (Claude 가 자동으로 `docs/screenshots/2026-04-21-qa/ISSUE-NN-xxx.png` 로 이동·rename)
2. **페이지/메뉴 경로**: 예) `/gallery` 또는 "OPS 갤러리 페이지"
3. **증상 한 줄 + 기대 동작 한 줄**: 예) "PBL 탭 눌러도 ROADMAP 카드 같이 나옴 / PBL만 보이기 기대"

### Claude 가 자동 처리
- 기존 문서 읽어 ISSUE 번호 자동 증가
- 심각도·카테고리 판정 (판단 근거 명시)
- 재현 경로 구체화 (필요 시 사용자에게 재확인 질문)
- As-is / To-be 명확히 분리
- 추정 원인 추론 (코드베이스 참조)
- 스크린샷 파일명 규칙 자동 준수

### 사용자 최종 검수
Claude 기록 후 "이렇게 작성했는데 맞아?" 확인 → 오류 시 교정 요청.

---

## 작성 규칙

### 이슈 ID
`ISSUE-NN` 두 자리 (01, 02, …, 99). 발견 순서대로 부여. **번호 재사용 금지**.

### 카테고리 (택 1)
`ROADMAP` · `PBL` · `갤러리` · `공지` · `OPS` · `모바일` · `HWPX` · `기타`

### 심각도
| 등급 | 의미 |
|------|------|
| **Critical** | 로그인 불가 / 페이지 500 / 데이터 손상. 발견 즉시 별도 hotfix 진행 |
| **High** | 핵심 기능 차단 (예: 인터뷰 저장 실패, 다운로드 실패) |
| **Medium** | 기능은 동작하나 UX 결함 (예: 글자 잘림, 정렬 어긋남) |
| **Low** | 사소한 시각 결함, 오탈자 |

### 환경
`데스크톱(1440×900)` · `모바일(375×667)` · `한글프로그램` · 그 외 명시

### 스크린샷
- **저장 경로**: `docs/screenshots/2026-04-21-qa/`
- **파일명**: `ISSUE-NN-짧은설명.png`
- **여러 장**: `ISSUE-NN-a.png`, `ISSUE-NN-b.png`
- **모바일 캡처**: 접미사 `-mobile` (예: `ISSUE-07-notice-cutoff-mobile.png`)
- **HWPX 캡처**: 접미사 `-hwpx` (예: `ISSUE-12-checkbox-hwpx.png`)
- **문서 내 참조**: `![](screenshots/2026-04-21-qa/ISSUE-01-gallery-filter.png)`

---

## QA 진행 체크리스트 (참고용 — 진행 시 √ 표시)

### §4-1. ROADMAP 트랙
- [ ] OPS 로 신규 ROADMAP 프로젝트 생성 → 컨설턴트 배정
- [ ] 컨설턴트로 인터뷰 6스텝 작성 (Ⅰ개요 / Ⅱ현황 / Ⅱ과업흐름 / Ⅱ교육대상 / Ⅱ분석노트 / 확인)
- [ ] 자동저장 동작 (각 스텝 입력 후 새로고침 시 보존)
- [ ] 로드맵 생성 → DRAFT 저장
- [ ] 로드맵 편집 (수립 필요성·역량·연간계획·NCS) → FINAL 확정
- [ ] PDF 다운로드
- [ ] XLSX 다운로드
- [ ] **HWPX 다운로드** (한글 파일)
- [ ] 갤러리 공유 토글 → /gallery 노출 확인

### §4-2. PBL 트랙
- [ ] OPS 로 신규 PBL 프로젝트 생성 → 컨설턴트 배정
- [ ] PBL 인터뷰 9스텝 (Ⅰ / Ⅱ-1·2·3 / Ⅲ-1·2·3·4 / 확인)
- [ ] PBL 보고서 생성 → 편집 → FINAL 확정
- [ ] PDF · XLSX · HWPX 다운로드

### §4-3. 공지 게시판
- [ ] OPS 로 공지 작성 + PDF 첨부 + HWPX 첨부
- [ ] 컨설턴트로 /notices 조회 + 첨부 다운로드
- [ ] 컨설턴트 화면에 작성 버튼 미노출 확인

### §4-4. 갤러리
- [ ] 트랙 필터(전체/ROADMAP/PBL) 전환
- [ ] 좋아요 토글 → 카운트 ±1
- [ ] 로드맵 상세 → Ⅰ장 요약 · NCS 박스 · 수립 방법 노출
- [ ] PBL 상세 → Ⅰ~Ⅴ장 전 섹션 노출

### §4-5. OPS 관리
- [ ] /ops/projects · /ops/users · /ops/audit · /ops/quota · /ops/templates 5개
- [ ] 감사로그에 ROADMAP_SHARED · PBL_REPORT_SHARED 기록
- [ ] 공유 토글 시 audit_logs INSERT

### §4-6. 모바일 (375×667)
- [ ] /consultant/home
- [ ] /gallery
- [ ] /notices
- [ ] 인터뷰 화면
- [ ] HWPX 다운로드

### §5. 한글 프로그램 실물 검수 (3건 샘플)
- [ ] 로드맵 HWPX (양식 1번 PDF 와 비교): 표지·목차·Ⅰ-1·Ⅰ-2·Ⅰ-3·Ⅱ-1·Ⅱ-2·Ⅱ-3·Ⅲ·NCS
- [ ] PBL HWPX (양식 2번 PDF 와 비교): 표지·조직도·성과 활동·Ⅱ·Ⅲ·Ⅳ·Ⅴ
- [ ] 긴 텍스트(50자+) 셀 밖 넘침 없음
- [ ] 한글 자음 분리(NFD) 현상 없음
- [ ] 체크박스 ☑ ☐ 정상 표시

---

## 이슈 (작성 예시 1건 — 실제 발견 시 이 양식 따라 추가)

> 💡 아래 ISSUE-EXAMPLE 은 양식 견본입니다. 실제 이슈가 없으므로 무시하거나 삭제 후 ISSUE-01 부터 시작하세요.

### ISSUE-EXAMPLE: 갤러리 PBL 탭 필터링 미작동 (예시)

- **카테고리**: 갤러리
- **심각도**: High
- **환경**: 데스크톱(1440×900)
- **재현 경로**:
  1. 컨설턴트 `kpc@test.com` 로 로그인
  2. 상단 메뉴 `라이브러리` 클릭 → /gallery 도달
  3. 트랙 탭 `PBL` 클릭
- **As-is (현재)**: PBL 탭 클릭해도 ROADMAP 카드까지 함께 노출됨
- **To-be (기대)**: PBL 트랙 카드만 노출, 카운트 표시도 PBL 건수만 반영
- **스크린샷**: `screenshots/2026-04-21-qa/ISSUE-EXAMPLE-gallery-pbl-filter.png`
- **추정 원인**: (모르면 비워둠)
- **추가 메모**: 트랙 필터가 클라이언트 사이드 필터인지 서버 쿼리인지 확인 필요

---

<!-- Claude 가 사용자 제보를 받아 아래에 ISSUE-01 부터 순차 추가합니다. -->

> 💡 **공통 주의사항 (ISSUE-05 ~ ISSUE-20 전체 적용)**:
> 1. 사용자가 컨설턴트 계정의 로드맵 트랙에서만 확인했지만, **PBL 트랙 및 운영관리자/시스템관리자 계정에 동일 기능·메뉴가 있으면 함께 일괄 수정**.
> 2. ~~**Critical 3건(ISSUE-06·07·19) 처리 시점**: "나머지 QA 완료 후 묶어서 Plan Mode 진입" 확정 (2026-04-21).~~ → ✅ **Batch 1 완료 (PR #18 머지, 2026-04-22, main `134fb25`)**. ISSUE-04·06·07·19 4건 해결.
> 3. **산인공 공식 양식 파일 교체**: 기존 `.hwpx` 는 `docs/references/archive/` 로 보존, 신버전 `.hwp` (폰트·서식만 변경, 내용 구조 동일) 를 `docs/references/1.*.hwp`·`2.*.hwp` 로 배치 (2026-04-21). PDF 는 기존 유지.

---

### ISSUE-20: 로그인·프로젝트 페이지 console error — 하이드레이션 #418 + 401/400 fetch

- **카테고리**: 기타 (UX·하이드레이션)
- **심각도**: Low (기능 영향 없음 — Batch 1 Preview 재검증 중 발견, 2026-04-22)
- **환경**: 데스크톱 (Chromium, 컨설턴트 로그인 후)
- **재현 경로**:
  1. `/login` 도달 → 로그인 시도
  2. 로그인 완료 후 `/consultant/projects` 도달
  3. 브라우저 devtools Console 탭 확인
- **As-is** (Batch 1 Preview `git-fi-be62f0` 에서 Playwright MCP 로 확인):
  - `Failed to load resource: 401 @ /login:0` (초기 로그인 플로우)
  - `Failed to load resource: 400 @ /:0` (루트 경로 fetch)
  - `Minified React error #418 (hydration mismatch)` — server HTML 과 client 가 불일치 (https://react.dev/errors/418)
- **To-be**: 로그인 직후 console error 0건. 하이드레이션 일치.
- **스크린샷**: 없음 (Playwright MCP console log 로 확인)
- **추정 원인**:
  - 401: 초기 세션 체크가 로그인 전에 발생해 예상된 현상일 수 있음 (정상이면 warn 으로 suppress)
  - 400: 루트 경로 redirect 중간 단계 요청 실패
  - #418: Server Component 와 Client Component 간 상태 차이 — `nav`/`헤더`/`알림 뱃지` 등 사용자 컨텍스트 의존 UI 가 SSR 결과와 CSR 결과가 다른 경우 발생 가능
- **수정 방향 (참고)**:
  - DevTools Network 탭에서 401/400 요청의 url + payload 확인 → 실제 실패 호출 식별
  - `/` (루트) 의 redirect 로직 점검 (middleware.ts 또는 `src/app/page.tsx`)
  - 하이드레이션 불일치: `useEffect` 로 클라이언트 값만 렌더하는 부분을 `suppressHydrationWarning` 또는 `'use client'` 경계 재검토
  - **기능에는 영향 없음** — Batch 2 UI/UX 배치에 묶어서 정리 권장

---

### ISSUE-19: 로드맵 생성 실패 — "AI 서비스에 일시적인 문제가 있습니다"

> ✅ **해결 완료** — Batch 1 PR #18 (main `134fb25`, 2026-04-22). `fillMissingRoadmapFields` 인터뷰 기반 자동 채움 + `callLLMForJSON` validator + Ⅲ-1 프롬프트 강화로 복구.

- **카테고리**: ROADMAP
- **심각도**: **🚨 Critical** (핵심 산출물 생성 기능 차단)
- **환경**: 데스크톱 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 로그인 → 프로젝트 → 인터뷰 6스텝 입력 → 확인/제출
  2. 상세 페이지에서 "로드맵 생성" 버튼 클릭
- **As-is**: "로드맵 생성 실패 AI 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요." 토스트 노출, 로드맵 미생성
- **To-be**: 로드맵 정상 생성 → 편집 가능한 DRAFT 버전 저장
- **스크린샷**: 없음 (토스트 메시지만)
- **추정 원인** (ISSUE-06·07 과 공통 가능성):
  - 최근 OFA 스키마 변경 후 `src/lib/services/roadmap/roadmap-generator.ts` · `roadmap-prompts.ts` 의 LLM 프롬프트/출력 스키마와 실제 응답이 불일치 → `roadmapContentSchema` 검증 실패 → `RoadmapStorageError` 발생
  - `fillMissingRoadmapFields` 의 방어 로직이 새 필드(OFA 추가 항목)를 못 덮고 있을 가능성
  - 또는 인터뷰 입력값(`mapInterviewRowToRoadmapInterview`)이 예상 shape 와 달라 프롬프트 변수 치환 실패 가능성
- **수정 방향 (참고)**:
  - Vercel Functions 로그에서 실제 스택트레이스 · LLM 응답 원본 확인 (가장 빠른 원인 특정)
  - ISSUE-04 의 Ⅲ-1 역량 모델링 스텝 추가 후 프롬프트/스키마 전면 재정비 시점에 함께 해결
  - **PBL 트랙도 동일 문제 가능성 점검** (`src/app/(dashboard)/test-pbl/actions.ts` + PBL 생성 서비스)
- **연관**: ISSUE-06 (매칭 실패), ISSUE-07 (사전분석 실패) 와 동일 LLM 스키마 미스매치 원인 추정

---

### ISSUE-18: AI 교육 로드맵 페이지 — 초기 생성 시 '+ 새 버전 생성' 누적 노출

- **카테고리**: ROADMAP
- **심각도**: Medium (UX)
- **환경**: 데스크톱 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 → 프로젝트 상세 → "로드맵 생성" 클릭 → AI 교육 로드맵 페이지 진입
  2. 아직 버전이 없는 상태
- **As-is**: 상단에 '버전 선택' 드롭다운 + **'+ 새 버전 생성'** 박스가 먼저 노출되고, 하단에 "로드맵이 없습니다 · 왼쪽의 '로드맵 생성' 버튼을 클릭하여 AI 로드맵을 생성하세요." 안내만 있음. **실제 'AI 로드맵 생성' 버튼이 보이지 않음** (안내 문구와 불일치)
- **To-be**:
  - **초기(버전 0개)**: 상단 '+ 새 버전 생성' 영역 숨김 → 가운데 크고 명확한 **'AI 로드맵 생성' 버튼** 단독 노출
  - **2번째 이후(버전 ≥1)**: 현재 UI 유지 (버전 선택 드롭다운 + '+ 새 버전 생성')
- **스크린샷**: `screenshots/2026-04-21-qa/ISSUE-18-a-roadmap-generation-button.png`
- **추정 원인**: 로드맵 버전 페이지 조건부 렌더링 로직에서 `versions.length === 0` 분기 처리 누락
- **수정 방향 (참고, 2026-04-21 확정)**: `src/app/(dashboard)/consultant/projects/[id]/roadmap/` + `ops/projects/[id]/roadmap/` + **PBL 페이지(`/pbl`) 모두 동일 로직 적용** 확정. 버전 개수 기반 분기 추가.

---

### ISSUE-17: 인터뷰 기록 탭 — 입력한 모든 내용이 노출되지 않음

- **카테고리**: ROADMAP (인터뷰 기록 표시)
- **심각도**: Medium
- **환경**: 데스크톱 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 → 프로젝트 상세 → "인터뷰 기록" 탭
- **As-is**: 시스템/AI 활용 경험, 세부업무, 페인포인트, 개선 목표, 기업 요구사항 일부만 노출. **ISSUE-04 에서 확정된 인터뷰 전체 항목(Ⅰ-1 수립 필요성 · Ⅰ-3 AI 역량 수준 · Ⅰ-3 선정 과업 · Ⅱ-1 HRD4U 첨부 · Ⅱ-2 요구분석 4필드 · Ⅱ-3 과업·워크플로우 분석 + 분석노트 · Ⅱ-4 훈련대상 과업 · Ⅲ-1 역량 모델링 · 메모 · STT) 중 상당수 미표시**
- **To-be**: 인터뷰 확인/제출 단계에서 입력한 **모든 항목**을 Ⅰ → Ⅱ → Ⅲ 순서로 읽기 좋게 노출 (섹션 헤더 + 입력값 + 첨부 파일 링크 + 표 형태 데이터는 테이블로)
- **스크린샷**: `screenshots/2026-04-21-qa/ISSUE-17-a-interview-history-incomplete.png`
- **추정 원인**: 인터뷰 기록 탭 컴포넌트가 레거시 필드(`company_details.ai_experience`, `pain_points`, `improvement_goals`) 만 렌더링 중. OFA 후 추가된 `overview.*`, `task_workflow_items`, `training_targets`, `competency_models`(ISSUE-04) 렌더링 누락
- **수정 방향 (참고)**: `src/app/(dashboard)/consultant/projects/[id]/_components/` 에서 인터뷰 기록 탭 컴포넌트를 ISSUE-04 확정 스키마 기준으로 전면 재작성. ISSUE-04 와 묶어서 진행 권장.
- **연관**: ISSUE-04 (인터뷰 범위 재정의)

---

### ISSUE-16: 확인/제출 페이지에 STT 업로드 항목 복원

- **카테고리**: ROADMAP (인터뷰)
- **심각도**: Medium (기능 회귀)
- **환경**: 데스크톱 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 → 인터뷰 6스텝 → 확인/제출 페이지
- **As-is**: 입력값 요약 + 하단에 '메모' 항목 노출. **STT 업로드 항목 누락** (기존 시스템에 있었으나 최근 개편으로 제거된 것으로 추정)
- **To-be**: 메모 아래 **STT 업로드 섹션** 복원. 기존 구현 로직을 재활용하되 UI 양식은 현재 시스템(shadcn/ui)에 맞춤
- **스크린샷**: 없음
- **추정 원인**: 인터뷰 UI 리팩터 시 STT 업로드 컴포넌트가 확인 스텝에서 누락됨. 스키마의 `stt_insights` 필드는 유지되어 있음 (`interview-roadmap.ts:142`)
- **수정 방향 (참고)**:
  - git log/history 에서 STT 업로드 섹션 마지막 구현 시점 확인 후 코드 재활용
  - `src/lib/services/stt.ts` (STT 인사이트 추출) + `sttInsightsSchema` 는 이미 존재 → UI 컴포넌트만 복원하면 됨
  - **PBL 인터뷰에도 동일 적용 필요**

---

### ISSUE-15: '다음' 버튼 클릭 시 페이지 스크롤이 상단으로 자동 이동하지 않음

- **카테고리**: ROADMAP (인터뷰 UX)
- **심각도**: Low (UX)
- **환경**: 데스크톱/모바일 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 → 인터뷰 진행 중 → 아래로 스크롤해서 필드 입력 → '다음' 버튼 클릭
- **As-is**: 다음 스텝으로 전환되지만 **스크롤 위치가 이전 위치 그대로** 유지 → 상단 진행 네비게이션·스텝 타이틀이 보이지 않음
- **To-be**: '다음' 클릭 시 페이지 상단으로 **부드럽게 자동 스크롤** (`window.scrollTo({ top: 0, behavior: 'smooth' })` 또는 스텝 타이틀 앵커)
- **스크린샷**: 없음
- **수정 방향 (참고)**: 인터뷰 스텝 전환 핸들러에서 scroll reset 추가. `prefers-reduced-motion` 감지해 smooth 여부 결정 권장. **PBL 인터뷰에도 동일 적용**.

---

### ISSUE-14: Ⅱ-3 '첨부파일(URL)' 을 실제 파일 업로드로 변경 + URL 첨부 제거

- **카테고리**: ROADMAP (인터뷰)
- **심각도**: Medium (기능 개선)
- **환경**: 데스크톱 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 → 인터뷰 → Ⅱ-3. 과업·워크플로우 분석 → '첨부파일 (URL)' 섹션
- **As-is**:
  - 섹션명: '첨부파일 (URL)'
  - 설명: "공정 분석, 업로드 자료 등 참고 URL을 첨부하세요. 파일 업로드는 로드맵 단계에서 제공됩니다."
  - 동작: '+ URL 추가' 버튼만 존재 → URL 텍스트만 저장
- **To-be**:
  - 섹션명 변경: **'추가자료 업로드'**
  - URL 입력 UI **삭제** → 실제 파일 업로드 UI (드래그&드롭 또는 버튼)
  - **허용 확장자 (확정, 2026-04-21)**: **PDF · PPT/PPTX · DOC/DOCX · XLS/XLSX · PNG/JPG** ← HWPX 제외 (LLM 이 내용 파싱 불가)
  - 허용 MIME: `application/pdf`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `image/png`, `image/jpeg`
  - 크기 제한: 10MB/파일, 총 합계 50MB 권장
  - Storage 버킷: `interview-attachments` 재사용 가능

- **🚨 범위 확장 (확정, 2026-04-21)**: **파일 본문 파싱 → LLM 프롬프트 통합** (기존 단순 업로드 UI 교체를 넘어 시스템 개선 포함)
  - 기존 구현: `analysis_notes.attachment_urls` 는 URL/파일명만 LLM 에 넘김 → 파일 내용이 로드맵/PBL 생성에 반영 안 됨 (사용자 지적)
  - 신규 파이프라인 (서버 측 Server Action 또는 API Route 에서 처리):
    | 확장자 | 파싱 방법 | 라이브러리 |
    |--------|---------|-----------|
    | PDF | 텍스트 추출 | `pdf-parse` 또는 `pdfjs-dist` |
    | PPT/PPTX | XML 텍스트 추출 | JSZip + XML 파서 |
    | DOC/DOCX | 텍스트 추출 | `mammoth` |
    | XLS/XLSX | 셀 텍스트 추출 | `xlsx-js-style` (이미 프로젝트 보유) |
    | PNG/JPG | Vision/OCR | Claude Vision API (멀티모달) 또는 Tesseract |
  - 파싱 결과 저장: `attachment_files[i].extracted_text` 필드에 저장 → 재생성 시 재파싱 비용 절약
  - LLM 프롬프트 통합: `roadmap-prompts.ts` 의 analysis_notes 섹션에 `extracted_text` 병합 후 프롬프트 입력
  - 토큰 대응: 파일당 최대 **5000자** 제한, 초과 시 앞 3000자 + LLM 요약 2000자 결합
  - UI 안내: "📎 첨부 파일 내용은 로드맵/PBL 생성에 자동 반영됩니다 (최대 5000자)"
- **스크린샷**: `screenshots/2026-04-21-qa/ISSUE-14-a-attachment-url-only.png`
- **추정 원인**: 개발 초기 "파일 업로드는 나중에" 로 URL 텍스트만 받는 임시 구현이 그대로 유지됨
- **수정 방향 (참고)**:
  - `analysisNotesSchema.attachment_urls` (현재 URL 배열) → `attachment_files` (스키마 `hrdReportAttachmentSchema` 형태 재사용) 로 변경
  - 마이그레이션: 기존 URL 데이터가 있다면 `type: 'url' | 'file'` 유니언으로 하위호환성 유지하거나, 초기 운영이라 레거시 없으면 단순 교체
  - **PBL Ⅲ. 운영계획 부분에도 유사 업로드 섹션 있으면 일관 적용**

---

### ISSUE-13: 작성 가이드 — ※ 같은 부가설명의 인덴테이션·크기 미구분

- **카테고리**: ROADMAP (인터뷰 UX)
- **심각도**: Low (UX)
- **환경**: 데스크톱 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 → 인터뷰 → 문항별 '작성 가이드' 박스
- **As-is**: 원본 양식 PDF 에서는 `※ [별첨] ~` 같은 부가 설명이 **들여쓰기 + 작은 글자**로 본문과 구분되어 있는데, 대시보드 작성 가이드에서는 **동일 머릿기호·동일 크기**로 병기되어 구분 안 됨
- **To-be**: 원본 양식과 유사하게 `※` 로 시작하는 줄은 **더 작은 글자 · 들여쓰기 · 약간 흐린 색**으로 차별화
- **스크린샷**: `screenshots/2026-04-21-qa/ISSUE-13-a-write-guide-indentation.png` (ISSUE-12 와 동일 캡처)
- **수정 방향 (참고)**: 작성 가이드 렌더러를 마크다운 또는 구조화된 JSON 으로 변경해, `※` prefix 를 감지해 하위 스타일 적용. ISSUE-12 와 같은 컴포넌트이므로 함께 수정.

---

### ISSUE-12: 작성 가이드 — 머릿기호가 숫자(1, 2,)로 되어 불릿처럼 안 보임

- **카테고리**: ROADMAP (인터뷰 UX)
- **심각도**: Low (UX)
- **환경**: 데스크톱 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 → 인터뷰 → 문항별 '작성 가이드' 박스
- **As-is**: "1. 과업(또는 워크플로우) 분석 과정 및 방법에 대한 내용 기술 / 2. 작성한 내용 외에 제시해야 할 파일이 있는 경우 첨부파일로 업로드" — **숫자 머릿기호** 사용. 산인공 원본 양식에는 `☐` 체크박스 또는 `◦·▫` 같은 불릿 기호 사용
- **To-be**: 숫자 → **불릿 기호**(예: `•`, `◦`, `▪`) 또는 원본 양식에 있는 `☐` 체크박스
- **스크린샷**: `screenshots/2026-04-21-qa/ISSUE-12-a-write-guide-numbering.png`
- **수정 방향 (참고)**: 작성 가이드 컴포넌트의 `<ol>` → `<ul>` 치환 + `list-disc` 클래스 적용. ISSUE-13 과 같은 컴포넌트.

---

### ISSUE-11: Ⅱ-3 'AI 도입·활용 필요도' 선택 라벨 변경

- **카테고리**: ROADMAP (인터뷰 UX)
- **심각도**: Low (문구)
- **환경**: 데스크톱 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 → 인터뷰 → Ⅱ-3. 과업·워크플로우 분석 → 각 행의 'AI 도입·활용 필요도'
- **As-is**: `1 불필요` / `2 선택` / `3 중립` / `4 권장` / `5 필수`
- **To-be**: `1 매우 낮음` / `2 낮음` / `3 보통` / `4 높음` / `5 매우 높음`
- **스크린샷**: `screenshots/2026-04-21-qa/ISSUE-11-a-ai-necessity-labels.png`
- **추정 원인**: 스키마는 `ai_necessity: z.number().int().min(1).max(5)` 로 숫자만 저장. UI 라벨만 변경하면 됨 (DB 마이그 불필요)
- **수정 방향 (참고, 2026-04-21 확정)**: 필요도 선택 버튼 컴포넌트의 라벨 상수 변경. **HWPX/PDF/XLSX export 에도 동일 라벨(`1 매우 낮음 ~ 5 매우 높음`) 포함해 렌더링** (숫자만 표시 ❌).

---

### ISSUE-10: 현장 인터뷰 수행시간 — 단일 시간을 '시작~종료' 범위로 변경

- **카테고리**: ROADMAP (인터뷰)
- **심각도**: Medium (양식 정합성)
- **환경**: 데스크톱 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 → 인터뷰 Ⅰ-2 주요 활동의 수행 시간 입력
- **As-is**: `interview_time` 필드 하나만 존재 (단일 시각)
- **To-be**: 산인공 양식 1번(Ⅰ-2 주요 활동 표)에 `00:00~00:00` 형식으로 **시작·종료 범위**를 표시함 → `interview_start_time` + `interview_end_time` 두 필드로 분리 (또는 `interview_time_range: { start, end }` 객체)
- **스크린샷**: 없음 (근거: `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf` Ⅰ-2 표)
- **추정 원인**: 초기 스키마 설계 시 단일 시각만 반영
- **수정 방향 (참고, 2026-04-21 확정)**:
  - `roadmapInterviewSchema` 에 `interview_start_time`/`interview_end_time` 추가, 기존 `interview_time` 은 **삭제** (legacy 호환 불필요 — 프로덕션 배포 전 기존 개발용 데이터는 모두 삭제 예정)
  - 기존 데이터의 `interview_start_time` = 기존 `interview_time` 값, `interview_end_time` = null 로 매핑해 일시적 공존 (최종 배포 시 reset)
  - HWPX/PDF export 의 수행일시 렌더링 로직 `00:00~00:00` 포맷
  - **PBL 인터뷰에 동일 필드 일관 적용** (양식 2번 Ⅲ-1 훈련과제 도출 수행활동 표에도 유사 구조 존재)

---

### ISSUE-09: 인터뷰 텍스트 폼 높이 — 서술형 항목 높이 확대

- **카테고리**: ROADMAP (인터뷰 UX)
- **심각도**: Low (UX)
- **환경**: 데스크톱/모바일 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 → 인터뷰 진행 → 서술형 텍스트에어리어에 3줄 이상 입력
- **As-is**: 기본 높이가 낮아 3줄 이상 입력 시 내부 스크롤 발생
- **To-be**: 서술형 필드(수립 필요성 · 기업 현황 · 주요 문제 · 추진 의지 · 기대 성과 · 분석 노트 · 역량 정의 · 선정 사유 · 현행 As-Is · 개선 To-Be 등)는 **기본 5~6줄 높이** 제공. 단답형(과업명 · 직무명 · 담당자명 등)은 현재 높이 유지
- **스크린샷**: 없음
- **수정 방향 (참고)**: `textarea` 의 `rows={5}` 또는 `min-h-[140px]` 일괄 적용, 단답은 `<Input>` 사용. **PBL 인터뷰에도 동일 적용**.

---

### ISSUE-08: 활동 일지 — 수정·삭제 아이콘이 '...' 클릭해야 표시됨

- **카테고리**: 기타 (활동 일지)
- **심각도**: Medium (UX · 발견성 저하)
- **환경**: 데스크톱 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 → 프로젝트 → 활동 일지 탭 → 기록 1건 확인
- **As-is**: 각 행 오른쪽에 `···` (3점 메뉴) 버튼이 있고, 클릭해야 드롭다운으로 '수정', '삭제' 노출
- **To-be**: 각 행 오른쪽에 **아이콘 버튼 2개** (연필 = 수정, 휴지통 = 삭제) **바로 노출**. hover 시 툴팁으로 "수정"/"삭제" 표시
- **스크린샷**: `screenshots/2026-04-21-qa/ISSUE-08-a-activity-log-icons.png`
- **수정 방향 (참고)**: 활동 일지 행 컴포넌트에서 DropdownMenu 제거, 아이콘 버튼 직접 배치. Lucide React 의 `Pencil`/`Trash2` 아이콘 사용. 삭제는 confirm 모달 유지.

---

### ISSUE-07: 사전 분석 실패 — "AI 분석 중 오류가 발생했습니다"

> ✅ **해결 완료** — Batch 1 PR #18 (main `134fb25`, 2026-04-22). `guideDataSchema` 런타임 검증 + validator 재시도 + 에러 메시지 상세화.


- **카테고리**: 기타 (사전 분석)
- **심각도**: **🚨 Critical** (핵심 기능 차단)
- **환경**: 데스크톱 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 → 프로젝트 → 사전 분석 탭
  2. '분석 시작' 버튼 클릭
- **As-is**: "생성 실패 · AI 분석 중 오류가 발생했습니다. 다시 시도해주세요." 토스트
- **To-be**: 자가진단 + 기업 정보 기반 사전 분석 가이드 정상 생성
- **스크린샷**: `screenshots/2026-04-21-qa/ISSUE-07-a-pre-analysis-failure.png`
- **추정 원인**:
  - `src/lib/services/interview-guide.ts` 의 `callLLMForJSON` 실패
  - LLM 응답이 `GuideData` 스키마(`src/lib/schemas/interview-guide.ts`)와 불일치 또는 토큰 8000 초과
  - 자가진단 scores/answers 형식이 프롬프트 입력 기대값과 달라 프롬프트 변수 치환 오류
- **수정 방향 (참고)**:
  - Vercel Functions 로그에서 실제 에러 메시지 · LLM 응답 원본 확인 (최우선)
  - 프롬프트 반환 스키마와 최신 스키마(`interview-guide.ts`) 싱크 확인
- **연관**: ISSUE-06, ISSUE-19 와 묶어 Plan Mode 에서 함께 진단

---

### ISSUE-06: 컨설턴트 자동 매칭 실패 — "매칭 추천 생성 중 오류가 발생했습니다"

> ✅ **해결 완료** — Batch 1 PR #18 (main `134fb25`, 2026-04-22). `llmMatchingResponseSchema` 신규 + hallucinated userId 필터링 + 재시도 로직 강화.


- **카테고리**: OPS (프로젝트 상세 → 컨설턴트 배정)
- **심각도**: **🚨 Critical** (핵심 플로우 차단 — 프로젝트 진행 자체 불가)
- **환경**: 데스크톱 (운영관리자 로그인)
- **재현 경로**:
  1. OPS 로그인 → 프로젝트 상세 → 자가진단 결과 입력 완료 상태
  2. '컨설턴트 배정' → '자동 매칭' 탭 → '컨설턴트 자동 매칭' 버튼 클릭
- **As-is**: "매칭 추천 생성 중 오류가 발생했습니다." 배너, 매칭 결과 없음
- **To-be**: 자가진단 + 프로젝트 업종/규모 기반 LLM 매칭 → 추천 컨설턴트 N명 리스트 노출
- **스크린샷**: `screenshots/2026-04-21-qa/ISSUE-06-a-matching-failure.png`
- **추정 원인**:
  - `src/lib/services/matching/matching-llm.ts` 의 LLM 호출 실패 또는 `LLMMatchingResponse` 스키마 불일치
  - `fetchMatchingData` 에서 컨설턴트 후보 조회 조건(role=CONSULTANT_APPROVED + status=ACTIVE) 에 해당 계정 없는 경우 "활성화된 컨설턴트가 없습니다" 에러이지만, 메시지가 다른 것으로 보아 LLM 응답 파싱 실패 가능성 높음
  - 인터뷰 스키마 변경(OFA)이 매칭 프롬프트의 입력 구조까지 영향을 줬을 가능성
- **수정 방향 (참고)**:
  - Vercel Functions 로그에서 실제 에러 메시지 확인 (최우선)
  - 매칭 LLM 프롬프트가 참조하는 `ConsultantProfile` · `SelfAssessmentScore` 타입 업데이트 확인
- **연관**: ISSUE-07, ISSUE-19 와 Plan Mode 에서 함께 진단

---

### ISSUE-05: 프로젝트 상세 페이지 상단에 트랙(ROADMAP/PBL) 배지 미노출

- **카테고리**: OPS/ROADMAP/PBL (프로젝트 상세)
- **심각도**: Medium (UX)
- **환경**: 데스크톱 (운영관리자 로그인 — 컨설턴트 계정에도 동일 여부 점검 필요)
- **재현 경로**:
  1. OPS → 프로젝트 목록 (`/ops/projects`) → 각 행에 ROADMAP/PBL 배지 표시됨 ✅
  2. 프로젝트 상세 (`/ops/projects/[id]`) 진입 → 상단에 트랙 배지 없음
- **As-is**: 회사명 + 부제(서비스업 · 중소기업) + 기업 정보 박스 ('신규 등록 완료' 같은 상태 배지만 표시). **트랙 배지(ROADMAP/PBL) 없음**
- **To-be**: **최상단 오른쪽**(회사명 헤더 영역 우측) 에 크고 가시적인 ROADMAP 또는 PBL 배지 노출. 상태 배지와 함께 배치하되 시각적 계층 구분
- **스크린샷**: `screenshots/2026-04-21-qa/ISSUE-05-a-project-detail-badge-missing.png`
- **수정 방향 (참고)**:
  - `src/app/(dashboard)/ops/projects/[id]/page.tsx` + 컨설턴트 측 동일 페이지
  - 프로젝트 목록에서 이미 사용 중인 TrackBadge 컴포넌트 재사용
  - `project.track` 필드 기반 조건부 렌더링

---

### ISSUE-04: 담당자 확정안 반영 — 로드맵 인터뷰 범위 재정의 + Ⅲ-1 역량 모델링 스텝 신규 추가

> ✅ **해결 완료** — Batch 1 PR #18 (main `134fb25`, 2026-04-22). 인터뷰 6→7스텝 + `competencyModelSchema`/`ncsUsageSchema` 신규 + `StepCompetencyModeling.tsx` UI + Ⅰ-3 `roadmap_summary` LLM 자동생성 전환.


> 💡 **출처**: 담당자 Q&A (2026-04-21). 산인공 양식 1번(AI훈련로드맵 컨설팅 보고서) 기준 "대시보드 인터뷰로 대체할 사용자 입력 범위" 를 담당자가 공식 확정.

- **카테고리**: ROADMAP
- **심각도**: High (인터뷰 구조의 근본적 재정의 — 스키마·UI·LLM 프롬프트·HWPX/PDF/XLSX Export 전반 영향)
- **환경**: 데스크톱/모바일 (컨설턴트 로그인)
- **근거 문서**: `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf` (17p)

#### 담당자 확정 인터뷰 범위 (양식 1번 기준)

| 항목 | 담당자 지정 범위 | 현재 대시보드 스키마 | 상태 |
|------|---------------|-------------------|------|
| Ⅰ-1 수립 필요성 | 포함 (사용자 입력) | `overview.establishment_necessity` | ✅ |
| Ⅰ-2 주요 활동 | 포함 (**시스템 자동생성 예정** — 수행일지 기반) | — | ⚠️ 사용자 입력 X, 자동 생성 로직 필요 |
| Ⅰ-3 주요 결과 中 '기업 AI 역량 수준' | 포함 (사용자 입력) | `overview.ai_competency_level` | ✅ |
| Ⅰ-3 주요 결과 中 '선정 과업' | 포함 (사용자 입력) | `overview.selected_tasks_summary` | ✅ |
| Ⅰ-3 주요 결과 中 '수립 주요내용(요약)' | 담당자 미언급 | `overview.roadmap_summary` | ✅ **확정: LLM 자동 생성으로 전환** (사용자 입력 필드 제거) |
| Ⅱ-1 기업 AI 역량 수준 진단 (HRD4U 진단 결과물 첨부) | 포함 | `overview.hrd_report_attachment` | ✅ 스키마 존재, UX 검증 필요 |
| Ⅱ-2 기업 요구분석 (4필드) | 포함 | `company_requirements` (4필드) | ✅ |
| Ⅱ-3 과업·워크플로우 분석 (표+첨부) | 포함 | `task_workflow_items` + `analysis_notes` | ✅ |
| Ⅱ-4 훈련대상 과업 선정 | 포함 | `training_targets` | ✅ |
| **Ⅲ-1 역량 모델링** | **포함** | **❌ 부재** | **🚨 신규 추가 필요** |
| Ⅲ-2 훈련체계도 도출 | 담당자 미언급 (LLM 생성) | LLM output | ✅ |
| Ⅲ-3 연간 훈련계획 수립 | 담당자 미언급 (LLM 생성) | LLM output | ✅ |
| Ⅲ-4 훈련과정 상세 | 담당자 미언급 (LLM 생성) | LLM output | ✅ |

#### As-is (현재 대시보드)
- 인터뷰 6스텝 구성: Ⅰ.개요 / Ⅱ.현황 / Ⅱ.과업흐름 / Ⅱ.교육대상 / Ⅱ.분석노트 / 확인
- **Ⅲ. 훈련체계 수립에 대한 사용자 입력 단계 없음** — 역량 모델링 스키마가 `src/lib/schemas/interview-roadmap.ts` 에 정의되어 있지 않음
- LLM 이 Ⅲ-1 역량 모델링을 인터뷰 다른 필드에서 "추론" 해서 생성 중일 가능성 → 산출물 품질 저하 위험
- Ⅰ-2 주요 활동 표는 현재 인터뷰 차수·시간·방법·참석자(`interview_date`, `interview_round`, `interview_time`, `interview_method`, `participants`) 기반으로 HWPX 에 자동 렌더링되고 있는 것으로 보임 (추가 확인 필요)

#### To-be

1. **Ⅲ-1 역량 모델링 인터뷰 스텝 신규 추가 (7번째 스텝)**
   - **필드 (역량 1건 단위, 표 형태로 여러 역량 추가 가능)**:
     - `competency_name` 역량명
     - `competency_definition` 역량 정의(수행준거)
     - `knowledge` 필요 지식 (학술·업무지식)
     - `skill` 필요 기술 (기능)
     - `attitude` 필요 태도
   - **NCS 활용 여부 (boolean)**: `uses_ncs`
     - `true` → `ncs_usage_method` 입력 (NCS 능력단위를 어떻게 참고·수정했는지)
     - `false` → `competency_derivation_method` 입력 (NCS 없이 어떻게 도출했는지)
   - 최소 1개 역량 필수, 여러 개 추가 가능

2. **스키마 확장** (`src/lib/schemas/interview-roadmap.ts`)
   - `competencyModelSchema` 신규 추가
   - `roadmapInterviewSchema.competency_models: z.array(competencyModelSchema).min(1)`
   - `roadmapInterviewSchema.ncs_usage: z.object({ uses_ncs, ncs_usage_method?, competency_derivation_method? })`
   - `roadmapInterviewAutoSaveSchema` 에도 optional 로 추가
   - 테스트 업데이트 (`interview-roadmap.test.ts`)
   - **DB 마이그 불필요** (roadmap_data JSONB 에 저장되므로)

3. **Export 업데이트**
   - HWPX: `src/lib/services/export/hwpx/hwpx-payload-roadmap.ts` — Ⅲ-1 역량 모델링 섹션 페이로드 추가
   - PDF: `src/lib/services/export/pdf/` 해당 파일 — 역량 모델링 표 + NCS 활용 블록 렌더링
   - XLSX: `src/lib/services/export/xlsx/` 해당 파일 — 시트 또는 행 추가

4. **LLM 프롬프트 업데이트** (`src/lib/services/roadmap/roadmap-prompts.ts`)
   - `competency_models` + `ncs_usage` 입력을 프롬프트에 포함
   - Ⅲ-2 훈련체계도 도출 / Ⅲ-3 연간 훈련계획 / Ⅲ-4 훈련과정 상세는 이 역량 모델링을 **직접 참조**해 생성하도록 지시문 강화

5. **Ⅰ-3 `roadmap_summary` LLM 자동 생성 전환** ✅ **확정 (2026-04-21)**
   - 담당자가 "Ⅰ-3 中 '기업 AI 역량 수준' + '선정 과업'만" 이라고 명시 → `roadmap_summary` 는 범위 밖
   - 사용자 입력 필드에서 제거 → **LLM 자동 생성**으로 전환
   - 세부 동작:
     - 인터뷰 UI 의 Ⅰ. 개요 스텝에서 "수립 주요내용 요약" 입력란 **삭제**
     - 로드맵 생성/확정 시 Server Action 에서 LLM 에 Ⅱ·Ⅲ 분석 결과 + 사용자 입력 overview 를 전달해 요약 문단 생성
     - 결과를 `overview.roadmap_summary` 에 저장하여 HWPX/PDF/XLSX Ⅰ-3 영역에 렌더링
     - 확정 페이지 preview 에서는 **"자동 생성됨"** 배지와 함께 결과를 보여주고, 필요 시 수동 편집 가능하도록 textarea 제공 (LLM 결과를 초안으로 활용)
   - 스키마 영향:
     - `overviewSchema` 에서 `roadmap_summary.min(1)` 검증 제거 → autosave 처럼 optional 로 완화 또는 LLM 생성 후 final 단계에서만 검증
     - `roadmapInterviewSchema` 최종 검증 시 `roadmap_summary` 는 optional 처리 (최종 확정 시점에만 LLM 생성 결과로 채워짐)
   - LLM 프롬프트 (Step D 에서): 요약은 1장 이내, 기업 AI 역량 수준·선정 과업·주요 분석 결과·역량 모델링 핵심을 한 눈에 파악 가능한 형태로 작성하도록 지시

#### 확정 사항 (2026-04-21)

- **Ⅱ-1 HRD4U 진단 결과물 첨부 파일 형식** ✅ (2026-04-21 재확정 — HWPX 제외)
  - **허용 MIME**: `application/pdf` **단일 허용** ← LLM 파싱 필요성 때문에 HWPX 제외 (ISSUE-14 와 정책 통일)
  - **크기 제한**: 10MB (진단 보고서 평균 1~3MB 대비 충분)
  - **UI 안내**: "HRD4U 에서 받은 HWPX 파일은 한글에서 '다른 이름으로 저장' → PDF 로 변환 후 업로드해 주세요. 진단 결과가 로드맵 생성에 자동 반영됩니다."
  - **기존 스키마 유지**: `overview.hrd_report_attachment` { storage_path, file_name, mime_type, size, uploaded_at }
  - **LLM 파싱 파이프라인 공유 (ISSUE-14 와 동일)**: PDF 텍스트 추출 → `overview.hrd_report_attachment.extracted_text` 저장 → 프롬프트 포함
  - QA 중 추가 검증 필요: 업로드 후 재조회·삭제·교체 플로우

- **Ⅰ-3 `selected_tasks_summary` 자동 prefill + 편집 허용** ✅
  - Ⅱ-4 `training_targets` 상세 입력이 저장되면 Ⅰ-3 의 요약란에 자동으로 채움 (규칙: `training_targets.map(t => t.task_name).join(', ')`)
  - 컨설턴트가 내용 **편집 가능** (LLM 결과를 초안으로 활용하는 방식과 동일 패턴)
  - 편집 후 Ⅱ-4 가 다시 변경되면: "Ⅱ-4 과업 목록이 변경되었습니다. Ⅰ-3 요약을 재생성하시겠습니까?" 확인 모달 (옵션)
  - 구현 힌트: 인터뷰 스텝 이동 시 또는 `training_targets` 변경 이벤트에서 `selected_tasks_summary` 가 비어 있으면 자동 채우고, 비어 있지 않으면 건드리지 않음 (사용자 편집 존중)

#### 수정 규모 (예측)

- 스키마 + 테스트: 1~2파일
- 인터뷰 UI: 스텝 1개 신규 (+ ProgressBar 업데이트)
- 자동저장 Server Action + 최종 제출 Server Action 업데이트
- Export (HWPX + PDF + XLSX): 각 1섹션 추가
- LLM 프롬프트: 1파일 업데이트
- `roadmap_summary` LLM 자동생성 전환 로직
- E2E 테스트 시나리오 업데이트 (`e2e/consultant/interview-roadmap.spec.ts`)
- **총 예상**: 10~12개 파일, **중~대규모 수정 (2~3일 작업)**

#### 수정 방향 (참고 — QA 종료 후 Plan Mode 에서 Step 단위로 쪼개기)

- **Step A**: `competencyModelSchema` + `ncs_usage` 스키마 추가 + 테스트
- **Step B**: 인터뷰 UI 에 Ⅲ-1 역량 모델링 스텝 추가 + 자동저장 연동
- **Step C**: Export 3종 (HWPX/PDF/XLSX) 섹션 추가 + 시각 검수
- **Step D**: LLM 프롬프트 업데이트 + `roadmap_summary` LLM 자동생성 전환
- **Step E**: E2E 시나리오 업데이트 + QA

#### 스크린샷
별도 첨부 없음 — 근거 자료는 `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf` 양식 전체.

---

### ISSUE-03: PBL/로드맵 테스트 페이지에 "샘플 데이터 채우기" 버튼 추가 + 기본 빈 폼 통일

> 💡 **확정된 방향** (2026-04-21): `/test-pbl` 은 prefill 제거, 양쪽 페이지 모두 **"샘플 데이터 채우기" 버튼**을 새로 추가해 컨설턴트가 필요할 때만 샘플을 채울 수 있도록 함.

- **카테고리**: 기타 (테스트 페이지)
- **심각도**: Medium (+ 기능 추가 포함 → 수정 규모 Medium~Large)
- **환경**: 데스크톱 (컨설턴트 로그인)
- **영향 페이지**: `/test-pbl`, `/test-roadmap`

#### As-is
- `/test-pbl`: 모든 인터뷰 필드(기업명 `샘플정밀공업(주)` · 사업장관리번호 `123-45-67890` · 업종코드 `C29` 등)가 페이지 로드 시 **자동으로 prefilled** 됨
- `/test-roadmap`: 빈 폼으로 시작하지만 **샘플을 자동으로 채우는 버튼도 없음** (컨설턴트가 매번 직접 작성)
- 결과: 두 페이지의 UX 가 **비대칭** — 한쪽은 채워짐, 한쪽은 비어 있음

#### To-be
1. **두 페이지 모두 기본은 빈 폼**
2. **페이지 상단에 "샘플 데이터 채우기" 버튼** 동일 위치·스타일로 배치 (예: PageHeader 우측 또는 안내 Alert 아래)
3. 버튼 클릭 시 **한 번에 모든 인터뷰 단계 필드**가 샘플 데이터로 채워짐 (이미 입력값이 있으면 덮어쓰기 여부 확인 모달 권장)
4. 샘플 데이터 품질: **결과 보고서(로드맵/PBL)가 잘 나오는 수준** — LLM 이 풍부한 분석을 할 수 있는 현실적 기업 사례 (업무·문제·AI 활용 포인트·훈련 과정 설계까지 구체적)

#### 스크린샷
- `screenshots/2026-04-21-qa/ISSUE-03-a-pbl-prefilled.png` (현재 자동 prefilled 된 PBL 인터뷰 1단계)

#### 추정 원인
- `src/app/(dashboard)/test-pbl/page.tsx:4,29` 에서 `PBL_INTERVIEW_SAMPLE` 을 import 해 `<TestPBLClient sampleData={PBL_INTERVIEW_SAMPLE} />` 로 자동 prefill 주입
- `src/app/(dashboard)/test-roadmap/page.tsx` 에는 sampleData prop 자체 없음 → 빈 폼 default 동작
- 두 경로가 다른 철학으로 작성됨

#### 수정 방향 (참고 — QA 종료 후 Plan Mode 에서 확정)

**1) `/test-pbl` 측**
- `page.tsx`: `sampleData` prop 제거, `TestPBLClient` 에서 초기값을 빈 객체로 시작
- `TestPBLClient.tsx`: 상단에 "샘플 데이터 채우기" 버튼 추가 → 클릭 시 `setInterview(PBL_INTERVIEW_SAMPLE)` 로 state 주입
- **기존 `e2e/fixtures/pbl-interview-sample.ts` (175줄) 그대로 재사용** — 이미 충분히 상세하고 LLM 검증 완료됨

**2) `/test-roadmap` 측**
- **신규 작성 필요**: `e2e/fixtures/roadmap-interview-sample.ts` — 현재 존재하지 않음
- 기준: 산인공 양식 1번 (ROADMAP) 인터뷰 6스텝 전체 필드를 채운 현실적 기업 사례
  - Ⅰ. 개요 (AI 역량 수준 · HRD이음 사용 여부)
  - Ⅱ. 기업 현황 4필드
  - Ⅱ. 과업 흐름 (task_workflow_items) — 최소 5~8행
  - Ⅱ. 교육 대상 (training_targets) — 최소 3~5행
  - Ⅱ. 분석 노트 — LLM 이 로드맵 짜기 좋은 수준의 문장 (각 섹션 2~4줄)
- **LLM 로드맵 출력 품질 검증**: fixture 생성 후 실제 `/test-roadmap` 에서 로드맵 생성해보고 Ⅰ장 수립 필요성 · 연간 계획 · NCS 코드 까지 자연스러운지 확인
- `TestRoadmapClient.tsx`: PBL 과 동일한 위치에 "샘플 데이터 채우기" 버튼 추가

**3) 공통**
- 버튼 UX: 이미 입력값이 있는 경우 "기존 입력값이 모두 덮어써집니다. 계속하시겠습니까?" 확인 모달/`confirm()` 권장
- 샘플 fixture 는 Server Action 에서도 참조 가능하도록 `e2e/fixtures/` → `src/lib/fixtures/` 이동 검토 (E2E 와 런타임 모두 사용)
  - 단, 기존 PBL server action 이 이미 `e2e/fixtures/pbl-interview-sample.ts` 를 참조 중 (`test-pbl/page.tsx:4`) 이므로 경로 변경 시 import 전부 업데이트 필요

---

### ISSUE-02: PBL 테스트 페이지 안내 문구에 개발자 변수명 노출 + 사용자 친화도 부족

- **카테고리**: 기타 (테스트 페이지)
- **심각도**: Medium
- **환경**: 데스크톱 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 `kpc@test.com` 로 로그인
  2. `/test-pbl` 접속
  3. 페이지 상단 PageHeader 설명 + "테스트 모드 안내" Alert 박스 확인
- **As-is** (`/test-pbl`):
  - description: `"산인공 양식 2번 기준 PBL 인터뷰 연습 — 샘플 데이터가 미리 채워져 있습니다."`
  - 안내 본문: `"이 화면의 UI/UX는 실제 PBL 인터뷰 화면과 동일합니다. 샘플 데이터를 편집하거나 그대로 두고 'PBL 보고서 생성'을 누르면 LLM이 PBL 보고서 초안을 생성합니다."`
  - 강조 (amber 텍스트): **`"결과는 is_test_mode=true 로 표시된 테스트 프로젝트에 저장되어 실제 프로젝트와 격리됩니다."`** ← 개발자 변수명 `is_test_mode=true` 가 사용자 화면에 그대로 노출
- **To-be**: `/test-roadmap` 과 동일한 톤으로 통일
  - description: `"산인공 양식 2번 기준 PBL 인터뷰 연습 — 입력 내용은 저장되지 않습니다."`
  - 안내 본문: `"이 화면의 UI/UX는 실제 현장 인터뷰(PBL)와 동일합니다. 테스트를 통해 인터뷰 진행 방법을 연습하세요."`
  - 강조 (amber 텍스트): `"입력값은 DB에 저장되지 않으며, 페이지를 떠나면 사라집니다."`
- **스크린샷**: `screenshots/2026-04-21-qa/ISSUE-02-a-pbl-guide-text.png`
- **추정 원인**: `src/app/(dashboard)/test-pbl/TestPBLClient.tsx:342, 351-355` 의 안내 문구가 `/test-roadmap` 의 톤·내용과 분리되어 작성됨. ISSUE-03 과 묶어 함께 수정하면 ISSUE-03 해결 후 "샘플 데이터" 언급도 자연스럽게 제거됨
- **수정 방향 (참고)**: TestRoadmapClient.tsx:415~435 의 안내 블록을 그대로 카피하되 "로드맵" → "PBL", "양식 1번" → "양식 2번" 으로만 치환

---

### ISSUE-01: 공지 첨부 다운로드 시 파일명이 UUID·언더스코어로 깨짐

- **카테고리**: 공지
- **심각도**: High
- **환경**: 데스크톱 (컨설턴트 로그인)
- **재현 경로**:
  1. 컨설턴트 `kpc@test.com` 로 로그인
  2. `/notices` → 첨부 파일이 있는 공지 1건 진입
  3. 첨부 파일 (`AI훈련로드맵 컨설팅 보고서(양식).hwp`, 492.5 KB) 옆 **다운로드** 버튼 클릭
- **As-is**:
  - 화면 표시 파일명: `AI훈련로드맵 컨설팅 보고서(양식).hwp`
  - 다운로드 후 저장된 파일명: `00276347-d02f-481b-b93f-9211b52fd685-AI________________` (UUID prefix + 한글 → 언더스코어 치환, 확장자 유실)
- **To-be**: 다운로드 후 저장된 파일명도 `AI훈련로드맵 컨설팅 보고서(양식).hwp` 그대로 유지
- **스크린샷**:
  - `screenshots/2026-04-21-qa/ISSUE-01-a-attachment-display.png` (공지 첨부 표시)
  - `screenshots/2026-04-21-qa/ISSUE-01-b-downloaded-filename.png` (다운로드 후 깨진 파일명)
- **추정 원인**:
  1. `src/lib/services/notice.ts:496` `createAttachmentSignedUrl` 에서 `createSignedUrl(path, expires)` 호출 시 **`{ download: originalFileName }` 옵션 누락** → Supabase Storage 응답의 `Content-Disposition` 헤더에 storage_path 그대로 반영됨
  2. `src/components/notices/AttachmentList.tsx:53-54` 에서 `<a>` 태그에 `download={att.file_name}` 설정하지만 **`target="_blank"` + cross-origin 응답** 조합이라 브라우저가 `download` 속성 무시 (보안 정책)
- **수정 방향 (참고)**:
  - 정석: `createAttachmentSignedUrl(storagePath, client, expires, originalFileName)` 시그니처에 원본 파일명 추가 → `createSignedUrl(path, expires, { download: originalFileName })` 호출
  - Server Action `getAttachmentDownloadUrl(storagePath)` 도 `(storagePath, fileName)` 으로 시그니처 변경 → 클라이언트에서 `att.file_name` 함께 전달
  - 또는 Server Action 이 path 로 attachment 행 조회해 file_name 자동 획득 (권장 — 클라이언트 위변조 방지)
  - 한글 파일명은 RFC 5987 형식으로 자동 인코딩됨 (`filename*=UTF-8''…`)

---

## 수정 작업 프롬프트 (별도 파일)

20건을 2개 배치로 분할해 처리합니다. 각 배치별 Claude 호출 프롬프트는 **별도 파일**로 분리되어 있습니다:

| 배치 | 대상 이슈 | 브랜치 | 프롬프트 파일 | 상태 |
|------|---------|--------|-------------|------|
| 🔴 Batch 1 | ISSUE-04·06·07·19 (Critical/High 4건 — LLM/스키마) | `fix/batch-1-llm-and-schema` | `docs/prompts/2026-04-22-batch-1-llm-schema.md` | ✅ 머지 (PR #18, main `134fb25`, 2026-04-22) |
| 🟢 인프라 | 커버리지 flaky 마진 보강 | `chore/coverage-margin-boost` | — | ✅ 머지 (PR #19, main `069df4f`, 2026-04-22) |
| 🟢 인프라 | main CI E2E 회귀 수정 (PR E2E 실행·OFA/Batch 1 selector) | `fix/ci-e2e-regressions` | — | ✅ 머지 예정 (PR #20 계획) |
| 🟡 Batch 2 | ISSUE-01·02·03·05·08~18·**20** (UI/UX 16건) | `fix/batch-2-ui-ux` | `docs/prompts/2026-04-22-batch-2-ui-ux.md` | ⏳ 대기 |

### 사용 방법

1. 새 Claude Code 세션 열기
2. 해당 프롬프트 파일(`docs/prompts/2026-04-22-batch-{1|2}-*.md`) 의 **코드블록 내용 전체**를 복사해 첫 메시지로 붙여넣기
3. Plan Mode 계획서 검토 → 승인 → 실행 → PR 생성까지 자동 진행

### 순서 준수

- **Batch 1 먼저** → PR 생성 · 머지 완료까지 확인
- **Batch 2 는 Batch 1 머지 후** 새 세션에서 시작 (Batch 2 가 Batch 1 의 스키마 변경에 의존)

### 공통 테스트 계정

- 운영관리자: `son@test.com` / `aaaa00000`
- 컨설턴트: `kpc@test.com` / `aaaa0000`
