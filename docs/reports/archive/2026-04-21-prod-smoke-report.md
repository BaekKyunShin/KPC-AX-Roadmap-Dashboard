# 2026-04-21 프로덕션 스모크 리포트

**대상**: OFA main PR #14 머지(2026-04-20 22:19 UTC) 직후 프로덕션
**도메인**: https://kpc-ax-roadmap-dashboard.vercel.app
**배포**: `dpl_4Es8pmieBEmQUZvvAb1Hpd8w8wow` (main `4ab91dd`), Ready
**실행자**: Claude (Puppeteer MCP 자동 실행)
**참조 계획서**: `docs/plans/archive/2026-04-20-ofa-post-merge-deployment.md` §1~§3

---

## 요약

| 항목 | 결과 |
|------|------|
| Vercel 배포 상태 | ● Ready (빌드 2분) |
| 프로덕션 URL 헬스 체크 | / 200, /login 200, /gallery 307 (미인증 리다이렉트) |
| Supabase 마이그 060~068 | 11건 전부 적용 확인 |
| Supabase security advisor | ERROR 0 · WARN 1 (auth_leaked_password_protection — **Free 플랜 구조적 제약. Pro 업그레이드 시 토글 ON 으로 해결 예정**) |
| 필수 환경변수 | HWPX_API_SECRET · LLM_API_KEY · SUPABASE_SERVICE_ROLE_KEY 전부 Production 스코프 존재 |
| 스모크 시나리오 | 6/6 PASS |
| Critical / High 이슈 | 0 |

---

## 스모크 시나리오 결과

### 1. 컨설턴트 플로우 (`kpc@test.com` / `aaaa0000`)

| # | 경로 | 검증 포인트 | 결과 |
|---|------|------------|------|
| 1-1 | POST /login → /consultant/home | "안녕하세요, 김동순 컨설턴트님" H1 렌더 | ✅ |
| 1-2 | /gallery | H1 "로드맵·PBL 갤러리", 카드 13건 노출, 트랙 탭("전체","PBL") 감지 | ✅ |
| 1-3 | /notices | H1 "공지사항" 렌더, 페이지 파싱 정상 | ✅ |

모든 페이지 `console.error` 0건. `window.error` 0건.

### 2. OPS 플로우 (`son@test.com` / `aaaa00000`)

| # | 경로 | 검증 포인트 | 결과 |
|---|------|------------|------|
| 2-1 | POST /login → /ops/projects | H1 "프로젝트 관리" 렌더 | ✅ |
| 2-2 | /ops/projects/<ROADMAP id>/roadmap | H1 "AI 교육 로드맵", HWPX 다운로드 버튼 존재 | ✅ |
| 2-3 | /ops/projects/<PBL id>/pbl | H1 "PBL 보고서 (감사 열람)", HWPX 다운로드 버튼 존재 | ✅ |

사용 프로젝트
- ROADMAP: `46b5cd9b-d9b2-4357-9092-5a0d1a451816` (테스트기업1111, 로드맵 최종 확정)
- PBL: `9029c06d-6718-4796-9e0d-83c8c75f9ca4` (PBL 테스트 기업, PBL 최종 확정)

모든 페이지 `console.error` 0건.

### 3. 서버 로그 점검

`vercel logs --environment=production --level=error` 스트림 8초간 수집 — 에러 라인 없음. 500 폭증 징후 없음.

---

## 발견 이슈

없음. Medium/Low 도 기록할 사항 없음.

---

## 남은 수동 작업

### A. Supabase Auth 설정 (Pro 업그레이드 후로 연기)

현재 Free 플랜이라 **Leaked Password Protection 토글이 잠겨 있음** (Pro 플랜 이상 전용 기능).
→ 향후 Pro 업그레이드 시점에 아래 3단계로 해결:

1. https://supabase.com/dashboard/project/axflsiffdbkitptgpavv/auth/providers
2. Email → Password Security → **Prevent use of leaked passwords** 토글 ON → Save
3. 완료 후 `mcp__supabase__get_advisors security` 로 WARN 0 검증

**추가 조치 불필요** (코드 변경·재배포·마이그 없음). HaveIBeenPwned.org API 대조는 Supabase Auth 서버 내부에서 처리됨. 기존 사용자 영향 없음 — 이후 신규 가입·비밀번호 변경부터 적용.

### B. 1주 수동 QA (계획서 §4)

`docs/plans/archive/2026-04-20-ofa-post-merge-deployment.md` §4-1 ~ §4-6 항목을 실 사용자 계정으로 진행.
핵심: ROADMAP 6스텝 인터뷰, PBL 9스텝 인터뷰, PDF/XLSX/HWPX 다운로드, 갤러리 공유 토글, 공지 첨부 업로드, 모바일 375×667 뷰.

### C. 한글 프로그램 실물 검수 (0.5일, §5)

기업 샘플 3건 HWPX 생성 → 양식 1번/2번 PDF 와 대조. 발견 이슈는 `docs/YYYY-MM-DD-hwpx-visual-qa-report.md` 로 기록 후 hotfix PR.

### D. Hotfix 판단 (조건부)

위 B/C 에서 High 이슈 발견 시:
- 별도 `fix/*` 브랜치 생성 → sub-PR → main
- 환경변수 누락이면 Vercel Env 추가 후 Redeploy (코드 변경 불요)
- 롤백 필요 시: `vercel rollback <deployment-url> --prod` — **사용자 승인 필수**

---

## 메타 데이터

- 검증 시각: 2026-04-21 07:30~07:45 KST
- Puppeteer MCP 단일 세션 (쿠키 공유, 탐색형 로그아웃→재로그인)
- 응답 시간: / 2.64s (콜드 스타트) · /login 0.90s · /gallery 0.13s
