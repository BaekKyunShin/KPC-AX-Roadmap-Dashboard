# AI 사전 분석 (인터뷰 준비 가이드) 설계 문서

> 2026-02-10 | 프로젝트 상세 페이지 탭 리팩토링 + AI 인터뷰 준비 가이드 기능

---

## 1. 배경 및 의사결정 요약

### 1.1 제안서 기능 재평가 결과

`docs/plans/CONSULTANT_ENGAGEMENT_PROPOSAL.md`의 미착수 기능들을 비판적으로 재검토하여 다음과 같이 결정했다.

| 기능 | 원래 평가 | 재평가 | 결정 |
|------|----------|--------|------|
| P1-2 교육 실행 추적 | ★★★★★ | ★★★★★ | 별도 구현 (가장 높은 우선순위) |
| P1-3 AI 인터뷰 질문 가이드 | ★★★★☆ | ★★★★☆ | **이 문서에서 설계** |
| P1-4 AI 강의 실행 가이드 | ★★★★★ | ★★☆☆☆ | 독립 기능 불필요, P1-2에 흡수 |
| P2-1 로드맵 템플릿 | ★★★☆☆ | ★★★☆☆ | 장기 (변경 없음) |

### 1.2 P1-4 폐기 이유

- 로드맵 데이터(`RoadmapCell` + `PBLCourse`)에 교육 진행 정보의 ~80%가 이미 존재 (module_name, hours, details, practice, tools, deliverables 등)
- "강의 가이드"는 기존 데이터의 재포맷팅에 불과
- 교육 실행 추적(P1-2)과 UX 중복 — 동일 시점, 동일 데이터, 동일 사용자
- 모든 과정 대상 시 토큰 90,000~240,000 (일 쿼터 50회 중 6~12회 소진)
- **대안**: P1-2 교육 추적의 세션 상세에서 로드맵 모듈 정보를 자동 참조 + 모듈별 선택적 AI 보강 버튼

### 1.3 P1-3 구현 결정 이유

- 토큰 ~6,000~8,000/회 = 로드맵 생성의 1/3 수준으로 경제적
- 자가진단 30문항의 교차 분석 + 업종 맥락 반영 = 규칙 기반으로 커버 어려운 AI 고유 가치
- 인터뷰 전 프리브리핑 문서로서의 현장 활용 가치
- 구현 시간은 Claude Code가 처리하므로 고려 대상 아님

---

## 2. 프로젝트 상세 페이지 탭 리팩토링

### 2.1 현재 구조 (Before)

경로: `/consultant/projects/[id]/page.tsx`

현재 프로젝트 상세 페이지는 모든 정보가 세로로 쌓여있다:

```
1. PageHeader (기업명, 업종/규모, 버튼)
2. Grid: CompanyInfoCard(2/5) + 자가진단 결과(3/5)
3. 인터뷰 정보 (InterviewSummary)
4. 활동 일지 (ActivityLog)
```

문제: 이미 4개 섹션으로 긴 스크롤. 인터뷰 준비 가이드를 추가하면 5개 → 정보 과부하. 향후 교육 추적(P1-2) 등 추가 시 더 악화.

### 2.2 새 구조 (After) — 페이지 레벨 탭

Salesforce Record Page의 "Highlight Panel + Tabs" 패턴을 차용한다.

```
┌─────────────────────────────────────────────────────┐
│ ← 프로젝트 목록                                      │
│                                                     │
│ (주)한국전자                    [인터뷰 수정] [로드맵] │
│ 전자/반도체 · 중견기업 · 🟡 INTERVIEWED               │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 담당자  홍길동 (AI추진팀장)   연락처  010-1234-5678│ │
│ │ 이메일  hong@hankook.co.kr  주소    경기도 화성시  │ │
│ │ 요청사항  "품질검사 업무에 AI 도입 희망"           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌──────────┐┌──────────┐┌──────────────┐┌─────────┐ │
│ │ 진단 결과 ││사전 분석  ││ 인터뷰 기록   ││활동 일지 │ │
│ └──────────┘└──────────┘└──────────────┘└─────────┘ │
├━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┤
│                                                     │
│ (선택된 탭의 콘텐츠)                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2.3 영역별 상세

**항상 보이는 영역 (탭 위)**:
- PageHeader: 기업명, 업종/규모, 프로젝트 상태 배지, 액션 버튼(인터뷰, 로드맵)
- 기업 정보 요약: 현재 `CompanyInfoCard`의 내용을 컴팩트한 가로 레이아웃으로 재배치 (담당자, 연락처, 이메일, 주소, 요청사항)
- 탭 네비게이션

**탭 구성 및 네이밍**:

| 탭 이름 | 내용 | 컴포넌트 |
|---------|------|----------|
| **진단 결과** | 종합점수, 5영역 도넛차트, 30문항 아코디언 | `ConsultantAssessmentResult` + `AssessmentDetailAccordion` |
| **사전 분석** | AI 인터뷰 준비 가이드 (신규) | `InterviewGuide` (신규) |
| **인터뷰 기록** | 인터뷰 요약 (업무, 페인포인트, 제약, 목표) | `InterviewSummary` |
| **활동 일지** | 활동 기록 리스트 | `ActivityLog` |

**탭 이름 선정 이유**:
- "사전 분석"은 고객사가 봐도 "컨설턴트가 진단 결과를 전문적으로 분석해온 것"으로 인식
- "질문 가이드"는 AI가 질문을 대신 만들어준 느낌 → 컨설턴트 전문성 저하 우려로 기각
- "인터뷰 준비"와 "인터뷰 정보"는 둘 다 "인터뷰"로 시작하여 구분이 느림 → 기각

**기본 선택 탭**: "진단 결과" (현재 페이지의 메인 콘텐츠와 동일)

### 2.4 향후 탭 확장 계획

P1-2 교육 실행 추적 구현 시 탭 하나만 추가하면 된다:

```
[진단 결과] [사전 분석] [인터뷰 기록] [교육 추적] [활동 일지]
```

---

## 3. "사전 분석" 탭 상세 설계

### 3.1 업계 Best Practice 조사 결과

6개 서비스를 조사하여 공통 패턴을 추출했다:

| 서비스 | 핵심 패턴 | 우리 시스템 적용 |
|--------|----------|----------------|
| **Gong AI Briefer** | 구조화된 섹션 브리프, 원본 소스 클릭 추적, 어디서든 접근 | 섹션 카드 구조, ▸상세보기 링크 |
| **Salesforce Client Meeting Prep** | 사이드 패널 요약, 템플릿 기반 자동 생성, 33% 준비 시간 단축 | 기존 데이터 자동 활용, 추가 입력 불필요 |
| **HubSpot Breeze** | CRM 데이터 기반 페인포인트 표면화, 30분 전 Push 알림 | 약한 영역 자동 하이라이트 |
| **Fireflies** | 자동 생성된 질문을 편집/재정렬 가능, Prep 탭 | 질문 체크/추가/삭제, 전용 탭 |
| **Cirrus Insight** | Who/What/Why 3섹션 구조, 매일 아침 이메일 Push | 간결한 섹션 구조 |
| **MagicSchool** | 최소 입력 → 구조화된 출력, 200만+ 교육자 검증 | 버튼 클릭 하나로 생성 |

### 3.2 적용한 6가지 공통 패턴

1. **기존 페이지에 통합** — 별도 라우트 만들지 않음 (탭으로 통합)
2. **구조화된 섹션 카드** — 긴 텍스트가 아닌 스캔 가능한 카드 형태
3. **원본 데이터 연결** — ▸상세보기 클릭 시 자가진단 상세 영역으로 이동
4. **편집 가능한 질문** — 생성 후 체크/추가/삭제 가능 (Fireflies 패턴)
5. **추가 입력 불필요** — 기존 자가진단 + 기업 정보에서 자동 생성
6. **PDF 내보내기** — 인쇄해서 현장에 가져감

### 3.3 UI 와이어프레임

```
│                                                     │
│  🎯 인터뷰 준비 가이드                   [생성하기]   │
│                                                     │
│  ┌─ 📋 기업 현황 요약 ─────────────────────────┐    │
│  │ 전자/반도체 업종 중견기업. AI 도입 의지는     │    │
│  │ 높으나(72%) 데이터 인프라가 매우 부족(28%).  │    │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ 🔍 핵심 파악 포인트 ───────────────────────┐    │
│  │                                             │    │
│  │ ❗ 데이터 준비도 28%             ▸상세보기   │    │
│  │   데이터 수집 체계가 거의 없는 상태           │    │
│  │                                             │    │
│  │ ⚠️ 인프라 준비도 45%            ▸상세보기    │    │
│  │   기본 인프라는 있으나 AI 전용 환경 부족      │    │
│  │                                             │    │
│  │ ⚠️ 문제 명확성 50%              ▸상세보기    │    │
│  │   문제는 인식하나 AI 적용 방향 불명확         │    │
│  │                                             │    │
│  │ ✅ AI 성숙도 72%                ▸상세보기   │    │
│  │   경영진의 AI 도입 의지가 높음               │    │
│  │                                             │    │
│  │ ✅ 인력 준비도 67%              ▸상세보기   │    │
│  │   기본적인 IT 역량은 보유                    │    │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ 💬 추천 질문 (12개) ─────── [PDF 내보내기] ─┐   │
│  │                                             │    │
│  │ ❗ 데이터 준비도                              │    │
│  │ ☑ 업무 데이터를 어떤 시스템에서 관리하나요?   │    │
│  │   ↳ 데이터 저장 현황 파악                    │    │
│  │ ☑ 데이터 품질 관리 프로세스가 있나요?         │    │
│  │   ↳ 데이터 관리 성숙도 확인                  │    │
│  │ ☑ 외부 데이터 연동이 필요한 업무가 있나요?    │    │
│  │   ↳ 데이터 통합 니즈 파악                    │    │
│  │                                             │    │
│  │ ⚠️ 인프라 준비도                             │    │
│  │ ☑ 사내 서버/클라우드 환경이 어떤가요?         │    │
│  │   ↳ AI 도구 배포 가능성 확인                 │    │
│  │ ☑ 보안 정책상 외부 AI 도구 사용이 가능한가요? │    │
│  │   ↳ 도구 선택 제약 사전 파악                 │    │
│  │                                             │    │
│  │ (영역별 계속...)                              │    │
│  │                                             │    │
│  │ [+ 질문 추가]                                │    │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ ⚠️ 인터뷰 시 주의사항 ────────────────────┐    │
│  │ • AI 의지는 높으나 데이터 부족 → 기대 관리   │    │
│  │ • 인프라 제약 먼저 파악 후 도구 추천으로      │    │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│              [재생성]  [PDF 내보내기]                 │
│                                                     │
```

### 3.4 상태별 UI

| 상태 | 표시 |
|------|------|
| 자가진단 미완료 | "자가진단 완료 후 이용할 수 있습니다." + 비활성 버튼 |
| 자가진단 완료, 가이드 미생성 | [가이드 생성하기] 버튼 + 기능 설명 텍스트 |
| 가이드 생성 중 | 로딩 스피너 + "분석 중입니다..." |
| 가이드 생성 완료 | 4개 섹션 카드 + [재생성] [PDF 내보내기] 버튼 |

### 3.5 사용자 인터랙션

- **[생성하기]**: 자가진단 + 기업 정보 → LLM 호출 → DB 저장 → UI 표시
- **[재생성]**: 기존 가이드 덮어쓰기 (확인 다이얼로그)
- **▸상세보기**: 진단 결과 탭으로 전환 + 해당 영역 아코디언 자동 펼침
- **☑/☐ 체크박스**: 질문 선택/해제 (PDF 내보내기 시 선택된 것만 포함)
- **[+ 질문 추가]**: 텍스트 입력 → 질문 목록에 추가 → DB 업데이트
- **[PDF 내보내기]**: 선택된 질문 + 4개 섹션을 A4 1~2장 PDF로 생성

---

## 4. 데이터 설계

### 4.1 새 테이블: `interview_guides`

```sql
CREATE TABLE interview_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  guide_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id)  -- 프로젝트당 1개
);
```

### 4.2 `guide_data` JSONB 구조

```jsonc
{
  "company_summary": "기업 현황 요약 2~3문장",
  "key_points": [
    {
      "dimension": "데이터 준비도",
      "score_percent": 28,
      "status": "critical",       // "critical" | "warning" | "good"
      "insight": "데이터 수집 체계가 거의 없는 상태로 추정됩니다."
    },
    {
      "dimension": "인프라 준비도",
      "score_percent": 45,
      "status": "warning",
      "insight": "기본 인프라는 있으나 AI 전용 환경이 부족합니다."
    }
    // ... 5영역 모두
  ],
  "questions": [
    {
      "id": "q1",                 // 프론트에서 생성하는 고유 ID
      "dimension": "데이터 준비도",
      "question": "업무 데이터를 어떤 시스템에서 관리하고 계신가요?",
      "intent": "데이터 저장 현황 파악",
      "checked": true,            // 선택 여부 (PDF 내보내기용)
      "is_custom": false          // 사용자 추가 질문 여부
    }
    // ... 10~15개
  ],
  "cautions": [
    "AI 성숙도는 높으나 데이터가 부족한 상태이므로, 기대 관리가 필요합니다.",
    "인프라 제약을 먼저 파악한 후 도구 추천 단계로 넘어가세요."
  ]
}
```

### 4.3 RLS 정책

```sql
-- 배정된 컨설턴트만 자신의 프로젝트 가이드를 CRUD
CREATE POLICY "consultant_own_guide" ON interview_guides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = interview_guides.project_id
        AND projects.assigned_consultant_id = auth.uid()
    )
  );
```

---

## 5. LLM 호출 설계

### 5.1 데이터 플로우

```
자가진단 (5영역 30문항 점수 + 개별 응답)
  + 기업 정보 (업종, 세부 업종, 규모)
         ↓
    [생성하기 버튼 클릭]
         ↓
    Server Action (actions.ts)
      → 세션/역할/배정 확인
      → 쿼터 확인 (checkQuotaExceeded)
      → LLM 호출 (callLLMForJSON)
      → 쿼터 기록 (recordLLMUsage)
      → interview_guides UPSERT
         ↓
    UI에 4개 섹션 표시
         ↓
    [선택] 질문 체크/추가/삭제 → Server Action으로 guide_data 부분 업데이트
    [선택] PDF 내보내기 → 클라이언트 사이드 jspdf
```

### 5.2 토큰 추정

| 항목 | 토큰 추정 |
|------|----------|
| 시스템 프롬프트 | ~1,500 |
| 유저 프롬프트 (자가진단 30문항 + 기업 정보) | ~2,500 |
| LLM 출력 (JSON) | ~3,000~4,000 |
| **총합** | **~7,000~8,000** |

일 쿼터 50회 중 1회 소진. 로드맵 생성(~20,000~25,000)의 약 1/3.

### 5.3 LLM 프롬프트 구조 (개요)

**시스템 프롬프트**:
- 역할: "기업 AI 교육 진단 분석 전문가"
- 입력 데이터 설명: 5영역 자가진단 점수 + 30문항 개별 응답 + 기업 기본정보
- 출력 JSON 스키마: 위 4.2 구조
- 지침: 약한 영역 우선, 영역별 2~3개 질문, 업종 맥락 반영, 교차 분석

**유저 프롬프트**:
- 기업 정보 (업종, 세부 업종, 규모)
- 자가진단 5영역 점수 (총점 + 영역별 점수/만점/퍼센트)
- 30문항 개별 응답 (질문 텍스트 + 5점 척도 응답)

프롬프트 상세는 구현 시 `src/lib/services/interview-guide.ts`에서 정의한다.

---

## 6. 컴포넌트 구조

### 6.1 새로 만들 파일

```
src/app/(dashboard)/consultant/projects/[id]/
  ├── page.tsx                          # 탭 레이아웃으로 리팩토링
  ├── actions.ts                        # generateInterviewGuide, updateGuideQuestions 추가
  ├── _components/
  │   ├── ProjectDetailTabs.tsx         # 탭 네비게이션 (클라이언트 컴포넌트)
  │   ├── CompanyInfoBar.tsx            # 기업 정보 가로 레이아웃 (항상 보임)
  │   ├── InterviewGuide.tsx            # 사전 분석 탭 메인 컴포넌트
  │   ├── InterviewGuideEmpty.tsx       # 미생성 상태 UI
  │   ├── GuideKeyPoints.tsx            # 핵심 파악 포인트 섹션
  │   ├── GuideQuestions.tsx            # 추천 질문 리스트 (체크/추가/삭제)
  │   └── GuideCautions.tsx             # 주의사항 섹션

src/lib/services/
  └── interview-guide.ts                # LLM 호출, 프롬프트 빌드

src/lib/schemas/
  └── interview-guide.ts                # guide_data Zod 스키마

supabase/migrations/
  └── 0XX_interview_guides.sql          # 테이블 + RLS
```

### 6.2 기존 파일 수정

```
src/app/(dashboard)/consultant/projects/[id]/
  ├── page.tsx                          # 세로 스크롤 → 탭 레이아웃 전환
  ├── _components/
  │   ├── CompanyInfoCard.tsx           # → CompanyInfoBar.tsx로 대체 (기존 삭제 또는 유지)

src/lib/services/
  └── export-pdf.ts                     # 인터뷰 가이드 PDF 내보내기 함수 추가
```

### 6.3 탭 구현 방식

- shadcn/ui의 `Tabs` 컴포넌트 사용 (Radix UI 기반)
- URL 해시 또는 searchParams로 탭 상태 관리 (새로고침 시 유지)
- 각 탭 콘텐츠는 서버 컴포넌트로 데이터를 미리 로드하되, 탭 전환은 클라이언트에서 처리

---

## 7. PDF 내보내기

### 7.1 구성

A4 1~2장 분량의 "인터뷰 사전 분석 보고서":

```
┌─────────────────────────────────────┐
│ 인터뷰 사전 분석 보고서              │
│ (주)한국전자 | 전자/반도체 | 중견기업  │
│ 생성일: 2026-02-10                  │
├─────────────────────────────────────┤
│                                     │
│ ■ 기업 현황 요약                     │
│ (company_summary 내용)              │
│                                     │
│ ■ 핵심 파악 포인트                   │
│ (key_points 테이블)                 │
│                                     │
│ ■ 인터뷰 질문 체크리스트              │
│ (checked=true인 질문만)             │
│ □ 질문1 — 의도                      │
│ □ 질문2 — 의도                      │
│ ...                                 │
│                                     │
│ ■ 주의사항                           │
│ (cautions 내용)                     │
│                                     │
└─────────────────────────────────────┘
```

### 7.2 구현

- 기존 `src/lib/services/export-pdf.ts`의 jspdf 인프라 활용
- 클라이언트 사이드에서 생성 (서버 리소스 불필요)

---

## 8. 구현 순서

### Phase 1: 프로젝트 상세 페이지 탭 리팩토링

1. `CompanyInfoBar` 컴포넌트 생성 (기업 정보 가로 레이아웃)
2. `ProjectDetailTabs` 컴포넌트 생성 (shadcn Tabs)
3. `page.tsx` 리팩토링: 세로 스크롤 → 상단 고정 + 탭 구조
4. 기존 컴포넌트(`ConsultantAssessmentResult`, `InterviewSummary`, `ActivityLog`)를 각 탭에 배치
5. 탭 상태 URL 동기화

### Phase 2: 사전 분석 기능 구현

1. DB 마이그레이션: `interview_guides` 테이블 + RLS
2. Zod 스키마: `guide_data` 검증
3. LLM 서비스: `interview-guide.ts` (프롬프트 + 호출 로직)
4. Server Actions: `generateInterviewGuide`, `updateGuideQuestions`
5. UI 컴포넌트: `InterviewGuide`, `GuideKeyPoints`, `GuideQuestions`, `GuideCautions`
6. 빈 상태 / 로딩 상태 UI

### Phase 3: 부가 기능

1. 질문 편집 (체크/추가/삭제)
2. PDF 내보내기
3. ▸상세보기 탭 전환 연동

---

## 9. 참고 자료

### 업계 리서치 소스

- [Gong AI Briefer](https://help.gong.io/docs/understanding-ai-briefer) — 구조화된 브리프, 섹션별 구성
- [Gong: How to use AI Briefer](https://www.gong.io/blog/how-to-use-ai-briefer-win-more-customers) — 브리프 타입, 커스터마이징
- [Salesforce Client Meeting Prep](https://www.salesforce.com/artificial-intelligence/use-cases/client-meeting-prep/) — CRM 기반 자동 요약
- [HubSpot AI Meeting Assistant](https://blog.origin63.com/how-to-use-hubspot-ai-meeting-assistant) — 페인포인트 표면화
- [Cirrus Insight Meeting AI](https://www.cirrusinsight.com/features/meeting-ai) — Who/What/Why 3섹션
- [Fireflies Discovery Call](https://fireflies.ai/blog/discovery-call-questions) — 편집 가능한 질문 리스트
- [MagicSchool Lesson Plan Generator](https://app.magicschool.ai/tools/lesson-plan-generator) — 최소 입력 → 구조화된 출력

### UX 패턴 소스

- [Dashboard UX Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards) — 탭 vs 스크롤
- [B2B SaaS Dashboard Design](https://uxdesign.cc/design-thoughtful-dashboards-for-b2b-saas-ff484385960d) — Progressive Disclosure
- [Dashboard Information Architecture](https://medium.com/gooddata-developers/six-principles-of-dashboards-information-architecture-5487d84c20c4)

### LLM 비용 소스

- [LLM Cost Per Token 2026](https://www.silicondata.com/blog/llm-cost-per-token) — Output 토큰이 Input의 3~10배 비용
- [LLM Pricing Comparison 2026](https://www.cloudidr.com/blog/llm-pricing-comparison-2026)
