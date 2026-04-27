# 2026-04-19 OFA Step 12 Task 3.6 — Playwright/Puppeteer 회귀 감사 리포트

## 감사 환경

- **Next.js dev server**: `localhost:3000` (PID 35148) — 이미 구동 중
- **HWPX Python 브리지**: `localhost:3010` (PID 20575) — `scripts/dev-hwpx-server.py`
- **브라우저 제어**: Puppeteer MCP (Chrome MCP는 기존 인스턴스와 충돌)
- **테스트 계정**:
  - 컨설턴트: `kpc@test.com` / `aaaa0000`
  - 운영관리자: `son@test.com` / `aaaa00000`

## 감사 결과 요약

| 영역 | 결과 | 비고 |
|------|------|------|
| 로그인 (두 계정) | ✅ | 양쪽 모두 정상 로그인, 역할별 홈 리다이렉트 정확 |
| 컨설턴트 네비 페이지 8개 | ✅ | 모두 HTTP 200 |
| OPS 네비 페이지 6개 | ✅ | 모두 HTTP 200 |
| 프로젝트 상세 (OPS) | ✅ | `/ops/projects/[id]`, `/roadmap`, `/pbl` 모두 200 |
| 프로젝트 상세 (컨설턴트) 3개 × 4 경로 | ✅ | 12/12 HTTP 200 |
| HWPX 브리지 서버 연결 | ✅ | 3010 포트 동작 (`next.config.ts` rewrites 정상) |

## 세부 결과

### 1. 인증·역할별 리다이렉트

- 컨설턴트 로그인 → `/consultant/home`
- 운영관리자 로그인 → `/ops/projects`
- 양쪽 모두 `middleware.ts` 역할 가드 동작 확인

### 2. 컨설턴트 네비 페이지

| 경로 | HTTP |
|------|------|
| `/consultant/home` | 200 |
| `/consultant/profile` | 200 |
| `/consultant/projects` | 200 |
| `/gallery` | 200 |
| `/notices` | 200 |
| `/dashboard/messages` | 200 |
| `/test-roadmap` | 200 |
| `/test-pbl` | 200 |

### 3. OPS 네비 페이지

| 경로 | HTTP |
|------|------|
| `/ops/projects` | 200 |
| `/ops/users` | 200 |
| `/ops/templates` | 200 |
| `/ops/quota` | 200 |
| `/ops/audit` | 200 |
| `/ops/projects/new` | 200 |
| `/notices` | 200 |

### 4. 프로젝트 상세 경로

**OPS 관점** (프로젝트 1건 샘플링):
- `/ops/projects/{id}` → 200
- `/ops/projects/{id}/roadmap` → 200
- `/ops/projects/{id}/pbl` → 200

**컨설턴트 관점** (본인 담당 3건 샘플링):
- `/consultant/projects/{id}` → 200
- `/consultant/projects/{id}/interview` → 200 (track 별 분기: `RoadmapInterviewClient` / `PBLInterviewClient`)
- `/consultant/projects/{id}/roadmap` → 200
- `/consultant/projects/{id}/pbl` → 200

### 5. HWPX 인프라

- `next.config.ts` 의 `rewrites()` 가 `HWPX_DEV_PROXY_URL` 환경변수 설정 시 `/api/hwpx/*` 를 3010 포트로 포워딩하는 로직 정상 동작.
- 브리지 서버(`scripts/dev-hwpx-server.py`)가 `api/hwpx/generate.py` handler 를 그대로 재사용해 프로덕션과 동일 출력 보장 (Session 10 에서 검증 완료).
- **POST 실 다운로드 시각 검수는 본 감사 범위 밖** — 사용자가 Preview 배포에서 실제 기업 데이터로 확인 필요.

## 발견 이슈

### High (즉시 수정 필요)

**0건**

### Medium (권고)

**0건** — HTTP 레벨 라우팅은 모두 정상

### Low (참고)

1. `/logout` 엔드포인트 미존재 (404).
   - 영향: 개발자가 직접 로그아웃 시 사용할 간단 엔드포인트가 없음
   - 현재 UX: Navigation 컴포넌트의 signOut 버튼은 Server Action 경유라 문제 없음
   - 권장: 불필요 (현행 유지)

### 본 감사로 잡히지 않는 영역

다음은 사용자가 Preview 배포에서 직접 확인해야 한다:

- 폼 제출 플로우 (인터뷰 6단계 / PBL 9단계 실제 입력·저장)
- LLM 호출을 거치는 동작 (로드맵 생성, PBL 생성, STT 처리)
- HWPX 실물 다운로드 시각 검수 (한글 프로그램)
- 좋아요·공유 토글, 알림 수신, 메시지 실시간 구독
- 모바일 반응형 (375×667 뷰포트)
- 키보드 접근성 (Tab / Escape / Enter)
- Realtime (Supabase 채널 구독)

## 결론

**Session 1~10 에서 도입된 모든 라우트가 현재 브랜치(`feature/ofa-12-final-qa-docs`) 에서 HTTP 레벨로 정상 응답**한다. 회귀 차단 요인 발견되지 않음.

기능·시각·폼 플로우 검증은 사용자 Preview QA (1주) 에서 완료된다.

## 참고

- 감사 일시: 2026-04-19 23:35 KST
- 브랜치: `feature/ofa-12-final-qa-docs`
- 기반 커밋: `c44c30e feat(ofa-11)` + `d5e5ee2 Step 12 중간`
