# 모바일 반응형 2차 최적화 계획서

## Context

모바일 반응형 최적화 1차 작업(Batch 0~6)이 완료되었으나, 실제 모바일 기기에서 테스트한 결과 10가지 잔여 문제가 발견됨. 스크린샷(`_reference/001.jpeg`~`010.jpeg`)으로 확인된 문제들을 근본적으로 해결한다. 이 계획서는 모바일 사용 경험을 개선하되, **기존 데스크톱 UI/UX를 절대 변경하지 않는** 원칙 하에 모바일 대응 코드만 추가하는 방식으로 진행한다.

**핵심 제약 — 데스크톱 UI 보호 원칙:**

1. **PC UI 보호:** `md:`, `lg:`, `xl:`, `2xl:` 접두사가 붙은 기존 클래스는 수정/삭제 금지. 모바일 대응은 접두사 없는 기본 스타일 또는 `sm:` 접두사로만 추가.
2. **최소 뷰포트 320px:** iPhone SE 기준. 테스트 뷰포트: 320px, 375px, 390px, 428px.

---

## 세션 분배

| 세션 | 이슈 | 난이도 | 예상 규모 |
|------|------|--------|----------|
| **A** | 004, 001 | 소~중 | 간단한 레이아웃 |
| **B** | 007, 008, 010 | 중~고 | 컴포넌트 레이아웃 재설계 |
| **C** | 002, 003, 009 | 중~고 | 차트/데이터 시각화 |

---

## 세션 A: 간단한 레이아웃

### 이슈 004 — 랜딩 페이지 CTA 버튼 가운데 정렬

- **파일:** `src/components/landing/sections/HeroSection.tsx:144-166`
- **현재:** `flex flex-col sm:flex-row gap-4` — 모바일 세로 배치 시 버튼 너비가 각각 다름
- **수정 방향:**
  - 컨테이너에 `items-center` 추가 (모바일 세로 시 가운데 정렬)
  - 두 버튼(`<Link>`, `<a>`) 모두에 `w-full sm:w-auto` 적용
  - Button 자체에도 `w-full` 추가하여 부모 너비에 맞춤
  - 결과: 모바일에서 두 버튼 동일 너비로 가운데 정렬, `sm:` 이상에서는 기존 그대로

### 이슈 001 — 감사로그 드롭다운 라벨 누락

- **파일:** `src/app/(dashboard)/ops/audit/page.tsx:351-371`
- **현재:** 4번째·5번째 `<Input type="date">` 에 `placeholder` 없음
- **문제:** 모바일에서 빈 date input은 용도가 불명확 (빈 셀렉트처럼 보임)
- **수정 방향:**
  - `<Input type="date" ... placeholder="시작일" />` — placeholder 추가
  - `<Input type="date" ... placeholder="종료일" />` — placeholder 추가
  - 참고: HTML `<input type="date">`에서 placeholder는 값이 비어있을 때 일부 브라우저에서 표시됨. 만약 브라우저가 무시하면, 상단에 `<label>` 요소를 추가하거나, 아이콘+텍스트를 별도로 표시

### 세션 A 검증

```bash
npm run typecheck && npm run lint
```

- 브라우저에서 모바일 뷰포트로 랜딩 페이지, 감사로그 페이지 확인
- 데스크톱 뷰포트에서 기존 UI 변경 없음 확인

---

## 세션 B: 컴포넌트 레이아웃 재설계

### 이슈 007 — Likert 5점 척도 라벨 겹침

- **파일:** `src/components/ops/self-assessment/QuestionInputs.tsx`
- **현재:** `grid grid-cols-5 gap-2` — 모바일 320px에서 5개 버튼+라벨이 한 줄에 강제 배치
- **근본 원인:** 반응형 클래스가 전혀 없음. `gap-2`, `px-3 py-2` 모두 고정.
- **수정 방향 (확정: 모바일에서 숫자만 + 양끝 라벨):**
  - 모바일(`< sm`): 숫자 버튼(1~5)만 표시, 라벨(`text-xs`)은 `hidden sm:inline`
  - 버튼 그리드 아래에 양끝 라벨만 별도 표시: `flex justify-between` 으로 "매우 그렇지 않다" ↔ "매우 그렇다"
  - `sm:` 이상: 기존 레이아웃 완전히 유지 (숫자+라벨 함께)
  - 모바일 패딩 축소: `gap-2` → `gap-1.5 sm:gap-2`, `px-3` → `px-2 sm:px-3`

### 이슈 008 — 진행 타임라인 아이콘 텍스트 가림

- **파일:** `src/app/(dashboard)/ops/projects/_components/ProjectTimeline.tsx:202-260`
- **현재 구조 (모바일 세로 타임라인):**
  - 컨테이너: `relative pl-8` (padding-left: 32px)
  - 아이콘: `absolute left-0 h-8 w-8` (0~32px 점유, left 기준은 pl-8 전의 원점)
  - 라벨: `ml-2` (margin-left: 8px → 아이콘 끝 32px + 8px = 40px부터 시작)
- **근본 원인:** `absolute left-0`은 `relative pl-8` 컨테이너의 padding 영역 안에 배치됨. 즉 아이콘이 0~32px을 차지하고, 텍스트는 pl-8(32px) 이후부터 시작하므로 `ml-2`(8px)를 추가하면 40px부터 시작. 그런데 여전히 가려진다면 아이콘의 크기 때문이 아니라, 부모의 `pl-8`이 텍스트 시작점에 반영되지 않는 것.
- **수정 방향:**
  - `pl-8` → `pl-12` (padding-left를 48px로 늘림): 아이콘(32px) + 여유(16px)
  - 또는 `ml-2` → `ml-4` (아이콘과 텍스트 사이 더 넓게)
  - 연결선 위치도 조정: `left-[15px]` → `left-[23px]` (원 중심 위치 맞춤)

### 이슈 010 — 인터뷰 네비게이션 + 푸터 텍스트 겹침

- **파일:**
  - `src/app/(dashboard)/consultant/projects/[id]/interview/page.tsx:475`
  - `src/app/(dashboard)/layout.tsx:38` (FooterCredit 위치)
- **현재:** 인터뷰 페이지의 하단 고정 네비(`fixed bottom-0`)가 FooterCredit("Developed by Baek Kyun Shin")와 시각적으로 겹침. 인터뷰 페이지 콘텐츠에 bottom padding이 없어서, 스크롤 시 푸터 텍스트가 고정 네비 버튼 사이에 보임.
- **수정 방향:**
  - 인터뷰 페이지 전체를 감싸는 div에 `pb-20 md:pb-0` 추가 (모바일에서 고정 네비 높이만큼 하단 여백)
  - 이렇게 하면 스크롤 끝에서 푸터 텍스트가 고정 네비 위에 위치함

### 세션 B 검증

```bash
npm run typecheck && npm run lint
```

- 자가진단 폼: 모바일에서 Likert 척도 라벨 가독성 확인
- 프로젝트 상세: 타임라인 단계명 완전 표시 확인
- 인터뷰 페이지: 하단 네비와 푸터 겹침 해소 확인
- 데스크톱 뷰포트에서 모든 변경 사항이 기존 UI에 영향 없음 확인

---

## 세션 C: 차트/데이터 시각화

### 이슈 002 — 월별 로드맵 확정 현황 차트 라벨 누락

- **파일:** `src/app/(dashboard)/ops/projects/_components/MonthlyCompletionChart.tsx:33-38`
- **데이터 소스:** `src/app/(dashboard)/ops/projects/actions/dashboard.ts:49-107`
- **근본 원인:** Recharts `<XAxis>`에 `interval` prop이 없음. 기본값 `"preserveEnd"`는 모바일 좁은 화면에서 라벨 겹침 방지를 위해 자동으로 일부 tick을 건너뜀.
- **데이터는 정상:** `fetchMonthlyCompletions()`는 최근 6개월 전체를 0건 포함하여 반환 (라인 73-77)
- **수정 방향:**
  - `<XAxis interval={0} ... />` 추가: 모든 tick 라벨 강제 표시
  - 모바일 라벨 겹침 방지: `tick={{ fontSize: 11 }}` 또는 약간 더 작게
  - 라벨 포맷에서 연도 표시 개선: `25년 9월` → `9월` (연도는 첫 번째와 연도 변경 시만)
  - 이미 데이터 소스에서 연도 처리를 하고 있으므로 (`showYear` 로직, 라인 94-103), XAxis 설정만 수정하면 됨

### 이슈 003 — 상태별 프로젝트 분포 도넛 차트 잘림

- **파일:** `src/app/(dashboard)/ops/projects/_components/StatusDistributionChart.tsx:133-168`
- **현재:** `flex items-center gap-4` + `ResponsiveContainer width="50%"` — 차트 50%, 범례 50%
- **근본 원인:** 모바일에서도 가로 배치를 강제. 좁은 화면에서 차트+범례가 찌부됨. 범례 텍스트("신규 등록 완료", "진단결과 입력 완료" 등)가 좁은 공간에서 줄바꿈/잘림.
- **수정 방향:**
  - 컨테이너: `flex items-center gap-4` → `flex flex-col sm:flex-row items-center gap-4`
  - 차트: `width="50%"` → 모바일에서 `width="100%"`, 데스크톱에서 `width="50%"`
  - 실제 구현: 조건부 렌더링 또는 CSS 기반 접근
    - 방법 1: 두 개의 ResponsiveContainer를 렌더링하고 `hidden`/`sm:block` 토글
    - 방법 2 (추천): 부모 div를 `flex-col sm:flex-row`로, 차트 div에 `w-full sm:w-1/2`, 범례 div에 `w-full sm:flex-1`
  - 모바일에서 도넛 차트 `innerRadius`/`outerRadius` 조정 (60/90 → 45/70)
  - 범례: 모바일에서 2열 그리드 (`grid grid-cols-2 sm:block`) 또는 기존 세로 스택

### 이슈 009 — 자가진단 결과 차원 라벨 잘림 + 퍼센트 겹침

- **파일:** `src/components/ui/SelfAssessmentResult.tsx:47-76`
- **현재:** 항목별 점수가 가로 flex 레이아웃 (`flex items-center gap-2 sm:gap-3 flex-wrap`)
- **스크린샷 분석:** 스크린샷 009는 `SelfAssessmentResult.tsx`가 아닌, 별도의 원형 프로그레스(도넛) 5개가 한 줄에 표시되는 뷰. 하지만 코드상 `SelfAssessmentResult.tsx`는 프로그레스 바(수평 막대) 방식. 원형 프로그레스는 다른 곳에서 렌더링될 수 있음.
- **실제 문제 위치:** 스크린샷 009의 원형 프로그레스 5개는 `SelfAssessmentResult.tsx`의 하단부가 아닌, 프로젝트 상세 페이지(`ops/projects/[id]/page.tsx`)에서 SelfAssessmentResult 외부에서 렌더링하는 별도 섹션일 가능성. → 프로젝트 상세 페이지 코드 확인 필요
- **SelfAssessmentResult.tsx 문제 (프로그레스 바 뷰):**
  - 차원명 `w-auto sm:w-28 sm:truncate`: 모바일에서 `w-auto`이지만 flex 한 줄에서 공간 부족 시 잘림
  - 점수 `w-12 sm:w-16`, 퍼센트 `w-10 sm:w-12`: 고정 너비
  - **수정:** 모바일에서 차원명을 full-width로 분리 (2줄 구성) 또는 flex-wrap 활용
- **원형 프로그레스 뷰 (세션에서 추가 탐색 후 수정):**
  - 5개 도넛이 한 줄 배치 → 모바일에서 `grid-cols-3` + `grid-cols-2` 또는 `grid-cols-2 sm:grid-cols-5`
  - 차원 라벨 `truncate` → 모바일에서 줄바꿈 허용 또는 약어 사용
  - 퍼센트 폰트 크기 조정

### 세션 C 검증

```bash
npm run typecheck && npm run lint
```

- 관리자 대시보드: 월별 차트에서 모든 6개월 라벨 표시 확인
- 관리자 대시보드: 도넛 차트 모바일에서 세로 배치 + 범례 가독성 확인
- 프로젝트 상세: 자가진단 결과 라벨/퍼센트 겹침 해소 확인
- 데스크톱 뷰포트에서 모든 변경 사항이 기존 UI에 영향 없음 확인

---

## 세션별 최적 프롬프트

### 세션 A 프롬프트

```
## 배경
모바일 반응형 2차 최적화 작업 (세션 A/3). _reference/ 디렉터리의 스크린샷을 참고.

## 참고 문서
- 계획서: docs/plans/archive/2026-02-20-mobile-responsive-v2-spec.md
- 1차 계획서: docs/plans/archive/2026-02-19-mobile-responsive-spec.md

## 핵심 조건 — 데스크톱 UI 보호 원칙
1. PC UI 보호: md:, lg:, xl:, 2xl: 접두사가 붙은 기존 클래스는 수정/삭제 금지. 모바일 대응은 접두사 없는 기본 스타일 또는 sm: 접두사로만 추가.
2. 최소 뷰포트 320px (iPhone SE 기준). 테스트 뷰포트: 320px, 375px, 390px, 428px.
3. 수정 후 `npm run typecheck && npm run lint` 통과 필수
4. 모바일 사용 경험을 개선하되, **기존 데스크톱 UI/UX를 절대 변경하지 않는** 원칙 하에 모바일 대응 코드만 추가하는 방식으로 구현

## 스킬/MCP 활용
- `frontend-guide` 스킬 호출 후 작업 시작
- 수정 완료 후 puppeteer MCP로 320px, 375px 뷰포트 스크린샷 촬영하여 렌더링 검증
- 작업 완료 직전 `verification-before-completion` 스킬 호출

## 수정 대상 2건

### 1. 랜딩 CTA 버튼 가운데 정렬 (004) — _reference/004.jpeg 참고
- 파일: `src/components/landing/sections/HeroSection.tsx` 144~166행
- 현재: `flex flex-col sm:flex-row gap-4` → 모바일 세로 배치 시 두 버튼 너비가 다름
- 수정:
  - 컨테이너 div에 `items-center` 추가
  - `<Link>`와 `<a>` 태그에 `w-full sm:w-auto` 추가
  - 두 Button 모두에 `w-full` 추가
  - sm: 이상에서는 기존 가로 배치 유지

### 2. 감사로그 필터 라벨 누락 (001) — _reference/001.jpeg 참고
- 파일: `src/app/(dashboard)/ops/audit/page.tsx` 351~371행
- 현재: 4번째, 5번째 `<Input type="date">`에 placeholder 없음 → 모바일에서 빈 셀렉트처럼 보임
- 수정: placeholder="시작일", placeholder="종료일" 추가
- 만약 브라우저가 date input의 placeholder를 무시하면, date 필드 위 또는 앞에 라벨 텍스트를 별도로 표시할 것 (예: `<div className="flex items-center gap-1"><span className="text-xs text-muted-foreground sm:hidden">시작일</span><Input .../></div>`)

## 검증
수정 완료 후 `npm run typecheck && npm run lint` 실행. 커밋은 하지 말 것.
```

### 세션 B 프롬프트

```
## 배경
모바일 반응형 2차 최적화 작업 (세션 B/3). _reference/ 디렉터리의 스크린샷을 참고.

## 참고 문서
- 계획서: docs/plans/archive/2026-02-20-mobile-responsive-v2-spec.md
- 1차 계획서: docs/plans/archive/2026-02-19-mobile-responsive-spec.md

## 핵심 조건 — 데스크톱 UI 보호 원칙
1. PC UI 보호: md:, lg:, xl:, 2xl: 접두사가 붙은 기존 클래스는 수정/삭제 금지. 모바일 대응은 접두사 없는 기본 스타일 또는 sm: 접두사로만 추가.
2. 최소 뷰포트 320px (iPhone SE 기준). 테스트 뷰포트: 320px, 375px, 390px, 428px.
3. 수정 후 `npm run typecheck && npm run lint` 통과 필수
4. 모바일 사용 경험을 개선하되, **기존 데스크톱 UI/UX를 절대 변경하지 않는** 원칙 하에 모바일 대응 코드만 추가하는 방식으로 구현

## 스킬/MCP 활용
- `frontend-guide` 스킬 호출 후 작업 시작
- 수정 완료 후 puppeteer MCP로 320px, 375px 뷰포트 스크린샷 촬영하여 렌더링 검증 (관리자 계정: son@test.com / aaaa0000, 컨설턴트 계정: kpc@test.com / aaaa0000)
- 작업 완료 직전 `verification-before-completion` 스킬 호출

## 수정 대상 3건

### 1. Likert 5점 척도 라벨 겹침 (007) — _reference/007.jpeg 참고
- 파일: `src/components/ops/self-assessment/QuestionInputs.tsx`
- 현재: `grid grid-cols-5 gap-2`에 숫자+라벨이 각 버튼에 함께 표시 → 모바일에서 "매우 그렇지 않다" 등 라벨이 겹침
- 수정 방향:
  - 모바일(< sm): 버튼에서 라벨(`SCALE_5_LABELS`) 숨기고 숫자만 표시 (`hidden sm:inline`)
  - 모바일(< sm): 버튼 그리드 아래에 양끝 라벨만 `flex justify-between`으로 표시: "매우 그렇지 않다" ↔ "매우 그렇다"
  - 모바일 패딩 축소: `gap-2` → `gap-1.5 sm:gap-2`, `px-3` → `px-2 sm:px-3`
  - sm: 이상에서는 기존과 완전히 동일해야 함

### 2. 진행 타임라인 텍스트 가림 (008) — _reference/008.jpeg 참고
- 파일: `src/app/(dashboard)/ops/projects/_components/ProjectTimeline.tsx` 202~260행
- 현재 모바일 세로 타임라인: 컨테이너 `pl-8`, 아이콘 `absolute left-0 h-8 w-8`, 텍스트 `ml-2`
- 문제: 아이콘(32px)이 텍스트 시작 영역을 침범 → "컨설턴트 배정" → "턴트 배정"
- 수정: `pl-8` → `pl-12` (48px 여백), 연결선 `left-[15px]` → `left-[23px]`, 아이콘의 left-0 위치도 필요 시 조정
- 또는 더 간단하게: `ml-2` → `ml-4` (텍스트에 더 넓은 마진)
- 어느 방식이든, 모바일에서만 적용되는 `md:hidden` 블록 안이므로 데스크톱 영향 없음

### 3. 인터뷰 하단 네비와 푸터 텍스트 겹침 (010) — _reference/010.jpeg 참고
- 파일: `src/app/(dashboard)/consultant/projects/[id]/interview/page.tsx`
- 현재: 인터뷰 페이지의 고정 하단 네비(`fixed bottom-0`, 475행)와 대시보드 레이아웃의 FooterCredit("Developed by Baek Kyun Shin")가 모바일에서 시각적으로 겹침
- 원인: 인터뷰 페이지 콘텐츠에 하단 여백이 없어서, 스크롤 끝에서 푸터 텍스트가 고정 네비 버튼 사이로 보임
- 수정: 인터뷰 페이지 전체를 감싸는 최상위 요소에 `pb-20 md:pb-0` 추가 (모바일에서 고정 네비 ~60~80px 높이만큼 여백)
- 참고: FooterCredit은 layout.tsx(38행)에서 렌더링됨

## 검증
수정 완료 후 `npm run typecheck && npm run lint` 실행.
```

### 세션 C 프롬프트

```
## 배경
모바일 반응형 2차 최적화 작업 (세션 C/3). _reference/ 디렉터리의 스크린샷을 참고.

## 참고 문서
- 계획서: docs/plans/archive/2026-02-20-mobile-responsive-v2-spec.md
- 1차 계획서: docs/plans/archive/2026-02-19-mobile-responsive-spec.md

## 핵심 조건 — 데스크톱 UI 보호 원칙
1. PC UI 보호: md:, lg:, xl:, 2xl: 접두사가 붙은 기존 클래스는 수정/삭제 금지. 모바일 대응은 접두사 없는 기본 스타일 또는 sm: 접두사로만 추가.
2. 최소 뷰포트 320px (iPhone SE 기준). 테스트 뷰포트: 320px, 375px, 390px, 428px.
3. 수정 후 `npm run typecheck && npm run lint` 통과 필수
4. 모바일 사용 경험을 개선하되, **기존 데스크톱 UI/UX를 절대 변경하지 않는** 원칙 하에 모바일 대응 코드만 추가하는 방식으로 구현

## 스킬/MCP 활용
- `frontend-guide` 스킬 호출 후 작업 시작
- 수정 완료 후 puppeteer MCP로 320px, 375px 뷰포트 스크린샷 촬영하여 렌더링 검증 (관리자 계정: son@test.com / aaaa0000, 컨설턴트 계정: kpc@test.com / aaaa0000)
- 작업 완료 직전 `verification-before-completion` 스킬 호출

## 수정 대상 3건

### 1. 월별 로드맵 확정 현황 차트 라벨 누락 (002) — _reference/002.jpeg 참고
- 파일: `src/app/(dashboard)/ops/projects/_components/MonthlyCompletionChart.tsx`
- 데이터 소스: `src/app/(dashboard)/ops/projects/actions/dashboard.ts` (fetchMonthlyCompletions 함수)
- 데이터는 정상 (0건인 월도 포함됨, 라인 73-77). 문제는 Recharts XAxis 설정.
- 현재: `<XAxis dataKey="label" tick={{ fontSize: 12 }} ... />` — interval prop 없음
- 원인: Recharts 기본 interval="preserveEnd"가 모바일 좁은 화면에서 일부 tick 건너뜀
- 수정: `<XAxis interval={0} ... />` 추가하여 모든 라벨 강제 표시
- 라벨 겹침 방지: `tick={{ fontSize: 11 }}` + `angle={-30}` 또는 `textAnchor="end"` 적용 (모바일에서 6개 라벨이 겹치지 않도록)

### 2. 상태별 프로젝트 분포 도넛 차트 잘림 (003) — _reference/003.jpeg 참고
- 파일: `src/app/(dashboard)/ops/projects/_components/StatusDistributionChart.tsx`
- 현재: `<div className="flex items-center gap-4">` + `ResponsiveContainer width="50%"` → 모바일에서 차트+범례가 좌우로 압축되어 잘림
- 수정:
  - 컨테이너: `flex items-center gap-4` → `flex flex-col sm:flex-row items-center gap-4`
  - 차트 영역: `ResponsiveContainer width="50%"` → 모바일/데스크톱 분기 처리
    - 방법: 차트를 감싸는 div에 `w-full sm:w-1/2` 적용, ResponsiveContainer는 `width="100%"`로 변경
  - 범례 영역: `flex-1 space-y-1.5` → `w-full sm:flex-1 space-y-1.5`
  - 모바일에서 도넛 차트 크기: `innerRadius={50} outerRadius={80}` 그대로 유지 가능 (전체 너비 사용 시 충분)
  - 범례: 모바일에서 가로 정렬 유지하되, 텍스트가 잘리지 않도록 공간 확보

### 3. 자가진단 결과 차원 라벨 잘림 + 퍼센트 겹침 (009) — _reference/009.jpeg 참고
- 파일: `src/components/ui/SelfAssessmentResult.tsx`
- 스크린샷 분석: 5개 원형 프로그레스(도넛)가 한 줄에 배치되어 라벨 잘림. 이 원형 프로그레스는 SelfAssessmentResult.tsx 외부에 있을 수 있음 → 세션 시작 시 `_reference/009.jpeg`를 보고, 해당 컴포넌트를 먼저 찾아서 수정할 것.
- 탐색 힌트: 프로젝트 상세 페이지 `src/app/(dashboard)/ops/projects/[id]/page.tsx`에서 자가진단 결과 섹션을 찾을 것. 또는 `SelfAssessmentResult.tsx` 자체가 원형 프로그레스를 렌더링하지 않는다면, 별도 컴포넌트를 grep으로 찾아볼 것 (`CircularProgress`, `donut`, `RadialChart` 등 키워드).
- SelfAssessmentResult.tsx의 프로그레스 바 뷰도 확인:
  - 차원명(라인 61): `w-auto sm:w-28 sm:truncate` → 모바일에서 공간 부족 시 잘릴 수 있음
  - 수정: `min-w-0` 추가 + `text-xs sm:text-sm`으로 모바일 폰트 축소
  - 점수/퍼센트: `w-12 sm:w-16` → `w-10 sm:w-16`, `w-10 sm:w-12` → `w-8 sm:w-12`로 모바일 너비 축소

## 검증
수정 완료 후 `npm run typecheck && npm run lint` 실행. 커밋은 하지 말 것.
```

---

## 각 세션 완료 후 후속 작업

세 세션 모두 완료 후:

1. puppeteer MCP로 모바일 뷰포트 스크린샷 촬영하여 수정 결과 확인
2. 데스크톱 뷰포트에서도 기존 UI 변경 없음 최종 확인
3. 변경 로그(`docs/plans/archive/2026-02-19-mobile-responsive-changelog.md`) 업데이트
4. 커밋 생성
