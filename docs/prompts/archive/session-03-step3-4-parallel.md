# Session 03 — Step 3 + Step 4 (병렬: HWPX PoC + 공지 게시판)

## 세션 목표
마스터 계획서 §4의 **Step 3** (S, 12 Task)와 **Step 4** (M, 10 Task)를 **병렬로** 수행. 두 Step은 의존관계가 없고(Step 4는 Step 2의 게시판 테이블만 필요) 독립 서브 브랜치이므로 `dispatching-parallel-agents`로 동시 진행.

## 사전 조건
- Step 2 PR이 `feature/official-form-alignment`에 머지됨 (마이그 060~064 + Storage 버킷 + audit ENUM 등 DB 기반 완비).
- `feature/official-form-alignment` 최신 (`git pull`).
- `uv` 설치 가능 (Python 가상환경).
- Vercel 환경변수에 `HWPX_API_SECRET` 등록 가능 (Production + Preview + Development).

## 실행 모드
**dispatching-parallel-agents** — 두 서브 에이전트를 동시 디스패치. 각 에이전트는 독립 worktree에서 자신의 Step 수행.

## 호출 스킬·MCP·서브에이전트
- `superpowers:dispatching-parallel-agents` (메인 모드)
- `superpowers:using-git-worktrees` (각 에이전트가 격리된 worktree 사용)
- 에이전트 A (Step 3):
  - `hwpx-docgen` (외부 스킬, `.claude/skills/hwpx-docgen/`)
  - Context7 MCP (`vercel python` 문서 조회)
  - `superpowers:test-driven-development`
- 에이전트 B (Step 4):
  - `frontend-guide`, `check-server-action`, `web-design-guidelines`, `react-best-practices`
  - shadcn MCP (`mcp__shadcn__list_items_in_registries`, `search_items_in_registries`)
  - `test-automator` 서브에이전트 (E2E 시나리오)

## 예상 소요
**4~7시간** (병렬, 각각 2~4시간 + 통합 검증)

## 성공 지표
**Step 3 (HWPX PoC):**
- [ ] `api/hwpx/ping.py`·`generate.py`·`requirements.txt` + `vercel.json` 생성.
- [ ] Vercel Preview에서 `/api/hwpx/ping` → `{"status":"ok","runtime":"python"}` 응답.
- [ ] Preview에서 `/api/hwpx/generate` POST + `X-HWPX-Secret` 헤더 → HWPX 바이너리 응답 (file 명령으로 ZIP 확인).
- [ ] 시크릿 누락 시 401 응답 (보안 가드 동작).
- [ ] `src/app/api/hwpx-test/route.ts`로 Node→Python 통신 검증 통과 (`{"ok":true,"bytes":>0}`).
- [ ] `docs/decisions/2026-04-14-hwpx-infrastructure.md` ADR 작성.
- [ ] PR `feat(ofa-03): HWPX 생성 인프라 PoC` 생성.

**Step 4 (공지 게시판):**
- [ ] `notice` 스키마 + 서비스 + Server Actions(6개: create/update/delete/togglePin/uploadAttachment/deleteAttachment) 모두 TDD로 작성.
- [ ] 운영자 페이지 (목록·신규·편집) + 컨설턴트 조회 페이지 + 첨부 업로드/다운로드 동작.
- [ ] `src/components/Navigation.tsx`에 공지 메뉴 추가.
- [ ] E2E (`e2e/ops/notices.spec.ts`) 통과.
- [ ] PR `feat(ofa-04): 공지 게시판` 생성.

## 다음 세션 이동 조건
- 두 PR 모두 사람 승인 + 머지 완료.
- `feature/official-form-alignment` 최신화.
- **Step 3가 실패하면 PoC 실패** → 마스터 계획서 §6 리스크 매트릭스의 (B) 별도 마이크로서비스 옵션 검토. 사용자와 협의 후 다음 진행 결정. Step 4는 독립적이므로 머지 진행 가능.
- 다음 → `session-04-step5-roadmap-interview.md`.

---

## 복사용 프롬프트

```
=== 컨텍스트 ===
- 프로젝트: KPC AI 훈련 로드맵 대시보드 (/Users/baekkyunshin/Desktop/AI-roadmap-dashboard)
- 마스터 계획서: docs/plans/archive/2026-04-14-official-form-alignment.md
- OFA 프로젝트 **세 번째 세션** — Step 1·2 완료 (메인 브랜치 + DB 기반 마이그 060~064 머지됨)
- 본 세션: Step 3 + Step 4 **병렬** 실행
  - Step 3 (S, 12 Task): HWPX PoC — Vercel Python Functions + python-hwpx — Critical PoC (실패 시 아키텍처 재검토)
  - Step 4 (M, 10 Task): 공지 게시판 — 독립 기능

=== 사전 검증 (반드시 첫 번째로 실행) ===
1. cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
2. git fetch origin && git checkout feature/official-form-alignment && git pull
3. git log --oneline -5            → "feat(ofa-02): DB 스키마 기반..." 머지 커밋 확인
4. ls supabase/migrations/06{0,1,2,3,4}_*.sql  → 5개 마이그 파일 모두 존재 확인
5. mcp__supabase__list_migrations  → 060~064 모두 적용 확인 (브랜치 DB)
6. mcp__supabase__list_tables({schemas:['public']})  → projects(track 컬럼)·pbl_reports·pbl_likes·notices·notice_attachments 모두 존재
7. ls .claude/skills/hwpx-docgen/scripts/  → analyze_template.py, validate_hwpx.py 존재
8. ls docs/references/1.AI훈련로드맵*.hwpx, docs/references/2.AI*PBL*.hwpx, docs/references/3.*.hwpx  → 양식 3종 존재
9. uv --version                    → uv 설치 확인 (없으면 brew install uv)
10. echo $HWPX_API_SECRET 또는 vercel env ls  → 환경변수 등록 확인 (없으면 사용자에게 강력한 무작위 시크릿 등록 요청)
11. npm run validate               → baseline pass 확인

검증 실패 시 즉시 중단. Step 2 미머지·Supabase 브랜치 DB 미연결·HWPX_API_SECRET 미등록 모두 차단 사유.

=== 필수 사전 정독 ===
> 계획서 해당 섹션의 정확한 줄 위치는 `grep -n '^## 0\.\|^### 3-4\.\|^### Step 3:\|^### Step 4:\|^## 6\.' docs/plans/archive/2026-04-14-official-form-alignment.md` 로 헤더 줄 확인 후 Read offset 지정.

- 계획서 §0: 안전장치 (a)~(d)
- 계획서 §3-4: UI/UX 재사용 원칙 (Step 4 적용)
- 계획서 §4 Step 3: HWPX PoC 12 Task + **보안 원칙 (X-HWPX-Secret 헤더 검증 필수)**
- 계획서 §4 Step 4: 공지 게시판 10 Task
- 계획서 §6: 리스크 매트릭스 — Step 3 PoC 실패 시 (B) 별도 마이크로서비스 옵션 검토 트리거

에이전트 디스패치:
1. superpowers:using-git-worktrees로 두 개의 격리된 worktree 생성:
   - worktree A: feature/ofa-03-hwpx-poc (Step 3용)
   - worktree B: feature/ofa-04-notices-board (Step 4용)

2. Agent A (Step 3 HWPX PoC):
   - subagent_type: general-purpose
   - 계획서 §4 Step 3 (Task 1~12) 수행 지시
   - 호출 스킬: hwpx-docgen (.claude/skills/hwpx-docgen/), Context7 MCP
   - Critical: api/hwpx/generate.py에 X-HWPX-Secret 헤더 검증 필수 (계획서 보안 원칙)
   - Vercel Preview 배포 후 ping·generate·hwpx-test 모두 검증
   - PoC 실패 시 즉시 보고하고 작업 중단 (아키텍처 재논의 필요)
   - 종료: ADR 작성 + PR 생성 (base = feature/official-form-alignment)

3. Agent B (Step 4 공지 게시판):
   - subagent_type: general-purpose
   - 계획서 §4 Step 4 (Task 1~10) 수행 지시
   - 호출 스킬: frontend-guide, check-server-action, web-design-guidelines, react-best-practices, shadcn MCP
   - 모든 UI는 §3-4 공통 UI/UX 재사용 원칙 준수 (Skeleton·shadcn 강제·sonner 토스트·PageHeader·EmptyState·Pagination)
   - Server Actions 6개 (create/update/delete/togglePin/uploadAttachment/deleteAttachment) 모두 5단계 패턴 + ActionResult { success, data|error } 반환
   - Navigation.tsx (src/components/Navigation.tsx — 프로젝트 유일 네비게이션) 메뉴 추가
   - test-automator 서브에이전트로 E2E (e2e/ops/notices.spec.ts) 작성
   - 종료: PR 생성

4. 두 에이전트 완료 후:
   - 각 PR의 base가 feature/official-form-alignment인지 확인 (main이면 즉시 close·재생성)
   - npm run validate && npm run build를 본 디렉터리에서 시도(병합 충돌 가능성 미리 확인)
   - PoC 결과(Step 3) 리포트 — 성공이면 다음 세션 진행, 실패면 사용자 승인 대기

=== 자동 진행 vs 승인 요청 경계 ===
- 자동 진행: 두 Step 22 Task 전체. TDD·UI 작성·E2E 자동.
- 승인 요청 (즉시 중단):
  - Step 3 PoC ping 통과했지만 generate 실패 (python-hwpx 호환 이슈) — **Critical 체크포인트, 사용자와 (B) 옵션 협의**
  - Step 4 첨부 업로드 트랜잭션 롤백 패턴이 별도 RPC 도입을 요구할 때
  - 어떤 PR도 base가 main으로 만들어진 경우 (즉시 close + 재생성)
  - HWPX_API_SECRET 헤더 검증이 Vercel 환경변수 미등록으로 401 반환할 때
  - 두 worktree 간 충돌이 발생할 때 (예: package.json 같은 공통 파일 동시 수정)

=== Task 종료 보고 양식 (각 에이전트가 본 Step 종료 시) ===
✅ Step 3 (Agent A) 완료
- PR URL: ...
- Preview URL: ...
- 핵심 검증: ping=ok, generate bytes>0, 시크릿 누락 시 401, hwpx-test 통과
- ADR 작성됨: docs/decisions/2026-04-14-hwpx-infrastructure.md

✅ Step 4 (Agent B) 완료
- PR URL: ...
- Preview URL: ...
- 핵심 검증: 운영자 작성·컨설턴트 조회·첨부 업로드/다운로드·E2E 통과

=== 금지 사항 ===
- api/hwpx/generate.py에서 X-HWPX-Secret 검증 생략 (DoS 위험)
- gh pr create --base main (반드시 feature/official-form-alignment)
- 두 worktree 간 동일 파일 동시 수정 (충돌 시 사용자 승인)
- gh pr merge --auto, force push

=== 종료 시 ===
1. 두 worktree에서 npm run validate && npm run build 통과 확인
2. 두 PR 링크 + Preview URL 보고
3. Step 3 PoC 성공/실패 명시 보고 (실패면 다음 세션 진행 보류)

=== 사용자에게 전달할 검증 안내 (세션 종료 시 반드시 출력) ===
아래 형식 그대로 사용자에게 안내:

────────────────────────────────────────
✅ Step 3 + Step 4 완료. PR URLs:
- Step 3 (HWPX PoC): <url>
- Step 4 (공지 게시판): <url>

**사용자가 확인할 것** (예상 10분):

**Step 4 (공지 게시판) — localhost 확인**
1. `npm run dev` → http://localhost:3000
2. 운영자로 로그인 → 사이드바에 "공지 관리" 메뉴 보임
3. 공지 1건 작성 + 파일 첨부 → 저장
4. 컨설턴트로 로그인 → /notices → 작성한 공지 보임 → 첨부 다운로드 동작

**Step 3 (HWPX PoC) — Vercel Preview에서만 동작**
- localhost에서는 Python Functions가 안 돌아갑니다 (Vercel 환경 전용)
- 대신 제가 검증한 결과를 신뢰하거나, Preview URL에 접속해 다음 URL 확인:
  - `https://<preview-url>/api/hwpx/ping` → `{"status":"ok"}` 응답

**저에게 질문 1개로 대체 가능**:
> "Step 3·4 PR이 계획서 성공 지표를 충족하는지 검증하고 보고해줘"

Step 4 localhost 동작 OK + 제 Step 3 검증 보고 OK면 → 두 PR 모두 **Squash and Merge** → 새 세션에서 session-04 진행.

**Step 3 PoC 실패 시**: 머지하지 말고 저와 아키텍처 재논의 필요.
────────────────────────────────────────
```
