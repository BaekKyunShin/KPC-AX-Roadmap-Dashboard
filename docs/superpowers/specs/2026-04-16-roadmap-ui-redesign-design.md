# 로드맵 결과 페이지 UI 리디자인 설계

- 작성일: 2026-04-16
- 대상 브랜치: `feature/ofa-06.5-form-compliance`
- 영향 페이지: **컨설턴트 로드맵 / 운영자 로드맵 / 테스트 로드맵** (동일 컴포넌트 공유)
- 목적: 결과물을 최대한 넓은 공간에 안정적으로 보여주고, 양식 1번 Ⅲ-1 역량 표의 2단 헤더 구조를 정확히 반영하며, 긴 콘텐츠도 세로 쏠림·텍스트 잘림 없이 균형 있게 표출한다.

---

## 1. 영향 범위

| 경로 | 컴포넌트 | 변경 유형 |
|---|---|---|
| `/consultant/projects/[id]/roadmap` | `ConsultantRoadmapClient.tsx` | 레이아웃 전면 개편 |
| `/ops/projects/[id]/roadmap` | `OpsRoadmapClient.tsx` | 레이아웃 전면 개편 (읽기 전용) |
| `/test-roadmap` | `TestRoadmapClient.tsx` (동등 구조) | 동일 기조 적용 |
| 공통 | `CompetencyModelingTable.tsx` | 2단 헤더 + 셀 높이 균일화 |
| 공통 | `RoadmapMatrix.tsx` | 모바일 탭만 미세 조정 |
| 공통 | `AnnualTrainingPlanTable.tsx` | 셀 줄바꿈·열 폭 재조정 |
| 공통 | `CourseSpecCard.tsx` | 명세서 표 균형, 부제 유지 |
| 공통 | `RoadmapOverviewSummary.tsx` | `grid-cols-2` → 세로 stack |
| 신규 | `RoadmapPageShell.tsx` (선택) | 3페이지 공용 헤더 바 |
| 신규 | `VersionSelector.tsx` | 버전 드롭다운 |
| 신규 | `RegenerateAccordion.tsx` | 수정 요청 아코디언 |

---

## 2. 레이아웃 (질문 7 응답) — 옵션 B 채택

사이드바 제거, 상단 액션 바 + 풀 너비 콘텐츠.

```
PageHeader (제목·뒤로가기 + PDF·Excel·최종확정·공유 버튼)
────────────────────────────────────────────────────────
버전 셀렉터 바 (sticky top-0, z-20, bg-background)
  [v1 초안 · 2026-04-16 ▼] [상태 뱃지]    [+ 새 버전 생성]
────────────────────────────────────────────────────────
(새 버전 생성 버튼 클릭 시 아코디언 펼침)
  ┌─ 수정 요청 사항 (선택) ──────────────────────┐
  │ textarea  (rows=8, min-h-[200px], 풀 너비) │
  │                      [취소] [생성 시작]      │
  └──────────────────────────────────────────────┘
────────────────────────────────────────────────────────
Ⅰ장 요약 블록 (세로 stack, AI 역량 수준 뱃지)
diagnosis_summary (muted 2줄 정도)
────────────────────────────────────────────────────────
탭 (sticky top-14 아래) [역량 모델링] [훈련체계도] ...
────────────────────────────────────────────────────────
탭 콘텐츠 (풀 너비 · 표가 여유롭게 배치)
```

**세부 규칙**:

- 버전이 2개 이상이면 드롭다운 아래쪽에 "버전 히스토리 펼치기" 메뉴 추가 → Dialog 모달로 목록 확인 가능 (드물게 쓰는 기능이라 모달로 분리)
- 버전 선택 드롭다운은 shadcn `Select` 또는 `DropdownMenu` 재사용. 각 항목은 `버전 N · 상태 뱃지 · 날짜` 형식
- 새 버전 생성 버튼은 DRAFT 없거나 기존 버전이 FINAL일 때만 활성화 (지금 로직 그대로)
- 아코디언은 shadcn `Accordion`의 single 모드로, open state를 로컬 state로 관리
- Consultant 페이지에만 "새 버전 생성" + 아코디언 표시. Ops·Test는 읽기 전용이므로 버전 셀렉터만 표시
- 최종 확정 버튼 등 write 액션은 `canEdit && canFinalize`일 때만 표시 (기존 조건 그대로)

---

## 3. Ⅰ장 요약 블록 (질문 1 응답)

```tsx
<section className="rounded-lg border bg-muted/20 p-5 space-y-4">
  <header className="flex items-center justify-between">
    <h3 className="text-sm font-semibold">개요 (Ⅰ장)</h3>
    <Badge className={LEVEL_BADGE_CLASS[level]}>
      AI 역량 {LEVEL_LABEL[level]}
    </Badge>
  </header>
  <dl className="space-y-4">
    {fields.map(...)}
  </dl>
</section>
```

- 모든 필드 세로 stack, `dl > dt + dd` 구조
- 라벨(`<dt>`): `text-xs font-medium text-muted-foreground uppercase tracking-wide` + 아래 얇은 1px border
- 내용(`<dd>`): `text-sm text-foreground whitespace-pre-wrap break-words`
- 어떤 데스크톱 너비에서도 2열로 쪼개지지 않음
- 빈 값일 땐 기존대로 섹션 자체 숨김 (`hasAny === false`)

---

## 4. Ⅲ-1 역량 모델링 표 (질문 2·3·4·5 응답)

### 4-1. 헤더 구조 (양식 1번 원본 그대로)

```
┌────────┬──────────────────┬────────────────────────────────────┐
│        │                  │        필요 지식·기술·태도          │
│ 역량명 │   역량 정의      ├──────────┬──────────┬──────────────┤
│(rowspan│  (수행준거)      │ 지식     │ 기술     │ 태도         │
│  =2)   │  (rowspan=2)     │(학술,업무│ (기능)   │              │
│        │                  │  지식)   │          │              │
├────────┼──────────────────┼──────────┼──────────┼──────────────┤
```

- `<thead>` 안 `<tr>` 2행
- 1행: `<th rowspan=2>역량명</th> <th rowspan=2>역량 정의(수행준거)</th> <th colspan=3 className="text-center">필요 지식·기술·태도</th>`
- 2행: `<th>지식 (학술, 업무지식)</th> <th>기술 (기능)</th> <th>태도</th>`
- colspan 헤더는 하단 border-b로 시각 그룹핑 강화

### 4-2. 열 폭 & 셀 높이

- 열 너비: 역량명 12% · 정의 26% · 지식 20% · 기술 20% · 태도 22% (액션 포함 시 비율 재조정)
- **같은 행 셀 높이 균일화**: `<tr className="align-top">` + 각 셀은 기본 CSS table 행 높이 정렬에 의존. 편집 모드 모든 텍스트 에리어 `rows={4}`로 통일. 표시 모드는 `min-h-[80px]` 적용 → 내용 짧아도 최소 높이 확보
- **자동 줄바꿈**: 모든 cell `<td>`에 `whitespace-pre-wrap break-words [overflow-wrap:anywhere]`
- 긴 토큰(URL 등) 포함 대비 `[overflow-wrap:anywhere]` 유지 (break-all 대신 자연스러운 위치)

### 4-3. 모바일 카드 뷰

- 카드 내부에 "필요 지식·기술·태도" 섹션 제목 추가, 하위에 3개 필드 쌓음
- 각 필드 라벨은 양식 부제 동일

### 4-4. 다른 표에도 같은 원칙 적용

- `AnnualTrainingPlanTable`: 5열 (역량명·과정명·형태·시간·비고). 시간 열은 `w-24 text-right`, 형태는 `w-28 text-center`로 고정해 세로 텍스트 방지. 나머지는 `flex-1 break-words`
- `RoadmapMatrix`의 데스크톱 테이블: 셀 내부 카드 너비 조정. 레벨 헤더 고정 폭 유지 (이미 반영)
- `CourseSpecCard` 교과목 3열: 교과목명 180px · 세부 내용 flex · 시간 90px. 셀 `whitespace-pre-wrap break-words` 적용

---

## 5. 전반 디자인 개선

| 항목 | 현재 | 개선 |
|---|---|---|
| 탭 | underline 2px | 유지 (양식 느낌과 맞음) + `sticky top-[headerH]` |
| 카드 padding | `p-4` 혼재 | `p-5` 또는 `p-6` 통일 |
| 섹션 간 여백 | `space-y-6` 혼재 | `space-y-6` 통일 |
| 라벨 타이포 | 혼재 | `text-xs font-medium text-muted-foreground uppercase tracking-wide` |
| 표 hover | 없음 | `hover:bg-muted/40` (편집 모드 + 읽기 모드 공통) |
| 상태 뱃지 | 일부 raw hex | `RoadmapStatusBadge` 재사용 |
| 미참조 역량 뱃지 | amber-50 유지 | 유지 (AA 접근성 충족) |

---

## 6. 구현 단위 (향후 writing-plans 입력)

Task 묶음 제안:

1. **신규 공용 컴포넌트**
   - `src/components/roadmap/VersionSelector.tsx` (드롭다운 + 모달용 히스토리)
   - `src/components/roadmap/RegenerateAccordion.tsx` (아코디언 + textarea + 생성 버튼)
2. **`CompetencyModelingTable.tsx` 2단 헤더 + 셀 균일화**
3. **`RoadmapOverviewSummary.tsx` 세로 stack**
4. **`AnnualTrainingPlanTable.tsx`, `CourseSpecCard.tsx`, `RoadmapMatrix.tsx` 표 균형**
5. **`ConsultantRoadmapClient.tsx` 레이아웃 재구성** (사이드바 제거 + 상단 바 + 아코디언 연결)
6. **`OpsRoadmapClient.tsx`, test-roadmap 페이지 동일 레이아웃 적용 (읽기 전용 버전)**
7. **테스트/스크린샷 갱신**: 기존 `.test.tsx` getByText/Role 셀렉터 새 마크업 호환 확인

각 단계에 TDD(RTL) + Playwright로 수동 확인.

---

## 7. 완료 지표

- Ⅰ장 요약 블록 세로 stack 확인 (브라우저 눈)
- 역량 표 `<thead>`에 2행 헤더 + "필요 지식·기술·태도" colspan 헤더
- 표의 어떤 셀도 가로 잘림 없이 줄바꿈됨 (긴 텍스트 1000자 더미로 확인)
- 같은 행에서 가장 큰 textarea 높이만큼 나머지 셀도 시각적으로 균형 유지
- 수정 요청 아코디언 안의 textarea 높이 ≥ 200px
- 컨설턴트·운영자·테스트 3개 페이지가 같은 레이아웃·컴포넌트 공유
- `npm run validate` (typecheck + lint + test) + `npm run build` 통과

---

## 8. 비-목표 (Out of scope)

- PBL 트랙 UI (별도 Step 8·9·10)
- HWPX 내보내기 UI (Step 7)
- 인터뷰 화면 전반 리디자인 (다음 세션)
- 프로젝트 상세 페이지 변경
