# Playwright E2E 테스트 — 세션별 실행 가이드

> 이 파일은 `docs/plans/2026-02-13-e2e-test-implementation-plan.md`을 세션별로 실행할 때 사용하는 프롬프트 및 진행 가이드입니다.

## 사전 준비

**매 세션 시작 전:**
- `npm run dev`로 개발 서버가 실행 중이어야 합니다 (localhost:3000)
- `.env.test` 파일이 프로젝트 루트에 존재해야 합니다 (Session 0에서 생성)

**진행 추적:**
- 각 Session 완료 후 아래 체크리스트에 표시하세요
- [ ] Session 0: 인프라 구축
- [ ] Session 1: public/ + auth/
- [ ] Session 2: ops/navigation + ops/projects
- [ ] Session 3: ops/users + templates + audit-quota
- [ ] Session 4: consultant/navigation + home + profile
- [ ] Session 5: consultant/projects + interview + roadmap + access-control
- [ ] Session 6: shared/ (gallery, messages, settings, test-roadmap)
- [ ] Session 7: cross/ + CI 설정

---

## Session 0: 인프라 구축

### 프롬프트

```
## 배경

이 프로젝트는 KPC AI 훈련 로드맵 대시보드(Next.js + Supabase)입니다.
기존에 Puppeteer MCP로 수동 실행하던 E2E 테스트(docs/testing/TEST_PLAN.md, 470+ 항목)를
Playwright 자동화 코드로 전환하는 작업을 진행 중입니다.

설계서: docs/plans/2026-02-13-e2e-test-design.md
구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md

## 이번 작업

구현 계획의 **Session 0 (인프라 구축)** 을 실행해줘.
Task 0-1부터 Task 0-10까지 순서대로 진행해.

구체적으로:
1. dotenv 설치
2. .env.test.example 생성 + .gitignore 추가
3. playwright.config.ts 생성
4. e2e/fixtures/test-data.ts, auth.fixture.ts 생성
5. e2e/global-setup.ts 생성
6. e2e/helpers/ 3개 파일 생성 (assertions, navigation, cleanup)
7. package.json에 test:e2e 스크립트 추가 + Playwright 브라우저 설치

구현 계획 문서에 코드가 있으니 참고하되, 실제 프로젝트 구조에 맞게 조정해.
각 Task 완료 후 개별 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test --list     # config 로딩 확인 (no tests found = 정상)
ls -la .auth/                  # 세션 파일 2개 생성 확인
```

### 문제 발생 시

- `.auth/` 파일이 안 생기면: `.env.test`의 계정 정보가 올바른지 확인
- `playwright test --list`에서 에러: `playwright.config.ts` 문법 확인

---

## Session 1: public/ + auth/ (5개 spec)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.
Session 0(인프라)은 완료되어 playwright.config.ts, fixtures, helpers가 준비됨.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 1.1~1.5)
- 설계서: docs/plans/2026-02-13-e2e-test-design.md

## 이번 작업

구현 계획의 **Session 1 (public/ + auth/)** 을 실행해줘.
Task 1-1부터 Task 1-5까지 순서대로 진행.

5개 spec 파일을 작성해야 해:
1. e2e/public/landing.spec.ts — Phase 1.1 랜딩 페이지
2. e2e/public/demo.spec.ts — Phase 1.2 데모 페이지
3. e2e/auth/login.spec.ts — Phase 1.3 로그인 검증
4. e2e/auth/register.spec.ts — Phase 1.4 회원가입 검증
5. e2e/auth/protected-routes.spec.ts — Phase 1.5 보호 경로

이 세션은 비로그인 테스트이므로 auth fixture 불필요 (base test 사용).
파괴적 액션 없음.

구현 계획에 코드 골격이 있으니 참고하되, 실제 페이지 구조에 맞게 셀렉터를 조정해.
각 spec 파일 작성 후 개별 커밋해줘.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/public e2e/auth --headed
```

---

## Session 2: ops/navigation + ops/projects (2개 spec)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.
Session 0(인프라)과 Session 1(public/auth)은 완료됨.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 2.0~2.8, 2.20)
- 설계서: docs/plans/2026-02-13-e2e-test-design.md

## 이번 작업

구현 계획의 **Session 2** 를 실행해줘. Task 2-1, Task 2-2.

2개 spec 파일:
1. e2e/ops/navigation.spec.ts — Phase 2.0~2.3, 2.20 (관리자 로그인/네비/알림벨/로그아웃)
2. e2e/ops/projects.spec.ts — Phase 2.4~2.8 (프로젝트 목록/생성/상세/자가진단/로드맵)

핵심 사항:
- opsPage fixture 사용 (e2e/fixtures/auth.fixture.ts)
- projects.spec.ts는 serial 모드 (test.describe.configure)
- 파괴적 액션: 프로젝트 생성 → afterAll에서 deleteProject()로 정리
- LLM 의존: AI 매칭 버튼 존재 확인만, 실제 실행 skip
- 관리자 네비게이션은 드롭다운 3그룹 구조 (Navigation.tsx 참고)

실제 페이지를 --headed 모드로 확인하면서 정확한 셀렉터를 찾아 작성해줘.
각 spec 파일 완료 후 개별 커밋.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/ops --headed
```

---

## Session 3: ops/users + templates + audit-quota (3개 spec)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.
Session 0~2 완료됨. 현재 e2e/public/, e2e/auth/, e2e/ops/navigation, e2e/ops/projects 존재.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 2.9~2.14)
- 설계서: docs/plans/2026-02-13-e2e-test-design.md

## 이번 작업

구현 계획의 **Session 3** 을 실행해줘. Task 3-1 ~ Task 3-3.

3개 spec 파일:
1. e2e/ops/users.spec.ts — Phase 2.9 사용자 관리 (승인/정지/활성화/프로필 모달)
2. e2e/ops/templates.spec.ts — Phase 2.10~2.12 템플릿 (목록/생성/수정/복제)
3. e2e/ops/audit-quota.spec.ts — Phase 2.13~2.14 감사로그 + 쿼터 관리

핵심 사항:
- opsPage fixture 사용
- 파괴적 액션: 사용자 승인/정지 → restoreUserStatus()로 복원, 템플릿 복제 → deleteTemplate()로 정리
- 프로필 모달: Radix Dialog → [data-slot="dialog-content"] 셀렉터
- 감사로그/쿼터: 읽기 전용 테스트 (파괴적 액션 없음)

각 spec 파일 완료 후 개별 커밋.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/ops --headed
```

---

## Session 4: consultant/navigation + home + profile (3개 spec)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.
Session 0~3 완료됨. e2e/public, auth, ops 디렉터리 완성.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 3.0~3.5, 3.16)
- 설계서: docs/plans/2026-02-13-e2e-test-design.md

## 이번 작업

구현 계획의 **Session 4** 를 실행해줘. Task 4-1 ~ Task 4-3.

3개 spec 파일:
1. e2e/consultant/navigation.spec.ts — Phase 3.0~3.3, 3.16 (로그인/플랫메뉴/알림벨/로그아웃)
2. e2e/consultant/home.spec.ts — Phase 3.4 (대시보드 카드/차트/최근활동)
3. e2e/consultant/profile.spec.ts — Phase 3.5 (프로필 폼 필드/수정/복원)

핵심 사항:
- consultantPage fixture 사용
- 컨설턴트 네비게이션은 플랫 메뉴 (드롭다운 아님, OPS와 다름)
- OPS 메뉴가 표시되지 않는 것을 확인해야 함
- 알림벨: 탭 미표시 확인 (탭은 관리자만)
- 파괴적 액션: 프로필 수정 → restoreProfile()로 복원

각 spec 파일 완료 후 개별 커밋.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/consultant --headed
```

---

## Session 5: consultant/projects + interview + roadmap + access-control (4개 spec)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.
Session 0~4 완료됨. consultant/navigation, home, profile 존재.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 3.6~3.9, 3.15)
- 설계서: docs/plans/2026-02-13-e2e-test-design.md

## 이번 작업

구현 계획의 **Session 5** 를 실행해줘. Task 5-1 ~ Task 5-4.

4개 spec 파일:
1. e2e/consultant/projects.spec.ts — Phase 3.6~3.7 (프로젝트 목록/상세, 활동일지 CRUD)
2. e2e/consultant/interview.spec.ts — Phase 3.8 (6단계 스테퍼 인터뷰 입력)
3. e2e/consultant/roadmap.spec.ts — Phase 3.9 (버전/탭/편집/확정/다운로드/공유)
4. e2e/consultant/access-control.spec.ts — Phase 3.15 (OPS 경로 접근 차단)

핵심 사항:
- consultantPage fixture 사용
- 파괴적 액션: 활동일지 → deleteActivityLog(), 공유 토글 → restoreShareStatus()
- LLM skip 항목 (UI 존재만 확인, 절대 클릭 금지):
  - "분석 재생성" 버튼
  - STT 파일 업로드 (UI만 확인)
  - "새 버전 로드맵 생성" 버튼
- 최종 확정: 읽기 전용으로만 테스트 (확정 실행 안 함)
- access-control: 5개 OPS 경로 접근 시 리다이렉트 확인

각 spec 파일 완료 후 개별 커밋.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/consultant --headed
```

---

## Session 6: shared/ (4개 spec)

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.
Session 0~5 완료됨. public, auth, ops, consultant 디렉터리 완성.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 2.15~2.19, 3.10~3.14)
- 설계서: docs/plans/2026-02-13-e2e-test-design.md

## 이번 작업

구현 계획의 **Session 6** 을 실행해줘. Task 6-1 ~ Task 6-4.

4개 spec 파일:
1. e2e/shared/gallery.spec.ts — Phase 2.17~2.18, 3.12~3.13 (갤러리 목록/상세, 양 역할)
2. e2e/shared/messages.spec.ts — Phase 2.15, 3.10 (메시지 양방향 통신)
3. e2e/shared/settings.spec.ts — Phase 2.16, 3.11 (설정, 양 역할)
4. e2e/shared/test-roadmap.spec.ts — Phase 2.19, 3.14 (테스트 로드맵, 양 역할)

핵심 사항:
- opsPage와 consultantPage fixture **모두 사용** (양 역할 테스트)
- 파괴적 액션: 좋아요 → 다시 토글로 UI 복원, 이메일 토글 → restoreEmailNotify()
- 메시지: 안읽음 배지는 정확한 숫자 대신 "존재 여부"로만 검증 (누적됨)
- LLM skip: 테스트 로드맵 "생성" 버튼 클릭 금지
- 갤러리: 관리자 전용 필터 3개 → ops에서만 표시, consultant에서 미표시 확인

각 spec 파일 완료 후 개별 커밋.
```

### 완료 후 직접 확인

```bash
npx playwright test e2e/shared --headed
```

---

## Session 7: cross/ + CI 설정

### 프롬프트

```
## 배경

KPC AI 로드맵 대시보드의 Playwright E2E 테스트 전환 작업 중입니다.
Session 0~6 완료됨. 19개 spec 파일 작성 완료. 마지막 세션.

참고 문서:
- 구현 계획: docs/plans/2026-02-13-e2e-test-implementation-plan.md
- 원본 테스트 항목: docs/testing/TEST_PLAN.md (Phase 4.1~4.4)
- 설계서: docs/plans/2026-02-13-e2e-test-design.md

## 이번 작업

구현 계획의 **Session 7** 을 실행해줘. Task 7-1 ~ Task 7-4.

3개 작업:
1. e2e/cross/cross-feature.spec.ts — Phase 4.1, 4.3, 4.4 (크로스 기능, 브라우저 히스토리, 로그아웃 정리)
2. e2e/cross/edge-cases.spec.ts — Phase 4.2 (존재하지 않는 ID → 404)
3. .github/workflows/e2e.yml — CI 워크플로우

최종 작업:
- npx playwright test 전체 실행하여 21개 spec 모두 통과 확인
- docs/plans/2026-02-13-e2e-test-design.md 진행 추적표를 모두 "완료"로 업데이트
- 최종 커밋

핵심 사항:
- cross-feature: opsPage + consultantPage 모두 사용
- edge-cases: 존재하지 않는 UUID(00000000-...)로 404 확인
- CI: GitHub Secrets에 E2E_* 환경 변수 설정 필요 (이건 GitHub UI에서 수동)
```

### 완료 후 직접 확인

```bash
# 전체 테스트 실행
npx playwright test

# 리포트 확인
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
