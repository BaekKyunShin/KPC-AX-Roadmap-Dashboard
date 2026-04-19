# Session 11 — Step 12: 최종 QA · 문서 · 배포 점검 + main 머지

## 세션 목표
마스터 계획서 §4의 **Step 12** (M, **15 Task**) 수행 + **`feature/official-form-alignment` → `main` 최종 PR 1회**. 마이그레이션 **066**(legacy 정리; 065는 Step 6.5의 interview_attachments가 점유), Task 1·2의 선행 이관, Task 3.5 HWPX 양식 세부 수정(Session 09 피드백), **Task 3.6 Session 1~10 Playwright 회귀 감사 + Task 3.7 Session 1~10 코드 레벨 회귀 감사(Session 10 종료 시 사용자 지시로 신설)**, E2E 스모크, 성능·보안 감사, **산인공 양식 1번·2번 1:1 정합성 전수 검증**, 문서 갱신, 배포 체크리스트 통과.

## 사전 조건
- Step 1~11 **+ Step 6.5** 모든 PR이 `feature/official-form-alignment`에 머지됨.
- `feature/official-form-alignment` 최신 + `npm run validate && npm run build` 통과.
- Vercel "Production Branch = main" 단일 고정 재확인 (§0 안전장치 (c)).
- 사람 승인 받을 준비 (마지막 main 머지 PR은 팀장 직접 승인 필수).

## 실행 모드
**subagent-driven-development** — **15 Task** (Task 1-a/1-b/2-a/2-b 분할 + Task 3.5 HWPX 피드백 + **Task 3.6 Playwright 회귀 감사 + Task 3.7 코드 레벨 회귀 감사(Session 10 종료 시 신설)** + 기존 3·4·5·6·7·8·9·10). 마이그·E2E·성능 감사·보안 감사·회귀 감사·문서 갱신·UI 감사 모두 분리된 specialist.

## 호출 스킬·MCP·서브에이전트
- `superpowers:subagent-driven-development`
- `superpowers:finishing-a-development-branch` (마지막 단계)
- 서브에이전트:
  - `test-automator` (E2E 스모크)
  - `performance-engineer` (번들·DB·콜드스타트)
  - `security-auditor` (RLS·HWPX 인증·트랙 격리·Storage)
- `web-design-guidelines` (UI 최종 감사)
- `refactoring`
- MCP: `mcp__supabase__get_advisors`, `mcp__supabase__apply_migration`, Playwright

## 예상 소요
**8~12시간** (Task 3.6 Playwright·3.7 코드 감사 추가 반영 — Session 10 종료 시 신설. 감사 결과 대응 시간 별도)

## 성공 지표
- [ ] **Task 1-a**: `interview.ts` 잔존 import 이관 (**Session 10 (Step 11) 실측 18 곳** — `test-roadmap/*`은 Session 10 (Step 11)에서 신 스키마로 이관 완료, 잔존은 대부분 `consultant/projects/[id]/interview/*` 실사용 페이지 15개 + 서비스 3개(`roadmap-generator.ts`, `stt.ts`, `roadmap-stt-formatter.ts`)) — `@/lib/schemas/interview-roadmap` 으로 개별 교체
- [ ] **Task 1-b**: grep 결과 0건 확인 후 `interview.ts` 삭제 + `npm run typecheck` 회귀 0
- [ ] **Task 2-a**: `roadmap_versions.pbl_course` 코드 레퍼런스 제거 (Session 09 실측: `src/types/database.ts:268`, `consultant/projects/[id]/roadmap/actions.ts`, 테스트 fixture 등) — 선행 필수
- [ ] **Task 2-b**: `supabase/migrations/066_ofa_cleanup.sql` 작성 + 적용 (**065는 Step 6.5의 `065_add_interview_attachments.sql`가 점유** — 본 Step는 **066**을 사용):
  - `roadmap_versions.pbl_course` DROP COLUMN (chk_pbl_course_size CASCADE 동반 제거 주석 명시)
  - audit/RPC는 마이그 061에서 이미 추가됨 — 본 마이그 추가 항목 0 가능
  - `mcp__supabase__apply_migration` 적용 → `mcp__supabase__list_migrations`로 066 반영 검증
- [ ] **Task 3**: `src/app/api/hwpx-test/route.ts` 제거 (PoC 일회성).
- [ ] **Task 3.5 (신규): HWPX 양식 세부 수정** — Session 09 한글 프로그램 검증에서 발견한 세부 수정 사항을 **사용자로부터 재취합**해 일괄 반영. 양식 1번·2번 셀 매핑·라벨·체크박스 위치·병합 처리 정밀 보정 후 한글 프로그램 육안 재검증 통과.
- [ ] **Task 3.6 (신규): Session 1~10 전체 워크플로우 Playwright MCP 회귀 감사** — Session 01~10 의 계획서 §4 각 Step + `docs/prompts/session-0{0..9}-*.md` + `session-05b-*.md` + `session-10-step11-gallery.md` 를 순서대로 읽고, 각 Step 에서 도입된 핵심 사용자 시나리오를 Playwright MCP 로 실제 브라우저에서 실행·검증. 버그·오류·UX 불편 지점 목록화 → 수정 계획 수립 → 수정 → 재검증. 자세한 절차는 아래 진행 원칙.
- [ ] **Task 3.7 (신규): Session 1~10 코드 레벨 회귀 감사** — Task 3.6 과 **별도·보완** 관계. 각 Session 의 마스터 계획서 Step + 프롬프트 성공 지표를 **코드와 1:1 대조**하여 구현 누락·부분 구현·편차·코드 레벨 버그·에러 처리 누락·성능 병목·테스트 커버리지 공백·보안 체크 누락을 정적으로 식별. 자세한 절차는 아래 진행 원칙.
- [ ] **Task 4**: `e2e/workflow/ofa-smoke.spec.ts` 6개 시나리오 작성 + 통과.
- [ ] **Task 5**: performance-engineer 보고서 (번들 사이즈·인터뷰 위저드 렌더·HWPX 콜드스타트·갤러리 통합 쿼리) — Critical 0건.
- [ ] **Task 6**: security-auditor 보고서 (트랙 격리·HWPX_API_SECRET 동작·Storage signed URL·MIME 검증) — Critical 0건 + `mcp__supabase__get_advisors` 결과 RLS·성능 경고 0건.
- [ ] **Task 7**: 문서 갱신 — ARCHITECTURE.md(트랙 분리·HWPX 아키텍처·공지 게시판·HWPX 로컬 브리지), RLS.md(pbl_reports·pbl_likes·notices·notice_attachments·interview_attachments 정책), CLAUDE.md(Task 3.6·3.7 결과 기반 추가 갱신만 — HWPX 브리지 워크플로우는 Session 10 Step 11에서 이미 반영됨).
- [ ] **Task 8**: `web-design-guidelines` 스킬 최종 UI 감사 통과.
- [ ] **Step 8(Session 7) UI/UX 원칙 일관 적용 확인** (무작위 5페이지 샘플링):
  - 모든 폼 필드 `FormField` 래핑
  - **인터뷰 단계에 한해** 양식 작성 가이드 `GuideNote` 섹션 **하단** 배치 (산출물은 LLM 생성이라 해당 없음)
  - 텍스트 입력 Grid 2열 이하
  - 양식 원문 1:1 라벨 매칭
- [ ] **Task 9**: `npm run validate && npm run build && npm run test:e2e` 모두 통과 + `.venv-hwpx/bin/pytest api/hwpx/` PASS.
- [ ] **산인공 양식 1번 QA 체크리스트** (계획서 §4 Step 12) 전 항목 ✅ — 로드맵 HWPX 실물 3건 이상 한글 프로그램에서 양식 PDF와 겹쳐 비교, 부제 라벨·NCS 박스·수립 방법·매트릭스 단순 표 전환 모두 확인.
- [ ] **산인공 양식 2번 QA 체크리스트** 전 항목 ✅ — PBL HWPX 실물 3건 이상, Ⅰ~Ⅴ장 + 결과보고서(수행일지) 전 섹션 + 교과목 프로파일 강사투입시간 합=훈련시간 + 결과평가 4종 설문 문항 수 고정 (5/3/5/4) 확인.
- [ ] **Task 10**: 배포 체크리스트(§8) 모든 항목 ✅:
  - 환경변수 (`HWPX_API_SECRET`·`VERCEL_AUTOMATION_BYPASS_SECRET`·`LLM_API_KEY`·`SUPABASE_*` 등) 등록 확인
  - Storage 버킷 프로덕션 생성 (`notice-attachments`, `interview-attachments`)
  - 마이그레이션 적용 순서 **060→061→062→063→064→065→066** (065 = Step 6.5 interview_attachments, 066 = Step 12 legacy 정리)
  - pg_dump 백업 준비
- [ ] **최종 PR** `feat(ofa): 산인공 공식 양식 정렬 통합` (base = `main`) 생성 — **팀장 직접 승인 + 머지 = 사람만 가능, Claude 자동 머지 절대 금지**.

## 다음 세션 이동 조건
- 본 세션이 마지막. 사람 승인·머지 후 OFA 프로젝트 종료.
- 추가 변경/수정 사항 발생 시 별도 새 계획서 작성 (마스터 계획서는 한 번 사용 후 종료).

---

## 복사용 프롬프트

```
=== 컨텍스트 ===
- 프로젝트: KPC AI 훈련 로드맵 대시보드 (/Users/baekkyunshin/Desktop/AI-roadmap-dashboard)
- 마스터 계획서: docs/plans/2026-04-14-official-form-alignment.md
- OFA 프로젝트 **열한 번째(마지막) 세션** — Step 1~11 + **Step 6.5** 모두 머지된 상태
  - 13 Step (Step 6.5 신규 삽입 포함) / 150+ Task / 65+ 신규·변경 파일 모두 통합됨
- 본 세션: Step 12 (M, **15 Task** — Task 1-a/1-b/2-a/2-b 분할 + 3.5/3.6/3.7 신규 + 기존 3·4·5·6·7·8·9·10) + **feature/official-form-alignment → main 최종 PR 1회**
- 결과물 후 OFA 프로젝트 종료. 추후 변경 사항은 별도 새 계획서.

=== 사전 검증 (반드시 첫 번째로 실행) ===
1. cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
2. git fetch origin && git checkout feature/official-form-alignment && git pull
3. git log --oneline | grep -E "ofa-(02|03|04|05|06|06\\.5|07|08|09|10|11)" | wc -l  → 11 이상 (ofa-02~11 + Step 6.5 모두 머지)
4. ls supabase/migrations/06{0,1,2,3,4,5}_*.sql  → **6개 마이그**:
   - 060: project track
   - 061: pbl_reports + pbl_likes + finalize_pbl RPC + audit ENUM
   - 062: notices + notice_attachments
   - 063: interviews.pbl_data JSONB
   - 064: project status PBL 확장
   - **065: interview_attachments + Storage 버킷 (Step 6.5 — HRD이음 첨부)**
5. ls api/hwpx/ templates/hwpx/ src/lib/services/pbl/ src/lib/services/export/hwpx/  → 핵심 산출물
6. ls templates/hwpx/roadmap.hwpx templates/hwpx/pbl.hwpx  → 양쪽 템플릿 존재
7. ls api/hwpx/_placeholders_roadmap.py api/hwpx/_placeholders_pbl.py  → Python 측 2파일 (이전 판 언급 `_hwpx_helpers.py`는 추출되지 않아 존재하지 않음 — `generate.py` 내부에 헬퍼 공유)
8. ls src/components/roadmap/shared/  → Step 6.5 공용 디자인 키트
9. ls src/app/\(dashboard\)/notices src/app/\(dashboard\)/test-pbl  → 신규 라우트
10. grep -rn "schemas/interview['\"]\\|from '@/lib/schemas/interview'" src/ e2e/  → interview.ts 잔존 import 사전 감사 (Task 1 전제)
11. mcp__supabase__list_migrations  → 060~065 모두 적용 + **066 미적용** 확인
12. mcp__supabase__get_advisors  → 현재 advisor 경고 상태 baseline
13. echo $HWPX_API_SECRET || vercel env ls | grep HWPX  → 환경변수 등록 확인
14. ls scripts/dev-hwpx-server.py && grep dev:hwpx package.json  → Session 10 Step 11 에서 도입한 HWPX 로컬 브리지 스크립트·npm 스크립트 존재 확인. (`.venv-hwpx/` 는 최초 실행 시 없을 수 있음 — 없으면 `npm run dev:hwpx:setup` 실행)
15. npm run validate && npm run build  → baseline 정적 검증 (E2E 는 무겁고 baseline 목적엔 과하므로 Task 9에서만 실행)

**HWPX 로컬 테스트 워크플로우 (직전 세션 Session 10 = Step 11 = OFA-11 에서 도입 — Task 3.5·3.6·4·E2E 에서 필수)**:
- `npm run dev:hwpx:setup` (최초 1회, `.venv-hwpx` 생성 + python-hwpx·lxml 설치)
- 터미널 A: `npm run dev:hwpx` (브리지 서버 3010)
- 터미널 B: `npm run dev:with-hwpx` (next dev + HWPX_DEV_PROXY_URL 자동 세팅)
- `next.config.ts` 의 `rewrites()` 가 `HWPX_DEV_PROXY_URL` 감지 시 `/api/hwpx/*` 를 브리지로 포워딩. 프로덕션(Vercel)은 기존 Python Function 그대로 사용.
- 기존 `npm run dev` + `npm run dev:vercel` 경로는 Vercel CLI 51.2.x 의 Python 런타임 빌드 실패 이슈로 신뢰 불가 → 브리지 방식이 공식 경로.

검증 실패 시 즉시 중단. Step 1~11 + 6.5 미머지·잔존 import 발견 시 사용자 보고.

=== 필수 사전 정독 ===
> 계획서에서 해당 섹션은 `grep -n '^## 0\.\|^### Step 12:\|^## 6\.\|^## 7\.\|^## 8\.' docs/plans/2026-04-14-official-form-alignment.md` 로 정확한 줄 위치 찾아 Read.

- 계획서 §0: 안전장치 (a)~(d) — 본 세션이 이 보장의 최종 게이트
- 계획서 §4 Step 12: 본 세션 **15 Task** (1-a/1-b/2-a/2-b 분할 + 3.5/3.6/3.7 신규 + 기존 3·4·5·6·7·8·9·10) + 마이그 **066** (065는 Step 6.5가 점유)
- 계획서 §6: 리스크 매트릭스 — 마지막 한 번 검토
- 계획서 §7: 롤백 전략
- 계획서 §8: 배포 체크리스트 — 본 세션이 모든 항목 ✅화

=== §0 안전장치 재확인 (절대 위반 금지) ===
- (a) 본 Step 마지막 PR만 base=main. 그 외 PR 없음
- (b) main 머지는 §8 체크리스트 통과 후
- (c) Vercel Production Branch = main 단일 고정 재확인 (Vercel 대시보드 → Settings → Git → Production Branch 직접 확인. `vercel inspect`는 부적합)
- (d) main PR은 팀장 직접 승인. Claude 자동 머지·force push 금지

진행 원칙 (Task 번호 순 — 각 Task 완료 후 다음 진행):

**0. 브랜치 생성**: `feature/ofa-12-final-qa-docs` (base = `feature/official-form-alignment`)

**Task 1 (interview.ts 제거, 두 단계로 분할)**:
   - **Task 1-a**: 먼저 `grep -rhE "import (type )?\{[^}]*\} from '@/lib/schemas/interview'" src/ e2e/` 로 실제 import되는 심볼 목록 수집. Session 11 실측(18 파일): `consultant/projects/[id]/interview/*` 15 파일(actions.ts, InterviewClient.tsx + 각 Step 컴포넌트·테스트) + `src/lib/services/roadmap/roadmap-generator.ts` + `src/lib/services/stt.ts` + `src/lib/services/roadmap/roadmap-stt-formatter.ts`. (Session 09 시점과 달리 `test-roadmap/*`는 Session 10 Step 11에서 신 스키마로 재작성되어 제외.) 이 심볼들은 `interview-roadmap.ts`에 **동일 이름으로 존재하지 않음** → 이관 매핑 표 작성(구 이름 → 새 이름/새 위치 또는 "유지"/"삭제" 결정). 파일별 import 교체 후 회귀 확인.
   - **Task 1-b**: grep 결과 0건 검증 후 `interview.ts` 삭제 + `npm run typecheck && npm run test` 회귀 0

**Task 2 (마이그 066 + pbl_course 정리, 두 단계로 분할)**:
   - **Task 2-a (선행 필수)**: `roadmap_versions.pbl_course` 코드 레퍼런스 제거. Session 09 실측: `src/types/database.ts:268`, `consultant/projects/[id]/roadmap/actions.ts`, `test-roadmap/actions.test.ts`, `consultant/projects/[id]/roadmap/actions.test.ts`, `gallery/actions/queries.ts`·`queries.test.ts` 등. 회귀 테스트 0건 확인.
   - **Task 2-b (마이그 적용)** — 065는 Step 6.5가 점유:
     - 파일명: `supabase/migrations/**066_ofa_cleanup.sql**`
     - `roadmap_versions.pbl_course` DROP COLUMN (chk_pbl_course_size CHECK 제약은 DROP COLUMN 으로 자동 제거 — 주석 명시)
     - audit_action ENUM 추가 항목은 마이그 061에서 이미 처리됨 — 본 마이그에서 발견된 추가 값만 (없으면 빈 블록)
     - finalize_pbl RPC도 마이그 061에서 처리됨
     - `mcp__supabase__apply_migration` 로 적용 + `mcp__supabase__list_migrations` 로 066 반영 검증
     - `src/types/database.ts` 는 **수동 편집 파일** — `generate_typescript_types` 전체 덮어쓰기 금지. enum 확장분(있으면)만 수기 병합

**Task 3**: `src/app/api/hwpx-test/route.ts` 제거 (PoC 일회성)

**Task 3.5 (HWPX 양식 세부 수정 — Session 09 한글 프로그램 검증 피드백 일괄 반영)**:
   - 본 Task 진입 시 **사용자에게 구체 피드백 목록 재요청** (Session 09 종료 시 "수정 필요 사항이 있지만 Step 12에서 일괄 처리" 합의됨)
   - 대상 위치: `api/hwpx/generate.py` (`_generate_roadmap`/`_generate_pbl` 셀 좌표), `api/hwpx/_placeholders_*.py` (placeholder 맵·반복 배열), `templates/hwpx/*.hwpx` (필요 시 템플릿 수정), 각 테스트 파일
   - **주의사항 (직전 세션 Session 10 = Step 11 에서 파악)**:
     - `src/lib/services/export/hwpx/hwpx-client.ts` 의 에러 메시지를 변경할 경우 `src/app/(dashboard)/consultant/projects/[id]/{roadmap,pbl}/actions.ts` 의 `isLocalDevFallback = message.includes('Vercel Python 런타임')` 키워드와 동기화 필수 (Session 10 회귀 사례 있음).
     - 파일명 생성 규칙은 `src/lib/services/export/hwpx/hwpx-filename.ts` (공통 `sanitizeFileNamePart`) 로 중앙화됨 → 신규 규칙 추가 시 여기만 수정.
   - 검증: pytest PASS + **로컬 HWPX 브리지 워크플로우** (사전 검증에서 안내) 또는 Preview 배포 후 Playwright MCP로 HWPX 재다운로드 + 한글 프로그램 육안 검수 **사용자 승인 필수**
   - 미통과 시 재수정 반복. 완료 없이는 Task 4 이후 진행 금지

**Task 3.6 (Session 1~10 전체 워크플로우 Playwright MCP 회귀 감사 — 신규)**:
   - 목적: Step 1~11 전 세션에서 도입된 실 사용자 기능이 현 브랜치(`feature/official-form-alignment`) 최신 상태에서 정상 동작하는지, UX/UI 불편·버그·오류가 없는지 실제 브라우저에서 확인.
   - 참고 입력 문서 (반드시 정독 — 각 Step 의 "성공 지표" 기반으로 시나리오 추출 / **총 13 문서**):
     - 마스터 계획서 `docs/plans/2026-04-14-official-form-alignment.md` §4 Step 1~11 각각 (1개 파일 안의 11 Step 섹션)
     - `docs/prompts/session-00-overview.md` (전체 개요)
     - `docs/prompts/session-01-step1-setup.md` ~ `session-09-step10-pbl-hwpx.md` (9개 파일)
     - `docs/prompts/session-05b-step6.5-form-compliance.md`
     - `docs/prompts/session-10-step11-gallery.md`
   - 테스트 계정:
     - **컨설턴트**: `kpc@test.com` / `aaaa0000`
     - **운영관리자**: `son@test.com` / `aaaa00000`
   - 감사 절차 (엄수):
     1. **시나리오 추출**: 위 13 문서 읽고 각 Step 의 핵심 사용자 시나리오 목록화(예: 로그인, 프로젝트 생성, 컨설턴트 배정, 로드맵 인터뷰 6단계, 로드맵 생성·편집·확정, PDF/XLSX/HWPX 다운로드, PBL 인터뷰 9단계, PBL 보고서 생성·편집·확정, 갤러리 트랙 필터·좋아요·공유, 공지사항 작성·첨부, /test-roadmap·/test-pbl, OPS 프로젝트 관리·감사로그·쿼터 등).
     2. **환경 준비**: 사전 검증에서 안내한 HWPX 브리지 워크플로우(`npm run dev:hwpx:setup` 최초 1회 → `npm run dev:hwpx` + `npm run dev:with-hwpx` 병렬 실행) 활성화. Playwright MCP(`mcp__plugin_playwright_playwright__*`) 로 두 계정 각각 로그인. 쿠키·세션 유지.
     3. **순차 실행**: Step 1→11 순서로 시나리오 수행. 각 단계마다 (a) 예상 화면·동작 (b) 실제 결과 (c) 네트워크 오류·콘솔 에러 (d) 스크린샷(필요 시) 기록.
     4. **이슈 수집**: 발견된 버그·오류·UX 불편을 `docs/{YYYY-MM-DD}-session11-playwright-audit.md` 에 우선순위(High/Medium/Low)로 기록 ({YYYY-MM-DD} = 본 Task 진입일).
     5. **수정 계획 수립**: High 는 본 Step 내 즉시 수정. Medium 은 시간 여유 있을 때. Low 는 별도 이슈 등록. 수정 계획을 사용자에게 보고 후 승인 받은 뒤 진행.
     6. **실제 수정**: 계획대로 코드 수정. `npm run validate` 통과 기준.
     7. **재검증**: 수정된 항목을 Playwright MCP 로 재실행해 해결 확인. 최종 리포트 업데이트.
   - 범위 가이드:
     - **인증·RBAC**: 로그인·회원가입·역할 승인·접근 거부(미승인 사용자) — Session 01~02
     - **프로젝트 라이프사이클**: 생성 → 진단 → 매칭 → 배정 → 인터뷰 → 산출물 → 확정 — Session 03~09
     - **로드맵 인터뷰/산출물**: 6단계 인터뷰·자동 저장·로드맵 LLM 생성·수정·확정·다운로드 — Session 04~06 + Session 05b(양식 정렬)
     - **PBL 인터뷰/산출물**: 9단계 인터뷰·PBL LLM 생성·수정·확정·다운로드 — Session 07~09
     - **HWPX 실물**: 로드맵·PBL HWPX 로컬 브리지로 실제 다운로드 후 파일 크기·매직 넘버 확인 — Session 06·09
     - **갤러리·테스트 페이지**: 트랙 필터·카드·상세·좋아요·공유·/test-roadmap·/test-pbl — Session 10
     - **OPS 관리**: 프로젝트 관리·사용자 관리·템플릿·감사로그·쿼터·공지사항 — Session 02~10 혼재
     - **모바일 반응형**: Playwright viewport 375×667 로 주요 페이지 5개 샘플링
     - **키보드 접근성**: Tab 순서·Escape·Enter — 네비 드롭다운·모달·폼
   - 미통과 시: High 전수 해결 전에는 Task 4 이후 진행 보류 (performance·security 감사 결과와 병합해 최종 수정 PR 로 묶을 수 있음).
   - 본 Task 는 **사용자 승인 게이트**: Playwright 감사 결과 요약 + 수정 계획을 사용자에게 보고하고 승인받은 뒤 수정 실행.

**Task 3.7 (Session 1~10 코드 레벨 회귀 감사 — 신규)**:
   - 목적: Task 3.6 이 **런타임·UX** 검증이라면, 본 Task 는 **정적·구현 적합성** 검증. 각 Session 이 계획서 성공 지표대로 코드에 반영되었는지, 누락·편차·코드 레벨 버그가 없는지 1:1 대조.
   - 참고 입력: Task 3.6 과 동일한 13 문서.
   - 감사 절차 (엄수):
     1. **Step 별 대조표 작성**: 각 Session 프롬프트의 "성공 지표" 체크박스를 표로 옮기고, 각 항목 옆에 실제 코드 위치(파일·심볼·라인)·구현 상태(✅/⚠️/❌)·메모 컬럼 기재. 산출: `docs/{YYYY-MM-DD}-session11-code-audit.md` ({YYYY-MM-DD} = 본 Task 진입일).
     2. **패턴 준수 감사** — 프로젝트 표준과 비교:
        - Server Actions: 세션 확인 → 역할 권한 → Zod 검증 → 비즈니스 → `ActionResult<T>` 5단계 패턴 일관성 (`.claude/skills/check-server-action` 참고)
        - Supabase: 4종 클라이언트(`client`/`server`/`admin`/`middleware`) 적재적소 사용, admin 오용(RLS 우회 남용) 없는지
        - RLS: 새 테이블이 RLS 정책 누락 없이 적용됐는지 (`supabase/migrations/*` + `docs/RLS.md` 대조)
        - 스키마·테스트: `src/lib/schemas/*.ts` 마다 `.test.ts` 쌍, 경계값·실패 케이스 포함
        - Server Action 테스트: 미인증·권한 없음·검증 실패·성공 4케이스 최소
        - 직렬화: `ActionResult` 반환에 Date·Map·함수 등 non-serializable 없는지
     3. **에러 처리·UX 감사**:
        - try/catch·finally 일관성, 로딩 상태 복구 누락
        - `showErrorToast` 같은 사용자 피드백 누락 분기
        - AbortController 연결된 cancel 가능 Server Action 에서 실제 signal 전달 확인
        - LLM 호출·HWPX 호출 등 장시간 작업의 취소·재시도 UX
     4. **보안·권한**:
        - `admin.ts` 사용처가 명시적 RBAC 체크 뒤에 있는지
        - 컨설턴트의 담당 프로젝트 배정 검증(`requireConsultantRoadmapAccess` 등) 일관 적용
        - 시크릿 토큰(HWPX_API_SECRET, VERCEL_AUTOMATION_BYPASS_SECRET) 클라이언트 bundle 노출 없는지
        - Storage 접근 시 signed URL 사용·MIME 검증 서버측 강제
     5. **성능·코드 스멜**:
        - N+1 쿼리, 중복 데이터 fetch, 불필요 hydration
        - Server Component vs Client Component 경계 오용
        - 동적 import·lazy 로딩 가능 지점 미활용
        - 사용되지 않는 `_components/*`·레거시 hook·dead code
     6. **테스트 커버리지**:
        - 신규 도입 스키마·서비스·Server Action 중 테스트 없는 것
        - 기존 테스트가 신 스키마로 이관됐으나 mock 업데이트 누락된 것
     7. **이슈 수집 + 수정 계획 수립**: 위 단계에서 발견한 항목을 우선순위(High/Medium/Low)로 분류. **사용자에게 보고 후 승인받아 범위 확정**.
     8. **실제 수정**: High·Medium 우선 처리. `npm run validate && npm run build` 기준.
     9. **재검증**: 수정한 이슈에 대해 해당 단위 테스트·E2E 스모크·lint·tsc 재확인. 대조표 상태 컬럼 갱신.
   - 서브에이전트 활용 권장:
     - `general-purpose` 또는 `Explore`: Step 별 구현 대조표 병렬 수집
     - `security-auditor`: 4단계(보안·권한) 전담 — Task 6 본 실행 전 **선행 스크리닝** 역할
     - `performance-engineer`: 5단계(성능·코드 스멜) 전담 — Task 5 본 실행 전 **선행 스크리닝** 역할
     - `postgres-pro`: RLS·인덱스·JSONB·RPC 코드 적합성 (Task 5·6 과 겹치지 않는 DB 중심)
   - Task 3.6 과의 관계:
     - **선·후 독립 가능**: Task 3.6 과 병렬로 진행해도 됨. 단 Task 3.6 에서 발견된 이슈 중 "원인이 코드 구조에 있는 것"은 Task 3.7 감사 결과와 교차 검토해 근본 원인 확정.
     - 두 Task 모두 완료 후 수정 PR 을 합치거나, 큰 이슈는 별도 sub-PR 로 분리.
   - 본 Task 는 **사용자 승인 게이트**: 대조표 + 우선순위별 이슈 요약 + 수정 계획을 사용자에게 보고하고 승인받은 뒤 수정 실행.

**Task 4**: `Agent(subagent_type:"test-automator", ...)` 디스패치 — `e2e/workflow/ofa-smoke.spec.ts` 6개 시나리오 (계획서 본문 그대로)

**Task 5**: `Agent(subagent_type:"performance-engineer", ...)` 성능 감사. Critical 발견 시 별도 PR 로 fix

**Task 6**: `Agent(subagent_type:"security-auditor", ...)` 최종 보안 감사 (RLS·트랙 격리·HWPX 인증·Storage signed URL·MIME 검증). Critical 발견 시 즉시 차단·수정. + `mcp__supabase__get_advisors` 로 Supabase advisor 경고 0건 확인.

**Task 7**: 문서 갱신 — 구체 범위:
   - **`docs/ARCHITECTURE.md`**: 트랙 분리 아키텍처 / HWPX 생성 파이프라인 (Node 클라이언트 → Python Function) / 공지 게시판 구조 / HWPX 로컬 브리지 (scripts/dev-hwpx-server.py + next.config.ts rewrites) / 갤러리 통합 쿼리 / 공용 디자인 키트 위치
   - **`docs/RLS.md`**: `pbl_reports`·`pbl_likes`·`notices`·`notice_attachments`·`interview_attachments` 정책 각각 명시 (역할별 SELECT/INSERT/UPDATE/DELETE 매트릭스)
   - **`CLAUDE.md`**: HWPX 로컬 워크플로우·네비 구조·TrackBadge는 Session 10 Step 11 에서 이미 반영됨 → Task 3.6·3.7 결과 기반으로 추가 보완할 것만 수기 추가. 전면 재작성 금지.

**Task 8**: `web-design-guidelines` 스킬로 UI 최종 감사
   - **직전 세션(Session 10 = Step 11 = OFA-11) 변경 체크포인트**:
     - **컨설턴트 네비 구조**가 기존 flat 링크 4개 → 공지사항 flat + 워크스페이스·라이브러리 드롭다운 2개 (OPS 와 동일 패턴). 모바일은 아코디언.
     - 드롭다운 UX: (a) flat 링크 클릭 시 열린 드롭다운 닫힘, (b) `aria-expanded`, (c) Escape 키로 닫기, (d) 바깥 클릭 닫기.
     - 공용 `TrackBadge` (`src/components/ui/TrackBadge.tsx`) 사용 일관성 — 갤러리 카드·프로젝트 테이블·상세 페이지에서 size prop 일관되게 사용.
     - `/test-roadmap`·`/test-pbl` 은 프로덕션 인터뷰 폼과 동일 Step 컴포넌트를 재사용하므로 UI/UX 원칙 자동 준수.
     - HWPX 파일명은 `src/lib/services/export/hwpx/hwpx-filename.ts` 공통 `sanitizeFileNamePart` 로 중앙화.

**Task 9**: `npm run validate && npm run build && npm run test:e2e` 모두 통과 + `.venv-hwpx/bin/pytest api/hwpx/` PASS

**Task 10**: sub-PR + main PR 생성
   a. 본 Step 의 sub-PR 생성·머지: `gh pr create --base feature/official-form-alignment --head feature/ofa-12-final-qa-docs --title "feat(ofa-12): 최종 QA + 문서"`
   b. 배포 체크리스트(§8) 전체 항목 자가 확인 + 사용자 보고
   c. 최종 main PR 생성:
       gh pr create --base main --head feature/official-form-alignment \
         --title "feat(ofa): 산인공 공식 양식 정렬 통합" \
         --body "$(cat <<'EOF'
       ## Summary
       13 Step (Step 6.5 포함) / 153+ Task / 65+ 마이그·신규 파일·UI 컴포넌트.

       산인공 공식 양식 1번(로드맵)·2번(PBL) 100% 정렬 + HWPX 자동 생성 + 공지 게시판.

       ## Test plan
       - [ ] feature 브랜치 Preview에서 운영자/컨설턴트 풀 워크플로우 수동 검증 1주
       - [ ] HWPX 한글 프로그램 검수 3건 이상
       - [ ] Task 3.6 Playwright 회귀 감사 + Task 3.7 코드 레벨 회귀 감사 완료 + High 이슈 0건
       - [ ] performance-engineer·security-auditor 보고서 통과
       - [ ] §8 배포 체크리스트 전부 ✅

       ## 머지 절차
       팀장 직접 승인 필수. 자동 머지 금지.
       프로덕션 마이그 적용 순서: 060 → 061 → 062 → 063 → 064 → 065 → 066.
       (065 = Step 6.5 interview_attachments, 066 = Step 12 legacy 정리)
       EOF
       )"
   d. 본 PR 머지는 사용자(팀장)만 수동 수행. Claude 는 절대 머지하지 않음

=== 자동 진행 vs 승인 요청 경계 (Step 12는 신중) ===
- 자동 진행: Task 1~9 (정리·마이그·E2E·문서) — 단 **Task 3.5·3.6·3.7 는 사용자 승인이 게이트**
- 승인 요청 (즉시 중단):
  - Task 1-a: interview.ts 잔존 import 발견 시 (Session 10 (Step 11) 실측 18 파일 — `consultant/projects/[id]/interview/*` 15 개 + 서비스 3 개; 해당 파일을 먼저 갱신해야)
  - Task 2-a: pbl_course 코드 레퍼런스 선제거 누락 시 (Session 09 실측 src/types/database.ts 포함 5+ 곳 — DROP COLUMN 전 필수)
  - **Task 3.5: HWPX 세부 수정 사용자 피드백 목록 재취합 + 수정 결과 한글 검수 통과 여부** — 사용자가 "OK"할 때까지 다음 Task 진행 금지
  - **Task 3.6: Session 1~10 Playwright 감사 결과 요약 + 수정 계획 보고** — 사용자가 수정 범위에 "OK"할 때까지 실제 수정 시작 금지. High 이슈 미해결 시 Task 4 이후 진행 보류.
  - **Task 3.7: Session 1~10 코드 레벨 감사 대조표 + 수정 계획 보고** — 사용자가 수정 범위에 "OK"할 때까지 실제 수정 시작 금지. Task 3.6 결과와 교차 검토.
  - security-auditor가 Critical 발견 시 (즉시 차단·수정)
  - performance-engineer가 회귀 보고 시
  - mcp__supabase__get_advisors 경고 발생 시
  - 마이그 066 적용 결과가 예상과 다를 때 (065가 아니라 066 — Step 6.5가 065 점유)
  - **Task 10 main PR 생성 직전 사람 최종 확인 필수**

=== Task 종료 보고 양식 ===
✅ Task N 완료
- 변경/검증 결과 1~3줄
- 다음 Task

=== 금지 사항 ===
- gh pr merge --auto, force push, --no-verify
- main에 직접 push 또는 force
- main PR을 사람 승인 없이 머지 (Claude 절대 머지 금지)
- 프로덕션 DB에 마이그 직접 적용 (배포 절차에서 별도 처리)
- 본 세션 종료 후 추가 코드 변경 (Step 12 PR이 마지막 — 변경 사항 발견 시 별도 PR로)

=== 종료 시 ===
0. **[필수] 전체 회귀 테스트 수행** — 모든 구현이 끝난 뒤 기존 기능 회귀 방지를 위해 반드시 실행. 최종 QA 세션이므로 특히 엄격히. 건너뛰기 금지.
   - `npm run validate` (typecheck + lint + unit test 전체)
   - `npm run build` (프로덕션 빌드)
   - `npm run test:e2e` (E2E 전체 — 모든 역할 시나리오)
   - `.venv-hwpx/bin/pytest api/hwpx/` (Python 측 placeholder 테스트 — `api/hwpx/test_placeholders_{roadmap,pbl}.py`)
   - Vercel Preview 배포 후 Playwright MCP 로 스모크 테스트 (Claude 자동 실행 — HWPX 다운로드·로그인·핵심 페이지 도달 확인)
   - 실패 시 원인 분석·수정 후 재실행. 우회·skip 금지.
1. ofa-12 sub-PR 머지 후 main PR 생성 보고
2. 배포 체크리스트 §8 항목별 ✅/❌ 보고
3. main PR URL + Preview URL 보고

=== 사용자에게 전달할 검증 안내 (세션 종료 시 반드시 출력) ===
────────────────────────────────────────
✅ Step 12 완료. main 병합 PR URL: <url>, Vercel Preview URL: <preview-url>

🔴 **본 PR은 프로덕션 반영 전 마지막 관문입니다. 절대 자동 머지 금지.**

**사용자(팀장)가 반드시 확인할 것** (예상 소요: QA 1주):

**(1) 나의 자동 검증 결과 정독** (5분)
- performance-engineer 보고서: Critical 0건인지
- security-auditor 보고서: Critical 0건인지
- mcp__supabase__get_advisors: RLS·성능 경고 0건
- §8 배포 체크리스트 항목별 ✅/❌

**(2) Vercel Preview URL에서 1주간 운영자·컨설턴트 풀 워크플로우 수동 검증**
- ROADMAP 시나리오: 프로젝트 생성 → **인터뷰 6스텝**(개요 Ⅰ + Ⅱ 4스텝 + 확인) → 로드맵 생성 → PDF/XLSX/HWPX 다운로드
- PBL 시나리오: 프로젝트 생성 → **PBL 인터뷰 9스텝**(Ⅰ + Ⅱ-1/2/3 + Ⅲ-1/2/3/4 + 확인) → PBL 보고서 → PDF/XLSX/HWPX 다운로드
- 공지 게시판: 작성·첨부·조회·다운로드
- 갤러리: 트랙 필터·좋아요·공유 + **로드맵 상세에 Ⅰ장 요약·NCS 박스·수립 방법 노출 확인** + **PBL 상세에 Ⅰ~Ⅴ장 전 섹션 노출 확인**

**(3) 한글 파일 실물 검수 3건 이상**
- 실제 기업 샘플 데이터로 HWPX 생성
- 한글 프로그램에서 **산인공 양식 1번(3~12p)·양식 2번(3~17p + 결과보고서) PDF와 겹쳐 비교**
- 조판·표·체크박스·한글 텍스트 품질 확인
- **양식 QA 체크리스트 각 항목을 한글 파일 위에서 ✅ 표기** (로드맵 Ⅰ·Ⅱ·Ⅲ 15개 항목 / PBL Ⅰ·Ⅱ·Ⅲ·Ⅳ·Ⅴ + 결과보고서 20개 항목)
- 실 발급 수준인지 판단

**(4) 프로덕션 환경 준비 확인**
- 프로덕션 Supabase에 마이그 060~066 적용 순서·백업 계획 (065 = interview_attachments, 066 = ofa_cleanup)
- `HWPX_API_SECRET`·`VERCEL_AUTOMATION_BYPASS_SECRET`·`LLM_API_KEY`·`SUPABASE_*` 프로덕션 환경변수 등록
- Storage 버킷 프로덕션 생성: `notice-attachments`, `interview-attachments`
- pg_dump 백업 준비

**(5) 팀장 최종 승인 후 직접 머지**
- GitHub PR 페이지에서 수동으로 "Merge pull request" 클릭
- 자동 머지 스크립트·봇·force push 절대 금지
- 머지 직후 프로덕션 배포 상황 모니터링 (별도 세션 필요)

**저에게 질문으로 대체 가능한 부분**:
> "Step 12 최종 PR의 §8 배포 체크리스트 전부 다시 점검하고 미흡한 항목 보고해줘"
> "security-auditor·performance-engineer 보고서를 한 번 더 정리해서 보여줘"

단, (2) Preview 1주 QA와 (3) 한글 파일 검수는 **사람이 직접** 해야 합니다.

OFA 프로젝트 완료. 추후 변경 사항은 별도 새 계획서로.
────────────────────────────────────────
```
