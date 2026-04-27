# Session 02 — Step 2: DB 스키마 기반 (마이그레이션 060~064 + tracks·status 상수)

## 세션 목표
마스터 계획서 §4의 **Step 2** (M, 15 Task) 수행. 트랙·PBL·공지 게시판·HWPX 인프라에 필요한 DB 기반(테이블·ENUM·RLS·트리거·RPC·Storage 버킷)을 한 PR에 담아 완성.

## 사전 조건
- session-01 완료. `feature/official-form-alignment` 브랜치가 origin에 있음.
- `.claude/skills/hwpx-docgen/` 설치됨.
- Supabase MCP가 활성화되어 있고 프로젝트와 연결됨.
- `npm install` 완료, `npm run validate` 통과 상태.

## 실행 모드
**subagent-driven-development** — 15 Task가 모두 독립성 있고 fresh 컨텍스트가 품질에 도움. RLS 작성·테스트 작성·UI 변경이 분리되어 있어 Task별 specialist 디스패치가 적합.

## 호출 스킬·MCP·서브에이전트
- `superpowers:subagent-driven-development` (메인 모드)
- `supabase-dev` (마이그레이션·RLS 작성)
- `check-server-action` (Task 11 Server Action 작성 시)
- 서브에이전트:
  - `security-auditor` (Task 12 RLS 감사)
  - `postgres-pro` (인덱스·RLS 비용 검증, 필요 시)
- MCP: `mcp__supabase__create_branch`, `mcp__supabase__apply_migration`, `mcp__supabase__list_branches`, `mcp__supabase__generate_typescript_types`, `mcp__supabase__get_advisors`

## 예상 소요
**3~5시간** (테스트 작성 포함, RLS 감사 30분 별도)

## 성공 지표
- [ ] 5개 마이그레이션 (060~064) 모두 Supabase MCP 브랜치 DB에 성공 적용.
- [ ] `pbl_reports`·`pbl_likes`·`notices`·`notice_attachments` 테이블 + 모든 RLS 정책 동작.
- [ ] `pbl_likes` INSERT/DELETE 트리거가 `pbl_reports.like_count`를 정확히 증감.
- [ ] `finalize_pbl(p_pbl_report_id, p_actor_user_id)` RPC 동작 (간단 단위 테스트). 반환은 JSONB `{success, error?, project_id?, version_number?}`. 실제 함수 이름은 `atomic_` 접두사 없는 `finalize_pbl` (마이그 036 `finalize_roadmap` 패턴 복제).
- [ ] `audit_action` ENUM에 9개 신규 값(NOTICE_*·PBL_*·ROADMAP_HWPX_EXPORTED) 모두 추가.
- [ ] `notice-attachments` Storage 버킷 + storage.objects RLS 정책 생성.
- [ ] `src/lib/constants/tracks.ts` (PROJECT_TRACKS, TRACK_LABELS, TRACK_BADGE_COLORS) + 테스트 통과.
- [ ] `src/lib/constants/status.ts`에 PBL_DRAFTED·PBL_ELIGIBLE_STATUSES·`getProjectWorkflowStepsByTrack` 반영 + 테스트 통과.
- [ ] `src/types/database.ts` 재생성 (신규 ENUM 값 반영).
- [ ] `src/app/(dashboard)/ops/projects/new/page.tsx` + `actions/crud.ts`에 track 필드 추가 + 테스트 통과.
- [ ] security-auditor 감사 결과: Critical 0건.
- [ ] `npm run validate` + `npm run build` 통과.
- [ ] PR `feat(ofa-02): DB 스키마 기반 추가 (트랙·PBL·공지)` 생성, base = `feature/official-form-alignment`.

## 다음 세션 이동 조건
- PR 생성됨 + 사람 승인 + 머지 완료.
- `feature/official-form-alignment` 최신화(`git pull`).
- 다음 → `session-03-step3-4-parallel.md` (HWPX PoC + 공지 게시판 병렬).

---

## 복사용 프롬프트

```
=== 컨텍스트 ===
- 프로젝트: KPC AI 훈련 로드맵 대시보드 (Next.js 16 + Supabase, /Users/baekkyunshin/Desktop/AI-roadmap-dashboard)
- 마스터 계획서: docs/plans/archive/2026-04-14-official-form-alignment.md
- OFA 프로젝트의 **두 번째 세션** — Step 1 (메인 브랜치 + hwpx-docgen 스킬 설치) 완료된 상태
- 본 세션: Step 2 (M, 15 Task) — 산인공 양식·HWPX·게시판이 동작하기 위한 모든 DB 기반을 한 PR에 담음
- 결과물: 마이그레이션 5개(060~064) + tracks·status 상수 + 프로젝트 생성 폼 track 필드

=== 사전 검증 (반드시 첫 번째로 실행) ===
1. cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
2. git fetch origin
3. git branch -a | grep "feature/official-form-alignment"   → origin/feature/official-form-alignment 존재 확인 (Step 1 결과)
4. git checkout feature/official-form-alignment && git pull
5. ls .claude/skills/hwpx-docgen/SKILL.md                   → Step 1에서 설치한 스킬 존재 확인
6. ls docs/plans/archive/2026-04-14-official-form-alignment.md      → 계획서 존재
7. ls supabase/migrations/ | tail -5                        → 059_*.sql까지 있음 확인 (060~064는 본 Step에서 신규 추가)
8. mcp__supabase__list_branches                             → Supabase MCP 활성화 + 기존 브랜치 목록 확인 (이름 충돌 방지)
9. npm run validate                                         → baseline pass 확인 (Step 1 후에도 회귀 0)

검증 실패 시 즉시 중단. 특히 Step 1 결과(feature/official-form-alignment 브랜치 + .claude/skills/hwpx-docgen)가 없으면 사용자에게 session-01 미완료 보고.

=== 필수 사전 정독 ===
> 계획서 해당 섹션의 정확한 줄 위치는 `grep -n '^## 0\.\|^### 3-4\.\|^### Step 2:' docs/plans/archive/2026-04-14-official-form-alignment.md` 로 헤더 줄 확인 후 Read offset 지정.

- 계획서 §0: 안전장치 (a)~(d)
- 계획서 §3-4: UI/UX 재사용 원칙 (Task 11에서 적용)
- 계획서 §4 Step 2: 본 세션 15 Task 전체 + "프로젝트 기존 자산 준수" 블록 (RLS 헬퍼·ENUM·UUID·JSONB 패턴)
- supabase/migrations/001_initial_schema.sql, 005_rename_case_to_project.sql, 024_add_roadmap_gallery.sql, 050_add_jsonb_size_constraints.sql, 056_add_like_count_cache.sql — 본 Step의 신규 마이그가 따를 패턴들

=== 실행 모드 ===
superpowers:subagent-driven-development

=== 핵심 자산 요약 (계획서 §4 Step 2 본문 정독 후 다음을 두뇌에 고정) ===
- 기존 RLS 헬퍼: is_assigned_to_project(UUID), is_ops_admin_or_higher(), is_approved_consultant() — is_system_admin은 없음
- auth.uid() 패턴: 헬퍼 안에서 이미 (SELECT auth.uid()) 래핑됨. 헬퍼 밖에서 직접 쓸 때만 (SELECT auth.uid())
- ENUM: project_status (case_status 아님 — 005 RENAME 완료), audit_action (ENUM, TEXT 아님)
- 좋아요: roadmap_likes 테이블 + INSERT/DELETE 트리거가 like_count 증감 (마이그 024·056). pbl도 동일 패턴 복제 — 마이그 061에 함께
- JSONB 크기: octet_length(col::TEXT) < N (마이그 050)
- UUID: uuid_generate_v4() 통일
- 마이그 061에 audit_action 9개 enum 값 + finalize_pbl RPC 모두 사전 추가 (Step 12로 미루지 않음)

진행 원칙:
1. supabase-dev 스킬을 먼저 호출해 마이그레이션 SQL 컨벤션 확인
2. mcp__supabase__create_branch(name="ofa-schema-foundation")로 브랜치 DB 생성 (Task 1) — 이후 Task 8에서는 재생성하지 않고 list_branches로 재사용
3. 마이그 060~064를 mcp__supabase__apply_migration으로 순차 적용
4. 마이그 061에는 audit_action ENUM 9개 값 + finalize_pbl RPC가 모두 포함됨 (Step 12로 미루지 않음 — 이후 Step에서 사용 시점에 DB에 있어야 함)
5. 마이그 062의 storage.buckets INSERT는 ON CONFLICT DO UPDATE 패턴. storage.objects 정책 생성이 환경상 실패하면 대시보드 폴백
6. 각 마이그 적용 후 mcp__supabase__generate_typescript_types로 src/types/database.ts 재생성
7. tracks.ts·status.ts 변경은 TDD (RED 테스트 → GREEN 구현)
8. Task 11 (프로젝트 생성 폼 track 필드 추가)도 TDD. requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN'], ...) 패턴 유지
9. Task 12에서 Agent(subagent_type:"security-auditor", ...) 디스패치해 RLS 감사. 감사 프롬프트는 계획서 본문에 명시된 6개 항목 그대로 사용
10. mcp__supabase__get_advisors 호출해 RLS·성능 advisor 경고 0건 확인

=== 자동 진행 vs 승인 요청 경계 ===
- 자동 진행: 15 Task 모두. TDD RED→GREEN 자율 진행. 마이그·테스트·UI 작성 자동.
- 승인 요청: 다음 경우에만 즉시 중단 후 사용자 확인
  - 마이그 적용 중 트리거·RPC가 예상대로 동작하지 않을 때
  - security-auditor가 Critical 이슈 보고 시
  - Storage RLS SQL이 환경에서 거부되어 대시보드 폴백 결정 시
  - PROJECT_WORKFLOW_STEPS·PROJECT_STATUS_CONFIG 변경이 기존 호출부 회귀를 일으킬 때
  - audit_action enum 추가가 기존 데이터 마이그레이션을 요구할 때 (실데이터 없으므로 발생 가능성 0이지만 만약 발생 시)

=== Task 종료 보고 양식 ===
✅ Task N 완료 (제목)
- 변경 파일: 경로 1~3개
- 검증: npm run test 결과 / 마이그 적용 결과 / RLS 동작 1줄
- 다음 Task로 진행 (또는 승인 요청 사유)

=== 금지 사항 ===
- 프로덕션 DB에 마이그 적용 (Supabase MCP 브랜치 DB만)
- supabase db reset을 원격에 실행
- 기존 RLS 헬퍼(is_assigned_to_project 등) 시그니처 변경
- pbl_likes·finalize_pbl을 Step 12로 미루기 (반드시 마이그 061에 포함)
- gh pr merge --auto, force push

=== 종료 시 ===
1. superpowers:verification-before-completion (npm run validate && npm run build)
2. mcp__supabase__get_advisors 결과 보고 (RLS·성능 경고 0건)
3. gh pr create --base feature/official-form-alignment --title "feat(ofa-02): DB 스키마 기반 추가 (트랙·PBL·공지)" --body (계획서 §4 Step 2 Task 14의 본문 사용)
4. PR URL 보고. 자동 머지 금지. 사용자(팀장) 승인 대기.

=== 사용자에게 전달할 검증 안내 (세션 종료 시 반드시 출력) ===
아래 형식 그대로 사용자에게 안내:

────────────────────────────────────────
✅ Step 2 완료. PR URL: <url>

**사용자가 확인할 것** (예상 10~15분):

1. **localhost 화면** (`npm run dev` → http://localhost:3000)
   - 운영자 계정으로 로그인
   - "프로젝트 생성" 페이지 → **트랙 선택 라디오(ROADMAP/PBL) 보이는지**
   - 양쪽 모두로 프로젝트 1건씩 생성 시도 → 정상 저장

2. **Supabase 대시보드** (app.supabase.com → 프로젝트)
   - Table Editor: `pbl_reports`·`pbl_likes`·`notices`·`notice_attachments` 4개 테이블 보임
   - Database → Advisors: 빨간 경고 0건 (있으면 저에게 보고)

3. **저에게 질문 1개로 대체 가능** (위 2번이 어렵다면):
   > "이 PR의 계획서 §4 Step 2 성공 지표 전부 검증하고 보고해줘"
   → 제가 Supabase MCP로 자동 검증합니다.

위 3가지 모두 OK면 GitHub PR 페이지에서 **Squash and Merge** → 새 세션에서 session-03 진행.
────────────────────────────────────────
```
