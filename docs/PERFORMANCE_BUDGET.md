# 성능 예산 (Performance Budget)

KPC AI 훈련 로드맵 대시보드의 성능 목표 및 예산 기준입니다.

> **정본은 코드입니다.** 실제 게이트 값은 `e2e/performance/*.perf.spec.ts` 의 상수이고, 이 문서는 그 요약입니다. 값을 바꿀 때는 코드와 이 표를 함께 고치세요.

## Core Web Vitals

2026-08-01 서울 리전 이전(#159·#160) 이후 **CI 실측 4런을 기준으로 조인 값**입니다. 이전 값은 실측의 10~20배라 회귀를 잡지 못했습니다.

| 메트릭 | 전체 명칭                | 공개 페이지 | 인증 페이지 | 실측 최대       | 수준                   |
| ------ | ------------------------ | ----------- | ----------- | --------------- | ---------------------- |
| LCP    | Largest Contentful Paint | < 1,800ms   | < 1,500ms   | 576 / 348ms     | error                  |
| CLS    | Cumulative Layout Shift  | < 0.05      | < 0.05      | 0.0172 / 0.0022 | error                  |
| TBT    | Total Blocking Time      | < 300ms     | —           | —               | warn (Lighthouse 전용) |
| TTFB   | Time To First Byte       | < 300ms     | < 800ms     | 28 / 113ms      | error                  |

> 인증 페이지 TTFB 가 공개 페이지보다 큰 이유는 Supabase 세션 검증이 서버에서 한 번 더 일어나기 때문입니다.
> **임계값을 완화할 때는 CI 로그의 실측값을 근거로 남기세요.** 근거 없는 완화는 회귀를 조용히 통과시킵니다.

## 번들 크기 예산

번들 크기는 빌드 결정적이라 실행 간 변동이 없습니다(4런 모두 바이트까지 동일). 그래서 타이트하게 잡아도 flaky 하지 않습니다.

| 리소스                     | 최대 허용 크기  | 실측           | 측정 기준                        | 수준  |
| -------------------------- | --------------- | -------------- | -------------------------------- | ----- |
| JS 번들 합계 (공개)        | 540 KB          | 503.6 KB (`/`) | transferSize 합계                | error |
| CSS 합계                   | 40 KB           | 25.1 KB        | transferSize 합계                | error |
| JS 번들 (로드맵 결과 화면) | 첫 실측 후 확정 | —              | 초기 진입 시점 transferSize 합계 | error |
| 비최적화 대형 이미지       | 0개             | 0개            | width > 1000px & srcset 없음     | error |

> 로드맵 결과 화면 예산은 **서버가 내려준 HTML 에 `<script src>` 로 박힌 파일**만 잽니다(임계 경로). "페이지가 받은 JS 총량"으로 바꾸면 지연 로딩이 끼는 순간 게이트가 무의미해집니다.
>
> ⚠️ 이 화면의 탭은 **의도적으로 코드 분할하지 않습니다** — `docs/decisions/2026-08-01-result-tabs-no-code-split.md` 참조(분할 시 탭 전환 59ms → 401ms).

## Lighthouse 점수

**Lighthouse 는 공개 3페이지 전용입니다.** 인증 페이지는 Playwright 가 담당합니다 — Lighthouse CI job 에는 로컬 DB 스택도, 시드 계정도, 로그인 스크립트도 없어서 인증 경로를 넣으면 로그인 페이지를 재게 됩니다(숫자가 조용히 무의미해짐).

| 카테고리       | 최소 점수   | 수준  |
| -------------- | ----------- | ----- |
| Performance    | 0.80 (80점) | error |
| Accessibility  | 0.90 (90점) | warn  |
| Best Practices | 0.90 (90점) | warn  |

## 측정 대상 페이지

### 공개 페이지 (인증 불필요) — Playwright + Lighthouse

| 경로     | 설명        |
| -------- | ----------- |
| `/`      | 랜딩 페이지 |
| `/login` | 로그인      |
| `/demo`  | 샘플 데모   |

### 인증 페이지 (로그인 필요) — Playwright 전용

| 경로                                       | 역할       | 설명                            |
| ------------------------------------------ | ---------- | ------------------------------- |
| `/dashboard`                               | 운영관리자 | 공통 대시보드                   |
| `/ops/projects`                            | 운영관리자 | 프로젝트 목록                   |
| `/gallery`                                 | 운영관리자 | 로드맵 갤러리                   |
| `/consultant/home`                         | 컨설턴트   | 컨설턴트 홈                     |
| `/consultant/projects/{시드기업D}/roadmap` | 컨설턴트   | 로드맵 결과 (탭 코드 분할 감시) |

Playwright 는 `e2e/global-setup.ts` 가 저장한 실제 로그인 세션(`storageState`)으로 측정합니다.

### 알려진 공백

PBL 결과 화면(4탭)과 갤러리 PBL 상세(5탭)는 **CI 에서 측정하지 않습니다.** `supabase/seed.sql` 에 `pbl_reports` 시드가 없어 안정적으로 도달할 수 없습니다. 시드 추가는 다른 E2E 스펙의 전제(갤러리 트랙 분기 등)를 건드리므로 별도 판단이 필요합니다. 세 결과 화면이 같은 패턴으로 분할돼 있어 로드맵 결과 게이트가 대표 감시 역할을 합니다.

## 자동화

| 도구                   | 실행 방법                                             | 적용 시점                                 | 성격                            |
| ---------------------- | ----------------------------------------------------- | ----------------------------------------- | ------------------------------- |
| Playwright 성능 테스트 | `npm run test:perf`                                   | **PR + main push 양쪽** (E2E job 에 포함) | **머지 차단 게이트**            |
| Lighthouse CI          | `npm run lighthouse:ci`                               | main 브랜치 push                          | 사후 알람 (이미 머지된 뒤 실행) |
| CI 통합                | `.github/workflows/ci.yml` → `e2e` · `lighthouse` job | 위와 동일                                 | —                               |

> 실질적인 방어선은 **E2E job 의 Playwright 성능 스펙**입니다. Lighthouse 는 PR 에서 돌지 않습니다.

## 파일 위치

| 파일                                               | 설명                                    |
| -------------------------------------------------- | --------------------------------------- |
| `lighthouserc.js`                                  | Lighthouse CI 설정                      |
| `e2e/performance/public-pages.perf.spec.ts`        | 공개 페이지 TTFB / LCP / JS 크기 테스트 |
| `e2e/performance/authenticated-pages.perf.spec.ts` | 인증 페이지 TTFB / LCP 테스트           |
| `e2e/performance/bundle-budget.perf.spec.ts`       | JS/CSS 번들 크기 및 이미지 최적화 검사  |
