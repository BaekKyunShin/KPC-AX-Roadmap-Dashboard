# Playwright E2E 테스트 — 세션별 실행 가이드 (v2)

> 이 파일은 `docs/plans/2026-02-13-e2e-test-implementation-plan.md`을 세션별로 실행할 때 사용하는 프롬프트 및 진행 가이드입니다.
>
> **v2 변경 사항:** 컨텍스트 압축으로 인한 누락 방지를 위해 세션을 더 작게 분할. 보완 세션(3~5) 추가. 각 프롬프트에 TEST_PLAN.md 원본 항목을 구체적으로 명시.

## 운영 원칙

- **세션당 spec 파일**: 복잡한 경우 1개, 간단한 경우 최대 2개
- **세션당 목표 시간**: 30~40분 이내 (압축 발생 전 마무리)
- **프롬프트에 TEST_PLAN 항목 명시**: 빈 바디/주석 참조 금지, 구체적 테스트 케이스 나열
- **각 세션은 새 대화로 시작**: 이전 세션 컨텍스트에 의존하지 않음

## 사전 준비

**매 세션 시작 전:**
- `npm run dev`로 개발 서버가 실행 중이어야 합니다 (localhost:3000)
- `.env.test` 파일이 프로젝트 루트에 존재해야 합니다 (Session 0에서 생성)

## 진행 추적

- [x] Session 0: 인프라 구축
- [x] Session 1: public/ + auth/
- [x] Session 2: ops/navigation + ops/projects + ops/logout
- [ ] Session 3: 보완 — Session 1~2 누락 항목 (navigation, landing, login, register)
- [ ] Session 4: 보완 — projects.spec.ts Phase 2.4 (필터/페이지네이션)
- [ ] Session 5: 보완 — projects.spec.ts Phase 2.5~2.8 (폼/상세/로드맵뷰)
- [ ] Session 6: ops/users (Phase 2.9)
- [ ] Session 7: ops/templates + audit-quota (Phase 2.10~2.14)
- [ ] Session 8: consultant/navigation + home (Phase 3.0~3.4)
- [ ] Session 9: consultant/profile + access-control (Phase 3.5, 3.15)
- [ ] Session 10: consultant/projects (Phase 3.6~3.7)
- [ ] Session 11: consultant/interview (Phase 3.8)
- [ ] Session 12: consultant/roadmap (Phase 3.9)
- [ ] Session 13: shared/gallery (Phase 2.17~2.18, 3.12~3.13)
- [ ] Session 14: shared/messages + settings (Phase 2.15~2.16, 3.10~3.11)
- [ ] Session 15: shared/test-roadmap + cross/edge-cases (Phase 2.19, 3.14, 4.2)
- [ ] Session 16: cross-feature + CI + 전체 검증 (Phase 4.1, 4.3~4.4)

---

## Session 0~2: 완료됨

Session 0(인프라), Session 1(public/auth), Session 2(ops/navigation+projects+logout)는 완료. 보완 세션(3~5)에서 누락 항목을 추가합니다.

---

## Session 3: 보완 — Session 1~2 누락 항목

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.
Session 0~2까지 완료되었으나, TEST_PLAN.md 원본 항목 대비 일부 누락이 발견되어 보완합니다.

참고 문서:
- 원본 테스트 항목: docs/testing/TEST_PLAN.md
- 기존 spec 파일들: e2e/public/, e2e/auth/, e2e/ops/

## 이번 작업

아래 **기존 spec 파일**에 누락된 test()를 추가해줘.
각 파일을 먼저 읽고, 기존 코드 스타일에 맞춰 누락된 테스트만 추가해.

### 1. e2e/public/landing.spec.ts (Phase 1.1)

누락 항목:
- CTA 버튼이 2개임: "로그인하여 시작하기"→/login, "무료로 시작하기"→/register (TEST_PLAN 참고, 실제 텍스트가 다를 수 있으니 확인)
- 현재 "서비스 이용하기" 1개만 테스트 중. 실제 페이지에서 CTA를 확인하고 누락된 것 추가
- 섹션 확인: 현재 3개(features, workflow, demo)만 확인. TEST_PLAN에는 6개 섹션이라고 되어 있음. 실제 페이지에서 section 요소를 확인하고 누락 섹션 추가

### 2. e2e/auth/login.spec.ts (Phase 1.3)

누락 항목:
- "로그인 중..." 로딩 상태 표시 확인 + 제출 시 버튼 비활성화 (disabled) 확인
  → 올바른 계정 로그인 테스트에 추가하거나 별도 test()로 작성

### 3. e2e/auth/register.spec.ts (Phase 1.4)

누락 항목:
- 개인정보 동의 미체크 시 → HTML5 required (valueMissing) 검사. 다른 필드는 다 채우고 동의만 미체크한 상태에서 "다음" 클릭
- 비밀번호 보기/숨기기 토글 동작 확인 — 비밀번호 필드 2개(password, confirmPassword) 각각의 토글 버튼 테스트

### 4. e2e/ops/navigation.spec.ts (Phase 2.0~2.2)

누락 항목:
- Phase 2.1: 메시지 안읽음 배지 존재 여부 확인 (숫자가 아닌 배지 요소 존재만)
- Phase 2.1: 알림 벨 아이콘 표시 확인 (현재 Phase 2.2에서 팝오버만 테스트, 아이콘 자체 표시 미확인)
- Phase 2.1: 활성 메뉴 하이라이트 확인 — 페이지 이동 후 해당 드롭다운 트리거의 활성 스타일 확인
- Phase 2.2: 각 탭(전체/인터뷰/초안/확정) 클릭 시 빈 알림 메시지 "새로운 알림이 없습니다" 표시 확인

완료 후 테스트 실행:
npx playwright test e2e/public e2e/auth e2e/ops/navigation.spec.ts --headed

모든 테스트 통과 확인 후 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/public e2e/auth e2e/ops/navigation.spec.ts --headed
```

---

## Session 4: 보완 — projects.spec.ts Phase 2.4 (필터/페이지네이션)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.
e2e/ops/projects.spec.ts가 존재하지만 Phase 2.4의 세부 항목이 누락되어 보완합니다.

참고 문서:
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 2.4 프로젝트 목록)
- 기존 파일: e2e/ops/projects.spec.ts

## 이번 작업

e2e/ops/projects.spec.ts의 Phase 2.4 섹션에 아래 누락된 test()를 추가해줘.
기존 파일을 먼저 읽고, 기존 코드 스타일과 구조에 맞춰 추가해.

### 누락된 테스트 케이스 (Phase 2.4)

**통계 카드:**
- 각 카드의 숫자가 0 이상인지 확인 (getByText로 숫자 존재 확인)
- 카드 클릭 시 필터 적용 확인: "신규 등록" 카드 클릭 → 목록 탭 전환 + 필터 결과 변경
- 카드 클릭 후 자동으로 목록 탭으로 전환되는지 확인

**필터 — 상태 드롭다운:**
- 상태 드롭다운(combobox) 열기 → 옵션 존재 확인
- 특정 상태 선택 → 필터 적용 (결과 카운터 변경 확인)

**필터 — 업종 드롭다운:**
- 업종 드롭다운(combobox) 열기 → 옵션 존재 확인
- 특정 업종 선택 → 필터 적용

**필터 — 배지/초기화:**
- 필터 적용 후 활성 필터 배지 표시 확인
- 배지의 X 버튼 클릭 → 해당 필터 해제
- "필터 초기화" 버튼 클릭 → 모든 필터 해제 (전체 프로젝트 복원)

**테이블 추가:**
- MiniStepper(진행 상태 시각화) 렌더링 확인
- 빈 목록 시 빈 상태 메시지 표시 (필터로 0개 만든 후 확인)

**페이지네이션:**
- 페이지 번호 버튼 클릭 → 해당 페이지 표시
- "이전" 버튼 — 첫 페이지에서 비활성화 확인
- "다음" 버튼 클릭 → 페이지 전환

셀렉터는 --headed 모드로 실제 DOM을 확인하면서 작성해.
완료 후 테스트 실행: npx playwright test e2e/ops/projects.spec.ts --headed
모든 테스트 통과 확인 후 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/ops/projects.spec.ts --headed
```

---

## Session 5: 보완 — projects.spec.ts Phase 2.5~2.8

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.
e2e/ops/projects.spec.ts가 존재하지만 Phase 2.5~2.8의 세부 항목이 누락되어 보완합니다.

참고 문서:
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 2.5~2.8)
- 기존 파일: e2e/ops/projects.spec.ts

## 이번 작업

e2e/ops/projects.spec.ts의 Phase 2.5~2.8 섹션에 아래 누락된 test()를 추가해줘.
기존 파일을 먼저 읽고, 기존 코드 스타일과 구조에 맞춰 추가해.

### Phase 2.5 프로젝트 생성 — 누락 항목

- 기업 규모 Select 옵션 수 확인 (5개: 1~9명, 10~49명, ...)
- 업종 Select 옵션 수 확인 (12개)
- 세부 업종 TagInput 구조 확인 (입력 필드 존재)
- 담당자 연락처(tel), 회사 주소, 고객 코멘트 필드 존재 확인
- 로딩 상태 "생성 중..." 표시 확인 (제출 후 버튼 텍스트/비활성화)
- "취소" 버튼 클릭 → /ops/projects 이동

### Phase 2.6 프로젝트 상세 (기존) — 누락 항목

- 상태 배지 표시 확인 (예: "로드맵 최종 확정")
- 이메일 링크 (mailto:) 존재 확인
- 연락처 링크 (tel:) 존재 확인
- 자가진단 결과 카드: 스텝 인디케이터 또는 완료 상태 표시
- 컨설턴트 배정 정보 표시 (배정된 경우)

### Phase 2.8 로드맵 OPS 뷰 — 누락 항목

현재 로드맵 페이지에 접근하는 테스트만 있음. 아래 추가:
- 콘솔 에러 확인
- 버전 히스토리 목록 표시 확인 (왼쪽 패널)
- 버전 상태 배지 (FINAL/DRAFT 등) 확인
- "PDF 다운로드" 버튼 존재 확인
- "Excel 다운로드" 버튼 존재 확인
- 탭 전환: 과정 체계도, PBL 과정, 과정 상세

참고: 로드맵이 존재하는 프로젝트에서 테스트해야 함. 기존 테스트처럼 목록→상세→로드맵 순으로 접근하되, 로드맵이 없으면 test.skip() 처리.

셀렉터는 --headed 모드로 실제 DOM을 확인하면서 작성해.
완료 후 테스트 실행: npx playwright test e2e/ops/projects.spec.ts --headed
모든 테스트 통과 확인 후 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/ops/projects.spec.ts --headed
```

---

## Session 6: ops/users (Phase 2.9)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.
Session 0~2 완료, 보완 세션(3~5) 완료.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md (Task 3-1)
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 2.9)
- 기존 패턴 참고: e2e/ops/projects.spec.ts (같은 ops 디렉터리)

## 이번 작업

e2e/ops/users.spec.ts를 새로 작성해줘.

### TEST_PLAN Phase 2.9 — 구현해야 할 테스트 케이스:

**테이블:**
- 컬럼 표시: 사용자(이름/이메일/전화), 역할, 상태, 프로필, 가입일, 작업
- 역할 배지 정상 표시
- 상태 배지 정상 표시

**사용자 승인 (파괴적):**
- PENDING 상태 사용자의 "승인" 버튼 클릭
- 승인 성공 확인 → 상태 변경
- afterAll에서 restoreUserStatus()로 복원

**사용자 정지 (파괴적):**
- ACTIVE 상태 사용자의 "정지" 버튼 클릭
- 정지 성공 확인

**사용자 재활성화:**
- SUSPENDED 상태 사용자의 "활성화" 버튼 클릭
- 활성화 성공 확인

**프로필 상세 모달:**
- "프로필 보기" 링크 클릭 → 모달 열림
- 기본 정보 (소속, 경력 연수) 표시
- 전문분야/가능 업종/강의 레벨/코칭 방식/역량 태그 배지 표시
- 대표 수행경험, 포트폴리오, 강점/제약 텍스트 표시
- Escape 키로 모달 닫기
- 모달 바깥 클릭으로 닫기

핵심 사항:
- opsPage fixture 사용
- 모달 셀렉터: [data-slot="dialog-content"]
- 파괴적 액션: restoreUserStatus()로 복원 (cleanup.helper.ts에 이미 있음)

셀렉터는 --headed 모드로 실제 DOM을 확인하면서 작성해.
완료 후 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/ops/users.spec.ts --headed
```

---

## Session 7: ops/templates + audit-quota (Phase 2.10~2.14)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md (Task 3-2, 3-3)
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 2.10~2.14)
- 기존 패턴 참고: e2e/ops/projects.spec.ts

## 이번 작업

2개 spec 파일을 새로 작성해줘.

### 1. e2e/ops/templates.spec.ts (Phase 2.10~2.12)

**목록 (Phase 2.10):**
- 테이블 컬럼: 버전, 이름, 문항 수, 사용 현황, 상태, 생성일, 작업
- 이름 클릭 → /ops/templates/{id} 이동
- 케밥 메뉴(⋮) 클릭 → DropdownMenu 열림 확인
- 케밥 메뉴 항목: 조건부 표시 (활성 템플릿은 복제만, 미사용+비활성만 삭제 가능)
- "복제" 클릭 → 복제 성공 (파괴적 → deleteTemplate()로 복원)
- "삭제" 클릭 → 삭제 성공 확인 (미사용+비활성 템플릿 대상, 파괴적 → 복제해두고 테스트)

**생성 (Phase 2.11):**
- "새 템플릿" 버튼 → /ops/templates/new 이동
- 폼 필드 확인 (이름, 설명 등)

**수정 (Phase 2.12):**
- 기존 템플릿 상세/수정 페이지
- 기존 데이터 로딩 확인
- 질문 편집 UI 확인
- 질문 드래그 앤 드롭 리오더링: GripVertical 드래그 핸들 존재 확인
- 사용 중 템플릿: 이름·설명만 수정 시 직접 수정 동작 (질문 미변경 시 새 버전 생성 안 함)

### 2. e2e/ops/audit-quota.spec.ts (Phase 2.13~2.14)

**감사로그 (Phase 2.13):**
- 필터 바: 검색, 액션, 대상, 사용자, 날짜
- 총 건수 표시
- 다운로드 버튼
- 테이블 6개 컬럼
- 페이지네이션

**쿼터 관리 (Phase 2.14):**
- 조회 월 드롭다운
- 테이블: 사용자, 역할, 월간 사용량, 일일/월간 한도, 한도 설정
- "수정" 클릭 → 편집 모드 → "취소"로 복원

핵심 사항:
- opsPage fixture 사용
- templates: 파괴적 — deleteTemplate()로 복원
- audit-quota: 읽기 전용 (파괴적 액션 없음, 편집 모드는 취소로 복원)

각 spec 파일 완료 후 개별 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/ops/templates.spec.ts e2e/ops/audit-quota.spec.ts --headed
```

---

## Session 8: consultant/navigation + home (Phase 3.0~3.4)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md (Task 4-1, 4-2)
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 3.0~3.4)
- OPS 네비게이션 참고: e2e/ops/navigation.spec.ts (컨설턴트는 구조가 다름)

## 이번 작업

2개 spec 파일을 새로 작성해줘.

### 1. e2e/consultant/navigation.spec.ts (Phase 3.0~3.3, 3.16)

**Phase 3.0 로그인:**
- 컨설턴트 로그인 → /consultant/projects 리다이렉트

**Phase 3.1 네비게이션 (플랫 메뉴, 드롭다운 아님!):**
- 플랫 메뉴 4개: 대시보드, 담당 프로젝트, 테스트 로드맵, 로드맵 갤러리
- 각 메뉴 클릭 → 해당 URL 이동
- OPS 메뉴 미표시 확인 (프로젝트 관리, 사용자 관리 등이 보이면 안 됨)
- 메시지 아이콘 + 안읽음 배지
- 메시지 클릭 → /dashboard/messages

**Phase 3.2 알림 벨:**
- 벨 아이콘 클릭 → 팝오버
- 탭 미표시 확인 (탭은 관리자만!)
- 팝오버 닫기

**Phase 3.3 사용자 드롭다운:**
- 이름, 이메일, 역할 배지
- 프로필 관리 → /consultant/profile
- 계정 설정 → /dashboard/settings
- 로그아웃 → /login + 세션 정리

**Phase 3.16 접근 제어:**
- /dashboard → /consultant/projects 리다이렉트

### 2. e2e/consultant/home.spec.ts (Phase 3.4)

- 요약 카드 (전체, 인터뷰 대기, 로드맵 작성 중, 완료)
- 상태 분포 차트 (Recharts SVG 존재 확인)
- 최근 프로젝트 목록 + 클릭 → 상세 이동
- 최근 활동 로그 표시
- "전체 보기" → /consultant/projects

핵심 사항:
- consultantPage fixture 사용
- 컨설턴트 네비게이션은 OPS와 완전히 다름 (플랫 메뉴 vs 드롭다운)
- 로그아웃 테스트는 OPS처럼 별도 파일 분리 필요할 수 있음 (세션 무효화)
  → 판단은 구현 시 결정. 분리하면 playwright.config.ts에 dependency 추가

각 spec 파일 완료 후 개별 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/consultant/navigation.spec.ts e2e/consultant/home.spec.ts --headed
```

---

## Session 9: consultant/profile + access-control (Phase 3.5, 3.15)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md (Task 4-3, 5-4)
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 3.5, 3.15)

## 이번 작업

2개 spec 파일을 새로 작성해줘.

### 1. e2e/consultant/profile.spec.ts (Phase 3.5)

- ProfileForm 필드 확인: 소속, 산업 분야, 업무 분야, 수준, 방식, 역량 태그, 경력 등
- 기존 값 로딩 확인
- 필수 필드 미선택 시 저장 버튼 비활성화
- 수정 + 저장 → 성공 토스트 (파괴적 → restoreProfile()로 복원)
- 취소 → /consultant/projects 이동

### 2. e2e/consultant/access-control.spec.ts (Phase 3.15)

5개 OPS 경로에 컨설턴트로 접근 시 리다이렉트 확인:
- /ops/projects → /consultant/projects
- /ops/users → /consultant/projects
- /ops/templates → /consultant/projects
- /ops/audit → /dashboard
- /ops/quota → /dashboard

핵심 사항:
- consultantPage fixture 사용
- profile: 파괴적 — restoreProfile()로 복원 (cleanup.helper.ts에 있음)
- access-control: 읽기 전용, 간단

각 spec 파일 완료 후 개별 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/consultant/profile.spec.ts e2e/consultant/access-control.spec.ts --headed
```

---

## Session 10: consultant/projects (Phase 3.6~3.7)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md (Task 5-1)
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 3.6~3.7)

## 이번 작업

e2e/consultant/projects.spec.ts를 새로 작성해줘. 이 파일은 복잡하므로 단독 세션입니다.

### Phase 3.6 프로젝트 목록

- 필터/검색 (회사명)
- 상태 드롭다운 필터
- 테이블 컬럼: 기업명, 업종, 규모, 상태, 배정일, 작업
- 자신의 담당 프로젝트만 표시되는지 확인
- 상세보기 클릭 → /consultant/projects/{id}

### Phase 3.7 프로젝트 상세

- 기업 정보 탭 확인
- 사전 분석 탭 확인
- 활동 일지 탭:
  - 일지 목록 표시
  - 새 일지 생성 (파괴적 → deleteActivityLog()로 복원)
  - 일지 수정
  - 일지 삭제
- "분석 재생성" 버튼 **존재만 확인** (클릭 금지 — LLM)

핵심 사항:
- consultantPage fixture 사용
- serial 모드 (test.describe.configure)
- 파괴적 액션: deleteActivityLog()로 복원

셀렉터는 --headed 모드로 실제 DOM을 확인하면서 작성해.
완료 후 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/consultant/projects.spec.ts --headed
```

---

## Session 11: consultant/interview (Phase 3.8)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md (Task 5-2)
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 3.8)

## 이번 작업

e2e/consultant/interview.spec.ts를 새로 작성해줘.

### Phase 3.8 인터뷰 입력

- 6단계 스테퍼 표시
- 각 단계 필드 확인:
  - 1단계: 인터뷰 날짜, 참석자
  - 2단계: 현재 시스템/AI 활용 현황
  - 3단계: 주요 업무 프로세스
  - 4단계: 페인포인트/개선 희망사항
  - 5단계: 교육 목표/제약조건
  - 6단계: 확인 (각 "수정" 버튼 → 해당 스텝 이동)
- 스텝 이동: 다음/이전 버튼, 인디케이터 클릭
- STT 파일 업로드 UI 존재만 확인 (실제 업로드 skip — LLM)
- 자동 저장 상태 표시

핵심 사항:
- consultantPage fixture 사용
- 인터뷰가 존재하는 프로젝트에서 테스트 (목록 → 상세 → 인터뷰 탭)
- LLM skip: STT 업로드 실행하지 않음

셀렉터는 --headed 모드로 실제 DOM을 확인하면서 작성해.
완료 후 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/consultant/interview.spec.ts --headed
```

---

## Session 12: consultant/roadmap (Phase 3.9)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md (Task 5-3)
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 3.9)

## 이번 작업

e2e/consultant/roadmap.spec.ts를 새로 작성해줘.

### Phase 3.9 로드맵 뷰

- 버전 히스토리 표시
- 탭 전환: 과정 체계도, PBL 과정, 과정 상세
- 수동 편집 버튼 존재 확인
- "새 버전 생성" 버튼 **존재만 확인** (클릭 금지 — LLM)
- 최종 확정 — 읽기 전용으로만 확인 (확정 실행 안 함)
- 다운로드 버튼: PDF, Excel 존재 확인
- 공유 토글 (파괴적 → restoreShareStatus()로 복원)

핵심 사항:
- consultantPage fixture 사용
- 로드맵이 존재하는 프로젝트에서 테스트 (없으면 test.skip)
- LLM skip: "새 버전 생성" 클릭 금지
- 파괴적: restoreShareStatus()로 복원

셀렉터는 --headed 모드로 실제 DOM을 확인하면서 작성해.
완료 후 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/consultant/roadmap.spec.ts --headed
```

---

## Session 13: shared/gallery (Phase 2.17~2.18, 3.12~3.13)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md (Task 6-1)
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 2.17~2.18, 3.12~3.13)

## 이번 작업

e2e/shared/gallery.spec.ts를 새로 작성해줘. 양 역할 테스트이므로 단독 세션입니다.

### 관리자 (opsPage) 테스트:
- 필터/검색 (업종, 정렬)
- 관리자 전용 필터 3개 표시 확인
- 카드 그리드 표시
- 카드 클릭 → /gallery/{id}
- 좋아요 토글 (클릭 → 증가 → 다시 클릭 → 원복)
- 갤러리 상세: 탭 3개, 뒤로가기

### 컨설턴트 (consultantPage) 테스트:
- 관리자 전용 필터 3개 미표시 확인
- 카드 그리드 표시
- 좋아요 토글
- "이 로드맵 사용하기" 다이얼로그 확인

핵심 사항:
- opsPage + consultantPage fixture 모두 사용
- 파괴적: 좋아요 → 다시 토글로 복원 (DB 복원 불필요)

각 역할별 describe 블록으로 분리해서 작성해.
셀렉터는 --headed 모드로 확인.
완료 후 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/shared/gallery.spec.ts --headed
```

---

## Session 14: shared/messages + settings (Phase 2.15~2.16, 3.10~3.11)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md (Task 6-2, 6-3)
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 2.15~2.16, 3.10~3.11)

## 이번 작업

2개 spec 파일을 새로 작성해줘.

### 1. e2e/shared/messages.spec.ts (Phase 2.15, 3.10)

- 대화 목록: 아바타, 이름, 역할, 마지막 메시지
- 대화 클릭 → 스레드 표시
- 메시지 전송 (Ctrl+Enter 또는 전송 버튼)
- 안읽음 배지 "존재 여부"로만 검증 (정확한 숫자 아님)
- 양 역할(ops, consultant) 각각 테스트

### 2. e2e/shared/settings.spec.ts (Phase 2.16, 3.11)

- 이메일 알림 토글 (파괴적 → restoreEmailNotify()로 복원)
- 비밀번호 변경 폼 구조 확인 (실제 변경 skip)
- 계정 삭제 섹션 표시 확인 (실제 삭제 skip)
- 뒤로가기 링크
- 양 역할(ops, consultant) 각각 테스트

핵심 사항:
- opsPage + consultantPage fixture 모두 사용
- messages: 파괴적 액션 없음
- settings: restoreEmailNotify()로 복원

각 spec 파일 완료 후 개별 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/shared --headed
```

---

## Session 15: shared/test-roadmap + cross/edge-cases (Phase 2.19, 3.14, 4.2)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md (Task 6-4, 7-2)
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 2.19, 3.14, 4.2)

## 이번 작업

2개 spec 파일을 새로 작성해줘.

### 1. e2e/shared/test-roadmap.spec.ts (Phase 2.19, 3.14)

- 6단계 스테퍼 표시 (양 역할)
- 1단계 필드 입력: 회사명, 업종, 규모
- 2~5단계 진행 (다음/이전/인디케이터 클릭)
- 6단계 확인: 입력 요약 표시
- "테스트 로드맵 생성" 버튼 **존재만 확인** (클릭 금지 — LLM)
- opsPage + consultantPage 각각 테스트

### 2. e2e/cross/edge-cases.spec.ts (Phase 4.2)

커스텀 404 페이지 확인 (완전히 존재하지 않는 경로):
- /this-does-not-exist 접근 → "404" 텍스트 + "페이지를 찾을 수 없습니다" 메시지 표시
- "홈으로 돌아가기" 링크 클릭 → / 이동

존재하지 않는 UUID(00000000-0000-0000-0000-000000000000)로 접근:
- /ops/projects/00000000-... → 커스텀 404 페이지 또는 에러 표시
- /ops/templates/00000000-... → 404
- /gallery/00000000-... → 404
- /consultant/projects/00000000-... → 404 (컨설턴트 계정으로)

핵심 사항:
- test-roadmap: opsPage + consultantPage 모두 사용, LLM skip
- edge-cases: opsPage + consultantPage 사용

각 spec 파일 완료 후 개별 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/shared/test-roadmap.spec.ts e2e/cross/edge-cases.spec.ts --headed
```

---

## Session 16: cross-feature + CI + 전체 검증 (Phase 4.1, 4.3~4.4)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업입니다. 마지막 세션입니다.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md (Task 7-1, 7-3, 7-4)
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 4.1, 4.3~4.4)

## 이번 작업

### 1. e2e/cross/cross-feature.spec.ts (Phase 4.1, 4.3, 4.4)

- 프로젝트 배정 반영: 관리자가 배정한 프로젝트가 컨설턴트 목록에 표시되는지
- 갤러리 공유: 공유 토글 ON → 갤러리에 표시되는지
- 브라우저 뒤로가기/앞으로가기 정상 동작
- 페이지 새로고침 → 데이터 유지
- opsPage + consultantPage 사용

### 2. .github/workflows/e2e.yml — CI 워크플로우

구현 계획의 Task 7-3 참고하여 GitHub Actions 워크플로우 생성.

### 3. 전체 실행 검증

- npx playwright test 전체 실행 → 모든 spec 통과 확인
- 실패 시 수정
- docs/plans/2026-02-13-e2e-test-design.md 진행 추적표를 모두 "완료"로 업데이트
- 최종 커밋
```

### 완료 후 직접 확인

```bash
npx playwright test
npx playwright show-report
```

---

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| `npx playwright test` 실행 시 "no tests found" | `playwright.config.ts`의 `testDir: './e2e'` 확인 |
| Global Setup에서 로그인 실패 | `.env.test`의 계정 정보 확인, 개발 서버 실행 여부 확인 |
| 셀렉터를 못 찾음 (timeout) | `npx playwright test --debug`로 Inspector 열어서 확인 |
| Radix Select 조작 안 됨 | `getByRole('combobox')` → `getByRole('option', { name: '...' })` 패턴 사용 |
| 토스트 감지 안 됨 | `[data-sonner-toast]` 셀렉터 + `timeout: 5000` |
| 파괴적 테스트 후 DB 복원 안 됨 | `SUPABASE_SERVICE_ROLE_KEY` 환경 변수 확인 |
| CI에서 실패 | GitHub Secrets 설정 확인, 개발 DB 연결 확인 |
| 세션이 길어지며 압축 발생 | 즉시 현재 작업 커밋하고 새 대화로 이어서 진행 |
