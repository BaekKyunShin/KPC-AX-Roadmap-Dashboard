# Session 11 — Step 12: 최종 QA · 문서 · 배포 점검 + main 머지

## 세션 목표
마스터 계획서 §4의 **Step 12** (M, 10 Task) 수행 + **`feature/official-form-alignment` → `main` 최종 PR 1회**. 마이그레이션 065(legacy 정리), E2E 스모크, 성능·보안 감사, **산인공 양식 1번·2번 1:1 정합성 전수 검증**, 문서 갱신, 배포 체크리스트 통과.

## 사전 조건
- Step 1~11 **+ Step 6.5** 모든 PR이 `feature/official-form-alignment`에 머지됨.
- `feature/official-form-alignment` 최신 + `npm run validate && npm run build` 통과.
- Vercel "Production Branch = main" 단일 고정 재확인 (§0 안전장치 (c)).
- 사람 승인 받을 준비 (마지막 main 머지 PR은 팀장 직접 승인 필수).

## 실행 모드
**subagent-driven-development** — 10 Task. 마이그·E2E·성능 감사·보안 감사·문서 갱신·UI 감사 모두 분리된 specialist.

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
**4~6시간** (감사 결과 대응 시간 별도)

## 성공 지표
- [ ] `interview.ts` 의존성 grep 결과 0건 → 파일 삭제 + `npm run typecheck` 회귀 0.
- [ ] `supabase/migrations/066_ofa_cleanup.sql` 작성 + 적용 (**065는 Step 6.5의 `065_add_interview_attachments.sql`가 점유** — 본 Step는 **066**을 사용):
  - `roadmap_versions.pbl_course` DROP COLUMN (chk_pbl_course_size CASCADE 동반 제거 주석 명시)
  - audit/RPC는 마이그 061에서 이미 추가됨 — 본 마이그 추가 항목 0 가능
  - `mcp__supabase__apply_migration` 적용 → `mcp__supabase__list_migrations`로 066 반영 검증
- [ ] `src/app/api/hwpx-test/route.ts` 제거 (PoC 일회성).
- [ ] `e2e/workflow/ofa-smoke.spec.ts` 6개 시나리오 작성 + 통과.
- [ ] performance-engineer 보고서 (번들 사이즈·인터뷰 위저드 렌더·HWPX 콜드스타트·갤러리 통합 쿼리) — Critical 0건.
- [ ] security-auditor 보고서 (트랙 격리·HWPX_API_SECRET 동작·Storage signed URL·MIME 검증) — Critical 0건.
- [ ] `mcp__supabase__get_advisors` 결과: RLS·성능 경고 0건.
- [ ] 문서 갱신: `docs/ARCHITECTURE.md`·`docs/RLS.md`·`CLAUDE.md` (필요 시).
- [ ] `web-design-guidelines` 스킬 최종 UI 감사 통과.
- [ ] **Step 8(Session 7) UI/UX 원칙 일관 적용 확인** (무작위 5페이지 샘플링):
  - 모든 폼 필드 `FormField` 래핑
  - **인터뷰 단계에 한해** 양식 작성 가이드 `GuideNote` 섹션 **하단** 배치 (산출물은 LLM 생성이라 해당 없음)
  - 텍스트 입력 Grid 2열 이하
  - 양식 원문 1:1 라벨 매칭
- [ ] `npm run validate && npm run build && npm run test:e2e` 모두 통과.
- [ ] **산인공 양식 1번 QA 체크리스트** (계획서 §4 Step 12) 전 항목 ✅ — 로드맵 HWPX 실물 3건 이상 한글 프로그램에서 양식 PDF와 겹쳐 비교, 부제 라벨·NCS 박스·수립 방법·매트릭스 단순 표 전환 모두 확인.
- [ ] **산인공 양식 2번 QA 체크리스트** 전 항목 ✅ — PBL HWPX 실물 3건 이상, Ⅰ~Ⅴ장 + 결과보고서(수행일지) 전 섹션 + 교과목 프로파일 강사투입시간 합=훈련시간 + 결과평가 4종 설문 문항 수 고정 (5/3/5/4) 확인.
- [ ] 배포 체크리스트(§8) 모든 항목 ✅:
  - 환경변수 (`HWPX_API_SECRET` 포함) 등록 확인
  - Storage 버킷 프로덕션 생성
  - 마이그레이션 적용 순서 (060→061→062→063→064→065)
  - pg_dump 백업 준비
- [ ] PR `feat(ofa): 산인공 공식 양식 정렬 통합` (base = `main`) 생성 — **팀장 직접 승인 + 머지 = 사람만 가능, Claude 자동 머지 절대 금지**.

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
- 본 세션: Step 12 (M, 10 Task) + **feature/official-form-alignment → main 최종 PR 1회**
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
7. ls api/hwpx/_hwpx_helpers.py api/hwpx/_placeholders_roadmap.py api/hwpx/_placeholders_pbl.py  → Python 측 3파일
8. ls src/components/roadmap/shared/  → Step 6.5 공용 디자인 키트
9. ls src/app/\(dashboard\)/notices src/app/\(dashboard\)/test-pbl  → 신규 라우트
10. grep -rn "schemas/interview['\"]\\|from '@/lib/schemas/interview'" src/ e2e/  → interview.ts 잔존 import 사전 감사 (Task 1 전제)
11. mcp__supabase__list_migrations  → 060~065 모두 적용 + **066 미적용** 확인
12. mcp__supabase__get_advisors  → 현재 advisor 경고 상태 baseline
13. echo $HWPX_API_SECRET || vercel env ls | grep HWPX  → 환경변수 등록 확인
14. npm run validate && npm run build && npm run test:e2e  → baseline 통과

검증 실패 시 즉시 중단. Step 1~11 + 6.5 미머지·잔존 import 발견 시 사용자 보고.

=== 필수 사전 정독 ===
> 계획서에서 해당 섹션은 `grep -n '^## 0\.\|^### Step 12:\|^## 6\.\|^## 7\.\|^## 8\.' docs/plans/2026-04-14-official-form-alignment.md` 로 정확한 줄 위치 찾아 Read.

- 계획서 §0: 안전장치 (a)~(d) — 본 세션이 이 보장의 최종 게이트
- 계획서 §4 Step 12: 본 세션 10 Task + 마이그 **066** (065는 Step 6.5가 점유)
- 계획서 §6: 리스크 매트릭스 — 마지막 한 번 검토
- 계획서 §7: 롤백 전략
- 계획서 §8: 배포 체크리스트 — 본 세션이 모든 항목 ✅화

=== §0 안전장치 재확인 (절대 위반 금지) ===
- (a) 본 Step 마지막 PR만 base=main. 그 외 PR 없음
- (b) main 머지는 §8 체크리스트 통과 후
- (c) Vercel Production Branch = main 단일 고정 재확인 (Vercel 대시보드 → Settings → Git → Production Branch 직접 확인. `vercel inspect`는 부적합)
- (d) main PR은 팀장 직접 승인. Claude 자동 머지·force push 금지

진행 원칙:
1. feature/ofa-12-final-qa-docs 브랜치
2. Task 1 (interview.ts 삭제):
   - 먼저 grep -rn "schemas/interview['\"]|from '@/lib/schemas/interview'" src/ e2e/ 로 잔존 import 감사
   - 잔존 0이면 삭제 + npm run typecheck && npm run test 회귀 0 확인
3. Task 2 (마이그 **066** — 065는 Step 6.5가 점유):
   - 파일명: supabase/migrations/**066_ofa_cleanup.sql**
   - roadmap_versions.pbl_course DROP COLUMN (chk_pbl_course_size CHECK 제약은 DROP COLUMN으로 자동 제거 — 주석 명시)
   - audit_action ENUM 추가 항목은 마이그 061에서 이미 처리됨 — 본 마이그에서 발견된 추가 값만 (없으면 빈 블록)
   - finalize_pbl RPC도 마이그 061에서 처리됨
   - mcp__supabase__apply_migration로 적용 + mcp__supabase__list_migrations 로 066 반영 검증
   - src/types/database.ts는 **수동 편집 파일** — generate_typescript_types 전체 덮어쓰기 금지. enum 확장분(있으면)만 수기 병합
4. Task 3: src/app/api/hwpx-test/route.ts 제거 (PoC 일회성)
5. Task 4: Agent(subagent_type:"test-automator", ...) 디스패치 — e2e/workflow/ofa-smoke.spec.ts 6개 시나리오 (계획서 본문 그대로)
6. Task 5: Agent(subagent_type:"performance-engineer", ...) 성능 감사. Critical 발견 시 별도 PR로 fix
7. Task 6: Agent(subagent_type:"security-auditor", ...) 최종 보안 감사 (RLS·트랙 격리·HWPX 인증·Storage signed URL·MIME 검증). Critical 발견 시 즉시 차단·수정
8. Task 7: 문서 갱신 (ARCHITECTURE.md·RLS.md·CLAUDE.md). 트랙 분리·HWPX·게시판 구조 반영
9. Task 8: web-design-guidelines 스킬로 UI 최종 감사
10. Task 9: npm run validate && npm run build && npm run test:e2e 모두 통과
11. Task 10:
    a. 본 Step의 sub-PR 생성·머지 (gh pr create --base feature/official-form-alignment --title "feat(ofa-12): 최종 QA + 문서")
    b. mcp__supabase__get_advisors로 RLS·성능 경고 0건 확인
    c. 배포 체크리스트(§8) 전체 항목 자가 확인 + 사용자 보고
    d. 최종 main PR 생성:
       gh pr create --base main --head feature/official-form-alignment \
         --title "feat(ofa): 산인공 공식 양식 정렬 통합" \
         --body "$(cat <<'EOF'
       ## Summary
       13 Step (Step 6.5 포함) / 153+ Task / 65+ 마이그·신규 파일·UI 컴포넌트.

       산인공 공식 양식 1번(로드맵)·2번(PBL) 100% 정렬 + HWPX 자동 생성 + 공지 게시판.

       ## Test plan
       - [ ] feature 브랜치 Preview에서 운영자/컨설턴트 풀 워크플로우 수동 검증 1주
       - [ ] HWPX 한글 프로그램 검수 3건 이상
       - [ ] performance-engineer·security-auditor 보고서 통과
       - [ ] §8 배포 체크리스트 전부 ✅

       ## 머지 절차
       팀장 직접 승인 필수. 자동 머지 금지.
       프로덕션 마이그 적용 순서: 060 → 061 → 062 → 063 → 064 → 065 → 066.
       (065 = Step 6.5 interview_attachments, 066 = Step 12 legacy 정리)
       EOF
       )"
    e. 본 PR 머지는 사용자(팀장)만 수동 수행. Claude는 절대 머지하지 않음

=== 자동 진행 vs 승인 요청 경계 (Step 12는 신중) ===
- 자동 진행: Task 1~9 (정리·마이그·E2E·문서)
- 승인 요청 (즉시 중단):
  - Task 1: interview.ts 잔존 import 발견 시 (해당 파일을 먼저 갱신해야)
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
   - pytest (Python 측 테스트)
   - Vercel Preview 배포 후 스모크 테스트
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
- `HWPX_API_SECRET` 프로덕션 환경변수 등록
- `notice-attachments` Storage 버킷 프로덕션 생성
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
