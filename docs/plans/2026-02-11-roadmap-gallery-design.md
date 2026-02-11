# 로드맵 갤러리 설계 문서

> 컨설턴트가 만든 로드맵을 공유하고, 다른 컨설턴트가 열람·좋아요·가져다 쓸 수 있는 갤러리

---

## 1. 개요

### 1.1 핵심 개념

컨설턴트는 자신의 FINAL 로드맵을 **갤러리에 공유**할 수 있다. 다른 컨설턴트는 공유된 로드맵을 **열람**하고, **좋아요**를 누르고, 마음에 드는 로드맵을 **자기 프로젝트에 가져다 쓸** 수 있다.

관리자(OPS_ADMIN, SYSTEM_ADMIN)는 공유 여부와 관계없이 **모든 로드맵**을 열람할 수 있다.

### 1.2 참고 서비스 (Best Practice)

| 서비스 | 차용한 패턴 |
|--------|-----------|
| **Figma Community** | ❤️ 좋아요 + 복제 수, "Get a copy" 복제 플로우 |
| **GitHub** | ⭐ Star 토글, Fork, 최신순/인기순 정렬 |
| **Dribbble** | Popular/Recent 탭, 카드 호버 효과 |
| **Notion** | "Share as template" 공유 토글, 카테고리 필터 |
| **CodePen** | Fork 문화, Trending/Popular/Recent 정렬 |
| **Behance** | Appreciate(좋아요) 한 번 클릭, 간결한 인터랙션 |

### 1.3 설계 원칙

- **검증된 패턴 사용**: 6개 서비스에서 공통으로 사용하는 패턴만 적용
- **YAGNI**: 20~30명 규모에 맞게 기능 최소화 (트렌딩 알고리즘, 컬렉션, 댓글 등 제외)
- **기존 컴포넌트 재활용**: 로드맵 뷰 컴포넌트(RoadmapMatrix, CoursesList, PBLCourseView)를 읽기전용으로 재사용

---

## 2. 역할별 접근 권한

| | 컨설턴트 (CONSULTANT_APPROVED) | 관리자 (OPS_ADMIN, SYSTEM_ADMIN) |
|---|---|---|
| **보이는 범위** | 다른 컨설턴트가 공유한 FINAL 로드맵 | 모든 컨설턴트의 모든 로드맵 |
| **필터** | 업종 | 업종 + 버전 상태 + 공유 여부 + 컨설턴트 |
| **정렬** | 최신순 / 좋아요순 | 최신순 / 좋아요순 |
| **좋아요** | ✅ 가능 | ✅ 가능 |
| **가져다 쓰기** | ✅ (내 담당 프로젝트에) | ❌ (열람/감사 목적) |
| **공유 토글** | 자기 로드맵에서 on/off | — |

---

## 3. 데이터 모델

### 3.1 기존 테이블 변경

**`roadmap_versions`** — 컬럼 1개 추가:

```sql
ALTER TABLE roadmap_versions
ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN roadmap_versions.is_shared
IS '갤러리 공유 여부. FINAL 버전만 공유 가능';
```

### 3.2 새 테이블

**`roadmap_likes`** — 좋아요:

```sql
CREATE TABLE roadmap_likes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roadmap_version_id UUID NOT NULL REFERENCES roadmap_versions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, roadmap_version_id)
);

CREATE INDEX idx_roadmap_likes_version ON roadmap_likes(roadmap_version_id);
CREATE INDEX idx_roadmap_likes_user    ON roadmap_likes(user_id);
```

### 3.3 ERD (변경분)

```
roadmap_versions (기존)
  + is_shared BOOLEAN
  │
  ├──< roadmap_likes (신규)
  │     user_id ──> users
  │     roadmap_version_id ──> roadmap_versions
  │
  └──> projects (기존)
        industry, company_size
```

### 3.4 RLS 정책

```sql
-- roadmap_likes: 로그인 사용자만 좋아요 가능
CREATE POLICY "좋아요 조회" ON roadmap_likes
  FOR SELECT USING (TRUE);

CREATE POLICY "좋아요 추가" ON roadmap_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "좋아요 삭제" ON roadmap_likes
  FOR DELETE USING (auth.uid() = user_id);

-- roadmap_versions.is_shared: 본인 로드맵만 공유 토글 가능
-- (기존 RLS에 추가하거나, Server Action에서 권한 체크)
```

---

## 4. UI 설계

### 4.1 페이지 구조

```
/consultant/gallery          ← 컨설턴트·관리자 공용 라우트
/consultant/gallery/[id]     ← 로드맵 상세 보기 (읽기전용)
```

### 4.2 갤러리 메인 뷰 — 컨설턴트

기존 `_proposals/templates`와 **전체 레이아웃은 동일**하되, 카드 내용이 변경됩니다.

```
┌─────────────────────────────────────────────────────────────────┐
│  로드맵 갤러리                                                   │
│  다른 컨설턴트가 공유한 로드맵을 탐색하고 활용할 수 있습니다.      │
│                                                                 │
│  ┌─🔍 로드맵 검색 (기업명, 업종, 키워드...)──┐  [전체] [제조업]  │
│  └──────────────────────────────────────────┘  [서비스업] [IT]  │
│                                                 [금융] [건설]    │
│                                                                 │
│  정렬: [최신순 ▾]                                                │
│        ├ 최신순                                                  │
│        └ 좋아요순                                                │
│                                                                 │
│  ┌─ 카드 ──────────────────┐  ┌─ 카드 ──────────────────┐      │
│  │                         │  │                         │      │
│  │  (카드 상세는 4.4 참조) │  │                         │      │
│  │                         │  │                         │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
│                                                                 │
│  ┌─ 카드 ──────────────────┐  ┌─ 카드 ──────────────────┐      │
│  │                         │  │                         │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 갤러리 메인 뷰 — 관리자 (추가 필터)

컨설턴트 뷰와 동일한 레이아웃에 **필터 4개 추가**:

```
┌─🔍 검색───────────────────┐  [업종 필터 버튼들...]
└───────────────────────────┘

┌─ 관리자 필터 ─────────────────────────────────────────────┐
│  상태: [전체 ▾]    공유: [전체 ▾]    컨설턴트: [전체 ▾]   │
│        ├ 전체            ├ 전체              ├ 전체       │
│        ├ DRAFT           ├ 공유됨            ├ 김민수     │
│        ├ FINAL           └ 비공유            ├ 박지영     │
│        └ ARCHIVED                            └ 이준호     │
└───────────────────────────────────────────────────────────┘

정렬: [최신순 ▾]
```

### 4.4 갤러리 카드

기존 `_proposals/templates` 카드에서 **변경된 부분**을 표시합니다.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  전자/반도체 품질검사 AI 자동화 로드맵               │  ← 제목 (roadmap 데이터에서 추출)
│  📎 제조업  🏢 300인 이상                            │  ← 업종 + 기업규모 배지
│  🏭 (주)한국전자                                     │  ← 기업명 (projects.company_name)
│                                                     │
│  반도체 공정 품질검사 데이터를 AI로 분석하여          │  ← 진단 요약 2줄 (diagnosis_summary)
│  불량 검출 시간을 단축하고 정확도를 향상...           │
│                                                     │
│  ┌─ PBL 최적 과정 ───────────────────────────────┐  │
│  │ 배터리 품질검사 데이터 분석 자동화 (40h)       │  │  ← pbl_course.course_name + total_hours
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  👤 김민수   ❤️ 12                     [상세 보기]   │  ← 작성자 + 좋아요 수 + 링크
│                                                     │
└─────────────────────────────────────────────────────┘
```

**기존 목업 대비 변경점:**

| 항목 | 기존 목업 | 변경 후 |
|------|----------|--------|
| ⭐ 별점 4.8 | 시스템에 없는 기능 | ❤️ 좋아요 수 |
| 📋 3회 사용 | 복제 기능 전제 | **제거** |
| 🏷 태그 (품질관리, 데이터분석...) | 하드코딩 | **제거** (실 데이터에서 자동 추출 어려움) |
| "사용하기" 버튼 | 카드에서 바로 사용 | **"상세 보기"** (상세 페이지에서 사용) |
| — | — | 🏭 **기업명 추가** (어떤 기업 대상인지 파악) |

**카드 호버 효과:**

```css
/* Dribbble 스타일 미묘한 상승 효과 */
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
}
```

### 4.5 로드맵 상세 페이지 (`/consultant/gallery/[id]`)

기존 로드맵 뷰 컴포넌트를 **읽기전용(canEdit=false)**으로 재활용합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│  ← 로드맵 갤러리                                                │  ← PageHeader backLink
│                                                                 │
│  전자/반도체 품질검사 AI 자동화 로드맵                            │  ← 제목
│  📎 제조업 · 🏢 300인 이상 · 🏭 (주)한국전자 · 👤 김민수         │  ← 메타 정보
│                                                                 │
│  ┌───────────────────────────────┐  ┌────────────────────────┐  │
│  │  ❤️ 좋아요  12               │  │  📥 이 로드맵 사용하기  │  │  ← 좋아요 토글 + 사용 버튼
│  └───────────────────────────────┘  └────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  과정 체계도  │  과정 상세  │  PBL 과정                 │    │  ← 기존 탭 3개 재활용
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │   (RoadmapMatrix / CoursesList / PBLCourseView          │    │
│  │    컴포넌트를 canEdit=false로 렌더링)                    │    │
│  │                                                         │    │
│  │   기존 컴포넌트 그대로 사용.                             │    │
│  │   편집 버튼, 수정 프롬프트, 확정 버튼 등은 숨김.         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.6 "이 로드맵 사용하기" 다이얼로그

Figma "Get a copy" 패턴. 1~2단계로 간결하게.

```
┌──────────────────────────────────────────┐
│                                          │
│  이 로드맵을 가져오시겠습니까?            │
│                                          │
│  이 로드맵의 데이터가 선택한 프로젝트의   │
│  새 DRAFT 버전으로 복사됩니다.            │
│  (원본에는 영향 없음)                     │
│                                          │
│  적용할 프로젝트:                        │
│  ┌─▾ 프로젝트 선택 ───────────────────┐  │
│  │  (주)한국전자 — 배정됨              │  │
│  │  삼성물산(주) — 인터뷰 완료         │  │
│  │  현대중공업(주) — 로드맵 초안       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ⚠️  기존 DRAFT 버전이 있으면 새 버전으로 │
│     추가됩니다.                           │
│                                          │
│            [취소]    [가져오기]            │
│                                          │
└──────────────────────────────────────────┘
```

**프로젝트 선택 조건:**
- 내 담당 프로젝트만 표시
- 상태가 INTERVIEWED 이상인 프로젝트 (인터뷰 완료 후 로드맵 생성 가능)

### 4.7 공유 토글 (로드맵 관리 페이지)

기존 `/consultant/projects/[id]/roadmap` 페이지에 추가:

```
┌─ 버전 정보 ────────────────────────────────────┐
│                                                │
│  v3 (FINAL)  ✅ 확정됨   2026-02-10 18:30      │
│                                                │
│  ┌─ 갤러리 공유 ─────────────────────────────┐ │
│  │                                           │ │
│  │  갤러리에 공유  [━━━━━━━━━○] OFF           │ │
│  │                                           │ │
│  │  다른 컨설턴트가 이 로드맵을               │ │
│  │  열람하고 활용할 수 있습니다.              │ │
│  │                                           │ │
│  └───────────────────────────────────────────┘ │
│                                                │
│  [PDF 다운로드]  [Excel 다운로드]               │
│                                                │
└────────────────────────────────────────────────┘
```

- **FINAL 버전에만** 공유 토글 표시
- DRAFT, ARCHIVED에는 표시하지 않음
- 토글 ON 시 즉시 갤러리에 노출

### 4.8 빈 상태 처리

**검색 결과 없음:**
```
┌─────────────────────────────────┐
│                                 │
│        🔍                       │
│   검색 결과가 없습니다           │
│   다른 키워드로 검색해보세요     │
│                                 │
│   [필터 초기화]                  │
│                                 │
└─────────────────────────────────┘
```

**공유된 로드맵 없음 (첫 사용):**
```
┌─────────────────────────────────┐
│                                 │
│        📋                       │
│   아직 공유된 로드맵이 없습니다  │
│                                 │
│   로드맵을 확정(FINAL)한 후      │
│   갤러리에 공유해보세요          │
│                                 │
└─────────────────────────────────┘
```

---

## 5. 라우트 및 컴포넌트 구조

### 5.1 파일 구조

```
src/app/(dashboard)/consultant/gallery/
├── page.tsx                    # 갤러리 메인 (서버 컴포넌트)
├── actions.ts                  # Server Actions
├── loading.tsx                 # 로딩 상태
└── [id]/
    └── page.tsx                # 로드맵 상세 보기 (서버 컴포넌트)

src/components/gallery/
├── GalleryCard.tsx             # 갤러리 카드 (클라이언트)
├── GalleryFilters.tsx          # 검색 + 필터 (클라이언트)
├── GallerySortSelect.tsx       # 정렬 드롭다운 (클라이언트)
├── LikeButton.tsx              # 좋아요 토글 버튼 (클라이언트)
├── UseRoadmapDialog.tsx        # "사용하기" 다이얼로그 (클라이언트)
└── ShareToggle.tsx             # 공유 토글 (클라이언트)
```

### 5.2 데이터 흐름

```
갤러리 메인 (page.tsx)
  │
  ├── Server Action: fetchGalleryRoadmaps(filters, sort, role)
  │   └── Supabase 조회:
  │       컨설턴트: roadmap_versions WHERE is_shared=true AND status='FINAL'
  │                 JOIN projects (industry, company_size, company_name)
  │                 LEFT JOIN roadmap_likes (count)
  │       관리자:   roadmap_versions (전체)
  │                 + 동일 JOIN
  │
  ├── GalleryFilters → URL searchParams로 필터 관리
  │
  └── GalleryCard[] → 카드 클릭 → /consultant/gallery/[id]

상세 페이지 ([id]/page.tsx)
  │
  ├── Server Action: fetchRoadmapDetail(id, role)
  │   └── 권한 체크 + roadmap_versions + projects 조회
  │
  ├── 기존 컴포넌트 재활용:
  │   ├── RoadmapMatrix (canEdit=false)
  │   ├── CoursesList (canEdit=false)
  │   └── PBLCourseView
  │
  ├── LikeButton → Server Action: toggleLike(roadmapVersionId)
  │
  └── UseRoadmapDialog → Server Action: copyRoadmapToProject(sourceId, targetProjectId)
```

---

## 6. Server Actions

### 6.1 갤러리 조회

```typescript
// actions.ts
async function fetchGalleryRoadmaps(params: {
  search?: string;
  industry?: string;
  sort?: 'latest' | 'popular';
  // 관리자 전용 필터
  status?: 'DRAFT' | 'FINAL' | 'ARCHIVED';
  isShared?: boolean;
  consultantId?: string;
}): Promise<ActionResult<GalleryRoadmap[]>>
```

### 6.2 상세 조회

```typescript
async function fetchRoadmapDetail(
  roadmapVersionId: string
): Promise<ActionResult<RoadmapDetailView>>
```

### 6.3 좋아요 토글

```typescript
async function toggleLike(
  roadmapVersionId: string
): Promise<ActionResult<{ liked: boolean; count: number }>>
```

### 6.4 공유 토글

```typescript
async function toggleShare(
  roadmapVersionId: string
): Promise<ActionResult<{ isShared: boolean }>>
```

### 6.5 로드맵 가져오기 (복제)

```typescript
async function copyRoadmapToProject(params: {
  sourceRoadmapVersionId: string;
  targetProjectId: string;
}): Promise<ActionResult<{ newVersionId: string; versionNumber: number }>>
```

**복제 로직:**
1. 원본 roadmap_version 조회
2. 대상 프로젝트의 다음 version_number 계산
3. 새 roadmap_version INSERT (status=DRAFT)
4. roadmap_matrix, pbl_course, courses, diagnosis_summary 복사
5. revision_prompt에 "갤러리에서 가져옴 (원본: {기업명} v{번호})" 기록
6. 감사로그 기록

---

## 7. 카드 데이터 추출

갤러리 카드에 표시할 정보는 기존 테이블에서 추출합니다:

| 카드 항목 | 데이터 소스 |
|----------|-----------|
| 제목 | `roadmap_versions.pbl_course → course_name` 또는 `projects.company_name + " 로드맵"` |
| 업종 배지 | `projects.industry` |
| 기업규모 배지 | `projects.company_size` |
| 기업명 | `projects.company_name` |
| 설명 (2줄) | `roadmap_versions.diagnosis_summary` (앞 100자) |
| PBL 과정명 | `roadmap_versions.pbl_course → course_name` |
| PBL 시간 | `roadmap_versions.pbl_course → total_hours` |
| 작성자 | `users.full_name` (created_by JOIN) |
| 좋아요 수 | `roadmap_likes` COUNT |
| 내가 좋아요 했는지 | `roadmap_likes` WHERE user_id = me |

---

## 8. 네비게이션 변경

기존 네비게이션에 "로드맵 갤러리" 메뉴 추가:

```
컨설턴트:
[로고]  대시보드  담당 프로젝트  테스트 로드맵  로드맵 갤러리  ···  [💬] [🔔] [👤]

관리자 (라이브러리 드롭다운):
[로고]  워크스페이스 ▾  운영관리 ▾  라이브러리 ▾  ···  [💬] [🔔] [👤]
                                    ├ 로드맵 갤러리
                                    └ 사전진단 템플릿
```

---

## 9. 반응형 디자인

| 화면 | 카드 그리드 | 필터 |
|------|-----------|------|
| 데스크톱 (lg+) | 2열 | 검색 + 업종 버튼 가로 배치 |
| 태블릿 (md) | 2열 | 검색 + 업종 버튼 가로 스크롤 |
| 모바일 (sm) | 1열 | 검색 풀 너비 + 업종 가로 스크롤 |

---

## 10. 구현 범위 및 순서

### Phase 1: 핵심 (갤러리 열람 + 좋아요)
1. DB 마이그레이션 (`is_shared` 컬럼 + `roadmap_likes` 테이블 + RLS)
2. 갤러리 메인 페이지 (카드 그리드 + 검색 + 업종 필터 + 정렬)
3. 좋아요 기능 (토글 + 카운트)
4. 네비게이션에 "로드맵 갤러리" 추가

### Phase 2: 상세 보기 + 공유
5. 로드맵 상세 페이지 (읽기전용, 기존 컴포넌트 재활용)
6. 공유 토글 (로드맵 관리 페이지에 추가)

### Phase 3: 가져다 쓰기
7. "이 로드맵 사용하기" 다이얼로그 + 복제 로직
8. 감사로그 연동

### Phase 4: 관리자 뷰
9. 관리자 전용 필터 (상태, 공유 여부, 컨설턴트별)

---

## 부록: 기존 목업과의 차이점 요약

| 항목 | `_proposals/templates` (목업) | 이 설계 |
|------|------------------------------|--------|
| 데이터 모델 | 별도 `roadmap_templates` 테이블 | 기존 `roadmap_versions` + `is_shared` |
| ⭐ 별점 | `rating: 4.8` | ❤️ 좋아요 수 |
| 📋 사용 횟수 | `usageCount: 3` | 제거 |
| 🏷 태그 | `tags: ['품질관리', ...]` (하드코딩) | 제거 |
| 탭 | 전체 / 내 템플릿 / 공유 템플릿 | 역할별 뷰 (컨설턴트: 전체, 관리자: 필터) |
| "사용하기" 버튼 | 카드에 표시 | 상세 페이지에서 표시 |
| 기업명 | 없음 | 추가 |
| 관리자 뷰 | 없음 | 추가 (전용 필터) |
