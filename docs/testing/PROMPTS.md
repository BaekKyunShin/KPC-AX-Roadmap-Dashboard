# Puppeteer 전수조사 - Phase별 실행 프롬프트

> 각 Phase를 **별도의 새 대화**에서 실행하세요.
> 각 프롬프트를 그대로 복사하여 사용합니다.

---

## Phase 1 프롬프트

```
본 시스템(KPC AI 로드맵 대시보드)의 모든 기능을 전수조사하는 QA 테스트를 진행한다.
모든 버튼, 폼, 링크를 빠짐없이 하나하나 실행하고, 항목을 건너뛰지 말 것.

docs/testing/TEST_PLAN.md를 먼저 읽고, "Phase 1: 비로그인 상태 테스트" 섹션을 Puppeteer MCP로 실행해줘.
결과는 docs/testing/TEST_RESULTS.md에 기록한다.

## Puppeteer 도구 사용법
- 페이지 이동: `puppeteer_navigate` (URL 지정)
- 요소 클릭: `puppeteer_click` (CSS 선택자 사용)
- 텍스트 입력: `puppeteer_fill` (CSS 선택자 + 값)
- 드롭다운 선택: `puppeteer_select` (CSS 선택자 + 값)
- JS 실행: `puppeteer_evaluate` (JavaScript 코드)
- 요소를 찾을 때는 텍스트 내용, aria-label, data-testid, name 속성 순으로 시도
- 요소를 못 찾으면 `puppeteer_evaluate`로 `document.querySelectorAll`을 사용하여 페이지 구조 파악 후 재시도

## 실행 규칙
1. TEST_PLAN.md의 Phase 1 체크리스트를 **위에서 아래로 순서대로** 하나하나 따라가며 테스트
2. 각 항목 테스트 후 결과를 즉시 기록:
   - 통과: TEST_PLAN.md에서 해당 항목을 `- [x]`로 업데이트
   - 실패/이슈: TEST_RESULTS.md의 해당 심각도 테이블에 추가하고, TEST_PLAN.md 항목 옆에 실패 사유를 간단히 기록
3. 매 페이지 진입 시 `puppeteer_evaluate`로 콘솔 에러 수집:
   `JSON.stringify(window.__console_errors || [])` 를 실행하되,
   최초 페이지 진입 시 아래 코드를 먼저 주입할 것:
   `window.__console_errors = []; const _origErr = console.error; console.error = (...a) => { window.__console_errors.push(a.join(' ')); _origErr.apply(console, a); };`
4. 에러가 발생해도 **절대 멈추지 말고** 기록 후 다음 항목으로 진행
5. Puppeteer 도구 호출 자체가 실패하면 (요소 못 찾음 등), 대안 선택자로 재시도 후 그래도 실패하면 이슈로 기록하고 다음으로
6. Phase 1 전체 완료 후 TEST_RESULTS.md의 "테스트 진행 상황" 테이블에서 Phase 1 상태를 "완료"로 업데이트
7. 스크린샷(`puppeteer_screenshot`)은 찍지 말 것 — 파일 저장이 안 되고 컨텍스트만 소모함

## 테스트 대상
- localhost:3000

## 주의사항
- TEST_PLAN.md의 "공통 검사 항목"도 각 페이지에 반드시 적용
- 비로그인 상태 유지 (로그인하지 않은 채로 테스트)
- 보호된 경로 접근 시 리다이렉트 URL의 redirect 쿼리 파라미터까지 확인
```

---

## Phase 2 프롬프트

```
본 시스템(KPC AI 로드맵 대시보드)의 모든 기능을 전수조사하는 QA 테스트를 진행한다.
모든 버튼, 폼, 링크를 빠짐없이 하나하나 실행하고, 항목을 건너뛰지 말 것.

docs/testing/TEST_PLAN.md를 먼저 읽고, "Phase 2: 관리자(OPS_ADMIN) 계정 테스트" 섹션을 Puppeteer MCP로 실행해줘.
결과는 docs/testing/TEST_RESULTS.md에 기록한다.

## Puppeteer 도구 사용법
- 페이지 이동: `puppeteer_navigate` (URL 지정)
- 요소 클릭: `puppeteer_click` (CSS 선택자 사용)
- 텍스트 입력: `puppeteer_fill` (CSS 선택자 + 값)
- 드롭다운 선택: `puppeteer_select` (CSS 선택자 + 값)
- JS 실행: `puppeteer_evaluate` (JavaScript 코드)
- 요소를 찾을 때는 텍스트 내용, aria-label, data-testid, name 속성 순으로 시도
- 요소를 못 찾으면 `puppeteer_evaluate`로 `document.querySelectorAll`을 사용하여 페이지 구조 파악 후 재시도

## 실행 규칙
1. TEST_PLAN.md의 Phase 2 체크리스트를 **위에서 아래로 순서대로** 하나하나 따라가며 테스트
2. 각 항목 테스트 후 결과를 즉시 기록:
   - 통과: TEST_PLAN.md에서 해당 항목을 `- [x]`로 업데이트
   - 실패/이슈: TEST_RESULTS.md의 해당 심각도 테이블에 추가하고, TEST_PLAN.md 항목 옆에 실패 사유를 간단히 기록
3. 매 페이지 진입 시 `puppeteer_evaluate`로 콘솔 에러 수집:
   `JSON.stringify(window.__console_errors || [])` 를 실행하되,
   최초 페이지 진입 시 아래 코드를 먼저 주입할 것:
   `window.__console_errors = []; const _origErr = console.error; console.error = (...a) => { window.__console_errors.push(a.join(' ')); _origErr.apply(console, a); };`
4. 에러가 발생해도 **절대 멈추지 말고** 기록 후 다음 항목으로 진행
5. Puppeteer 도구 호출 자체가 실패하면 (요소 못 찾음 등), 대안 선택자로 재시도 후 그래도 실패하면 이슈로 기록하고 다음으로
6. Phase 2 전체 완료 후 TEST_RESULTS.md의 "테스트 진행 상황" 테이블 업데이트
7. 스크린샷(`puppeteer_screenshot`)은 찍지 말 것 — 파일 저장이 안 되고 컨텍스트만 소모함

## 로그인 정보
- 관리자: werooring@gmail.com / <비공개>

## 테스트 대상
- localhost:3000

## 특별 지시사항
- 파괴적 액션(사용자 승인/정지/재활성화) **실제로 실행**할 것
- AI 매칭 추천, 로드맵 생성 등 LLM 호출 기능도 **실제로 실행**할 것 (응답 대기, 느려도 기다릴 것)
- 프로젝트 새로 생성 시 테스트 데이터 입력:
  - 회사명: "테스트기업_자동화"
  - 업종: 아무거나 선택
  - 기업 규모: 아무거나 선택
  - 담당자명: "테스트담당자"
  - 담당자 이메일: "test-auto@example.com"
- 메시지 테스트 시 kpc@test.com에게 "Phase2 크로스테스트 메시지"라고 전송 (Phase 3에서 수신 확인)
- 테스트 로드맵 생성은 최소한의 데이터만 입력하되, 실제 LLM 호출까지 완료할 것
- 비밀번호 변경/계정 삭제는 유효성 검사만 확인하고 실제 변경은 하지 말 것
```

---

## Phase 3 프롬프트

```
본 시스템(KPC AI 로드맵 대시보드)의 모든 기능을 전수조사하는 QA 테스트를 진행한다.
모든 버튼, 폼, 링크를 빠짐없이 하나하나 실행하고, 항목을 건너뛰지 말 것.

docs/testing/TEST_PLAN.md를 먼저 읽고, "Phase 3: 컨설턴트(CONSULTANT_APPROVED) 계정 테스트" 섹션을 Puppeteer MCP로 실행해줘.
결과는 docs/testing/TEST_RESULTS.md에 기록한다.

## Puppeteer 도구 사용법
- 페이지 이동: `puppeteer_navigate` (URL 지정)
- 요소 클릭: `puppeteer_click` (CSS 선택자 사용)
- 텍스트 입력: `puppeteer_fill` (CSS 선택자 + 값)
- 드롭다운 선택: `puppeteer_select` (CSS 선택자 + 값)
- JS 실행: `puppeteer_evaluate` (JavaScript 코드)
- 요소를 찾을 때는 텍스트 내용, aria-label, data-testid, name 속성 순으로 시도
- 요소를 못 찾으면 `puppeteer_evaluate`로 `document.querySelectorAll`을 사용하여 페이지 구조 파악 후 재시도

## 실행 규칙
1. TEST_PLAN.md의 Phase 3 체크리스트를 **위에서 아래로 순서대로** 하나하나 따라가며 테스트
2. 각 항목 테스트 후 결과를 즉시 기록:
   - 통과: TEST_PLAN.md에서 해당 항목을 `- [x]`로 업데이트
   - 실패/이슈: TEST_RESULTS.md의 해당 심각도 테이블에 추가하고, TEST_PLAN.md 항목 옆에 실패 사유를 간단히 기록
3. 매 페이지 진입 시 `puppeteer_evaluate`로 콘솔 에러 수집:
   `JSON.stringify(window.__console_errors || [])` 를 실행하되,
   최초 페이지 진입 시 아래 코드를 먼저 주입할 것:
   `window.__console_errors = []; const _origErr = console.error; console.error = (...a) => { window.__console_errors.push(a.join(' ')); _origErr.apply(console, a); };`
4. 에러가 발생해도 **절대 멈추지 말고** 기록 후 다음 항목으로 진행
5. Puppeteer 도구 호출 자체가 실패하면 (요소 못 찾음 등), 대안 선택자로 재시도 후 그래도 실패하면 이슈로 기록하고 다음으로
6. Phase 3 전체 완료 후 TEST_RESULTS.md의 "테스트 진행 상황" 테이블 업데이트
7. 스크린샷(`puppeteer_screenshot`)은 찍지 말 것 — 파일 저장이 안 되고 컨텍스트만 소모함

## 로그인 정보
- 컨설턴트: kpc@test.com / <비공개>

## 테스트 대상
- localhost:3000

## 특별 지시사항
- Phase 2에서 관리자가 보낸 "Phase2 크로스테스트 메시지"를 메시지 페이지에서 수신 확인할 것
- 답장으로 "Phase3 답장 메시지"를 전송할 것
- 담당 프로젝트가 있는 경우:
  - 인터뷰 입력 전체 플로우 (6단계) 실행
  - 로드맵 생성 실제 실행 (LLM 호출, 느려도 기다릴 것)
  - 로드맵 수동 편집 (과정 편집 모달)
  - 최종 확정
  - 갤러리 공유 토글
  - PDF/Excel 다운로드
- OPS 경로 접근 차단 테스트 반드시 실행
- 프로필 수정 시 실제로 값을 바꿨다가 다시 원래대로 복원할 것
```

---

## Phase 4 프롬프트

```
본 시스템(KPC AI 로드맵 대시보드)의 모든 기능을 전수조사하는 QA 테스트를 진행한다.
모든 버튼, 폼, 링크를 빠짐없이 하나하나 실행하고, 항목을 건너뛰지 말 것.

docs/testing/TEST_PLAN.md를 먼저 읽고, "Phase 4: 크로스 기능 및 엣지 케이스 테스트" 섹션을 Puppeteer MCP로 실행해줘.
결과는 docs/testing/TEST_RESULTS.md에 기록한다.

## Puppeteer 도구 사용법
- 페이지 이동: `puppeteer_navigate` (URL 지정)
- 요소 클릭: `puppeteer_click` (CSS 선택자 사용)
- 텍스트 입력: `puppeteer_fill` (CSS 선택자 + 값)
- 드롭다운 선택: `puppeteer_select` (CSS 선택자 + 값)
- JS 실행: `puppeteer_evaluate` (JavaScript 코드)
- 요소를 찾을 때는 텍스트 내용, aria-label, data-testid, name 속성 순으로 시도
- 요소를 못 찾으면 `puppeteer_evaluate`로 `document.querySelectorAll`을 사용하여 페이지 구조 파악 후 재시도

## 실행 규칙
1. TEST_PLAN.md의 Phase 4 체크리스트를 **위에서 아래로 순서대로** 하나하나 따라가며 테스트
2. 각 항목 테스트 후 결과를 즉시 기록:
   - 통과: TEST_PLAN.md에서 해당 항목을 `- [x]`로 업데이트
   - 실패/이슈: TEST_RESULTS.md의 해당 심각도 테이블에 추가하고, TEST_PLAN.md 항목 옆에 실패 사유를 간단히 기록
3. 매 페이지 진입 시 `puppeteer_evaluate`로 콘솔 에러 수집:
   `JSON.stringify(window.__console_errors || [])` 를 실행하되,
   최초 페이지 진입 시 아래 코드를 먼저 주입할 것:
   `window.__console_errors = []; const _origErr = console.error; console.error = (...a) => { window.__console_errors.push(a.join(' ')); _origErr.apply(console, a); };`
4. 에러가 발생해도 **절대 멈추지 말고** 기록 후 다음 항목으로 진행
5. Puppeteer 도구 호출 자체가 실패하면 (요소 못 찾음 등), 대안 선택자로 재시도 후 그래도 실패하면 이슈로 기록하고 다음으로
6. Phase 4 전체 완료 후 TEST_RESULTS.md의 "테스트 진행 상황" 테이블 업데이트
7. 스크린샷(`puppeteer_screenshot`)은 찍지 말 것 — 파일 저장이 안 되고 컨텍스트만 소모함

## 로그인 정보
- 관리자: werooring@gmail.com / <비공개>
- 컨설턴트: kpc@test.com / <비공개>

## 테스트 대상
- localhost:3000

## 특별 지시사항
- 관리자로 로그인하여 크로스 기능 확인
- Phase 3에서 컨설턴트가 보낸 "Phase3 답장 메시지" 수신 확인
- 존재하지 않는 ID로 URL 직접 입력 테스트
- 브라우저 뒤로가기/앞으로가기/새로고침 테스트

## 최종 보고서 작성
Phase 4 완료 후 TEST_RESULTS.md에 다음을 추가:
1. "통계 요약" 섹션의 숫자 업데이트
2. 전체 테스트 결론 (1~2문단)
3. 심각도별 이슈 우선순위 정리
```

---

## Phase 5 프롬프트 (미완료 항목 보완)

> Phase 1~4에서 `[ ]`로 남아있는 미완료 항목을 보완 테스트한다.
> 공통 검사 항목 4개 + 개별 미완료 3개 + 접근 제어 미차단 2개 = 총 9개 항목.
> (B-1 테스트 로드맵 생성은 수동 확인 완료로 제외)

```
Phase 1~4에서 미완료로 남아있는 항목을 보완하는 QA 테스트를 진행한다.
docs/testing/TEST_PLAN.md에서 아직 `[ ]`로 남아있는 항목을 모두 처리한다.
결과는 docs/testing/TEST_RESULTS.md에 반영하고, TEST_PLAN.md도 업데이트한다.

## 미완료 항목 전체 목록

| # | 위치 | 항목 | 이전 실패 사유 |
|---|------|------|----------------|
| A-1 | 공통 검사 항목 | 페이지 정상 로딩 (빈 화면, 에러 바운더리 없음) | Phase별 개별 확인은 했으나 공통 섹션 미체크 |
| A-2 | 공통 검사 항목 | JavaScript 콘솔 에러 없음 | 위와 동일 |
| A-3 | 공통 검사 항목 | 로딩 스켈레톤/스피너 정상 표시 후 데이터 로딩 | 위와 동일 |
| A-4 | 공통 검사 항목 | 네비게이션 활성 상태 올바르게 표시 | 위와 동일 |
| B-1 | 3.4 컨설턴트 홈 | "진행 중" 카드 표시 확인 | 카드 3개만 표시, "진행 중" 미표시 |
| B-2 | 3.9 컨설턴트 로드맵 | CourseEditModal 열기 | 편집 버튼 클릭 시 React 이벤트 미전파 |
| B-3 | 3.12 갤러리 (컨설턴트) | "로드맵 가져다쓰기" UseRoadmapDialog | 버튼 자체를 찾지 못함 |
| C-1 | 3.15 접근 제어 | `/ops/audit` 컨설턴트 접근 차단 | 차단 안 됨 (버그 확인) |
| C-2 | 3.15 접근 제어 | `/ops/quota` 컨설턴트 접근 차단 | 차단 안 됨 (버그 확인) |

## Puppeteer 도구 사용법
- 페이지 이동: `puppeteer_navigate` (URL 지정)
- 요소 클릭: `puppeteer_click` (CSS 선택자 사용)
- 텍스트 입력: `puppeteer_fill` (CSS 선택자 + 값)
- 드롭다운 선택: `puppeteer_select` (CSS 선택자 + 값)
- JS 실행: `puppeteer_evaluate` (JavaScript 코드)
- 요소를 찾을 때는 텍스트 내용, aria-label, data-testid, name 속성 순으로 시도
- 요소를 못 찾으면 `puppeteer_evaluate`로 `document.querySelectorAll`을 사용하여 페이지 구조 파악 후 재시도
- 스크린샷(`puppeteer_screenshot`)은 찍지 말 것 — 파일 저장이 안 되고 컨텍스트만 소모함

## 로그인 정보
- 관리자: werooring@gmail.com / <비공개>
- 컨설턴트: kpc@test.com / <비공개>

## 테스트 대상
- localhost:3000

## 실행 규칙
1. 아래 실행 순서대로 진행
2. 각 항목 테스트 후 결과를 즉시 기록:
   - 통과: TEST_PLAN.md에서 해당 항목을 `- [x]`로 업데이트하고 결과 메모 추가
   - 우회 성공: `- [x]`로 업데이트하고 "puppeteer_evaluate 우회로 확인" 메모
   - 최종 실패: `- [ ]` 유지, "Puppeteer 한계, 수동 테스트 필요" 메모 확정
   - 버그 확인: `- [ ]` 유지 (이미 TEST_RESULTS.md에 기록된 버그)
3. 에러가 발생해도 **절대 멈추지 말고** 기록 후 다음 항목으로 진행
4. 전체 완료 후 TEST_RESULTS.md의 "테스트 진행 상황" 테이블에 Phase 5 행 추가, 통계 요약 갱신

---

## 파트 A: 공통 검사 항목 (4개)

Phase 1~4에서 각 페이지마다 개별 확인은 했으나, TEST_PLAN.md "공통 검사 항목" 섹션의
체크박스가 `[ ]`로 남아있다. **대표 페이지 6개를 순회하며 4가지를 명시적으로 검증**한다.

대표 페이지:
1. `/` (비로그인)
2. `/login` (비로그인)
3. `/ops/projects` (관리자 로그인)
4. `/ops/users` (관리자 로그인)
5. `/consultant/home` (컨설턴트 로그인)
6. `/consultant/projects` (컨설턴트 로그인)

각 페이지에서 아래 4가지를 `puppeteer_evaluate`로 실행:

**① 페이지 정상 로딩**
```js
(() => {
  const body = document.body.innerText.trim();
  const hasError = document.querySelector(
    '[class*="error-boundary"], [class*="ErrorBoundary"], [data-nextjs-error]'
  );
  return {
    bodyLength: body.length,
    isEmpty: body.length < 10,
    hasErrorBoundary: !!hasError,
    title: document.title
  };
})()
```

**② JavaScript 콘솔 에러 없음**
- 페이지 진입 직후 주입:
```js
window.__console_errors = [];
const _origErr = console.error;
console.error = (...a) => { window.__console_errors.push(a.join(' ')); _origErr.apply(console, a); };
```
- 3초 대기 후 수집:
```js
JSON.stringify(window.__console_errors)
```

**③ 로딩 스켈레톤/스피너 정상 표시 후 데이터 로딩**
```js
(() => {
  const skeletons = document.querySelectorAll(
    '[class*="skeleton"], [class*="Skeleton"], [class*="spinner"], [class*="Spinner"], [role="progressbar"]'
  );
  const dataElements = document.querySelectorAll('table tbody tr, [class*="card"], [class*="Card"]');
  return {
    skeletonCount: skeletons.length,
    skeletonVisible: [...skeletons].filter(el => el.offsetParent !== null).length,
    dataLoaded: dataElements.length > 0,
    dataCount: dataElements.length
  };
})()
```
→ 스켈레톤이 0개이고 데이터가 로딩되어 있으면 "데이터 로딩 완료 상태에서 확인"으로 통과

**④ 네비게이션 활성 상태 올바르게 표시**
```js
(() => {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('nav a, [role="navigation"] a, header a');
  const activeLinks = [...navLinks].filter(a =>
    a.classList.contains('active') ||
    a.getAttribute('aria-current') === 'page' ||
    a.getAttribute('data-active') === 'true' ||
    a.closest('[data-state="active"], [aria-selected="true"]')
  );
  return {
    currentPath,
    totalNavLinks: navLinks.length,
    activeLinks: activeLinks.map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent.trim().substring(0, 30)
    }))
  };
})()
```
→ 비로그인 페이지(`/`, `/login`)는 네비게이션이 없거나 활성 상태 개념이 없으므로
  "해당 없음"으로 통과 처리 가능

6개 페이지 모두 검증 완료 후 TEST_PLAN.md 공통 검사 항목 4개를 `[x]`로 변경하고
"대표 페이지 6개에서 검증 완료"라고 메모한다.

---

## 파트 B: 개별 미완료 항목 (3개)

> B-1(테스트 로드맵 생성, 2.19)은 수동 확인 완료로 제외됨.

### B-1. 컨설턴트 홈 "진행 중" 카드 (TEST_PLAN.md 3.4)

**계정:** 컨설턴트 (kpc@test.com)
**경로:** `/consultant/home`

**테스트 방법:**
1. `/consultant/home` 이동
2. 요약 카드 영역 구조 파악:
   ```js
   (() => {
     const cards = document.querySelectorAll(
       '[class*="card"], [class*="Card"], [class*="stat"], [class*="kpi"], [class*="summary"]'
     );
     return [...cards].map(c => ({
       text: c.textContent.trim().substring(0, 100),
       className: c.className.substring(0, 80)
     }));
   })()
   ```
3. "진행 중" 텍스트 존재 여부:
   ```js
   document.body.innerText.includes('진행 중')
   ```
4. 서버 데이터 확인:
   ```js
   JSON.stringify(window.__NEXT_DATA__?.props?.pageProps || 'not found')
   ```
5. 결과 판단:
   - 0건이라 의도적 미표시 → `[x]`, "0건이므로 카드 미표시 (의도된 동작)" 메모
   - 데이터 있는데 누락 → 버그 유지
   - 판단 불가 → "코드 확인 필요"로 기록

### B-2. CourseEditModal 열기 (TEST_PLAN.md 3.9)

**계정:** 컨설턴트 (kpc@test.com)
**경로:** `/consultant/projects/[id]/roadmap` (DRAFT 상태 필요)

**사전 확인:** Phase 3에서 DRAFT → FINAL로 확정했으므로 DRAFT가 남아있는지 먼저 확인.
DRAFT가 없으면 "새 버전 로드맵 생성" 버튼 클릭 → LLM 호출 최대 2분 대기.

**우회 전략:**
1. DRAFT 로드맵 페이지에서 "과정 체계도" 탭 선택
2. 편집 버튼 구조 파악:
   ```js
   (() => {
     // 아이콘 버튼일 수 있으므로 넓게 탐색
     const allBtns = [...document.querySelectorAll('button')];
     const editBtns = allBtns.filter(b =>
       /편집|edit|pencil|수정/i.test(
         (b.textContent || '') +
         (b.getAttribute('aria-label') || '') +
         (b.getAttribute('title') || '') +
         (b.innerHTML || '')
       ) ||
       b.closest('td, [class*="matrix"], [class*="Matrix"]')
     );
     return editBtns.map(b => ({
       text: b.textContent.trim().substring(0, 30),
       ariaLabel: b.getAttribute('aria-label'),
       html: b.innerHTML.substring(0, 80),
       className: b.className.substring(0, 60)
     }));
   })()
   ```
3. React fiber를 통해 onClick 직접 호출:
   ```js
   (() => {
     const btn = document.querySelectorAll('편집버튼선택자')[0];
     if (!btn) return 'button not found';
     const key = Object.keys(btn).find(k => k.startsWith('__reactFiber$'));
     if (!key) return 'no react fiber';
     let fiber = btn[key];
     while (fiber && !fiber.memoizedProps?.onClick) fiber = fiber.return;
     if (fiber?.memoizedProps?.onClick) {
       fiber.memoizedProps.onClick({ preventDefault:()=>{}, stopPropagation:()=>{} });
       return 'onClick called';
     }
     return 'onClick not found in fiber tree';
   })()
   ```
4. 모달 열림 확인:
   ```js
   (() => {
     const modal = document.querySelector('[role="dialog"], [class*="modal"], [class*="Modal"]');
     return modal
       ? { found: true, text: modal.textContent.substring(0, 200) }
       : { found: false };
   })()
   ```
5. 모달 열리면 → 내부 필드 확인 후 닫기 → `[x]`
6. 안 열리면 → "Puppeteer 한계, 수동 테스트 필요"로 최종 기록

### B-3. "로드맵 가져다쓰기" UseRoadmapDialog (TEST_PLAN.md 3.12)

**계정:** 컨설턴트 (kpc@test.com)
**경로:** `/gallery` 및 `/gallery/[id]`

**테스트 방법:**
1. `/gallery` 이동
2. "가져다쓰기" 관련 UI 요소 전체 탐색:
   ```js
   (() => {
     const allBtns = document.querySelectorAll('button, a, [role="button"]');
     const matches = [...allBtns].filter(el =>
       /가져|사용|use|import|복사|copy|적용|apply/i.test(
         (el.textContent || '') +
         (el.getAttribute('aria-label') || '') +
         (el.getAttribute('title') || '')
       )
     );
     return matches.map(el => ({
       tag: el.tagName, text: el.textContent.trim().substring(0, 50),
       className: el.className
     }));
   })()
   ```
3. 갤러리 목록에 없으면 갤러리 **상세 페이지** (`/gallery/[id]`)로 이동하여 같은 검색
4. hover 시에만 표시되는 버튼일 수 있으므로:
   ```js
   (() => {
     const card = document.querySelector('[class*="card"], [class*="Card"]');
     if (card) {
       card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
       card.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
     }
     return card ? 'hover dispatched' : 'no card found';
   })()
   ```
   3초 대기 후 다시 버튼 검색
5. 버튼 찾으면 → 클릭 → Dialog 열림 확인 → 내부 구조 확인 → 닫기 → `[x]`
6. 못 찾으면 → "UseRoadmapDialog가 현재 UI에 미구현 또는 특정 조건에서만 표시"로 기록

---

## 파트 C: 접근 제어 미차단 재확인 (2개)

C-1, C-2는 이미 Phase 3에서 **버그로 확인**되어 TEST_RESULTS.md에 🔴 심각한 버그로 기록됨.
이번에는 재확인만 수행하고 TEST_PLAN.md의 체크 상태를 확정한다.

1. 컨설턴트(kpc@test.com)로 로그인
2. `/ops/audit` 이동 → 페이지가 렌더링되면 **여전히 미차단** → `[ ]` 유지, "🔴 버그 확인됨 — TEST_RESULTS.md #1" 메모
3. `/ops/quota` 이동 → 동일 확인 → `[ ]` 유지, "🔴 버그 확인됨 — TEST_RESULTS.md #2" 메모

---

## 실행 순서

1. **비로그인** → 파트 A: `/`, `/login` (공통 항목 4가지 × 2페이지)
2. **관리자 로그인** → 파트 A: `/ops/projects`, `/ops/users` (공통 항목 4가지 × 2페이지) → 로그아웃
3. **컨설턴트 로그인** → 파트 A: `/consultant/home`, `/consultant/projects` (공통 항목 4가지 × 2페이지)
   → 파트 B-1: 진행 중 카드 → 파트 B-3: 가져다쓰기 → 파트 B-2: CourseEditModal
   → 파트 C: 접근 제어 재확인 → 로그아웃

## 최종 보고서 작성

전체 완료 후:
1. TEST_RESULTS.md의 "테스트 진행 상황" 테이블에 Phase 5 행 추가:
   `| Phase 5 | 미완료 항목 보완 테스트 | ✅ 완료 / ⚠️ 일부 완료 | 날짜 |`
2. 통계 요약 갱신 (새로 통과한 항목 반영)
3. 🟡 일반 버그 테이블에서 Puppeteer 제한 항목들의 최종 상태 업데이트
```

---

## 실행 순서 요약

```
1. npm run dev 로 개발 서버 실행 확인
2. 새 대화 → Phase 1 프롬프트 붙여넣기 → 실행
3. 완료 확인 → 새 대화 → Phase 2 프롬프트 붙여넣기 → 실행
4. 완료 확인 → 새 대화 → Phase 3 프롬프트 붙여넣기 → 실행
5. 완료 확인 → 새 대화 → Phase 4 프롬프트 붙여넣기 → 실행
6. 완료 확인 → 새 대화 → Phase 5 프롬프트 붙여넣기 → 실행 (미완료 보완)
7. TEST_RESULTS.md 확인 → 이슈 수정 작업 시작
```
