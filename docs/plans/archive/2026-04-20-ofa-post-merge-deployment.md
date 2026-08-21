# OFA main 머지 직후 배포·검증 체크리스트

**작성일**: 2026-04-20
**Main PR**: https://github.com/BaekKyunShin/KPC-AX-Roadmap-Dashboard/pull/14
**소요 시간 예상**: 머지 10분 + Preview QA 1주 + 한글 검수 0.5일

---

## 전제

- 본 프로젝트는 **Supabase 단일 프로젝트(`roadmap-dashboard`, ref `axflsiffdbkitptgpavv`)** 사용. 개발·프로덕션 분리 없음.
- 본 세션(OFA Step 12) 에서 마이그 060~068 전부 개발/프로덕션 공통 DB 에 **이미 적용 완료**.
- Vercel 프로젝트: `kpc-ax-roadmap-dashboard` (projectId `prj_DVJvj62xLPP1BpkensN6Uozz1tqq`). main 브랜치 자동 배포.

---

## 0. 머지 직전 최종 확인 (5분)

### 0-1. PR #14 CI 초록 확인
- [ ] GitHub PR 페이지에서 모든 체크 ✅ (Vercel Preview · GitHub Actions)
- [ ] Vercel Preview URL 클릭해서 로그인 페이지 로드 정상

### 0-2. advisor 재확인
```bash
# MCP 도구 호출 또는 Supabase Dashboard → Advisors
# - ERROR: 0 (audit_logs_archive RLS 활성화 이후 0 유지)
# - WARN (security): 1 건 (auth_leaked_password_protection — 3단계에서 해결)
# - WARN (performance): 다수 (multiple_permissive_policies — 후속 PR)
```

### 0-3. 환경변수 확인
Vercel 대시보드 → Settings → Environment Variables 에 아래 항목이 **Production** 스코프로 설정되어 있는지:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `LLM_API_KEY`
- [ ] `HWPX_API_SECRET` ← **OFA 에서 신규 추가. 없으면 HWPX 다운로드 실패**
- [ ] `LLM_API_BASE_URL` (선택)
- [ ] `SMTP_HOST`·`SMTP_PORT`·`SMTP_USER`·`SMTP_PASS`·`EMAIL_FROM` (이메일 기능 사용 시)
- [ ] `NEXT_PUBLIC_APP_URL`

> `HWPX_API_SECRET` 은 아무 무작위 문자열(예: `openssl rand -hex 32`). Vercel Python Function 과 Node 클라이언트가 같은 값을 공유하므로 한 번 설정 후 변경 시 양쪽 동시 재배포 필요.

---

## 1. 머지 실행 (2분)

1. GitHub PR #14 페이지 → **Merge pull request** 버튼 클릭.
2. Merge 방식: **Squash and merge** 권장 (ofa-01~12 히스토리는 sub-PR 에 이미 보존됨).
3. 머지 후 `feature/official-form-alignment` 브랜치 삭제 버튼 클릭.

**금지 사항**:
- `gh pr merge --auto`·봇·force push 모두 금지.
- main 에 직접 push 금지.

---

## 2. Vercel 프로덕션 배포 모니터링 (5~10분)

### 2-1. 빌드 성공 확인
- Vercel 대시보드 → Deployments → `main` 최상단 배포가 **Ready** 상태로 전환.
- 빌드 로그에서 `Failed` 키워드 없음.

### 2-2. 프로덕션 URL 기본 헬스 체크
- [ ] `https://<프로덕션 도메인>/` 도달 (로그인 페이지 노출)
- [ ] 로그인 후 `/consultant/home` 또는 `/ops/projects` 도달
- [ ] Function 로그에 500/4xx 폭증 없음 (Vercel → Observability → Logs)

### 2-3. 간단 스모크 테스트 3건
- [ ] 컨설턴트 로그인 → 프로젝트 상세 1건 진입
- [ ] `/gallery` 도달 + 트랙 필터 토글
- [ ] `/notices` 도달 + 공지 1건 읽기

---

## 3. Supabase Auth 설정 수동 활성화 (2분)

advisor 마지막 1건 해결.

1. https://supabase.com/dashboard/project/axflsiffdbkitptgpavv/auth/providers 접속
2. Email Provider → **Password Security** 섹션
3. **Leaked Password Protection** 토글 ON
4. Save
5. advisor 재확인 → security WARN 0 건

---

## 4. Preview 1주 수동 QA (핵심)

### 4-1. ROADMAP 트랙 전체 플로우
- [ ] OPS 로 프로젝트 생성 (track=ROADMAP) → 컨설턴트 배정
- [ ] 컨설턴트 로그인 → 인터뷰 **6스텝** 전부 작성·자동저장 동작 확인
  - [ ] Ⅰ. 개요 (AI 역량 수준 · HRD이음 첨부 업로드)
  - [ ] Ⅱ. 기업 현황 (4필드)
  - [ ] Ⅱ. 과업 흐름 (task_workflow_items)
  - [ ] Ⅱ. 교육 대상 (training_targets)
  - [ ] Ⅱ. 분석 노트
  - [ ] 확인 단계
- [ ] 로드맵 생성 (LLM 호출) → DRAFT 저장
- [ ] 로드맵 편집 (수립 필요성·역량·연간 계획·NCS) → FINAL 확정
- [ ] PDF 다운로드 · XLSX 다운로드 · **HWPX 다운로드 (한글 파일)**
- [ ] 갤러리 공유 토글 → `/gallery` 에서 노출 확인

### 4-2. PBL 트랙 전체 플로우
- [ ] OPS 로 프로젝트 생성 (track=PBL) → 컨설턴트 배정
- [ ] PBL 인터뷰 **9스텝** 전부 작성
  - [ ] Ⅰ. 개요
  - [ ] Ⅱ-1/2/3. 업무·문제·AI 활용
  - [ ] Ⅲ-1/2/3/4. 운영 목표·학습 그룹·교육 내용·시설
  - [ ] 확인 단계
- [ ] PBL 보고서 생성 (LLM) → 편집 → FINAL 확정
- [ ] PDF·XLSX·**HWPX** 다운로드

### 4-3. 공지 게시판
- [ ] OPS 로 공지 작성 + 파일 첨부 (PDF 1건, HWPX 1건)
- [ ] 컨설턴트 로그인 → `/notices` 에서 조회 + 첨부 다운로드
- [ ] 컨설턴트는 작성 버튼 안 보임 확인

### 4-4. 갤러리
- [ ] 트랙 필터 (ALL/ROADMAP/PBL) 전환 시 카드 갱신
- [ ] 좋아요 토글 → 카운트 ±1
- [ ] 로드맵 상세 → Ⅰ장 요약 · NCS 박스 · 수립 방법 노출
- [ ] PBL 상세 → Ⅰ~Ⅴ장 전 섹션 노출

### 4-5. OPS 관리 기능
- [ ] `/ops/projects` · `/ops/users` · `/ops/audit` · `/ops/quota` · `/ops/templates` 각각 정상
- [ ] 감사로그에 `ROADMAP_SHARED`·`PBL_REPORT_SHARED` 기록 확인
- [ ] 공유 토글 시 audit_logs 에 INSERT 확인

### 4-6. 모바일 뷰 (375×667 기준 5개 샘플)
- [ ] `/consultant/home` · `/gallery` · `/notices` · 인터뷰 화면 · HWPX 다운로드

---

## 5. 한글 프로그램 실물 검수 (0.5일)

최소 3건 기업 샘플 데이터로 HWPX 생성 후:

### 5-1. 로드맵 HWPX (양식 1번 PDF 와 비교)
- [ ] 표지 · 목차 조판
- [ ] Ⅰ-1 수립 필요성 · Ⅰ-2 수행 방법 · Ⅰ-3 AI 역량 수준 체크박스 렌더링
- [ ] Ⅱ-1 HRD이음 PDF 참조 링크
- [ ] Ⅱ-2 업무 흐름 표 · Ⅱ-3 교육 대상 표
- [ ] Ⅲ 역량 표 · 연간 계획 표 · NCS 박스
- [ ] 긴 텍스트 (50자+) 셀 밖으로 넘치지 않음
- [ ] 한글 자음 분리 (NFD) 현상 없음

### 5-2. PBL HWPX (양식 2번 + 결과보고서 PDF 와 비교)
- [ ] 표지 · 조직도 · 성과 활동 표
- [ ] Ⅱ 문제 우선순위 · 대상 업무 · AI 도구 활용
- [ ] Ⅲ 학습 그룹 · 교육 내용 · 시설 · 강사
- [ ] Ⅳ 성과 체크리스트
- [ ] Ⅴ 권고 사항

### 5-3. 체크박스 심볼
- [ ] `☑`·`☐` 한글에서 올바르게 표시 (깨지는 경우 개선 필요)

발견 이슈는 `docs/YYYY-MM-DD-hwpx-visual-qa-report.md` 에 기록 → 후속 hotfix PR 로 처리.

---

## 6. 이상 발견 시 롤백 (긴급 시)

### 시나리오 A: 프로덕션 배포 후 로그인·주요 페이지 전체 장애
1. Vercel 대시보드 → Deployments → **직전 성공 배포** 옆 점3개 → **Promote to Production**
   - 또는 `vercel rollback <deployment-url> --prod`
2. 장애 원인 분석 전까지 main 브랜치 추가 merge 보류

### 시나리오 B: 특정 기능(예: HWPX 다운로드) 만 실패
1. 서버 로그(Vercel Functions) 에서 원인 확인
2. **환경변수 누락이면** Vercel Env 에 추가 → **Redeploy** (롤백 불요)
3. **코드 버그면** hotfix 브랜치 → sub-PR → main

### 시나리오 C: DB 마이그 문제 발견
- 마이그 060~068 은 모두 **비파괴적** (ADD 위주, DROP 없음).
- 역마이그가 필요할 확률 낮음. 발견 시:
  - 신규 정책·enum 제거 SQL 을 새 마이그(069+)로 작성·적용
  - 과거 마이그 파일을 직접 수정하지 않음 (히스토리 무결성)

---

## 7. 체크리스트 완료 기준

모든 항목 ✅ 이고 1주 QA 동안 High 버그 미발생 시:
- 정식 프로덕션 오픈 공지
- 팀장 포함 stakeholders 에게 안내
- `docs/plans/archive/2026-04-20-ofa-followup-improvements.md` 를 참조해 후속 개선 일정 수립

---

## 부록: 빠른 명령어 모음

```bash
# Vercel 로그 실시간 관찰
vercel logs --prod --follow

# 환경변수 확인
vercel env ls production

# 특정 배포로 롤백
vercel rollback <url> --prod

# Supabase advisor 재확인 (로컬에서)
# → Claude 에 "mcp__supabase__get_advisors 호출해줘" 요청
```

---

## 부록: 새 세션 실행 프롬프트 (복사·붙여넣기)

Main PR #14 머지 직후 새 Claude Code 세션을 열고 아래 전체를 첫 메시지로 붙여넣으면 배포 검증이 자동 진행된다.

```
=== 컨텍스트 ===
- 프로젝트: KPC AI 훈련 로드맵 대시보드 (/Users/baekkyunshin/Desktop/AI-roadmap-dashboard)
- 상태: OFA (산인공 공식 양식 정렬) 프로젝트 main PR #14 머지 완료
- 계획서: docs/plans/archive/2026-04-20-ofa-post-merge-deployment.md (이 파일 먼저 정독)
- Supabase: 단일 프로젝트 axflsiffdbkitptgpavv (roadmap-dashboard) — 마이그 060~068 이미 적용
- Vercel: kpc-ax-roadmap-dashboard, main 자동 배포

=== 본 세션 목적 ===
Main PR 머지 직후 배포 검증 + Auth 설정 + 스모크 테스트. 계획서 §1~§3 는 자동 수행, §4 (1주 QA) 는 사용자 직접 몫 — Claude 는 시나리오 자동 스모크만 실행하고 결과 리포트.

=== 사전 확인 (첫 번째로 실행) ===
1. cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
2. git fetch origin && git checkout main && git pull
3. git log -1 --oneline  → OFA 최종 머지 커밋(예: `feat(ofa):`) 확인
4. gh pr view 14 --json mergedAt,state  → state=MERGED 확인
5. mcp__supabase__list_migrations  → 060~068 전부 있음
6. mcp__supabase__get_advisors security  → ERROR 0 / WARN (leaked_password) 1 건 — 이는 3단계 해결
7. vercel env ls production | grep -E "HWPX_API_SECRET|LLM_API_KEY|SUPABASE_SERVICE_ROLE_KEY"  → 모두 존재
8. 계획서 `docs/plans/archive/2026-04-20-ofa-post-merge-deployment.md` 정독

검증 실패 시 즉시 중단 + 보고.

=== 진행 순서 ===

**1. Vercel 배포 모니터링 (자동)**
- `vercel list --prod | head -5` 로 최신 main 배포 Ready 확인
- Ready 아니면 30초 간격 폴링 (최대 10분)
- 배포 URL 로 `curl -sI` 요청해 HTTP 200/307 확인
- Vercel Functions 로그에 500 에러 폭증 없음 (최근 5분간)

**2. Supabase Auth leaked_password_protection 활성화 안내 (사용자 수동)**
- Dashboard URL 출력: https://supabase.com/dashboard/project/axflsiffdbkitptgpavv/auth/providers
- 사용자에게 "Email Provider → Leaked Password Protection 토글 ON → Save" 안내
- 완료 보고 기다림 후 `mcp__supabase__get_advisors security` 로 WARN 0 확인

**3. 스모크 테스트 자동 실행**
- Puppeteer MCP 또는 Playwright MCP 사용
- 계정: 컨설턴트 `kpc@test.com`/`<비공개>`, OPS `son@test.com`/`<비공개>`
- 시나리오 (프로덕션 URL 기준):
  a. 컨설턴트 로그인 → /consultant/home 도달
  b. /gallery · /notices 도달 + 콘솔 에러 없음
  c. OPS 로그인 → /ops/projects 도달
  d. 프로젝트 1건 상세 → /roadmap · /pbl 서브페이지 도달
- 결과를 `docs/2026-MM-DD-prod-smoke-report.md` 에 기록

**4. 이상 발견 시 대응**
- Critical (로그인·핵심 페이지 500) → 즉시 사용자 보고 + 계획서 §6 롤백 안내
- High (특정 기능 실패) → 원인 분석 후 사용자 보고. hotfix 판단은 사용자가.
- Medium/Low → 리포트에 기록만

**5. 세션 종료 보고**
- Vercel 배포 Ready / Auth 설정 완료 여부 / 스모크 결과 / 남은 사용자 수동 작업 3가지(1주 QA · HWPX 한글 검수 · 필요시 hotfix) 를 요약
- 각 항목의 "어떻게 하면 되는지" 링크/경로로 제시

=== 자동 진행 vs 승인 요청 ===
- 자동 진행: Vercel 모니터링, 스모크 테스트 실행, 리포트 작성
- 승인 요청:
  - Auth 설정 완료 확인 (사용자 수동이므로 회신 대기)
  - Critical 이슈 발견 시 (롤백 결정은 사용자)
  - hotfix 필요 판단 시 (별도 브랜치 생성 여부)

=== 금지 사항 ===
- `vercel rollback --prod` 를 사용자 승인 없이 실행
- main 에 직접 push · force push
- 환경변수 변경 (조회만 가능)
- 어떤 머지·PR 작업도 (본 세션은 배포 검증 전용)

=== 계획서와 달라지면 ===
이 프롬프트와 계획서(`docs/plans/archive/2026-04-20-ofa-post-merge-deployment.md`) 내용이 모순되면 **계획서가 우선**. 프롬프트는 계획서의 실행 요약일 뿐.
```
