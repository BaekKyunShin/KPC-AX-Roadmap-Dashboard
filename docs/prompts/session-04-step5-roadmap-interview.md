# Session 04 — Step 5: 로드맵 인터뷰 산인공 양식 재설계

## 세션 목표
마스터 계획서 §4의 **Step 5** (L, 13 Task) 수행. 기존 6스텝 인터뷰를 산인공 문서 1번 양식 기반의 5스텝 위저드(기본/요구분석/과업분석/훈련대상/확인)로 전면 재작성.

## 사전 조건
- Step 2 PR 머지 완료 (`projects.track`, 트랙 분기 가능).
- `feature/official-form-alignment` 최신.
- 기존 인터뷰 컴포넌트 컨벤션 파악: `_components/InterviewClient.tsx`, `Step*.tsx` 접두사, `InterviewStepper.tsx` 재사용, 자동 저장 로직(setTimeout 디바운스 3000ms) — `_hooks/useInterviewAutoSave.ts`로 추출 예정.

## 실행 모드
**subagent-driven-development** — 13 Task. 스텝 컴포넌트 작성·Server Action·E2E가 분리되어 fresh 컨텍스트가 도움.

## 호출 스킬·MCP·서브에이전트
- `superpowers:subagent-driven-development`
- `frontend-guide`, `composition-patterns`, `check-server-action`, `react-best-practices`, `refactoring`
- `superpowers:test-driven-development` (모든 컴포넌트·스키마·액션)
- `web-design-guidelines` (각 스텝 완료 후 자가 점검, Step 12에서 최종 감사)

## 예상 소요
**4~6시간**

## 성공 지표
- [ ] `src/lib/schemas/interview-roadmap.ts` 신규 + 테스트 통과 (4영역 스키마 + autosave 완화 스키마).
- [ ] `src/lib/constants/interview-steps-roadmap.ts` 신규 + `interview-steps.ts` 디스패처 분기 (PBL은 Step 8에서 추가).
- [ ] `_components/RoadmapInterviewClient.tsx` + 3개 신규 스텝(`StepCompanyRequirements`, `StepTaskWorkflowAnalysis`, `StepTrainingTargets`) + 모든 RTL 테스트 통과.
- [ ] `_hooks/useInterviewAutoSave.ts` 추출 (기존 InterviewClient 인라인 로직 → 공용 훅).
- [ ] `interview/page.tsx`에 트랙 분기 (PBL은 placeholder).
- [ ] `actions.ts`의 `saveInterview` — **이름 유지** + 본문에 ROADMAP 트랙 가드 추가 + 신규 스키마 검증 + 기존 컬럼 매핑.
- [ ] `e2e/consultant/interview-roadmap.spec.ts` 통과.
- [ ] `interview.ts`에 `@deprecated` JSDoc만 추가 (실제 삭제는 Step 12).
- [ ] `npm run validate` + `npm run build` 통과.
- [ ] PR `feat(ofa-05): 로드맵 인터뷰 산인공 양식 재설계` 생성.

## 다음 세션 이동 조건
- PR 머지 완료. 다음 → `session-05-step6-roadmap-output.md`.

---

## 복사용 프롬프트

```
=== 컨텍스트 ===
- 프로젝트: KPC AI 훈련 로드맵 대시보드 (/Users/baekkyunshin/Desktop/AI-roadmap-dashboard)
- 마스터 계획서: docs/plans/2026-04-14-official-form-alignment.md
- OFA 프로젝트 **네 번째 세션** — Step 1·2·3·4 모두 머지된 상태
  - Step 1: 메인 브랜치 + hwpx-docgen
  - Step 2: 마이그 060~064 + tracks·status 상수 + 프로젝트 생성 폼 track 필드
  - Step 3: Vercel Python Functions HWPX PoC (api/hwpx/) + ADR
  - Step 4: 공지 게시판 (Navigation 메뉴 추가됨)
- 본 세션: Step 5 (L, 13 Task) — 기존 6스텝 인터뷰를 산인공 양식 기반 5스텝으로 **전면 재작성**

=== 사전 검증 (반드시 첫 번째로 실행) ===
1. cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
2. git fetch origin && git checkout feature/official-form-alignment && git pull
3. git log --oneline -10           → ofa-02·ofa-03·ofa-04 머지 커밋 확인
4. ls supabase/migrations/06{0,1,2,3,4}_*.sql  → 마이그 5개 존재
5. ls src/lib/constants/tracks.ts src/app/(dashboard)/notices/page.tsx  → Step 2·4 산출물 존재
6. ls api/hwpx/generate.py vercel.json  → Step 3 산출물 존재
7. ls src/app/\(dashboard\)/consultant/projects/\[id\]/interview/_components/  → 기존 InterviewClient.tsx + Step* 6개 확인
8. ls src/lib/schemas/interview.ts src/lib/constants/interview-steps.ts  → 본 Step에서 변경 대상
9. npm run validate                → baseline pass

검증 실패 시 즉시 중단. 특히 Step 2·3·4 머지 누락 시 사용자에게 보고.

=== 필수 사전 정독 ===
> 계획서 해당 섹션의 정확한 줄 위치는 `grep -n '^## 0\.\|^### 3-4\.\|^### Step 5:' docs/plans/2026-04-14-official-form-alignment.md` 로 헤더 재확인.

- 계획서 §0: 안전장치
- 계획서 §3-4: UI/UX 재사용 원칙 (모든 스텝 컴포넌트가 준수)
- 계획서 §4 Step 5: 본 세션 13 Task + 기존 자산 준수 블록
- src/app/(dashboard)/consultant/projects/[id]/interview/_components/InterviewClient.tsx — 기존 자동저장 인라인 로직 (이 세션에서 useInterviewAutoSave 훅으로 추출)
- src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts — saveInterview (이 세션에서 본문 변경, 함수명 유지)
- docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf — 산인공 양식 1번 (스키마 도출 기준)

=== 핵심 자산 요약 ===
- 컨테이너 컨벤션: _components/RoadmapInterviewClient.tsx (기존 InterviewClient.tsx와 평행 신규, 기존 삭제 X — Step 12에서 정리)
- 스텝 컨벤션: Step* 접두사, _components/roadmap/ 서브폴더
- InterviewStepper.tsx 재사용 (기존 파일)
- useInterviewAutoSave 훅 신규 추출 (기존 InterviewClient 인라인 로직 디바운스 3000ms)
- saveInterview 함수: 이름 유지 + projects.track === 'ROADMAP' 가드 + roadmapInterviewSchema 검증
- 본 Step에서 마이그레이션 추가 금지 (interviews.roadmap_data 별도 컬럼 옵션은 Step 12로 위임)

진행 원칙:
1. feature/official-form-alignment에서 git pull 후 feature/ofa-05-interview-roadmap 브랜치 생성
2. 모든 스키마·컴포넌트는 TDD (RED → Verify RED → GREEN → Verify GREEN)
3. saveInterview 함수는 이름 유지 + 내부에 projects.track === 'ROADMAP' 가드 추가 (PBL 트랙은 Step 8에서 savePBLInterview 신규)
4. 본 Step에서 신규 마이그레이션 추가 금지 (interviews.roadmap_data 별도 컬럼 같은 옵션은 Step 12 마이그 065로 위임)
5. 모든 UI Task는 §3-4 공통 UI/UX 재사용 원칙 준수 (Skeleton·shadcn 강제·sonner 토스트·field-error·접근성)
6. composition-patterns 스킬로 동적 배열 컴포넌트(StepTaskWorkflowAnalysis, StepTrainingTargets) 공통 Wrapper 추출 검토
7. interview.ts에 @deprecated JSDoc 추가 (실제 삭제는 Step 12에서 의존성 감사 후)
8. e2e/consultant/interview-roadmap.spec.ts 신규 작성 (test-automator 서브에이전트 활용 가능)

서브에이전트 활용 예시 Task:
- Task 6·7·8 (3개 스텝 컴포넌트) → 각각 fresh subagent 디스패치
- Task 11 (Server Action 수정) → check-server-action 스킬 호출하는 subagent
- Task 12 (E2E) → test-automator 서브에이전트

=== 자동 진행 vs 승인 요청 경계 ===
- 자동 진행: 13 Task 전체. TDD·UI 작성·E2E 자율.
- 승인 요청 (즉시 중단):
  - saveInterview 본문 변경이 기존 호출부(InterviewClient, 테스트) 회귀를 일으킬 때
  - composition-patterns 검토 결과 추상화가 과도해 보일 때 (예: BaseInterviewClient 추출이 두 트랙에 적합하지 않을 때)
  - 자동 저장 디바운스 시간 변경 필요 판단 시
  - interview.ts 의존성 grep에서 잔존 import 발견 시 (Step 12에서 처리해야 하지만 본 Step에서 만지면 안 됨)

=== Task 종료 보고 양식 ===
✅ Task N 완료
- 신규/변경 파일: 1~3개
- TDD 사이클: RED→GREEN→REFACTOR 결과 1줄
- 테스트: npm run test 결과
- 다음 Task 진행

=== 금지 사항 ===
- 마이그레이션 신규 추가 (Step 12 마이그 065로 위임)
- interview.ts 파일 삭제 (Step 12에서)
- saveInterview 함수명 변경 (이름 유지 + 본문 가드 추가)
- 기존 Step* 컴포넌트(StepBasicInfo 등) 삭제 (Step 12에서)
- React Hook Form 도입 (Zod + native HTML 폼 유지)

=== 종료 시 ===
1. superpowers:verification-before-completion (npm run validate && npm run build && npm run test:e2e)
2. interview-roadmap.test.ts·useInterviewAutoSave.test.ts·각 스텝 컴포넌트 테스트 결과 보고
3. gh pr create --base feature/official-form-alignment --title "feat(ofa-05): 로드맵 인터뷰 산인공 양식 재설계"
4. PR URL 보고. 자동 머지 금지.

=== 사용자에게 전달할 검증 안내 (세션 종료 시 반드시 출력) ===
────────────────────────────────────────
✅ Step 5 완료. PR URL: <url>

**사용자가 확인할 것** (예상 10분, localhost):

1. `npm run dev` → http://localhost:3000
2. 운영자로 로그인 → ROADMAP 트랙 프로젝트 1건 생성 → 컨설턴트에게 배정
3. 컨설턴트로 로그인 → 배정된 프로젝트 → 인터뷰 화면 진입
4. **인터뷰 5스텝** 확인:
   - Step 1: 기본 정보·참석자
   - Step 2: 기업 요구분석 (4필드)
   - Step 3: 과업·워크플로우 분석표 (행 추가 가능)
   - Step 4: 훈련대상 과업 선정 (행 추가 가능)
   - Step 5: 확인·제출
5. 각 스텝 작성 → "다음" 이동 → 마지막 "제출" → 프로젝트 상태 INTERVIEWED로 전환
6. 중간에 새로고침 → 자동 저장된 draft 복원 확인

**저에게 질문으로 대체 가능**:
> "Step 5 PR의 모든 성공 지표 검증해줘"

localhost 동작 OK면 → PR Squash and Merge → 새 세션 session-05.
────────────────────────────────────────
```
