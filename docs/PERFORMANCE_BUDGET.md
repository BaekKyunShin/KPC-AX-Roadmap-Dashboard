# 성능 예산 (Performance Budget)

KPC AI 훈련 로드맵 대시보드의 성능 목표 및 예산 기준입니다.

## Core Web Vitals

| 메트릭 | 전체 명칭 | 공개 페이지 | 인증 페이지 | 수준 |
|--------|-----------|------------|------------|------|
| LCP | Largest Contentful Paint | < 3,500ms | < 3,500ms | error |
| CLS | Cumulative Layout Shift | < 0.1 | < 0.1 | error |
| TBT | Total Blocking Time | < 300ms | < 300ms | warn |
| TTFB | Time To First Byte | < 1,000ms | < 1,500ms | error |

> 인증 페이지 TTFB는 Supabase 세션 검증 오버헤드를 감안해 1,500ms로 설정합니다.

## 번들 크기 예산

| 리소스 | 최대 허용 크기 | 측정 기준 | 수준 |
|--------|--------------|----------|------|
| JS 번들 합계 | 500 KB | transferSize 합계 | error |
| CSS 합계 | 100 KB | transferSize 합계 | warn |
| 비최적화 대형 이미지 | 0개 | width > 1000px & srcset 없음 | error |

## Lighthouse 점수

| 카테고리 | 최소 점수 | 수준 |
|---------|---------|------|
| Performance | 0.80 (80점) | error |
| Accessibility | 0.90 (90점) | warn |
| Best Practices | 0.90 (90점) | warn |

## 측정 대상 페이지

### 공개 페이지 (인증 불필요)

| 경로 | 설명 |
|------|------|
| `/` | 랜딩 페이지 |
| `/login` | 로그인 |
| `/demo` | 샘플 데모 |

### 인증 페이지 (로그인 필요)

| 경로 | 역할 | 설명 |
|------|------|------|
| `/dashboard` | 운영관리자 | 공통 대시보드 |
| `/ops/projects` | 운영관리자 | 프로젝트 목록 |
| `/gallery` | 운영관리자 | 로드맵 갤러리 |
| `/consultant/home` | 컨설턴트 | 컨설턴트 홈 |

## 자동화

| 도구 | 실행 방법 | 적용 시점 |
|------|----------|---------|
| Playwright 성능 테스트 | `npm run test:perf` | PR / 로컬 개발 |
| Lighthouse CI | `npm run lighthouse:ci` | main 브랜치 push |
| CI 통합 | `.github/workflows/ci.yml` → `lighthouse` job | main 브랜치 push 자동 실행 |

## 파일 위치

| 파일 | 설명 |
|------|------|
| `lighthouserc.js` | Lighthouse CI 설정 |
| `e2e/performance/public-pages.perf.spec.ts` | 공개 페이지 TTFB / LCP / JS 크기 테스트 |
| `e2e/performance/authenticated-pages.perf.spec.ts` | 인증 페이지 TTFB / LCP 테스트 |
| `e2e/performance/bundle-budget.perf.spec.ts` | JS/CSS 번들 크기 및 이미지 최적화 검사 |
