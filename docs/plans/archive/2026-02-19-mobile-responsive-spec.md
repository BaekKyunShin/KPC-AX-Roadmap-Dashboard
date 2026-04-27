# 모바일 반응형 최적화 계획서

> **용도:** 이 계획서는 모바일 반응형 최적화의 마스터 참조 문서이다.
> 각 Batch 세션을 시작할 때 이 문서를 먼저 읽고, 해당 배치의 내용만 정확히 구현한다.

---

## 1. Context

KPC AI 훈련 로드맵 대시보드의 모바일 반응형 최적화 작업이다. 현재 대시보드는 데스크톱 우선으로 설계되어 있어, 다수의 테이블 기반 페이지가 모바일에서 가로 스크롤만 가능한 상태이다. 이 계획서는 모바일 사용 경험을 개선하되, **기존 데스크톱 UI/UX를 절대 변경하지 않는** 원칙 하에 모바일 대응 코드만 추가하는 방식으로 진행한다.

---

## 2. 핵심 원칙 (절대 위반 금지)

1. **PC UI 보호:** `md:`, `lg:`, `xl:`, `2xl:` 접두사가 붙은 기존 클래스는 수정/삭제 금지. 모바일 대응은 접두사 없는 기본 스타일 또는 `sm:` 접두사로만 추가.
2. **최소 뷰포트 320px:** iPhone SE 기준. 테스트 뷰포트: 320px, 375px, 390px, 428px.
3. **한글 줄바꿈:** `word-break: keep-all` + `overflow-wrap: break-word` (Tailwind: `break-keep break-words`). 글자 중간 끊김 방지.

---

## 3. 작업 우선순위 분류

### P0 (필수) — 외부 노출 + 전체 사용자 공통

| 페이지/컴포넌트 | 현재 상태 | 필요 작업 |
|----------------|----------|----------|
| globals.css | 방어 CSS 없음 | `overflow-wrap`, `word-break`, 이미지 max-width 추가 |
| Login (`(auth)/login/page.tsx`) | max-w-md, p-4 — 양호 | break-keep 확인, 미미한 조정 |
| Register (`(auth)/register/page.tsx`) | sm:grid-cols-2 — 양호 | break-keep 확인 |
| Dashboard 메인 (`dashboard/page.tsx`) | max-w-2xl — 양호 | PendingApprovalCard 수정으로 해결 |
| PendingApprovalCard.tsx | 4스텝 수평 배치 → 모바일 오버플로우 | 스텝 모바일 레이아웃 변경 |
| ProfileForm.tsx | 모바일 좌우 패딩 없음 | px-4 추가 |
| Gallery 상세 (`gallery/[id]/page.tsx`) | flex-wrap — 양호 | break-keep 확인 |
| GalleryCard.tsx | line-clamp-2 고정 | 미미한 조정 |
| Demo (`demo/page.tsx`) | 헤더 nav 줄 뜸, 탭 오버플로우 | 반응형 마진/패딩 |
| Pagination.tsx | 터치 영역 작음 | 모바일 패딩 확대 |
| EmptyState.tsx | py-12 고정 | 모바일 py-8 |
| RoadmapLoadingOverlay.tsx | whitespace-nowrap, max-w-md | wrap 허용, 모바일 max-w 조정 |
| SelfAssessmentResult.tsx | w-28 truncate 고정 | 모바일 유동 너비 |
| Skeleton.tsx | 테이블 스켈레톤만 있음 | 모바일 카드 스켈레톤 추가 |

### P1 (권장) — 컨설턴트/운영관리자 모바일 조회

| 페이지/컴포넌트 | 현재 상태 | 필요 작업 |
|----------------|----------|----------|
| Consultant Home (`consultant/home/page.tsx`) | 5카드 grid-cols-2 → 홀수 비대칭 | 마지막 카드 full-width |
| Consultant ProjectList | min-w-[700px] 테이블 | 모바일 카드 뷰 추가 |
| Consultant Project Detail (`[id]/page.tsx`) | lg:grid-cols-5, 모바일 1열 — 양호 | break-keep 확인 |
| Consultant Profile (`consultant/profile/page.tsx`) | ProfileForm 위임 | Batch 1에서 해결 |
| Ops ProjectList | min-w-[900px] 테이블 | 모바일 카드 뷰 추가 |
| StatsSummaryCards | 7카드 grid-cols-2 → 홀수 비대칭 | 가로 스크롤 카드 또는 그리드 조정 |
| MiniStepper | whitespace-nowrap 넘침 | 모바일 wrap 허용 |
| UserManagementTable | min-w-[700px], pl-20 | 모바일 카드 뷰 추가 |
| Ops Audit | min-w-[800px] 테이블 | 모바일 카드 뷰 추가 |
| Ops Quota | min-w-[800px] 테이블 | 모바일 카드 뷰 추가 |
| Ops TemplateList | 퍼센트 너비 → 모바일 압축 | 모바일 카드 뷰 추가 |
| AssignmentTabSection.tsx | gap-3 고정 | 모바일 gap 축소 |

### P2 (선택) — PC 전용 자연

| 페이지/컴포넌트 | 현재 상태 | 필요 작업 |
|----------------|----------|----------|
| Interview (`[id]/interview/page.tsx`) | fixed bottom nav, 탭 오버플로우 | 패딩/크기 반응형 |
| Roadmap Editor (consultant + ops) | 탭 px-6 py-3 오버플로우 | 반응형 패딩 |
| Ops Project New (`ops/projects/new/page.tsx`) | md:grid-cols-2 폼 — 양호 | md:w-1/2 select 조정 |
| Ops Template Detail/New | lg:grid-cols-2 — 양호 | minor 확인 |
| CoursesList.tsx | w-[140px] 라벨, 3내부 테이블 | 라벨 유동화, overflow 개선 |
| SelfAssessmentForm.tsx | spacing 고정 | 모바일 spacing 축소 |
| ConsultantSelector.tsx | gap 고정 | 모바일 gap 축소 |
| Test Roadmap (`test-roadmap/page.tsx`) | 미확인 | 확인 후 조정 |

---

## 4. 글로벌 수정 사항

### 4-1. globals.css 추가 규칙

`@layer base` 블록의 기존 `*` 규칙에 추가:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground font-sans;
  }
  /* === 모바일 방어 코드 (추가) === */
  html {
    overflow-wrap: break-word;
    word-break: keep-all;
    -webkit-text-size-adjust: 100%;
  }
  img, video, svg {
    max-width: 100%;
    height: auto;
  }
}
```

**설명:**
- `overflow-wrap: break-word`: 긴 URL/영문이 컨테이너를 넘지 않도록
- `word-break: keep-all`: 한글 단어 단위 줄바꿈 (글자 중간 끊김 방지)
- `-webkit-text-size-adjust: 100%`: iOS Safari에서 가로 모드 전환 시 텍스트 크기 변경 방지
- `img, video, svg max-width: 100%`: 미디어 요소 뷰포트 초과 방지

### 4-2. 한글 텍스트 줄바꿈 표준

globals.css에서 html 레벨로 `word-break: keep-all`을 적용하므로, 개별 컴포넌트에서 `break-keep`을 반복 추가할 필요는 없다. 단, `whitespace-nowrap`이 적용된 요소는 이를 override해야 하므로 해당 요소에서 `whitespace-nowrap`을 제거하거나 모바일 조건부로 변경한다.

**예외:** `whitespace-nowrap`이 의도적으로 필요한 경우(예: 배지 텍스트, 숫자), `min-w-0`을 부모에 추가하여 flex 축소가 정상 작동하도록 한다.

---

## 5. 공통 패턴 가이드

### 패턴 A: 테이블 → 모바일 카드 뷰 전환

기존 `RoadmapMatrix.tsx`의 패턴을 따른다: `hidden md:block` / `md:hidden`

```tsx
{/* 데스크톱: 테이블 뷰 */}
<div className="hidden md:block overflow-x-auto">
  <table className="min-w-[900px] w-full ...">
    {/* 기존 테이블 코드 그대로 유지 */}
  </table>
</div>

{/* 모바일: 카드 뷰 */}
<div className="md:hidden space-y-3">
  {items.map((item) => (
    <div key={item.id} className="border rounded-lg p-4 space-y-2">
      {/* 주요 정보: 제목 + 상태 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900 break-keep">{item.name}</div>
          <div className="text-sm text-gray-500">{item.subtitle}</div>
        </div>
        <Badge>{item.status}</Badge>
      </div>
      {/* 보조 정보: 키-값 쌍 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="text-gray-500">라벨</div>
        <div className="text-gray-900">{item.value}</div>
      </div>
      {/* 액션 */}
      <div className="flex justify-end pt-2 border-t">
        <Link href={`/path/${item.id}`} className="text-sm text-primary hover:underline">
          상세보기
        </Link>
      </div>
    </div>
  ))}
</div>
```

**핵심 규칙:**
- 데스크톱 테이블은 `hidden md:block`으로 감싸서 md 이상에서만 표시
- 모바일 카드는 `md:hidden`으로 감싸서 md 미만에서만 표시
- 카드 내부에서 `min-w-0 flex-1`로 텍스트 말줄임 보장
- 키-값 쌍은 `grid grid-cols-2`로 정렬

### 패턴 B: 그리드 홀수 비대칭 해결

**방법 1 (권장): 마지막 아이템 full-width**

```tsx
<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
  {cards.map((card, i) => (
    <div
      key={i}
      className={cn(
        "p-4 rounded-lg border",
        // 홀수 개일 때 마지막 아이템 full-width
        i === cards.length - 1 && cards.length % 2 !== 0 && "col-span-2 lg:col-span-1"
      )}
    >
      {/* 카드 내용 */}
    </div>
  ))}
</div>
```

**방법 2: 가로 스크롤 (카드 7개 이상)**

```tsx
<div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-4 lg:grid-cols-7 md:overflow-visible">
  {cards.map((card) => (
    <div key={card.id} className="min-w-[140px] snap-start flex-shrink-0 md:min-w-0 md:flex-shrink">
      {/* 카드 내용 */}
    </div>
  ))}
</div>
```

### 패턴 C: 텍스트 오버플로우 처리

```tsx
{/* 고정 너비 → 유동 너비 전환 */}
{/* Before */}
<span className="w-28 truncate">{text}</span>

{/* After: 모바일에서 유동, 데스크톱에서 고정 */}
<span className="shrink-0 w-auto sm:w-28 sm:truncate break-keep">{text}</span>

{/* whitespace-nowrap 제거 패턴 */}
{/* Before */}
<span className="whitespace-nowrap">{text}</span>

{/* After: 모바일에서 wrap 허용 */}
<span className="sm:whitespace-nowrap">{text}</span>
```

### 패턴 D: 탭 오버플로우 처리

```tsx
{/* Before: 고정 패딩으로 오버플로우 */}
<div className="flex border-b">
  <button className="px-6 py-3 text-sm">탭1</button>
  ...
</div>

{/* After: 모바일에서 패딩 축소 + 스크롤 가능 */}
<div className="flex border-b overflow-x-auto">
  <button className="px-3 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
    탭1
  </button>
  ...
</div>
```

### 패턴 E: 모바일 전용 스타일 추가 컨벤션

```tsx
{/* 기본(모바일) 값을 먼저, sm:/md: 접두사로 데스크톱 값 복원 */}
className="px-3 sm:px-6"        // 모바일 12px → sm 이상 24px
className="text-xs sm:text-sm"  // 모바일 12px → sm 이상 14px
className="gap-2 sm:gap-4"     // 모바일 8px → sm 이상 16px
className="py-8 sm:py-12"      // 모바일 32px → sm 이상 48px

{/* 절대 하지 말 것: 기존 md: 이상 클래스 수정/삭제 */}
// ❌ md:px-6 → md:px-4 (데스크톱 변경)
// ❌ lg:grid-cols-3 삭제 (데스크톱 레이아웃 파괴)
// ✅ px-4 추가 (모바일 기본값 설정) + 기존 sm:px-6 유지
```

---

## 6. 페이지별 수정 계획

### 6-1. globals.css

**파일:** `src/app/globals.css`
**현재 문제:** 글로벌 방어 CSS 없음 (overflow-wrap, word-break, 이미지 max-width)
**수정:**
- `@layer base` 내 `html` 셀렉터 추가: `overflow-wrap: break-word`, `word-break: keep-all`, `-webkit-text-size-adjust: 100%`
- `img, video, svg` 셀렉터 추가: `max-width: 100%`, `height: auto`
**영향 범위:** 전체 앱. 모든 페이지의 텍스트 줄바꿈 동작 변경.
**데스크톱 확인:** `word-break: keep-all`은 한글에만 영향. 데스크톱에서 레이아웃 변화 없음. `overflow-wrap: break-word`는 컨테이너를 넘는 긴 텍스트에만 영향.

### 6-2. Pagination.tsx

**파일:** `src/components/ui/Pagination.tsx`
**현재 문제:** 고정 `px-4`, 터치 영역 44px 미만
**수정:**
- 컨테이너: `px-2 sm:px-4` (모바일 패딩 축소)
- 버튼 간격: `space-x-1 sm:space-x-2` (모바일 간격 축소)
- 페이지 번호 버튼: `min-h-[36px] min-w-[36px]` 추가 (터치 영역 확보)
**영향 범위:** 모든 테이블 페이지의 페이지네이션
**데스크톱 확인:** `sm:` 이상에서 기존 값 유지

### 6-3. EmptyState.tsx

**파일:** `src/components/ui/EmptyState.tsx`
**현재 문제:** `py-12` 고정 → 모바일에서 과대
**수정:**
- `py-12` → `py-8 sm:py-12`
- 아이콘: `h-12 w-12` → `h-10 w-10 sm:h-12 sm:w-12`
**영향 범위:** 빈 상태를 표시하는 모든 페이지
**데스크톱 확인:** `sm:` 이상에서 기존 값 유지

### 6-4. RoadmapLoadingOverlay.tsx

**파일:** `src/components/roadmap/RoadmapLoadingOverlay.tsx`
**현재 문제:** 스텝 라벨 `whitespace-nowrap` (line ~363), 모달 `max-w-md` (line ~553)
**수정:**
- 스텝 라벨: `whitespace-nowrap` → `sm:whitespace-nowrap` (모바일에서 줄바꿈 허용)
- 모달 컨테이너: `max-w-md` → `max-w-[calc(100vw-2rem)] sm:max-w-md` (모바일에서 뷰포트 내 유지)
- 패딩: `p-4` → `p-3 sm:p-4`
**영향 범위:** 로드맵 생성 중 로딩 오버레이
**데스크톱 확인:** `sm:` 이상에서 기존 값 유지

### 6-5. SelfAssessmentResult.tsx

**파일:** `src/components/ui/SelfAssessmentResult.tsx`
**현재 문제:** 차원명 `w-28 truncate` → 모바일에서 7글자 이상 잘림
**수정:**
- `w-28 truncate` → `shrink-0 w-auto sm:w-28 sm:truncate` (모바일에서 전체 표시, sm 이상에서 고정 너비)
- 부모 flex에 `flex-wrap` 추가하여 모바일에서 줄바꿈 허용
- 점수/퍼센트: `w-16`, `w-12` → `w-12 sm:w-16`, `w-10 sm:w-12` (모바일 축소)
**영향 범위:** 자가진단 결과 표시 (ops 프로젝트 상세, 갤러리 상세)
**데스크톱 확인:** `sm:` 이상에서 기존 w-28 truncate 유지

### 6-6. PendingApprovalCard.tsx

**파일:** `src/components/PendingApprovalCard.tsx`
**현재 문제:** 4스텝 `flex items-center justify-between` → 320px에서 오버플로우
**수정:**
- 스텝 컨테이너: `flex items-center justify-between` → `grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between` (모바일 2x2 그리드)
- 스텝 라벨: `text-xs` 유지
- 스텝 간 연결선: `hidden sm:block` (모바일에서 숨김)
**영향 범위:** 승인 대기 중인 사용자의 대시보드
**데스크톱 확인:** `sm:` 이상에서 기존 수평 레이아웃 유지

### 6-7. ProfileForm.tsx

**파일:** `src/components/consultant/ProfileForm.tsx`
**현재 문제:** `max-w-2xl mx-auto` — 모바일에서 좌우 패딩 없이 화면 끝까지 닿음
**수정:**
- 최외곽 컨테이너: `px-4 sm:px-0 max-w-2xl mx-auto` 추가
- 또는 부모 Card 컴포넌트에서 모바일 패딩이 적용되는지 확인 후, 필요 시 추가
**영향 범위:** 컨설턴트 프로필 편집, 대시보드 프로필 관리
**데스크톱 확인:** `sm:px-0`으로 기존 패딩 복원

### 6-8. Demo 페이지

**파일:** `src/app/demo/page.tsx`
**현재 문제:** 헤더 nav 로고+배지+버튼 배치 줄 뜸, 탭 px-6 py-4 오버플로우
**수정:**
- 헤더: `ml-4` → `ml-2 sm:ml-4` (마진 축소)
- 로그인/회원가입 버튼: `gap-4` → `gap-2 sm:gap-4`, 모바일에서 `text-sm` → `text-xs sm:text-sm`
- 탭 버튼: `px-6 py-4` → `px-3 py-2 sm:px-6 sm:py-4`, `text-sm` → `text-xs sm:text-sm`
- 탭 컨테이너: `overflow-x-auto` 추가
**영향 범위:** demo/page.tsx 단일 파일
**데스크톱 확인:** `sm:` 이상에서 기존 크기 유지

### 6-9. Consultant Home — SummaryCards 그리드

**파일:** `src/app/(dashboard)/consultant/home/page.tsx`
**현재 문제:** 5카드 `grid-cols-2 lg:grid-cols-5` → 모바일 2열에서 마지막 1개 홀로
**수정:** 패턴 B-1 적용. 마지막 카드에 `col-span-2 lg:col-span-1` 추가
**영향 범위:** 컨설턴트 홈 단일 파일
**데스크톱 확인:** `lg:col-span-1`으로 기존 5열 유지

### 6-10. Consultant ProjectList — 모바일 카드 뷰

**파일:** `src/app/(dashboard)/consultant/projects/_components/ProjectList.tsx`
**현재 문제:** min-w-[700px] 테이블, 6컬럼 (기업명, 업종, 규모, 상태, 배정일, 작업)
**수정:** 패턴 A 적용
- 데스크톱 테이블: `hidden md:block` 래핑
- 모바일 카드 뷰: `md:hidden` 추가
  - 카드 헤더: 기업명 + 상태 배지
  - 카드 본문: 업종, 규모, 배정일을 `grid grid-cols-2`로 배치
  - 카드 푸터: 상세보기 링크
**영향 범위:** 해당 파일만
**데스크톱 확인:** `hidden md:block`으로 기존 테이블 그대로

### 6-11. Ops ProjectList — 모바일 카드 뷰

**파일:** `src/app/(dashboard)/ops/projects/_components/ProjectList.tsx`
**현재 문제:** min-w-[900px] 테이블, 6컬럼 (기업명+이메일, 업종, 진행상태 MiniStepper, 컨설턴트, 생성일, 작업)
**수정:** 패턴 A 적용
- 데스크톱 테이블: `hidden md:block` 래핑
- 모바일 카드 뷰: `md:hidden` 추가
  - 카드 헤더: 기업명 + 작업 링크
  - 카드 본문 상단: 이메일 `text-xs text-gray-500`
  - 카드 본문: 업종, 컨설턴트, 생성일을 `grid grid-cols-2`로 배치
  - 진행 상태: MiniStepper를 카드 하단에 전체 너비로 표시
**영향 범위:** 해당 파일 + MiniStepper 수정 필요
**데스크톱 확인:** `hidden md:block`으로 기존 테이블 그대로

### 6-12. StatsSummaryCards 그리드

**파일:** `src/app/(dashboard)/ops/projects/_components/StatsSummaryCards.tsx`
**현재 문제:** 7카드 `grid-cols-2 sm:grid-cols-4 lg:grid-cols-7` → 모바일 2열 마지막 홀로, sm 4열 비대칭
**수정:** 패턴 B-2 적용. 모바일에서 가로 스크롤 카드로 전환
- `grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7` → `flex gap-3 overflow-x-auto pb-2 snap-x sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:overflow-visible`
- 각 카드: `min-w-[120px] flex-shrink-0 sm:min-w-0 sm:flex-shrink` 추가
- 스크롤바 스타일링 미니멀 (기본 브라우저)
**영향 범위:** 해당 파일만
**데스크톱 확인:** `sm:grid`로 sm 이상에서 기존 그리드 복원

### 6-13. MiniStepper

**파일:** `src/app/(dashboard)/ops/projects/_components/MiniStepper.tsx`
**현재 문제:** `whitespace-nowrap` (line ~68) → 모바일에서 넘침
**수정:**
- 상태 라벨 + 경과일: `whitespace-nowrap` → `sm:whitespace-nowrap` (모바일에서 줄바꿈 허용)
- 컨테이너: `flex-wrap` 추가 (모바일 대응)
**영향 범위:** ops ProjectList 테이블 + 모바일 카드 내에서 사용
**데스크톱 확인:** `sm:whitespace-nowrap`으로 기존 동작 유지

### 6-14. UserManagementTable — 모바일 카드 뷰

**파일:** `src/components/ops/UserManagementTable.tsx`
**현재 문제:** min-w-[700px] 테이블, pl-20, 6컬럼 (사용자, 역할, 상태, 프로필, 가입일, 관리)
**수정:** 패턴 A 적용
- 데스크톱 테이블: `hidden md:block` 래핑
- `pl-20` → `pl-4 md:pl-20` (모바일 패딩 축소)
- 모바일 카드 뷰: `md:hidden` 추가
  - 카드 헤더: 사용자명 + 역할 배지
  - 카드 본문: 이메일, 전화번호, 상태, 가입일을 `grid grid-cols-2`로 배치
  - 카드 푸터: 프로필 보기 + 관리 액션
**영향 범위:** 해당 파일만
**데스크톱 확인:** `hidden md:block`으로 기존 테이블 그대로, `md:pl-20`으로 기존 패딩 유지

### 6-15. Ops Audit — 모바일 카드 뷰

**파일:** `src/app/(dashboard)/ops/audit/page.tsx`
**현재 문제:** min-w-[800px] 테이블, 6컬럼 (시간, 사용자, 액션, 대상, 상태, 상세)
**수정:** 패턴 A 적용
- 데스크톱 테이블: `hidden md:block` 래핑
- 모바일 카드 뷰: `md:hidden` 추가
  - 카드 헤더: 액션 배지 + 상태 배지
  - 카드 본문: 시간, 사용자, 대상을 세로 배치
  - 상세/오류 메시지: 하단에 `text-xs text-gray-500`으로 표시
**영향 범위:** 해당 파일만
**데스크톱 확인:** `hidden md:block`으로 기존 테이블 그대로

### 6-16. Ops Quota — 모바일 카드 뷰

**파일:** `src/app/(dashboard)/ops/quota/page.tsx`
**현재 문제:** min-w-[800px] 테이블, 6컬럼 (사용자, 역할, 월간사용량, 일일한도, 월간한도, 설정)
**수정:** 패턴 A 적용
- 데스크톱 테이블: `hidden md:block` 래핑
- 모바일 카드 뷰: `md:hidden` 추가
  - 카드 헤더: 사용자명 + 역할 배지
  - 카드 본문: 월간 사용량 프로그레스 바 전체 너비, 일일/월간 한도 2열 배치
  - 카드 푸터: 한도 설정 버튼
**영향 범위:** 해당 파일만
**데스크톱 확인:** `hidden md:block`으로 기존 테이블 그대로

### 6-17. Ops TemplateList — 모바일 카드 뷰

**파일:** `src/app/(dashboard)/ops/templates/_components/TemplateList.tsx`
**현재 문제:** 퍼센트 너비 7컬럼 → 모바일에서 과도 압축
**수정:** 패턴 A 적용
- 데스크톱 테이블: `hidden md:block` 래핑
- 모바일 카드 뷰: `md:hidden` 추가
  - 카드 헤더: 템플릿 이름 + 버전 배지 + 상태 배지
  - 카드 본문: 문항 수, 사용 현황, 생성일
  - 카드 푸터: 편집/관리 링크
**영향 범위:** 해당 파일만
**데스크톱 확인:** `hidden md:block`으로 기존 테이블 그대로

### 6-18. Interview 페이지

**파일:** `src/app/(dashboard)/consultant/projects/[id]/interview/page.tsx`
**현재 문제:** fixed bottom nav, 탭 오버플로우
**수정:**
- 고정 네비 버튼: `p-4` → `p-3 sm:p-4`, 버튼 `text-sm` → `text-xs sm:text-sm`
- 이미 `pb-24`로 공간 확보 — 유지
- 탭/스텝 표시: 현재 `hidden md:block` / `md:hidden` 분기 있으므로 모바일 세로 스텝 확인
**영향 범위:** 해당 파일만
**데스크톱 확인:** `sm:` / `md:` 이상에서 기존 값 유지

### 6-19. Roadmap 탭 오버플로우 (consultant + ops)

**파일:**
- `src/app/(dashboard)/consultant/projects/[id]/roadmap/page.tsx`
- `src/app/(dashboard)/ops/projects/[id]/roadmap/page.tsx`
**현재 문제:** 탭 `px-6 py-3` 고정 → 모바일 오버플로우
**수정:** 패턴 D 적용
- 탭 컨테이너: `overflow-x-auto` 추가
- 탭 버튼: `px-6 py-3` → `px-3 py-2 sm:px-6 sm:py-3`, `text-sm` → `text-xs sm:text-sm`
- 탭 버튼에 `whitespace-nowrap flex-shrink-0` 추가
**영향 범위:** 각 파일만
**데스크톱 확인:** `sm:px-6 sm:py-3`으로 기존 크기 유지

### 6-20. CoursesList 테이블

**파일:** `src/components/roadmap/CoursesList.tsx`
**현재 문제:** `w-[140px]` 라벨 고정, 3개 내부 테이블
**수정:**
- 라벨 컬럼: `w-[140px]` → `w-[100px] sm:w-[140px]` (모바일 축소)
- 커리큘럼 시간 컬럼: `w-[70px]` → `w-[50px] sm:w-[70px]`
- 카드 헤더: `gap-4` → `gap-2 sm:gap-4`
- 테이블 텍스트: `text-sm` → `text-xs sm:text-sm` (공간 절약)
**영향 범위:** 로드맵 상세 보기 (consultant + ops + gallery)
**데스크톱 확인:** `sm:` 이상에서 기존 값 유지

### 6-21. Ops Project New 폼

**파일:** `src/app/(dashboard)/ops/projects/new/page.tsx`
**현재 문제:** `md:w-1/2` select → 모바일에서는 전체 너비 (양호). 전반적으로 양호.
**수정:** minor — break-keep 확인, 필요 시 패딩 조정
**영향 범위:** 해당 파일만
**데스크톱 확인:** 기존 `md:grid-cols-2`, `md:w-1/2` 유지

### 6-22. AssignmentTabSection

**파일:** `src/components/ops/AssignmentTabSection.tsx`
**현재 문제:** `gap-3` 고정
**수정:** `gap-2 sm:gap-3` (모바일 gap 축소)
**영향 범위:** ops 프로젝트 상세의 배정 탭
**데스크톱 확인:** `sm:gap-3`으로 기존 값 유지

### 6-23. Skeleton.tsx — 모바일 카드 스켈레톤

**파일:** `src/components/ui/Skeleton.tsx`
**현재 문제:** 테이블 스켈레톤만 있고, 모바일 카드 스켈레톤 없음
**수정:**
- 각 테이블 스켈레톤 함수에 `hidden md:block` 래핑
- 모바일용 카드 스켈레톤 추가 (`md:hidden`)
- 공통 카드 스켈레톤 패턴: 3-4개 카드 형태 shimmer
**영향 범위:** 모든 loading.tsx 파일에서 사용
**데스크톱 확인:** `hidden md:block`으로 기존 테이블 스켈레톤 유지

---

## 7. 검증 체크리스트

### 7-1. Chrome DevTools 검증 절차

1. Chrome DevTools 열기 (F12)
2. 디바이스 도구바 토글 (Ctrl+Shift+M)
3. 뷰포트 설정: Responsive
4. 아래 너비에서 각 페이지 확인:
   - **320px** (iPhone SE) — 최소 지원
   - **375px** (iPhone 12/13 mini)
   - **390px** (iPhone 14/15)
   - **428px** (iPhone 14/15 Plus)

### 7-2. 페이지별 "깨지지 않음" 판정 기준

| 판정 항목 | 기준 |
|----------|------|
| 가로 오버플로우 | 수평 스크롤바가 body에 나타나지 않음 (테이블 내부 스크롤은 허용) |
| 텍스트 잘림 | 한글이 글자 중간에서 끊기지 않음. 의도적 truncate 제외. |
| 터치 영역 | 버튼/링크의 터치 영역이 최소 36x36px |
| 콘텐츠 겹침 | 요소끼리 겹쳐서 읽을 수 없는 상태가 아님 |
| 카드 뷰 전환 | md 미만에서 카드 뷰 표시, md 이상에서 테이블 표시 |
| 패딩 | 콘텐츠가 화면 좌우 끝에 닿지 않음 (최소 12px 여백) |

### 7-3. 빌드 검증

각 배치 완료 후:
```bash
npm run build
npm run typecheck
```
빌드 에러 없이 완료되어야 함.

### 7-4. 데스크톱 보호 검증

각 배치 완료 후 1024px 이상 뷰포트에서:
- 수정한 페이지의 기존 레이아웃이 동일한지 육안 확인
- 테이블이 여전히 정상 표시되는지 확인
- 그리드 레이아웃이 변경되지 않았는지 확인

---

## 8. 세션 분할 실행 전략

### 의존성 그래프

```
Batch 0 (글로벌 CSS + 공통 UI)
   │
   ├── Batch 1 (Auth + Dashboard + Public)     ← P0
   ├── Batch 2 (Consultant Tables + Cards)     ← P1
   ├── Batch 3 (Ops Tables Part 1)             ← P1
   ├── Batch 4 (Ops Tables Part 2)             ← P1/P2
   └── Batch 5 (Detail + Roadmap Pages)        ← P2
         │
         └── Batch 6 (Skeleton + 나머지 + 최종 검증) ← 전체 완료 후
```

- **Batch 0**은 모든 배치의 선행 조건
- **Batch 1~5**는 서로 독립적 — 순서 무관
- **Batch 6**는 Batch 0~5 전체 완료 후 진행

---

### Batch 0: 글로벌 CSS + 공통 UI 컴포넌트

| 항목 | 내용 |
|------|------|
| **선행 조건** | 없음 |
| **우선순위** | P0 |
| **예상 코드량** | ~120줄 |

**수정 대상 파일:**

| # | 파일 | 수정 요약 |
|---|------|----------|
| 1 | `src/app/globals.css` | `@layer base`에 html overflow-wrap/word-break, img/video/svg max-width 추가 |
| 2 | `src/components/ui/Pagination.tsx` | 컨테이너 `px-2 sm:px-4`, 버튼 간격 `space-x-1 sm:space-x-2`, 터치 영역 `min-h-[36px] min-w-[36px]` |
| 3 | `src/components/ui/EmptyState.tsx` | `py-8 sm:py-12`, 아이콘 `h-10 w-10 sm:h-12 sm:w-12` |
| 4 | `src/components/roadmap/RoadmapLoadingOverlay.tsx` | 스텝 라벨 `sm:whitespace-nowrap`, 모달 `max-w-[calc(100vw-2rem)] sm:max-w-md` |
| 5 | `src/components/ui/SelfAssessmentResult.tsx` | 차원명 `w-auto sm:w-28 sm:truncate`, 점수 `w-12 sm:w-16` |

**세션 종료 검증:**
- [ ] 320px 뷰포트에서 빈 상태, 로딩 오버레이, 페이지네이션 정상 표시
- [ ] 한글 텍스트가 단어 단위로 줄바꿈 (글자 중간 끊김 없음)
- [ ] 이미지가 뷰포트를 넘지 않음
- [ ] `npm run build` 성공
- [ ] 1024px 뷰포트에서 기존 레이아웃 변경 없음

**세션 시작 프롬프트:**

```
글로벌 CSS + 공통 UI 컴포넌트 모바일 반응형 (Batch 0)

## 배경

이 작업은 `docs/plans/archive/2026-02-19-mobile-responsive-spec.md` 계획서의 Batch 0에 해당한다.
계획서를 먼저 읽고, 이 배치의 내용만 정확히 구현해줘.

## 핵심 원칙

1. PC(데스크톱) UI/UX 절대 변경 금지 — md: 이상 기존 클래스 수정/삭제 금지
2. 모바일 대응 코드만 추가 (기본 스타일 또는 sm: 접두사)
3. 한글 텍스트는 글로벌 CSS에서 word-break: keep-all 적용

## 이 배치에서 수정할 파일

- `src/app/globals.css`: @layer base에 html overflow-wrap/word-break + img/video/svg max-width 추가
- `src/components/ui/Pagination.tsx`: 모바일 패딩 축소(px-2 sm:px-4), 버튼 간격(space-x-1 sm:space-x-2), 터치 영역 확보(min-h-[36px])
- `src/components/ui/EmptyState.tsx`: 모바일 패딩 축소(py-8 sm:py-12), 아이콘 크기(h-10 w-10 sm:h-12 sm:w-12)
- `src/components/roadmap/RoadmapLoadingOverlay.tsx`: whitespace-nowrap → sm:whitespace-nowrap, 모달 max-w-[calc(100vw-2rem)] sm:max-w-md
- `src/components/ui/SelfAssessmentResult.tsx`: w-28 truncate → w-auto sm:w-28 sm:truncate, 점수 너비 축소

## 선행 배치 완료 사항

- 없음 (이 배치가 최초 배치)

## 완료 기준

- [ ] 320px 뷰포트에서 공통 컴포넌트 레이아웃 깨짐 없음
- [ ] 375px 뷰포트에서 한글 텍스트 단어 단위 줄바꿈 정상
- [ ] npm run build 성공
- [ ] 1024px 뷰포트에서 기존 데스크톱 레이아웃 변경 없음 확인
```

---

### Batch 1: Auth + 공통 대시보드 + Public 페이지

| 항목 | 내용 |
|------|------|
| **선행 조건** | Batch 0 |
| **우선순위** | P0 |
| **예상 코드량** | ~200줄 |

**수정 대상 파일:**

| # | 파일 | 수정 요약 |
|---|------|----------|
| 1 | `src/app/(auth)/login/page.tsx` | break-keep 확인 (globals.css로 이미 적용). 필요 시 미미한 패딩 조정 |
| 2 | `src/app/(auth)/register/page.tsx` | 동일. sm:grid-cols-2 이미 양호 |
| 3 | `src/app/(dashboard)/dashboard/page.tsx` | PendingApprovalCard 수정과 연동 확인 |
| 4 | `src/components/PendingApprovalCard.tsx` | 진행 단계 `grid grid-cols-2 gap-3 sm:flex sm:justify-between`, 연결선 `hidden sm:block` |
| 5 | `src/components/consultant/ProfileForm.tsx` | 최외곽 `px-4 sm:px-0` 패딩 추가 |
| 6 | `src/components/gallery/GalleryCard.tsx` | break-keep 확인, line-clamp 미미한 조정 |
| 7 | `src/app/(dashboard)/gallery/[id]/page.tsx` | break-keep 확인, flex-wrap 양호 |
| 8 | `src/app/demo/page.tsx` | 헤더 마진 `ml-2 sm:ml-4`, 탭 `px-3 py-2 sm:px-6 sm:py-4` + `overflow-x-auto`, 버튼 `gap-2 sm:gap-4` |

**세션 종료 검증:**
- [ ] 320px에서 로그인/회원가입 폼이 화면 내에 들어감
- [ ] PendingApprovalCard 스텝이 320px에서 2x2 그리드로 정상 표시
- [ ] ProfileForm이 모바일에서 좌우 여백 있음
- [ ] 데모 페이지 헤더/탭이 320px에서 오버플로우 없음
- [ ] `npm run build` 성공
- [ ] 1024px 뷰포트에서 기존 레이아웃 변경 없음

**세션 시작 프롬프트:**

```
Auth + 공통 대시보드 + Public 페이지 모바일 반응형 (Batch 1)

## 배경

이 작업은 `docs/plans/archive/2026-02-19-mobile-responsive-spec.md` 계획서의 Batch 1에 해당한다.
계획서를 먼저 읽고, 이 배치의 내용만 정확히 구현해줘.

## 핵심 원칙

1. PC(데스크톱) UI/UX 절대 변경 금지 — md: 이상 기존 클래스 수정/삭제 금지
2. 모바일 대응 코드만 추가 (기본 스타일 또는 sm: 접두사)
3. 한글 텍스트는 break-keep break-words 적용

## 이 배치에서 수정할 파일

- `src/app/(auth)/login/page.tsx`: break-keep 확인, 미미한 조정
- `src/app/(auth)/register/page.tsx`: break-keep 확인
- `src/app/(dashboard)/dashboard/page.tsx`: PendingApprovalCard 연동 확인
- `src/components/PendingApprovalCard.tsx`: 진행 단계 grid grid-cols-2 sm:flex 전환, 연결선 hidden sm:block
- `src/components/consultant/ProfileForm.tsx`: 최외곽 px-4 sm:px-0 패딩 추가
- `src/components/gallery/GalleryCard.tsx`: break-keep 확인
- `src/app/(dashboard)/gallery/[id]/page.tsx`: break-keep 확인
- `src/app/demo/page.tsx`: 헤더 마진/gap 반응형, 탭 px-3 py-2 sm:px-6 sm:py-4 + overflow-x-auto

## 선행 배치 완료 사항

- Batch 0에서 globals.css에 word-break: keep-all, overflow-wrap: break-word 이미 적용됨
- 개별 컴포넌트에서 break-keep 반복 추가 불필요 (whitespace-nowrap override 시에만 필요)

## 완료 기준

- [ ] 320px 뷰포트에서 로그인/회원가입/대시보드/데모 레이아웃 깨짐 없음
- [ ] PendingApprovalCard 320px에서 2x2 그리드 표시
- [ ] 375px 뷰포트에서 텍스트 줄바꿈 정상
- [ ] npm run build 성공
- [ ] 기존 데스크톱 레이아웃 변경 없음 확인
```

---

### Batch 2: 컨설턴트 영역 (테이블 + 카드)

| 항목 | 내용 |
|------|------|
| **선행 조건** | Batch 0 |
| **우선순위** | P1 |
| **예상 코드량** | ~200줄 |

**수정 대상 파일:**

| # | 파일 | 수정 요약 |
|---|------|----------|
| 1 | `src/app/(dashboard)/consultant/home/page.tsx` | SummaryCards 마지막 카드 `col-span-2 lg:col-span-1` 추가 |
| 2 | `src/app/(dashboard)/consultant/projects/_components/ProjectList.tsx` | 모바일 카드 뷰 추가 (패턴 A). 기업명+상태 헤더, 업종/규모/배정일 grid-cols-2, 상세보기 링크 |
| 3 | `src/app/(dashboard)/consultant/projects/[id]/page.tsx` | break-keep 확인 (lg:grid-cols-5 모바일 1열 이미 양호) |
| 4 | `src/app/(dashboard)/consultant/profile/page.tsx` | ProfileForm 연동 확인 (Batch 1에서 수정) |
| 5 | `src/components/ops/AssignmentTabSection.tsx` | `gap-2 sm:gap-3` 모바일 gap 축소 |

**세션 종료 검증:**
- [ ] 320px에서 컨설턴트 프로젝트 목록이 카드 뷰로 표시
- [ ] 768px 이상에서 기존 테이블 뷰 그대로
- [ ] 컨설턴트 홈 SummaryCards 320px에서 마지막 카드 full-width
- [ ] `npm run build` 성공
- [ ] 1024px 뷰포트에서 기존 레이아웃 변경 없음

**세션 시작 프롬프트:**

```
컨설턴트 영역 모바일 반응형 (Batch 2)

## 배경

이 작업은 `docs/plans/archive/2026-02-19-mobile-responsive-spec.md` 계획서의 Batch 2에 해당한다.
계획서를 먼저 읽고, 이 배치의 내용만 정확히 구현해줘.

## 핵심 원칙

1. PC(데스크톱) UI/UX 절대 변경 금지 — md: 이상 기존 클래스 수정/삭제 금지
2. 모바일 대응 코드만 추가 (기본 스타일 또는 sm: 접두사)
3. 테이블 → 모바일 카드 뷰 전환은 hidden md:block / md:hidden 패턴 사용

## 이 배치에서 수정할 파일

- `src/app/(dashboard)/consultant/home/page.tsx`: SummaryCards 마지막 카드 col-span-2 lg:col-span-1
- `src/app/(dashboard)/consultant/projects/_components/ProjectList.tsx`: 모바일 카드 뷰 추가 (hidden md:block + md:hidden)
- `src/app/(dashboard)/consultant/projects/[id]/page.tsx`: break-keep 확인
- `src/app/(dashboard)/consultant/profile/page.tsx`: ProfileForm 패딩 확인
- `src/components/ops/AssignmentTabSection.tsx`: gap-2 sm:gap-3

## 선행 배치 완료 사항

- Batch 0: globals.css에 word-break: keep-all, overflow-wrap: break-word 적용됨
- Batch 0: SelfAssessmentResult.tsx w-28 → w-auto sm:w-28 수정됨

## 카드 뷰 구현 참조

계획서 섹션 5 "공통 패턴 가이드 > 패턴 A" 또는 src/components/roadmap/RoadmapMatrix.tsx의 hidden md:block / md:hidden 패턴 참조.

컨설턴트 ProjectList 카드 뷰 구성:
- 카드 헤더: 기업명 (font-medium) + 상태 Badge
- 카드 본문: 업종, 규모, 배정일을 grid grid-cols-2 gap-x-4 gap-y-1 text-sm
- 카드 푸터: 상세보기 링크 (border-t pt-2)

## 완료 기준

- [ ] 320px 뷰포트에서 프로젝트 목록이 카드 뷰로 표시
- [ ] 768px 이상에서 기존 테이블 뷰 그대로
- [ ] 컨설턴트 홈 SummaryCards 320px에서 그리드 비대칭 해결
- [ ] npm run build 성공
- [ ] 기존 데스크톱 레이아웃 변경 없음 확인
```

---

### Batch 3: Ops 테이블 Part 1 (프로젝트 + 사용자)

| 항목 | 내용 |
|------|------|
| **선행 조건** | Batch 0 |
| **우선순위** | P1 |
| **예상 코드량** | ~300줄 |

**수정 대상 파일:**

| # | 파일 | 수정 요약 |
|---|------|----------|
| 1 | `src/app/(dashboard)/ops/projects/_components/ProjectList.tsx` | 모바일 카드 뷰 추가. 기업명+작업 헤더, 이메일, 업종/컨설턴트/생성일 grid, MiniStepper 전체 너비 |
| 2 | `src/app/(dashboard)/ops/projects/_components/StatsSummaryCards.tsx` | 모바일 가로 스크롤: `flex gap-3 overflow-x-auto snap-x sm:grid sm:grid-cols-4 lg:grid-cols-7` |
| 3 | `src/app/(dashboard)/ops/projects/_components/MiniStepper.tsx` | `whitespace-nowrap` → `sm:whitespace-nowrap`, 컨테이너 `flex-wrap` 추가 |
| 4 | `src/components/ops/UserManagementTable.tsx` | 모바일 카드 뷰 추가. `pl-20` → `pl-4 md:pl-20`. 사용자명+역할 헤더, 이메일/상태/가입일 grid, 관리 버튼 |

**세션 종료 검증:**
- [ ] 320px에서 ops 프로젝트 목록/사용자 관리가 카드 뷰로 표시
- [ ] StatsSummaryCards가 320px에서 가로 스크롤 가능
- [ ] MiniStepper가 320px에서 텍스트 줄바꿈 정상
- [ ] 768px 이상에서 모든 기존 테이블 뷰 그대로
- [ ] `npm run build` 성공
- [ ] 1024px 뷰포트에서 기존 레이아웃 변경 없음

**세션 시작 프롬프트:**

```
Ops 테이블 Part 1 모바일 반응형 (Batch 3)

## 배경

이 작업은 `docs/plans/archive/2026-02-19-mobile-responsive-spec.md` 계획서의 Batch 3에 해당한다.
계획서를 먼저 읽고, 이 배치의 내용만 정확히 구현해줘.

## 핵심 원칙

1. PC(데스크톱) UI/UX 절대 변경 금지 — md: 이상 기존 클래스 수정/삭제 금지
2. 모바일 대응 코드만 추가 (기본 스타일 또는 sm: 접두사)
3. 테이블 → 모바일 카드 뷰 전환은 hidden md:block / md:hidden 패턴 사용

## 이 배치에서 수정할 파일

- `src/app/(dashboard)/ops/projects/_components/ProjectList.tsx`: 모바일 카드 뷰 추가 (기업명+작업 헤더, 이메일, 업종/컨설턴트/생성일 grid, MiniStepper 전체 너비)
- `src/app/(dashboard)/ops/projects/_components/StatsSummaryCards.tsx`: 모바일 가로 스크롤 (flex overflow-x-auto snap-x → sm:grid sm:grid-cols-4 lg:grid-cols-7)
- `src/app/(dashboard)/ops/projects/_components/MiniStepper.tsx`: whitespace-nowrap → sm:whitespace-nowrap, flex-wrap 추가
- `src/components/ops/UserManagementTable.tsx`: 모바일 카드 뷰 추가 + pl-20 → pl-4 md:pl-20

## 선행 배치 완료 사항

- Batch 0: globals.css에 word-break: keep-all, overflow-wrap: break-word 적용됨
- Batch 0: Pagination, EmptyState 등 공통 컴포넌트 모바일 최적화 완료

## 카드 뷰 구현 참조

계획서 섹션 5 "공통 패턴 가이드 > 패턴 A" 참조. RoadmapMatrix.tsx (src/components/roadmap/RoadmapMatrix.tsx)의 hidden md:block / md:hidden 패턴 참조.

Ops ProjectList 카드 뷰 구성:
- 카드 헤더: 기업명 (font-medium) + 상세보기 Link
- 이메일: text-xs text-gray-500
- 카드 본문: 업종, 담당 컨설턴트, 생성일을 grid grid-cols-2
- MiniStepper: 카드 하단 전체 너비, border-t pt-2

UserManagementTable 카드 뷰 구성:
- 카드 헤더: 사용자명 + 역할 Badge
- 카드 본문: 이메일, 전화번호, 상태, 가입일을 grid grid-cols-2
- 카드 푸터: 프로필 보기 + 관리 액션

## 완료 기준

- [ ] 320px 뷰포트에서 프로젝트 목록/사용자 관리가 카드 뷰로 표시
- [ ] StatsSummaryCards 320px에서 가로 스크롤 가능
- [ ] 768px 이상에서 기존 테이블 뷰 그대로
- [ ] npm run build 성공
- [ ] 기존 데스크톱 레이아웃 변경 없음 확인
```

---

### Batch 4: Ops 테이블 Part 2 (감사 + 쿼터 + 템플릿)

| 항목 | 내용 |
|------|------|
| **선행 조건** | Batch 0 |
| **우선순위** | P1/P2 |
| **예상 코드량** | ~280줄 |

**수정 대상 파일:**

| # | 파일 | 수정 요약 |
|---|------|----------|
| 1 | `src/app/(dashboard)/ops/audit/page.tsx` | 모바일 카드 뷰 추가. 액션+상태 배지 헤더, 시간/사용자/대상 세로 배치, 상세 text-xs |
| 2 | `src/app/(dashboard)/ops/quota/page.tsx` | 모바일 카드 뷰 추가. 사용자+역할 헤더, 프로그레스 바 전체 너비, 한도 2열 |
| 3 | `src/app/(dashboard)/ops/templates/_components/TemplateList.tsx` | 모바일 카드 뷰 추가. 이름+버전+상태 헤더, 문항수/사용현황/생성일, 편집 링크 |

**세션 종료 검증:**
- [ ] 320px에서 감사 로그/쿼터/템플릿 목록이 카드 뷰로 표시
- [ ] 768px 이상에서 모든 기존 테이블 뷰 그대로
- [ ] `npm run build` 성공
- [ ] 1024px 뷰포트에서 기존 레이아웃 변경 없음

**세션 시작 프롬프트:**

```
Ops 테이블 Part 2 모바일 반응형 (Batch 4)

## 배경

이 작업은 `docs/plans/archive/2026-02-19-mobile-responsive-spec.md` 계획서의 Batch 4에 해당한다.
계획서를 먼저 읽고, 이 배치의 내용만 정확히 구현해줘.

## 핵심 원칙

1. PC(데스크톱) UI/UX 절대 변경 금지 — md: 이상 기존 클래스 수정/삭제 금지
2. 모바일 대응 코드만 추가 (기본 스타일 또는 sm: 접두사)
3. 테이블 → 모바일 카드 뷰 전환은 hidden md:block / md:hidden 패턴 사용

## 이 배치에서 수정할 파일

- `src/app/(dashboard)/ops/audit/page.tsx`: 모바일 카드 뷰 추가 (액션+상태 배지 헤더, 시간/사용자/대상 세로 배치)
- `src/app/(dashboard)/ops/quota/page.tsx`: 모바일 카드 뷰 추가 (사용자+역할 헤더, 프로그레스 바 전체 너비, 한도 2열)
- `src/app/(dashboard)/ops/templates/_components/TemplateList.tsx`: 모바일 카드 뷰 추가 (이름+버전+상태 헤더, 문항수/사용현황/생성일)

## 선행 배치 완료 사항

- Batch 0: globals.css에 word-break: keep-all, overflow-wrap: break-word 적용됨
- Batch 0: Pagination, EmptyState 공통 컴포넌트 최적화 완료

## 카드 뷰 구현 참조

계획서 섹션 5 "공통 패턴 가이드 > 패턴 A" 참조.

Audit 카드 뷰 구성:
- 카드 헤더: 액션 Badge + 상태 Badge
- 카드 본문: 시간 (text-xs text-gray-500), 사용자명+이메일, 대상 타입+ID
- 카드 하단: 오류 메시지 또는 상세 정보 (text-xs)

Quota 카드 뷰 구성:
- 카드 헤더: 사용자명 + 역할 Badge
- 카드 본문: 이메일 (text-xs), 월간 사용량 프로그레스 바 (전체 너비)
- 카드 본문: 일일/월간 한도 grid grid-cols-2
- 카드 푸터: 한도 설정 버튼

TemplateList 카드 뷰 구성:
- 카드 헤더: 템플릿 이름 + 버전 Badge + 상태 Badge
- 카드 본문: 문항 수, 사용 현황, 생성일
- 카드 푸터: 편집/관리 링크

## 완료 기준

- [ ] 320px 뷰포트에서 감사로그/쿼터/템플릿이 카드 뷰로 표시
- [ ] 768px 이상에서 기존 테이블 뷰 그대로
- [ ] npm run build 성공
- [ ] 기존 데스크톱 레이아웃 변경 없음 확인
```

---

### Batch 5: 상세 + 로드맵 페이지

| 항목 | 내용 |
|------|------|
| **선행 조건** | Batch 0 |
| **우선순위** | P2 |
| **예상 코드량** | ~200줄 |

**수정 대상 파일:**

| # | 파일 | 수정 요약 |
|---|------|----------|
| 1 | `src/app/(dashboard)/consultant/projects/[id]/interview/page.tsx` | 고정 nav 패딩 `p-3 sm:p-4`, 버튼 `text-xs sm:text-sm` |
| 2 | `src/app/(dashboard)/consultant/projects/[id]/roadmap/page.tsx` | 탭 `px-3 py-2 sm:px-6 sm:py-3` + `overflow-x-auto`, 탭 버튼 `whitespace-nowrap flex-shrink-0` |
| 3 | `src/app/(dashboard)/ops/projects/[id]/page.tsx` | break-keep 확인 (이미 적용됨), minor 확인 |
| 4 | `src/app/(dashboard)/ops/projects/[id]/roadmap/page.tsx` | 탭 동일 수정 (consultant roadmap과 동일 패턴) |
| 5 | `src/app/(dashboard)/ops/projects/new/page.tsx` | break-keep 확인, 폼 양호 |
| 6 | `src/components/roadmap/CoursesList.tsx` | 라벨 `w-[100px] sm:w-[140px]`, 시간 `w-[50px] sm:w-[70px]`, 텍스트 `text-xs sm:text-sm` |
| 7 | `src/app/(dashboard)/ops/templates/[id]/page.tsx` | break-keep 확인, lg:grid-cols-2 모바일 1열 양호 |

**세션 종료 검증:**
- [ ] 320px에서 인터뷰 페이지 고정 nav가 화면 내에 들어감
- [ ] 320px에서 로드맵 탭이 스크롤 가능하고 오버플로우 없음
- [ ] CoursesList 테이블이 320px에서 읽을 수 있음
- [ ] `npm run build` 성공
- [ ] 1024px 뷰포트에서 기존 레이아웃 변경 없음

**세션 시작 프롬프트:**

```
상세 + 로드맵 페이지 모바일 반응형 (Batch 5)

## 배경

이 작업은 `docs/plans/archive/2026-02-19-mobile-responsive-spec.md` 계획서의 Batch 5에 해당한다.
계획서를 먼저 읽고, 이 배치의 내용만 정확히 구현해줘.

## 핵심 원칙

1. PC(데스크톱) UI/UX 절대 변경 금지 — md: 이상 기존 클래스 수정/삭제 금지
2. 모바일 대응 코드만 추가 (기본 스타일 또는 sm: 접두사)
3. 탭 오버플로우는 overflow-x-auto + whitespace-nowrap + flex-shrink-0 패턴으로 해결

## 이 배치에서 수정할 파일

- `src/app/(dashboard)/consultant/projects/[id]/interview/page.tsx`: 고정 nav p-3 sm:p-4, 버튼 text-xs sm:text-sm
- `src/app/(dashboard)/consultant/projects/[id]/roadmap/page.tsx`: 탭 px-3 py-2 sm:px-6 sm:py-3, overflow-x-auto
- `src/app/(dashboard)/ops/projects/[id]/page.tsx`: break-keep 확인
- `src/app/(dashboard)/ops/projects/[id]/roadmap/page.tsx`: 탭 동일 수정
- `src/app/(dashboard)/ops/projects/new/page.tsx`: break-keep 확인
- `src/components/roadmap/CoursesList.tsx`: 라벨 w-[100px] sm:w-[140px], 시간 w-[50px] sm:w-[70px], text-xs sm:text-sm
- `src/app/(dashboard)/ops/templates/[id]/page.tsx`: break-keep 확인

## 선행 배치 완료 사항

- Batch 0: globals.css에 word-break: keep-all, overflow-wrap: break-word 적용됨
- Batch 0: RoadmapLoadingOverlay whitespace-nowrap → sm:whitespace-nowrap 수정됨
- Batch 0: SelfAssessmentResult w-28 → w-auto sm:w-28 수정됨

## 완료 기준

- [ ] 320px 뷰포트에서 인터뷰/로드맵 페이지 레이아웃 깨짐 없음
- [ ] 로드맵 탭 320px에서 스크롤 가능
- [ ] CoursesList 320px에서 텍스트 읽기 가능
- [ ] npm run build 성공
- [ ] 기존 데스크톱 레이아웃 변경 없음 확인
```

---

### Batch 6: Skeleton 업데이트 + 나머지 + 최종 검증

| 항목 | 내용 |
|------|------|
| **선행 조건** | Batch 0~5 전체 |
| **우선순위** | P1 |
| **예상 코드량** | ~200줄 |

**수정 대상 파일:**

| # | 파일 | 수정 요약 |
|---|------|----------|
| 1 | `src/components/ui/Skeleton.tsx` | 모든 테이블 스켈레톤에 hidden md:block 래핑 + md:hidden 카드 스켈레톤 추가 |
| 2 | `src/components/ops/SelfAssessmentForm.tsx` | `p-3 sm:p-4`, `space-y-3 sm:space-y-4` 모바일 spacing 축소 |
| 3 | `src/components/ops/ConsultantSelector.tsx` | `gap-1 sm:gap-2`, 필터 패널 `p-3 sm:p-4` |
| 4 | `src/app/(dashboard)/test-roadmap/page.tsx` | 확인 후 필요 시 조정 |
| 5 | `src/app/(dashboard)/dashboard/settings/page.tsx` | break-keep 확인 (md:grid-cols-2 이미 양호) |

**세션 종료 검증:**
- [ ] 모든 페이지의 loading 상태가 320px에서 정상 표시
- [ ] 테이블 페이지 로딩 시 모바일에서 카드 스켈레톤 표시
- [ ] 전체 페이지 320px, 375px, 390px, 428px 최종 점검
- [ ] `npm run build` 성공
- [ ] `npm run typecheck` 성공
- [ ] 1024px 뷰포트에서 모든 페이지 기존 레이아웃 유지 최종 확인

**세션 시작 프롬프트:**

```
Skeleton 업데이트 + 나머지 + 최종 검증 (Batch 6)

## 배경

이 작업은 `docs/plans/archive/2026-02-19-mobile-responsive-spec.md` 계획서의 Batch 6 (최종 배치)에 해당한다.
계획서를 먼저 읽고, 이 배치의 내용만 정확히 구현해줘.

## 핵심 원칙

1. PC(데스크톱) UI/UX 절대 변경 금지 — md: 이상 기존 클래스 수정/삭제 금지
2. 모바일 대응 코드만 추가 (기본 스타일 또는 sm: 접두사)
3. 스켈레톤도 테이블과 동일한 hidden md:block / md:hidden 패턴 적용

## 이 배치에서 수정할 파일

- `src/components/ui/Skeleton.tsx`: 모든 테이블 스켈레톤에 hidden md:block 래핑, 모바일 카드 스켈레톤(md:hidden) 추가
- `src/components/ops/SelfAssessmentForm.tsx`: p-3 sm:p-4, space-y-3 sm:space-y-4
- `src/components/ops/ConsultantSelector.tsx`: gap-1 sm:gap-2, 필터 p-3 sm:p-4
- `src/app/(dashboard)/test-roadmap/page.tsx`: 확인 후 조정
- `src/app/(dashboard)/dashboard/settings/page.tsx`: break-keep 확인

## 선행 배치 완료 사항

- Batch 0: 글로벌 CSS, 공통 컴포넌트 완료
- Batch 1: Auth, 대시보드, Public 페이지 완료
- Batch 2: 컨설턴트 영역 완료
- Batch 3: Ops 테이블 Part 1 (프로젝트+사용자) 카드 뷰 완료
- Batch 4: Ops 테이블 Part 2 (감사+쿼터+템플릿) 카드 뷰 완료
- Batch 5: 상세+로드맵 페이지 탭 오버플로우 수정 완료

## Skeleton.tsx 카드 스켈레톤 패턴

기존 테이블 스켈레톤 각각에 대해:
1. 기존 테이블 스켈레톤을 hidden md:block으로 래핑
2. 바로 아래에 md:hidden 카드 스켈레톤 추가:
   - 3~4개의 카드 형태 (border rounded-lg p-4 space-y-2)
   - 카드 내부: h-4 w-3/4 (제목), h-3 w-1/2 (본문) 등의 shimmer 바

## 완료 기준

- [ ] 모든 loading 상태 320px에서 카드 스켈레톤 표시
- [ ] 전체 페이지 320px, 375px, 390px, 428px 최종 점검
- [ ] npm run build && npm run typecheck 성공
- [ ] 1024px 뷰포트에서 모든 페이지 기존 레이아웃 유지
```

---

## 부록: 수정하지 않는 파일 (이미 양호)

| 파일 | 이유 |
|------|------|
| `src/components/Navigation.tsx` | hidden md:flex / md:hidden 완전 분기 |
| `src/components/NotificationBell.tsx` | max-w-[calc(100vw-2rem)] 적용 |
| `src/components/ui/SearchInput.tsx` | w-full 반응형 |
| `src/components/ui/FooterCredit.tsx` | text-sm 적절 |
| `src/components/ui/page-header.tsx` | sm:flex-row sm:justify-between 양호 |
| `src/components/roadmap/RoadmapMatrix.tsx` | hidden md:block / md:hidden 완전 분기 |
| `src/app/(dashboard)/dashboard/messages/page.tsx` | 모바일 thread/list 교체 완료 |
| Landing 전체 (Hero, Features, Workflow) | 반응형 완료 |
| `src/app/(dashboard)/ops/projects/[id]/page.tsx` | break-keep 이미 적용, md:grid-cols-2 양호 |

---

## 부록: PC 보호 검증 방법

모든 수정에서 데스크톱 영향이 없는지 확인하는 방법:

1. **코드 리뷰 단계:** 수정한 파일에서 `md:`, `lg:`, `xl:`, `2xl:` 접두사가 붙은 기존 클래스가 삭제/변경되지 않았는지 확인
2. **시각적 확인:** Chrome DevTools에서 1280px 뷰포트로 수정한 페이지를 열어 기존 레이아웃과 비교
3. **자동 검증 (선택):** 수정 전/후 1024px 스크린샷 비교

---

*이 문서는 2026-02-19 기준으로 작성되었으며, 프로젝트 구조 변경 시 업데이트가 필요할 수 있다.*
