# E2E 후속 작업 계획 (2026-04-21)

이 문서는 "E2E 14건 근본 수정 + 1순위 3 spec 추가" 세션의 **후속 작업**을 정리한 것입니다.
다음 세션에서 이 문서를 읽고 순차 진행하세요.

**시작 명령:** `docs/plans/archive/2026-04-21-e2e-followup-plan.md 읽고 계획대로 진행해줘.`

---

## 세션 배경

- **이번 세션 결과:** chromium 프로젝트 E2E 228/229 통과 + 신규 12개 테스트 추가
- **총 chromium 테스트:** 약 350개 (338 + 12)
- **남은 실패 1건:** `project-lifecycle:178` (아래 참조)
- **커버리지 수준:** "B급 골격 → A− 수준" (1순위 신규 기능 커버 완료)

### 이번 세션에서 확보한 지식 (함정 회피용)

1. **산인공 양식 정렬(#14) 이후 변경된 라벨/탭** — 많은 spec이 이로 인해 깨졌음
   - 로드맵 탭: "과정 체계도/과정 상세/PBL 과정" → **"역량 모델링/훈련체계도/연간 훈련계획/훈련과정 명세서"** (4개)
   - 갤러리 상세 탭: **트랙(ROADMAP/PBL)별로 완전히 다른 탭 구조**. 하드코딩 금지, 트랙 판별 후 분기 또는 방어적 검증
   - 로드맵 인터뷰 heading: `<h2>Ⅰ. 개요</h2>` / `<h2>Ⅰ-2. 주요 활동</h2>` (stepper label과 heading 문자열이 다름)
   - 통계 카드 라벨 단축: "로드맵 초안" → "초안 완료", "로드맵 최종" → "최종 확정"
2. **Agentation 위젯 간섭** — `page.locator('textarea').last()`는 외부 위젯의 textarea를 잡음. 스코프 좁히기 필수 (form/section locator 체이닝)
3. **Supabase auth flaky** — dev 서버 초기화 시 `TypeError: Failed to fetch` 간헐 발생. `assertions.helper.ts`의 `IGNORE_PATTERNS`에 추가됨
4. **갤러리 이름** — "로드맵 갤러리" → "로드맵·PBL 갤러리" 전면 변경
5. **BackButton** — `useBack: true` 면 `<button>`, `false` 면 `<a>`. `.or()` 로 둘 다 허용
6. **트랙별 버튼 라벨** — PBL이면 "이 PBL 사용하기", ROADMAP이면 "이 로드맵 사용하기"
7. **regex에 동적 문자열 쓸 때** — `[E2E]` 같은 특수문자는 character class로 해석됨. string으로 전달 권장 (`getByRole('link', { name: PINNED_TITLE })`)
8. **스텝 내부 subsection heading** — Step 2 버튼 label은 "기본 정보·참석자"인데 heading은 "Ⅰ-2. 주요 활동". stepper label과 heading 혼동 금지
9. **Tailwind 토큰화** — `.bg-white.shadow.rounded-lg` → `.bg-card.shadow.rounded-lg` 로 바뀜
10. **Select 콤보박스 옵션 대기** — Select 클릭 후 option이 나타날 때까지 `await expect(option).toBeVisible()` 필수

### 참고 파일

- `e2e/helpers/assertions.helper.ts` — `setupConsoleErrorCheck` IGNORE_PATTERNS 및 `expectToast`
- `e2e/fixtures/auth.fixture.ts` — `opsPage`, `consultantPage` 다중 context fixture
- `e2e/helpers/cleanup.helper.ts` — `deleteProject`, `ensureTestConversation` 등
- `e2e/fixtures/test-data.ts` — 테스트 계정

---

## 작업 1. project-lifecycle:178 재작성 (우선도: 중)

### 현재 상태
- 6-스텝 로드맵 인터뷰로 재작성됨 (`e2e/workflow/project-lifecycle.spec.ts` line 178~)
- `test.skip()`로 표시되어 있음 (이유 주석 포함)
- Step 1~3까지 진행은 확인되었으나, 30초 기본 timeout을 초과하여 실패

### 해야 할 것
1. `test.skip(...)` → `test(...)`로 변경
2. `test.setTimeout(120_000)` 추가 (6-스텝 전체 진행)
3. Select 옵션 로드 대기 강화: `await page.locator('#basic-round').click(); await expect(page.getByRole('option').first()).toBeVisible(); await page.getByRole('option').first().click();`
4. 각 스텝 heading은 stepper label이 아닌 **실제 h2 기준**으로 검증:
   - Step 1: `/Ⅰ\. 개요/`
   - Step 2: `/Ⅰ-2\. 주요 활동/`
   - Step 3: `/기업 요구분석/`
   - Step 4: `/과업.*분석/`
   - Step 5: `/훈련대상 과업/`
   - Step 6: `/확인.*제출/`
5. 마지막 저장 후 토스트: `'인터뷰가 성공적으로 저장되었습니다'`

### 검증
- `npx playwright test --project=chromium e2e/workflow/project-lifecycle.spec.ts`
- 4단계 통과해야 5·6단계도 실행됨 (`isAssigned` + autoSave 연동)

---

## 작업 2. 2순위 spec 추가 (우선도: 중)

### 2-1. 로드맵 상태 전이 (파괴적 동작)
**파일:** `e2e/consultant/roadmap-transitions.spec.ts`

#### 테스트 시나리오
1. **DRAFT → FINAL 전환 시 기존 FINAL이 ARCHIVED로 변경**
   - 전제: 해당 프로젝트에 DRAFT 2개 + FINAL 1개 존재
   - "최종 확정" 클릭 → confirm dialog 자동 수락
   - 토스트: `'로드맵이 최종 확정되었습니다'`
   - 버전 리스트에서 기존 FINAL이 "아카이브" 상태로 표시되는지 확인
2. **DRAFT 버전 무제한 생성 가능**
   - "새 버전 생성" 3회 반복
   - 각 버전이 버전 리스트에 노출되는지 확인
3. **버전 선택 → 콘텐츠 전환**
   - 버전 리스트에서 다른 버전 클릭
   - `<h2>버전 N</h2>` 헤더가 변경되는지 확인

#### 주의사항
- LLM 호출 포함되면 `test.skip(!process.env.LLM_API_KEY, ...)` 조건
- timeout 250s (LLM 240s + 여유)
- 생성된 DRAFT는 afterAll에서 정리

### 2-2. 컨설턴트 재배정 + 해제 알림
**파일:** `e2e/ops/consultant-reassignment.spec.ts`

#### 테스트 시나리오
1. OPS가 프로젝트 상세에서 "재배정" 클릭
2. 새 컨설턴트 선택 후 confirm
3. **이전 컨설턴트에게 해제 알림 생성** 확인 (이전 컨설턴트 context로 알림 벨 열기)
4. 새 컨설턴트에게 배정 알림 확인

#### 참고 커밋
- `83adbd8 feat: 컨설턴트 재배정 시 이전 컨설턴트에게 해제 알림 전송`

### 2-3. 권한 위반 (RLS negative)
**파일:** `e2e/negative/cross-role-access.spec.ts`

#### 테스트 시나리오
1. **컨설턴트 A가 컨설턴트 B의 프로젝트에 URL로 직접 접근 → 403/redirect**
   - `/consultant/projects/{B의 projectId}` 직접 goto
   - URL이 `/dashboard` 또는 `/consultant/projects`로 리다이렉트되거나 "권한 없음" 텍스트
2. **OPS가 컨설턴트 전용 페이지에 접근 시도**
   - `/consultant/home` 접근 시 OPS는 `/ops/...`로 리다이렉트되는지
3. **비인증 사용자가 대시보드 URL 직접 접근 → /login 리다이렉트**

### 2-4. 쿼터 초과 시 LLM 호출 차단
**파일:** `e2e/negative/quota-exceeded.spec.ts`

#### 테스트 시나리오
1. 특정 테스트 계정의 쿼터를 OPS가 0으로 설정 (`/ops/quota` 페이지에서)
2. 해당 계정으로 로드맵 생성 시도
3. 에러 토스트 확인: 쿼터 초과 메시지

#### 주의사항
- 테스트 후 쿼터 복원 필수 (`afterAll`)
- LLM 실제 호출은 피해야 함 (쿼터로 차단)

---

## 작업 3. 3순위 spec 추가 (우선도: 낮음)

### 3-1. PDF/XLSX 다운로드 파일 무결성
**파일:** `e2e/consultant/export-integrity.spec.ts`

#### 테스트 시나리오
1. FINAL 로드맵에서 PDF 다운로드 → 파일 크기 >= 10KB, 확장자 `.pdf`, magic bytes `%PDF`
2. XLSX 다운로드 → 파일 크기 >= 5KB, magic bytes `PK\x03\x04` (ZIP)
3. HWPX는 로컬 dev에서 제한적 — `process.env.HWPX_DEV_PROXY_URL` 설정 시에만 실행

#### 참고
- `e2e/helpers/download.helper.ts` 에 `waitForDownload`, `expectDownloadFilename`, `expectDownloadSize` 헬퍼 존재

### 3-2. 갤러리 공유 토글 크로스 역할
**파일:** `e2e/gallery/sharing-cross-role.spec.ts`

#### 테스트 시나리오
1. 컨설턴트 A가 로드맵 페이지에서 "갤러리 공유" 토글 ON
2. 컨설턴트 B로 context 전환 후 `/gallery` 접근
3. A의 공유한 로드맵이 리스트에 노출되는지 확인
4. 토글 OFF 후 B에서 재조회 → 리스트에서 사라짐

#### 주의사항
- 공유/비공유 상태 afterAll에서 원복 필수

---

## 완료 체크리스트

- [ ] project-lifecycle:178 재작성 및 통과
- [ ] 2-1 로드맵 상태 전이
- [ ] 2-2 컨설턴트 재배정
- [ ] 2-3 권한 위반 negative
- [ ] 2-4 쿼터 초과
- [ ] 3-1 PDF/XLSX 무결성
- [ ] 3-2 갤러리 공유 크로스 역할
- [ ] 최종 `npm run test:e2e --project=chromium` 통과 확인
- [ ] `npm run validate && npm run build` 통과
- [ ] 한국어 커밋 메시지로 커밋 제안

## 커밋 전략

작업 분량이 크므로 2~3개 커밋으로 나누는 것을 권장:
1. `feat: project-lifecycle 4단계 재작성 (산인공 6-스텝)` — 작업 1
2. `test: E2E 2순위 4건 추가 (상태전이·재배정·권한·쿼터)` — 작업 2
3. `test: E2E 3순위 2건 추가 (다운로드 무결성·갤러리 공유)` — 작업 3
