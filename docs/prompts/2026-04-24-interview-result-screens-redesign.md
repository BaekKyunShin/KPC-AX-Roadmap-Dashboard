# AI 훈련 로드맵 / PBL — 인터뷰·결과 페이지 전면 재설계

항상 한국어로 답변할 것.

## 배경

KPC AI 훈련 로드맵 대시보드의 **로드맵/PBL 트랙 인터뷰 페이지·결과 페이지**가 이미 구현되어 있지만, 산인공 공식 양식과 완벽히 1:1 정합하지 않는다. 이번 작업은 4개 화면 전체를 **양식 1:1 정합** 기준으로 전면 재설계·재구현하는 것이다.

## 단일 원천 문서 (반드시 먼저 통독)

- **`docs/references/2026-04-23-current-fields-inventory.md`** — 산인공 공식 양식을 대제목(Ⅰ~Ⅴ) → 중제목(1·2·3·4) → 소제목(가/나/다 또는 □) 계층으로 분해하고, 각 요소를 `표` / `박스` / `체크박스` / `블록` / `PDF 파일 첨부` / `조직도` / `서명 표` 타입으로 명시한 **모든 구현의 기준 문서**. 예시/작성 안내/양식 병합 구조까지 포함.
- `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf` — 양식 1번 정본
- `docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf` — 양식 2번 정본
- `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx`, `2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx` — HWPX 출력 1:1 검증용 원본

## 대상 화면 (4개)

1. **로드맵 인터뷰 화면** (양식 1번 기반)
2. **로드맵 결과 화면** (양식 1번 기반)
3. **PBL 인터뷰 화면** (양식 2번 기반)
4. **PBL 결과 화면** (양식 2번 기반)

## 화면 구성 원칙

### 인터뷰 화면

기준 문서에서 아래 **3개 라벨을 가진 섹션만** 양식 목차 순서(Ⅰ → Ⅱ → Ⅲ …)대로 렌더링:

- `[인터뷰 입력]`
- `[PDF 파일 첨부]`
- `[인터뷰 입력 → 결과 페이지]`

### 결과 화면 (로드맵/PBL 생성 후 노출)

기준 문서에서 아래 **2개 라벨을 가진 섹션만** 렌더링:

- `[결과 페이지 · LLM 생성]`
- `[인터뷰 입력 → 결과 페이지]`

### 절대 화면 노출 금지 (HWPX 출력에만 포함)

- `[결과물 표지]`
- `[고정 참고자료]`
- `[고정 양식 · 결과 화면 제외]` (PBL Ⅳ-4-나 결과평가 계획 · PBL [결과보고서] 전체가 여기 해당)

### UI 공통 규칙

- **양식과 동일한 표 병합 구조**(rowspan/colspan) 재현. 단순 마크다운·단일 `<table>` 로 어려운 경우 React 컴포넌트 + Tailwind로 양식 레이아웃을 **픽셀 단위 근사**.
- **박스형 텍스트 입력란은 기본 6~7줄 높이** (`min-h` 계산치, 한글 기준 약 160–190px). 세로 스크롤 허용, 사용자 수동 리사이즈 가능.
- 체크박스(택1 / 복수)·라디오 그룹은 양식의 라벨·순서·기호(□·☐·☑·①②③④⑤) 그대로.
- 각 섹션 하단의 `(예시)`와 `작성 안내` 블록 노출 (권장: 접기/펼치기 Accordion 또는 인라인 보조 박스).
- 양식 번호 체계(Ⅰ·Ⅱ·Ⅲ → 1·2·3 → 가·나·다 → □)를 사이드바/스테퍼/헤더에 그대로 표기.
- 인터뷰 자동 저장(loose Zod) + 최종 제출(strict Zod) 이중 검증 유지.
- 결과 페이지 DRAFT 상태에서만 인라인 편집, FINAL 확정 시 기존 FINAL → ARCHIVED.

### ⚠️ 4개 화면 UI/스타일 통일 원칙 (반드시 준수)

> 현재 로드맵/PBL 의 인터뷰·결과 화면 4개는 **컨테이너 폭·헤더·다운로드 버튼·액션 바·상태 배지·편집 인터랙션 등이 서로 상이**하다. 항목(데이터)은 트랙별로 다를 수밖에 없지만, **공통 UI 컴포넌트와 레이아웃 규칙은 4개 화면 전체에서 완전히 동일해야 한다.** 이는 본 작업의 명시적 요구사항이며 DoD 로 검증된다.

**통일 대상 (모두 공통 컴포넌트/토큰으로 추출):**

1. **페이지 컨테이너** — `max-width`, 좌우 패딩, 수직 spacing 를 하나의 값으로 통일 (예: `max-w-4xl mx-auto` 또는 `max-w-5xl`, 팀 합의 1개 값 선택).
2. **페이지 헤더** — `PageHeader` 공통 컴포넌트 단일 사용. 제목 폰트 사이즈·뒤로가기·액션 영역 레이아웃 동일.
3. **다운로드 버튼 UI** — PDF / XLSX / HWPX 세 버튼의 스타일(variant, size, icon, 여백, 색)·배치 순서·로딩 스피너 처리 완전 동일. 공통 `DownloadButton` 하나로 통합.
4. **다운로드 동작 방식** — 4개 화면의 hook·에러 토스트·취소 처리·파일명 규칙을 동일 패턴으로 통일. (로드맵·PBL 의 `useRoadmapDownload` / `usePBLDownload` / `useHwpxDownload` 의 시그니처·반환값·에러 UX 단일화.)
5. **상태 배지** — DRAFT / FINAL / ARCHIVED 배지 색·라벨·위치 동일 (`VersionStatusBadge` 공통 컴포넌트).
6. **버전 셀렉터** — 컴포넌트·레이아웃·공유 토글 배치 동일.
7. **재생성 아코디언** — `RegenerateAccordion` 공통 재사용, 프롬프트 입력·버튼 위치 동일.
8. **섹션 카드/탭 UI** — 결과 페이지의 섹션 컨테이너(카드 vs 탭) 스타일·간격·타이포그래피·sticky 동작 통일.
9. **편집 인터랙션** — 인라인 편집 트리거·저장 상태 인디케이터(`저장 중…` / `자동 저장됨` 등)·낙관적 업데이트·롤백 UX 동일.
10. **빈 상태(Empty State)** — 아이콘·문구·CTA 버튼 스타일 동일.
11. **생성 오버레이 / 진행 표시** — 로드맵의 `RoadmapLoadingOverlay` 와 PBL 의 인라인 진행 바 중 **하나의 UX 로 통일**. 취소 버튼 동작 포함.
12. **로딩 스켈레톤 / Suspense 폴백** — 공통 `PageSkeleton` / `SectionSkeleton` 사용.
13. **스텝퍼(인터뷰 화면)** — `InterviewStepper` 단일 컴포넌트. 짧은 이름(shortName)·필수 표시(*)·완료 체크·클릭 네비게이션 동작 동일.
14. **하단 고정 네비게이션 바** — 이전/다음/저장 버튼 배치·크기·색·disabled 스타일 동일.
15. **반응형 브레이크포인트** — 4개 화면이 동일 브레이크포인트에서 동일하게 반응 (모바일/태블릿 레이아웃 일관).

**구현 전략:**

- `src/components/layout/` · `src/components/forms/` · `src/components/result/` 하위에 **공통 컴포넌트 레이어를 신설**하고 4개 화면에서 이를 재사용. 트랙별 차이는 props/children 으로만 해결한다.
- Tailwind 커스텀 토큰(spacing·container-width·section-gap 등)을 `tailwind.config` 또는 CSS 변수로 정의하고 하드코딩 값 제거.
- 리뷰 시 4개 화면을 한 화면에 나란히 띄워 육안 스캔(Storybook 또는 Playwright screenshot grid) 으로 공통성 검증.

**통일 범위 예외 (허용 불일치):**

- 섹션 수·항목명·필드 수 자체 (양식이 다르므로 불가피)
- 특정 트랙 전용 위젯 (예: 조직도 트리, AI역량 수준 체크박스 4등급) — 단, 이들도 스타일 토큰은 공통 사용
- 결과 페이지의 탭 개수·제목 (로드맵은 4탭, PBL 은 섹션 스크롤) — **단, 결정된 형태를 두 트랙에서 가능한 한 동일 패턴으로 맞출 것**. 불일치가 불가피하면 계획서에 사유 명시.

## ⚠️ HWPX 템플릿 재구축 (독립 Step, 절대 건너뛰지 말 것)

> **이 단계는 본 작업의 핵심 산출물이다. 반드시 독립된 Step으로 계획·실행·검증되어야 한다.**
> 인터뷰 화면에서 입력한 **모든 값**과 결과 화면에서 LLM이 생성한 **모든 값**이 **한 개도 빠짐없이** 한글 양식에 1:1로 매핑되어야 한다. 한 항목이라도 HWPX 출력에 누락되거나 치환되지 않은 `{{...}}` 문자열이 노출되면 본 작업은 **완료로 간주하지 않는다.**

### 전제 조건

사용자가 이 Step 착수 전에 **서식(폰트·줄간격 등)을 수정한 정본 HWPX**를 아래 경로에 덮어써 둔 상태다. **항목·내용은 기존과 완전히 동일하며 서식만 다르다.**

- `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx`
- `docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx`

이전 버전은 `docs/references/archive/` 로 이동되어 있어야 한다.

### 수행 작업 (순서 엄수)

1. **원본 교체 확인** — `docs/references/*.hwpx` 가 서식 수정본인지 파일 해시·수정 일자로 검증. archive 폴더에 이전 버전이 백업되었는지 확인.
2. **템플릿 복사** — 새 원본을 `templates/hwpx/roadmap.hwpx` · `templates/hwpx/pbl.hwpx` 로 복사 (원본 손상 금지).
3. **구조 재분석** — `hwpx-docgen` 스킬 + `.claude/skills/hwpx-docgen/scripts/analyze_template.py` 로 두 템플릿의 표 인덱스 · 셀 좌표 · paragraph 번호를 전수 분석. 서식 수정으로 인해 이전 구조 매핑이 달라졌을 수 있으므로 **처음부터 다시** 분석.
4. **플레이스홀더 전수 매핑 표 작성** — 계획서(`docs/plans/2026-04-24-interview-result-screens-redesign.md`) 안에 아래 형식의 **완전한 매핑 표**를 포함한다.

   | 양식 번호 | 양식 섹션 | 양식 요소 (표·박스·체크박스·블록) | 템플릿 표 인덱스 / 셀 좌표 | 플레이스홀더 명 | 데이터 출처 (인터뷰 필드 or 결과 필드) | 치환 전략 |
   |---|---|---|---|---|---|---|

   - 기준 문서(`docs/references/2026-04-23-current-fields-inventory.md`)의 **모든 섹션을 한 줄도 빠짐없이** 표에 포함한다.
   - `[인터뷰 입력]` · `[PDF 파일 첨부]` · `[인터뷰 입력 → 결과 페이지]` · `[결과 페이지 · LLM 생성]` · `[결과물 표지]` · `[고정 참고자료]` · `[고정 양식 · 결과 화면 제외]` **6개 라벨 전부** 대상.
   - `[고정 참고자료]` · `[고정 양식 · 결과 화면 제외]` 섹션은 "양식 원문 유지 / 치환 없음"으로 명시하되 **표에서 생략 금지**.
   - 표지·서명 표·기업체 확인 박스까지 모두 포함.
   - **누락된 항목이 0건임이 cross-check 될 때까지** 표를 확장한다.

5. **플레이스홀더 삽입** — `python-hwpx` 기반 스크립트로 매핑 표의 모든 플레이스홀더(`{{…}}`)를 템플릿에 삽입. **runs 분리 방지를 위해 서식 덩어리 단위로 작성** (서식 경계에서 플레이스홀더가 쪼개지면 치환 실패).
6. **치환 로직 갱신** — `api/hwpx/generate.py` 및 `src/lib/services/roadmap/` · `src/lib/services/pbl/` · `src/lib/services/export/` 하위의 헬퍼를 매핑 표와 정합하도록 **전면 갱신**. 표 인덱스 변경 · 셀 좌표 변경 · 새 필드 추가를 모두 반영.
7. **체크박스·반복 행·조건부 박스 규칙 재정의** — 양식의 체크박스(`□ → ☑`) · 행 반복(차수별 수행일지, 역량 모델링, 교과목 표 등) · 조건부 박스(NCS 활용/미활용 XOR) 규칙을 기준 문서와 완전히 일치시킨다.
8. **샘플 데이터로 출력 검증** — 인터뷰/결과의 모든 필드에 샘플 값을 채운 fixture 를 만들어 HWPX 를 생성하고, **한글 오피스에서 직접 열어** 다음 전부 확인:
   - ① 서식(폰트·줄간격·들여쓰기 등)이 사용자 수정본 그대로 유지되는가
   - ② 표 병합 구조가 양식 PDF와 동일한가
   - ③ 체크박스·반복 행·조건부 박스가 의도대로 토글되는가
   - ④ **치환되지 않은 `{{…}}` 문자열이 0건인가** (grep 검증 스크립트 포함)
   - ⑤ HWPX를 PDF로 변환 후 양식 PDF와 나란히 비교하여 픽셀 수준 근접성 확인
9. **누락 회귀 테스트** — 모든 인터뷰 필드 + 결과 필드에 대해 "빈 값 / 최대 길이 / 특수문자 / 긴 한국어" 네 조합의 Vitest · Playwright 테스트 케이스 작성. CI 상시 검증.

### 플레이스홀더 명명 규칙

- **snake_case**, 양식 섹션 계층을 접두어로 명명:
  - 로드맵 예: `{{roadmap_overview_establishment_necessity}}`, `{{roadmap_cover_company_name}}`
  - PBL 예: `{{pbl_course_overview_company_name}}`, `{{pbl_ope_plan_training_goal}}`
- 반복 행·블록은 인덱스 포함: `{{competency_row_{i}_name}}`, `{{course_spec_{j}_main_content}}`
- 체크박스는 상태 기반 심볼 치환: `{{ai_level_beginner_check}}` → `☑` 또는 `☐`

### HWPX 1:1 동일성 기준

- 섹션 순서 · 번호 체계(Ⅰ → 1 → 가 → □) 완전 일치
- 표 셀 병합(rowspan / colspan) 양식 PDF와 시각적 동일
- 서명 표 · 표지 · 기업체 확인 박스 서식 유지
- 서식 수정본의 폰트·줄간격이 치환 후에도 유지
- 치환되지 않은 `{{...}}` 문자열 **0건**

## 필수 워크플로우 (Superpowers)

1. **`superpowers:brainstorming`** — 착수 직후 요구·설계·엣지케이스 탐색
2. **`superpowers:writing-plans`** — **PlanMode 진입** 후 `docs/plans/2026-04-24-interview-result-screens-redesign.md` 계획서를 작성하고 사용자 승인 대기
3. 승인 후 **`superpowers:executing-plans`** 또는 **`superpowers:subagent-driven-development`** 로 실행 (독립 태스크 3+ 시 병렬)
4. **`superpowers:test-driven-development`** 전면 적용 (예외: 설정 파일·생성 코드)
5. **`superpowers:systematic-debugging`** — 버그·테스트 실패 시
6. **`superpowers:requesting-code-review`** / **`superpowers:receiving-code-review`** — 각 주요 Step 완료 시
7. **`superpowers:verification-before-completion`** — 완료 주장 전 필수

## 필수 스킬

- `frontend-guide` (B2B 대시보드 컴포넌트·반응형·폼·표) — **UI 작업 전반 필수**
- `check-server-action` (actions.ts 5단계 패턴 — 세션 → 역할 → Zod → 비즈니스 → ActionResult)
- `supabase-dev` (스키마·RLS·마이그레이션 변경 시)
- `hwpx-docgen` (HWPX 템플릿 편집 / 표 구성 / 검증)
- `react-best-practices`, `composition-patterns` (구조·성능)
- `web-design-guidelines` (접근성·UX 감사, UI 검수 시)
- `refactoring` (TDD GREEN 이후)

## 필수 MCP

- `context7` — Next.js 16 · Tailwind 4 · Zod · Radix · Recharts 등 최신 문서 조회
- `shadcn` — textarea · table · tabs · accordion · form · radio-group · checkbox 등 최신 컴포넌트 설치
- `serena` — 기존 인터뷰/결과 컴포넌트 심볼 탐색·치환
- `supabase` — 스키마·마이그레이션 적용 (필요 시)
- `sequential-thinking` — 복잡한 표 병합·양식 매핑 추론
- `puppeteer` — **구현 후 실제 브라우저 렌더 결과 스크린샷 → 양식 PDF와 시각 비교**

## 서브에이전트 (필요 시 병렬)

- `test-automator` — 4개 화면의 Vitest + Playwright 시나리오 설계·작성
- `performance-engineer` — 대형 표·장문 폼의 번들·렌더 성능 점검
- `prompt-engineer` — 결과 페이지 LLM 프롬프트 재설계 (양식 1:1 출력 보장)
- `security-auditor` — RLS·역할 검증 변경 시
- `superpowers:code-reviewer` — 단계별 산출물 리뷰

## ⚠️ Definition of Done (모두 충족되어야 완료)

1. 4개 화면이 기준 문서의 라벨 규칙(`[인터뷰 입력]` · `[PDF 파일 첨부]` · `[인터뷰 입력 → 결과 페이지]` · `[결과 페이지 · LLM 생성]`)대로만 구성.
2. 제외 라벨(`[결과물 표지]` · `[고정 참고자료]` · `[고정 양식 · 결과 화면 제외]`)은 화면에 **단 하나도 렌더되지 않음**.
3. **산인공 공식 양식 PDF와 1:1 대조 검증을 반드시 수행**한다.
   - 로드맵 양식 PDF(15p + 별첨·참고자료) / PBL 양식 PDF(20p)의 **모든 섹션·표·박스·체크박스·병합 구조·작성 안내·예시**를 기준 문서와 비교.
   - 불일치 0건이 될 때까지 반복.
   - **대조 리포트**(`docs/reports/2026-04-24-form-parity-report.md`)를 작성하여 각 섹션별 ✅/⚠️/❌ 상태 기록.
   - `puppeteer` 로 실제 렌더 스크린샷을 찍어 PDF와 나란히 첨부.
4. 박스 입력란이 기본 6~7줄 높이로 렌더됨을 실측 검증.
4-1. **4개 화면 UI/스타일 통일 검증** — 컨테이너 폭·헤더·다운로드 버튼(PDF/XLSX/HWPX) 스타일 및 동작·상태 배지·버전 셀렉터·재생성 아코디언·편집 인터랙션·빈 상태·스텝퍼·하단 네비게이션 바·반응형 브레이크포인트가 4개 화면에서 완전히 동일. Storybook 또는 Playwright screenshot grid 로 한 화면에 나란히 띄워 육안 검증 후 스크린샷을 대조 리포트에 첨부.
5. **HWPX 플레이스홀더 전수 매핑 완료** — 기준 문서의 모든 섹션이 빠짐없이 플레이스홀더로 템플릿에 기재됨. 매핑 표가 계획서에 포함되어 있고 cross-check 완료. **누락 항목 0건.**
6. **HWPX 출력 검증** — 다운로드된 결과물에 치환되지 않은 `{{...}}` 문자열이 **0건**. 양식 PDF와 섹션·레이아웃·표 구조·서식(폰트·줄간격)까지 1:1 동일 (Preview 배포 URL + 브리지 서버 `npm run dev:hwpx` 양쪽에서 모두 검증).
7. **한글 오피스 실물 검증** — 생성된 HWPX 를 한글 오피스에서 직접 열어 표 병합·체크박스 토글·반복 행·조건부 박스가 모두 양식과 동일한지 육안 확인. 스크린샷을 대조 리포트에 첨부.
8. 자동 저장 · 최종 제출 · DRAFT → FINAL → ARCHIVED 워크플로우 회귀 없음.
9. `npm run validate && npm run build` 통과.
10. PR CI 전체 pass — **Lint & Typecheck · Unit Test · Build · E2E Test · Vercel** 의 `gh pr checks` 모든 check가 pass. Unit Test만 보고 "통과" 판정 금지.
11. 최종적으로 **`superpowers:verification-before-completion`** 를 호출해 증거 기반 검증 후 완료 선언.

## 진행 방식

**지금 바로 구현하지 말고, PlanMode로 진입하여 아래 순서로 진행:**

1. 먼저 `docs/references/2026-04-23-current-fields-inventory.md` 와 양식 PDF 2개를 통독한다.
2. `superpowers:brainstorming` 으로 요구·제약·엣지케이스를 정리한다.
3. `superpowers:writing-plans` 스킬을 따라 **`docs/plans/2026-04-24-interview-result-screens-redesign.md`** 계획서를 작성한다. 계획서에는 아래가 반드시 포함되어야 한다.
   - 4개 화면별 컴포넌트 트리 · 데이터 플로우 · 상태 관리
   - 기존 코드의 대체/삭제/유지 범위 (파일·경로 구체)
   - 단계별 작업 순서 (TDD: 테스트 → 구현 → 리팩토링)
   - 각 단계에 사용할 **스킬 / MCP / 서브에이전트** 명시
   - **HWPX 템플릿 재구축을 반드시 독립 Step으로** 분리 (위 "⚠️ HWPX 템플릿 재구축" 섹션의 9 단계 수행 항목 전체를 Step 작업 목록에 그대로 포함).
   - **플레이스홀더 전수 매핑 표** — 기준 문서의 모든 섹션을 빠짐없이 포함한 완전한 표를 계획서에 첨부. 한 줄이라도 누락 시 계획 승인 불가.
   - **4개 화면 UI/스타일 통일 Step 독립 분리** — 위 "⚠️ 4개 화면 UI/스타일 통일 원칙" 섹션의 15개 통일 대상 항목을 Step 체크리스트로 변환하고, 공통 컴포넌트 추출 계획·Tailwind 토큰 설계·마이그레이션 순서를 계획서에 명시. 트랙별 차이가 불가피한 항목은 사유 기재.
   - LLM 프롬프트 변경 범위
   - **PDF 1:1 대조 검증 프로토콜** (체크리스트 + 스크린샷 비교 절차 + 대조 리포트 양식)
   - **HWPX 출력 물리 검증 프로토콜** — 샘플 fixture → 생성 → 한글 오피스 실물 확인 → 누락 `{{...}}` grep 검증 → PDF 변환 비교 절차
   - 롤백 전략
   - 예상 PR 분할 안
4. 계획서 작성 후 사용자 승인을 요청한다. **승인 전 구현 코드 수정 금지.**
