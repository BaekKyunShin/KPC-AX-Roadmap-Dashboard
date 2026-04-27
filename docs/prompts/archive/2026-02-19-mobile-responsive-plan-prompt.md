# 모바일 반응형 최적화 계획서 작성 프롬프트

> **용도:** 이 프롬프트를 새 Claude Code 세션에서 Plan Mode로 실행하여 기획서를 생성한 뒤,
> 또 다른 세션에서 해당 기획서를 기반으로 구현 작업을 수행합니다.

---

## 프롬프트

```
나는 KPC AI 훈련 로드맵 대시보드의 모바일 반응형 최적화 작업을 계획하고 싶어.
아래의 "현재 상태 분석"과 "요구사항"을 꼼꼼히 읽고,
실행 가능한 구체적 계획서를 `docs/plans/archive/2026-02-19-mobile-responsive-spec.md` 파일로 작성해줘.

---

## 핵심 원칙 (절대 위반 금지)

1. **PC(데스크톱) UI/UX는 절대 변경하지 않는다**
   - md: 이상 브레이크포인트의 기존 스타일은 건드리지 않는다
   - 기존 데스크톱 레이아웃, 색상, 간격, 타이포그래피를 변경하는 것은 금지
   - 모든 변경은 모바일/소형 화면 대응 코드를 **추가**하는 방식으로만 진행

2. **최소 지원 뷰포트: 320px (iPhone SE)**
   - 320px에서 깨지지 않으면 모든 모바일 기기에서 동작한다고 간주
   - 테스트 기준 뷰포트: 320px, 375px, 390px, 428px (대표 모바일 너비)

3. **한글 텍스트 줄바꿈 품질**
   - 단어 단위 줄바꿈 (`word-break: keep-all` + `overflow-wrap: break-word`)
   - 글자 중간에서 끊기는 현상 방지
   - 필요한 곳에 `break-keep break-words` Tailwind 클래스 적용

---

## 현재 상태 분석

### 기술 스택
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 (기본 브레이크포인트: sm:640, md:768, lg:1024, xl:1280, 2xl:1536)
- shadcn/ui + Radix UI
- 랜딩 페이지: GSAP + Three.js + Lenis

### 이미 잘 되어 있는 부분 (건드릴 필요 없음)

| 영역 | 반응형 처리 상태 |
|------|-----------------|
| Navigation.tsx | `hidden md:flex` / `md:hidden` 완전 분기, 모바일 햄버거 메뉴 구현 완료 |
| 대시보드 레이아웃 | `px-4 sm:px-6 lg:px-8` 반응형 패딩 |
| HeroSection (랜딩) | `text-4xl sm:text-5xl md:text-6xl lg:text-7xl` 반응형 타이포 |
| WorkflowSection (랜딩) | `grid sm:grid-cols-2 lg:grid-cols-4` |
| FeaturesSection (랜딩) | `grid-cols-1 md:grid-cols-2` |
| RoadmapMatrix.tsx | `hidden md:block` 테이블 / `md:hidden` 모바일 카드 완전 분기 |
| InterviewStepper.tsx | 데스크톱 가로 / 모바일 세로 완전 분기 |
| ProjectTimeline.tsx | 데스크톱 가로 / 모바일 세로 완전 분기 |
| MessagesClient.tsx | 모바일에서 thread/list 교체 패턴 구현 |
| NotificationBell.tsx | `max-w-[calc(100vw-2rem)]`으로 뷰포트 초과 방지 |
| MessageThread.tsx 말풍선 | `max-w-[280px] sm:max-w-[360px]` 반응형 |
| GalleryContent.tsx | 필터: `flex-col md:flex-row`, 그리드: `grid-cols-1 lg:grid-cols-2` |
| 랜딩 Navbar | 데스크톱/모바일 완전 분기 |

### 문제가 있거나 개선이 필요한 부분

#### [심각도 높음] 테이블 기반 페이지 — 모바일 카드 뷰 없음

1. **ops 프로젝트 목록** (`src/app/(dashboard)/ops/projects/_components/ProjectList.tsx`)
   - `min-w-[900px]` 테이블 + `overflow-x-auto`
   - MiniStepper의 `whitespace-nowrap`으로 가로 넘침
   - 모바일에서 가로 스크롤만 가능 → UX 나쁨
   - **필요:** 모바일 카드 뷰 분기 또는 테이블 가로 스크롤 힌트 UI

2. **ops 사용자 관리** (`src/components/ops/UserManagementTable.tsx`)
   - `min-w-[700px]` 테이블 + `overflow-x-auto`
   - `pl-20` (80px) 고정 패딩 → 모바일에서 첫 번째 셀 매우 좁음
   - **필요:** 모바일용 패딩 축소 + 카드 뷰 검토

3. **ops 감사 로그** (`src/app/(dashboard)/ops/audit/page.tsx`)
   - `min-w-[800px]` 테이블 + `overflow-x-auto`
   - 모바일 카드 뷰 없음

4. **ops 쿼터 관리** (`src/app/(dashboard)/ops/quota/page.tsx`)
   - `min-w-[800px]` 테이블 + `overflow-x-auto`
   - 모바일 카드 뷰 없음

5. **ops 템플릿 목록** (`src/app/(dashboard)/ops/templates/_components/TemplateList.tsx`)
   - `overflow-x-auto`는 있으나 테이블에 `min-w` 미설정
   - 좁은 화면에서 컬럼이 과도하게 압축될 수 있음

6. **컨설턴트 프로젝트 목록** (`src/app/(dashboard)/consultant/projects/_components/ProjectList.tsx`)
   - `min-w-[700px]` 테이블 + `overflow-x-auto`
   - 모바일 카드 뷰 없음

7. **로드맵 CoursesList** (`src/components/roadmap/CoursesList.tsx`)
   - 내부 테이블들에 `w-[140px] whitespace-nowrap` 고정 셀
   - `overflow-x-auto` 래퍼는 있으나 모바일 별도 레이아웃 없음

#### [심각도 중간] 그리드/레이아웃 비대칭

8. **ops 프로젝트 StatsSummaryCards** (`src/app/(dashboard)/ops/projects/_components/StatsSummaryCards.tsx`)
   - `grid-cols-2 sm:grid-cols-4 lg:grid-cols-7` → 7개 카드
   - 모바일 2열: 마지막 1개 홀로 표시 (2+2+2+1)
   - sm 4열: 마지막 행 3개 비대칭 (4+3)
   - **필요:** 모바일에서 균형 잡힌 그리드 또는 가로 스크롤 카드

9. **컨설턴트 홈 SummaryCards** (`src/app/(dashboard)/consultant/home/page.tsx`)
   - `grid-cols-2 lg:grid-cols-5` → 5개 카드
   - 모바일 2열: 마지막 1개 홀로 표시 (2+2+1)
   - **필요:** 마지막 카드 full-width 처리 또는 그리드 조정

#### [심각도 중간] 텍스트 및 간격 문제

10. **SelfAssessmentResult.tsx** (`src/components/ui/SelfAssessmentResult.tsx`)
    - `w-28 truncate`로 차원 이름 잘림
    - 모바일에서 7글자 이상 차원명 가독성 떨어짐
    - **필요:** 모바일에서 너비 유동적으로 조정

11. **MiniStepper.tsx** (`src/app/(dashboard)/ops/projects/_components/MiniStepper.tsx`)
    - `whitespace-nowrap`으로 상태 라벨 + 경과일 넘침 가능
    - 테이블 셀 내부에서 사용되므로 모바일 영향

12. **RoadmapLoadingOverlay.tsx** (`src/components/roadmap/RoadmapLoadingOverlay.tsx`)
    - 로딩 단계 텍스트에 `whitespace-nowrap`
    - 모바일 좁은 화면에서 텍스트 잘림 가능

#### [심각도 낮음] 글로벌 방어 코드 부족

13. **globals.css에 모바일 방어 스타일 없음**
    - `overflow-wrap: break-word` 글로벌 미적용
    - `word-break: keep-all` 한글 줄바꿈 글로벌 미적용
    - 이미지 `max-width: 100%` 글로벌 미적용

#### [참고] 확인이 필요한 페이지 (현재 상태 미상)

- 로그인/회원가입 페이지 (`(auth)/login`, `(auth)/register`)
- 대시보드 프로필 (`dashboard/profile/page.tsx`)
- 대시보드 설정 (`dashboard/settings/page.tsx`)
- 컨설턴트 프로필 편집 (`consultant/profile/page.tsx`)
- 컨설턴트 프로젝트 상세 (`consultant/projects/[id]/page.tsx`)
- 인터뷰 페이지 (`consultant/projects/[id]/interview/page.tsx`)
- 로드맵 편집 (`consultant/projects/[id]/roadmap/page.tsx`)
- ops 프로젝트 상세 (`ops/projects/[id]/page.tsx`)
- ops 프로젝트 로드맵 (`ops/projects/[id]/roadmap/page.tsx`)
- ops 신규 프로젝트 (`ops/projects/new/page.tsx`)
- ops 템플릿 편집 (`ops/templates/[id]/page.tsx`, `ops/templates/new/page.tsx`)
- 갤러리 상세 (`gallery/[id]/page.tsx`)
- 테스트 로드맵 (`test-roadmap/page.tsx`)
- 데모 페이지 (`demo/page.tsx`)
- PendingApprovalCard.tsx (승인 대기 카드)

---

## 계획서에 반드시 포함할 내용

### 1. 작업 우선순위 분류
모든 페이지/컴포넌트를 아래 3단계로 분류해줘:
- **P0 (필수):** 외부 노출 가능성 있는 페이지 + 모든 사용자가 접근하는 공통 페이지
- **P1 (권장):** 컨설턴트/운영관리자가 모바일로 확인할 수 있으면 좋은 페이지
- **P2 (선택):** 복잡한 데이터 입력이라 PC 전용이 자연스러운 페이지

### 2. 글로벌 수정 사항
- `globals.css`에 추가할 방어적 CSS
- 공통 컴포넌트(테이블, 카드 등)에 적용할 반응형 패턴
- 한글 텍스트 줄바꿈 표준 패턴 정의

### 3. 페이지별 수정 계획
각 페이지/컴포넌트에 대해:
- 현재 문제점
- 수정 방법 (Tailwind 클래스 수준의 구체적 가이드)
- 영향 범위 (해당 파일만인지, 공통 컴포넌트까지 수정 필요한지)
- 주의사항 (데스크톱 영향 없는지 확인 포인트)

### 4. 공통 패턴 가이드
구현자가 일관되게 작업할 수 있도록:
- 테이블 → 모바일 카드 뷰 전환 패턴 (코드 예시)
- 그리드 비대칭 해결 패턴
- 텍스트 오버플로우 처리 패턴
- 가로 스크롤 힌트 패턴 (필요 시)
- 모바일 전용 스타일 추가 시 코드 컨벤션

### 5. 검증 체크리스트
- Chrome DevTools 반응형 모드 검증 절차
- 테스트할 뷰포트 너비 목록 (320, 375, 390, 428px)
- 각 페이지별 "깨지지 않음"의 판정 기준

### 6. 세션 분할 실행 전략

이 작업은 양이 많아 **하나의 Claude Code 세션에서 전부 완료할 수 없다.**
컨텍스트 압축이 발생하면 맥락이 유실되므로, 반드시 **세션 단위로 나누어 실행**해야 한다.

아래 기준으로 계획서를 작성해줘:

#### 6-1. 배치 = 세션 원칙
- **1배치 = 1세션**으로 설계
- 각 배치는 해당 세션 안에서 **시작부터 검증까지 완결**되어야 함
- 한 배치가 실패하거나 미완성이어도 다른 배치에 영향 없도록 **독립적**으로 설계

#### 6-2. 세션당 작업량 상한
- 한 세션에서 수정하는 파일 수: **최대 8~12개**
- 새로 작성하는 코드: **최대 300~400줄** 수준
- 이보다 많으면 컨텍스트 압축 위험 → 배치를 더 잘게 나눌 것

#### 6-3. 배치 간 의존성 순서
- 반드시 **선행 배치가 완료되어야 후행 배치를 시작할 수 있는 경우**를 명시
- 예: "글로벌 CSS 배치(Batch 0)가 완료되어야 나머지 배치에서 `break-keep` 등을 전제할 수 있음"
- 독립적인 배치는 **순서 무관**으로 표시

#### 6-4. 각 배치별 필수 포함 정보
각 배치(세션)에 대해 아래를 **모두** 명시해줘:

| 항목 | 설명 |
|------|------|
| **배치 번호 및 제목** | 예: `Batch 0: 글로벌 방어 CSS + 공통 컴포넌트` |
| **선행 조건** | 이 배치를 시작하기 전에 완료되어야 하는 배치 번호 (없으면 "없음") |
| **수정 대상 파일 목록** | 정확한 파일 경로 나열 |
| **수정 내용 요약** | 파일별로 무엇을 어떻게 바꾸는지 Tailwind 클래스 수준으로 기술 |
| **세션 시작 프롬프트** | 해당 세션을 열 때 Claude Code에게 붙여넣을 프롬프트 초안 (아래 형식) |
| **세션 종료 검증 항목** | 이 배치 완료 후 확인해야 할 것들 (뷰포트별 스크린샷, 빌드 성공 등) |

#### 6-5. 세션 시작 프롬프트 형식
각 배치의 세션 시작 프롬프트는 아래 형식을 따르도록 작성해줘:

```

[배치 제목]

## 배경

이 작업은 `docs/plans/archive/2026-02-19-mobile-responsive-spec.md` 계획서의 Batch N에 해당한다.
계획서를 먼저 읽고, 이 배치의 내용만 정확히 구현해줘.

## 핵심 원칙

1. PC(데스크톱) UI/UX 절대 변경 금지 — md: 이상 기존 클래스 수정/삭제 금지
2. 모바일 대응 코드만 추가 (기본 스타일 또는 sm: 접두사)
3. 한글 텍스트는 break-keep break-words 적용

## 이 배치에서 수정할 파일

- [파일 경로 1]: [수정 내용 한 줄 요약]
- [파일 경로 2]: [수정 내용 한 줄 요약]
- ...

## 선행 배치 완료 사항

- [Batch X에서 이미 수정된 내용 중 이 배치에서 전제하는 것]

## 완료 기준

- [ ] 320px 뷰포트에서 레이아웃 깨짐 없음
- [ ] 375px 뷰포트에서 텍스트 줄바꿈 정상
- [ ] npm run build 성공
- [ ] 기존 데스크톱 레이아웃 변경 없음 확인

```

#### 6-6. 배치 분할 예시 구조 (참고용)
아래는 예시이며, 실제 조사 결과에 따라 개수 및 내용은 조정해줘:

```

Batch 0: 글로벌 CSS + 공통 UI 컴포넌트  (선행 조건: 없음)
Batch 1: 인증 + 공통 대시보드 페이지     (선행 조건: Batch 0)
Batch 2: 갤러리 페이지                   (선행 조건: Batch 0)
Batch 3: 컨설턴트 영역                   (선행 조건: Batch 0)
Batch 4: ops 테이블 페이지들             (선행 조건: Batch 0)
Batch 5: ops 폼/상세 페이지들            (선행 조건: Batch 0)
Batch 6: 나머지 + 최종 검증              (선행 조건: 전체)

```

Batch 1~5는 서로 독립적이므로 순서 무관하게 진행 가능.
이런 식으로 **의존성 그래프**를 명확히 그려줘.

---

## 주의사항

- 계획서는 **다른 세션의 Claude Code가 읽고 바로 구현할 수 있는 수준**으로 구체적이어야 함
- "적절히 수정" 같은 모호한 표현 대신 Tailwind 클래스명까지 명시
- 기존 코드의 정확한 파일 경로와 라인 참조 포함
- `break-keep break-words` 패턴을 한글 텍스트가 있는 모든 곳에 체계적으로 적용하는 계획 포함
- `min-w-0` 패턴이 flex 컨테이너에서 텍스트 말줄임에 필요한 곳 식별
- PC 레이아웃 보호를 위해 모든 변경이 `sm:` 이하 또는 기본(접두사 없음) 클래스에만 적용되는지 검증 방법 명시
- **각 배치(세션)의 시작 프롬프트는 그 세션만 읽으면 작업할 수 있도록 자기 완결적**이어야 함 — 이전 세션의 대화 기록에 의존하지 않을 것
- **계획서 자체가 모든 세션의 공통 참조 문서** 역할을 하므로, 각 세션 시작 시 "이 계획서를 먼저 읽어라"는 지시를 포함할 것

---

## 참고: 프로젝트 전체 페이지 목록

### 공개 라우트
| 경로 | 설명 |
|------|------|
| `page.tsx` | 랜딩 페이지 |
| `demo/page.tsx` | 샘플 데모 |

### 인증 라우트
| 경로 | 설명 |
|------|------|
| `(auth)/login/page.tsx` | 로그인 |
| `(auth)/register/page.tsx` | 회원가입 |

### 공통 대시보드
| 경로 | 설명 |
|------|------|
| `(dashboard)/dashboard/page.tsx` | 역할별 진입점 |
| `(dashboard)/dashboard/profile/page.tsx` | 프로필 관리 |
| `(dashboard)/dashboard/settings/page.tsx` | 계정 설정 |
| `(dashboard)/dashboard/messages/page.tsx` | DM 메시징 |

### 컨설턴트 전용
| 경로 | 설명 |
|------|------|
| `consultant/home/page.tsx` | 대시보드 (KPI) |
| `consultant/profile/page.tsx` | 프로필 편집 |
| `consultant/projects/page.tsx` | 프로젝트 목록 |
| `consultant/projects/[id]/page.tsx` | 프로젝트 상세 |
| `consultant/projects/[id]/interview/page.tsx` | 인터뷰 진행 |
| `consultant/projects/[id]/roadmap/page.tsx` | 로드맵 생성 |

### 갤러리
| 경로 | 설명 |
|------|------|
| `gallery/page.tsx` | 갤러리 목록 |
| `gallery/[id]/page.tsx` | 갤러리 상세 |

### 운영관리자 (ops)
| 경로 | 설명 |
|------|------|
| `ops/projects/page.tsx` | 프로젝트 관리 |
| `ops/projects/new/page.tsx` | 신규 프로젝트 |
| `ops/projects/[id]/page.tsx` | 프로젝트 상세 |
| `ops/projects/[id]/roadmap/page.tsx` | 로드맵 관리 |
| `ops/users/page.tsx` | 사용자 관리 |
| `ops/templates/page.tsx` | 템플릿 목록 |
| `ops/templates/new/page.tsx` | 템플릿 생성 |
| `ops/templates/[id]/page.tsx` | 템플릿 편집 |
| `ops/audit/page.tsx` | 감사 로그 |
| `ops/quota/page.tsx` | 쿼터 관리 |

### 기타
| 경로 | 설명 |
|------|------|
| `test-roadmap/page.tsx` | 테스트 로드맵 |

### 주요 공통 컴포넌트
| 컴포넌트 | 위치 |
|----------|------|
| Navigation.tsx | src/components/ |
| NotificationBell.tsx | src/components/ |
| MessageIcon.tsx | src/components/ |
| PendingApprovalCard.tsx | src/components/ |
| page-header.tsx | src/components/ui/ |
| SelfAssessmentResult.tsx | src/components/ui/ |
| Pagination.tsx | src/components/ui/ |
| SearchInput.tsx | src/components/ui/ |
| EmptyState.tsx | src/components/ui/ |
| FooterCredit.tsx | src/components/ui/ |
| GalleryCard.tsx | src/components/gallery/ |
| CoursesList.tsx | src/components/roadmap/ |
| RoadmapMatrix.tsx | src/components/roadmap/ |
| RoadmapLoadingOverlay.tsx | src/components/roadmap/ |
| UserManagementTable.tsx | src/components/ops/ |
| AssignmentTabSection.tsx | src/components/ops/ |
| SelfAssessmentForm.tsx | src/components/ops/ |
| ConsultantSelector.tsx | src/components/ops/ |
| ProfileForm.tsx | src/components/consultant/ |

---

## 참고: Tailwind CSS 4 브레이크포인트

| 접두사 | 최소 너비 | 의미 |
|--------|----------|------|
| (없음) | 0px | 모바일 기본 |
| sm: | 640px | 큰 모바일/작은 태블릿 |
| md: | 768px | 태블릿 |
| lg: | 1024px | 데스크톱 |
| xl: | 1280px | 큰 데스크톱 |
| 2xl: | 1536px | 초대형 화면 |

**PC 보호 원칙:** 기존 `md:`, `lg:`, `xl:`, `2xl:` 클래스는 절대 수정하지 않는다.
모바일 대응은 접두사 없는 기본 스타일 또는 `sm:` 접두사로만 추가한다.
```
