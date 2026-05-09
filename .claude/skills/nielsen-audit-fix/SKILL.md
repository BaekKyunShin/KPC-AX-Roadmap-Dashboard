---
name: nielsen-audit-fix
description: docs/reports/의 Nielsen 휴리스틱 감사 보고서가 선별한 CRITICAL 이슈 N개를 일괄 해결한다. 텍스트+ASCII mockup 일괄 검토 → 새 브랜치 → 플랜 모드 계획서 → TDD 구현 → 보고서 archive 이동 → PR → Preview URL 즉시 안내·사용자 검토 게이트 → CI 7분 루프 → main 머지 → main CI 7분 루프까지 완주. "감사 보고서 해결", "휴리스틱 이슈 고쳐줘", "감사 결과 반영", "Nielsen 보고서대로 고쳐줘", "/nielsen-audit-fix" 요청 시 사용한다.
user-invocable: true
argument-hint: [보고서 경로?]
---

# Nielsen 휴리스틱 감사 보고서 일괄 해결

$ARGUMENTS(보고서 경로) 또는 `docs/reports/`의 가장 최근 `*-nielsen-heuristics-audit.md`를 대상으로, 보고서가 선별한 CRITICAL 이슈 N개를 한 번에 해결하고 main 머지·CI 통과까지 완주한다.

본 스킬은 `nielsen-audit`(보고서 작성)의 후속 페어다. 보고서가 없으면 먼저 `nielsen-audit` 실행 안내.

---

## 산출물

- 새 브랜치: `fix/nielsen-audit-YYYY-MM-DD` (동일 일자 충돌 시 `-v2`, `-v3`…)
- 이슈별 커밋 (한국어, 타입 `fix:`)
- 보고서 이동: `docs/reports/<file>.md` → `docs/reports/archive/<file>.md`
- PR: 제목 `fix: Nielsen 휴리스틱 N건 해결` (squash merge 대상)
- main 머지 + main CI 모든 check pass

---

## 작업 절차 (7 Phase)

### Phase 0 — 보고서 식별

1. `$ARGUMENTS` 가 있으면 그 경로 사용
2. 없으면 `ls docs/reports/ | grep nielsen-heuristics-audit | sort | tail -1` 로 가장 최근 자동 선택
3. 후보가 0건이면 "먼저 `/nielsen-audit` 으로 보고서를 생성하세요" 안내 후 종료
3-A. 보고서를 파싱해 `### #N [★+ H? ...] 제목` 패턴 매칭. **매칭 0건이면 다음 안내 후 종료** (Phase 1 이후 진입 금지):

     ```text
     ✅ 보고서 확인 완료

     📄 docs/reports/<file>.md
        본 보고서는 CRITICAL 이슈 0건입니다 — 해결할 항목이 없습니다.

     다음 단계:
       ① 다른 영역으로 새 감사 (/nielsen-audit <영역>)
       ② 보고서 archive로 이동 후 작업 종료
          (`git mv docs/reports/<file>.md docs/reports/archive/<file>.md`)
     ```

4. `git log --oneline -20` 으로 최근 PR에서 이미 해결된 이슈가 있는지 식별 (보고서 이슈와 대조해 자동 제외 후보로 표시)
5. 보고서 각 이슈의 4단에 **`[이전]` / `[이후]` ASCII mockup 두 블록** 이 첨부됐는지 확인. 누락된 이슈가 있으면 사용자에게 안내: 「#N 이슈에 ASCII mockup 이 누락됐습니다. `/nielsen-audit` 재실행 또는 보고서 직접 보강을 권장합니다.」

### Phase 1 — 일괄 검토 사이클 (수정 요청 0건이 될 때까지 반복)

보고서를 파싱해 `### #N [★+ H?] 제목` 형식 (별점 ★~★★★★★, 1~5개 가변)의 모든 이슈를 추출하고, **N개 모두를 한 화면에 일괄 표시**한 뒤 사용자 합의가 완전히 끝날 때까지 사이클을 반복한다. 합의가 끝나야 Phase 2(코드 구현)로 넘어간다.

#### 1-A. 일괄 표시 (텍스트 5줄 + ASCII mockup 발췌)

각 이슈를 다음 형식으로 사용자 관점 압축 (개발자 용어 금지, 메뉴명·실제 노출 라벨 사용):

````text
#N [{보고서 별점 그대로} H{번호} {휴리스틱명}] {제목}
   현재: {사용자가 막히는 상황 — 1문장}
   개선 후: "{실제 노출될 라벨}" {플로우 변화 — 1문장}
   변경: {파일 경로} (재사용: {자산 명} | 신규: {사유 1줄})

   [이전]
   ```
   {보고서 4단에서 가져온 [이전] ASCII 블록 그대로}
   ```

   [이후]
   ```
   {보고서 4단에서 가져온 [이후] ASCII 블록 그대로}
   ```
````

ASCII mockup 발췌는 보고서 4단의 두 블록을 **그대로 인용**한다 (변형 금지). **수정 사이클이 반복돼도 매번 N개 전체를 다시 표시**한다 (1개씩 차례차례 묻지 않는다).

#### 1-B. 일괄 질문

`AskUserQuestion` 으로 다음 옵션 (워딩 고정):

- **그대로 진행** — N개 전체를 현 보고서 그대로 해결. Phase 2 로 이동
- **특정 항목 수정** — 어느 이슈를 어떻게 바꿀지 후속 자유 텍스트 입력
- **취소** — 작업 중단

⛔ **1개씩 승인 받지 말 것.** 매번 N개 전체를 한 번에 보여주고 한 번에 묻는다. 사용자 메모리 규칙: "UI/UX 변경은 사용자 관점 사전 승인 필수 — 추상적 옵션 금지" — ASCII mockup 의 [이전]/[이후] 두 블록이 이 규칙의 시각 자료를 충족한다.

#### 1-C. "특정 항목 수정" 선택 시 처리

1. 사용자에게 자유 텍스트로 수정 내역을 받는다 (한 번에 여러 이슈도 가능):
   - 예: "#2 의 토스트 문구를 「24시간 이내 검토」로 바꿔줘. #4 는 모달 대신 인라인 안내로."
2. 수정 대상 이슈마다 **보고서 4단을 갱신** (옵션 A — 진실의 원천 단일):
   - `docs/reports/{date}-nielsen-heuristics-audit.md` 의 해당 이슈 「사용자 관점 개선 후」 단의 따옴표 라벨·플로우 묘사
   - **ASCII mockup 두 블록도 함께 갱신** — 변경된 라벨·배치를 반영
   - 본문 라벨과 ASCII 블록 안 라벨이 정확히 일치하는지 grep 검증 (예: `grep "24시간 이내 검토" docs/reports/...`)
3. 변경된 이슈가 다른 이슈와 의존(예: 공용 컴포넌트 변경)이 있으면 그 이슈도 함께 갱신
4. 사용자에게 안내:
   - 「✅ #2, #4 보고서·ASCII mockup 갱신 완료. 변경된 내용을 다시 확인해주세요.」
5. **1-A 단계로 회귀** — N개 전체를 다시 일괄 표시 → 1-B 일괄 질문 반복

#### 1-D. 사이클 종료 조건

사용자가 **그대로 진행**을 선택할 때만 Phase 2 로 넘어간다. 사이클 횟수에 상한은 없다 — 사용자가 만족할 때까지 반복.

수정 사이클이 5회 초과 시 사용자에게 한 번 안내: 「현재 N회째 수정 사이클입니다. 보고서 자체를 재작성하는 게 빠를 수도 있습니다 — `/nielsen-audit` 재실행도 검토해보세요. 계속 진행하시려면 다시 수정 요청을 주시면 됩니다.」 (안내만, 강제 종료 X)

### Phase 2 — 브랜치 생성 + 플랜 모드 + 계획서 작성

1. `git checkout main && git pull`
2. `git checkout -b fix/nielsen-audit-YYYY-MM-DD` (today 명령으로 자동 치환, 충돌 시 `-v2`)
3. `superpowers:writing-plans` 스킬 호출 → `EnterPlanMode` 진입
4. 계획서 저장: `docs/plans/YYYY-MM-DD-nielsen-audit-fix.md`
5. 계획서 구조:
   - **메타** — 보고서 경로·브랜치명·이슈 수·누적 추정 시간
   - **이슈 #N 별 섹션** — 변경 파일(재사용 자산 우선) / 테스트 시나리오(Vitest unit + Playwright E2E 필요 여부) / 호출할 스킬·에이전트(아래 매칭표 참조) / 검증 명령
   - **구현 순서** — 의존 관계 고려, 독립 이슈는 병렬 가능 표시
   - **롤백 시나리오** — 각 이슈가 깨졌을 때 단독 revert 가능 여부

**영역 매칭표 (계획서 작성·실행 시 호출할 스킬/에이전트):**

| 변경 위치 | 호출 대상 |
|---|---|
| `src/app/**/*.tsx` (UI) | `frontend-guide`(shadcn/ui 우선), `composition-patterns`, `react-best-practices`, `web-design-guidelines` |
| `actions.ts` (Server Action) | `check-server-action` |
| `supabase/migrations/*` | `supabase-dev` + `mcp__supabase__apply_migration` + `list_migrations` 검증 |
| `src/types/database.ts` 갱신 | 수동 편집 (메모리 규칙: gen types로 덮어쓰기 금지) |
| 테스트 작성 | 서브에이전트 `test-automator` |
| DB 쿼리·인덱스 | 서브에이전트 `postgres-pro` |
| RLS·인증·역할 | 서브에이전트 `security-auditor` |
| 번들·SC/CC 경계·Realtime | 서브에이전트 `performance-engineer` |
| LLM 프롬프트 | 서브에이전트 `prompt-engineer` |

### Phase 3 — TDD 구현

`superpowers:executing-plans` + `superpowers:test-driven-development` 호출.

이슈 ≥ 3개 & 의존 없음 → `superpowers:subagent-driven-development` 로 병렬 처리.

각 이슈마다 **RED → GREEN → REFACTOR**:

1. **RED** — 실패하는 테스트 먼저 작성 (Vitest 또는 Playwright). 보고서의 "사용자 시나리오" 를 그대로 테스트 케이스로 변환
2. **GREEN** — 최소 구현으로 테스트 통과. 컴포넌트 결정은 다음 우선순위 엄수:
   1. **보고서 「재사용 가능 자산」 표** (`EmptyState`/`AlertDialog`/`PageSkeleton`/`showSuccessToast 등`/`ActionResult`/`FilterBadge`) ← 최우선
   2. **`src/components/ui/`** — 이미 설치된 shadcn 기본 + 커스텀 공용 (button, card, dialog, alert-dialog, badge, table, page-header, form-field, field-error 등)
   3. **shadcn 레지스트리** — 미설치 컴포넌트는 `npx shadcn@latest add <name>` 으로 추가 (Radix 기반·접근성 보장)
   4. **신규 작성** — 위 셋 중 어느 것도 부합하지 않을 때만. 사유를 커밋 메시지·PR 본문·Phase 1 승인 라인에 명시
3. **REFACTOR** — `superpowers:refactoring` 패턴 적용

이슈 단위 커밋 (한국어):

```text
fix: H{번호} {짧은 한국어 제목}

- {변경 요약}
- 재사용: {자산 경로} | 신규: {사유} ← 둘 중 해당 항목 선택
- 테스트: {새 테스트 파일·케이스 수}
```

**이슈별 완료 기준:**
- 새 테스트 추가 + 통과
- 기존 테스트 회귀 없음
- `superpowers:verification-before-completion` 통과

**전체 완료 후 (브랜치 푸쉬 직전):**

1. `npm run validate && npm run build` 모두 pass 확인
2. **보고서 archive 이동 + 단독 커밋**:

```bash
mkdir -p docs/reports/archive
git mv docs/reports/<file>.md docs/reports/archive/<file>.md
git commit -m "docs: Nielsen 감사 보고서 아카이브 (N건 해결 완료)"
```

3. (선택) `superpowers:requesting-code-review` 로 자체 리뷰 → 이슈 발견 시 `receiving-code-review` 로 보강 후 추가 커밋

### Phase 4 — 푸쉬 + PR 생성

```bash
git push -u origin fix/nielsen-audit-YYYY-MM-DD
```

```bash
gh pr create --title "fix: Nielsen 휴리스틱 N건 해결" --body "$(cat <<'EOF'
## 요약

`docs/reports/archive/YYYY-MM-DD-nielsen-heuristics-audit.md` 의 CRITICAL N건 해결.

## 해결 이슈

- [#1] H{번호} {제목} — {1줄 요약}
- [#2] H{번호} {제목} — {1줄 요약}
- ...

## 검증

- [x] `npm run validate`
- [x] `npm run build`
- [x] 신규 테스트 N건 추가 (Vitest M / Playwright K)
- [x] 보고서 archive 이동
- [x] 임시 우회·skip 0건

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Phase 5 — Preview URL 즉시 안내 + CI 백그라운드 모니터링

PR 생성 직후 **두 흐름을 동시 시작**한다:

#### 5-A. Preview URL 추출 + 사용자 안내 (즉시)

PR 생성 후 1~2분 내 Vercel 봇이 코멘트로 Preview URL을 단다. 폴링으로 추출:

```bash
# Vercel 봇 코멘트에서 Preview URL 추출 (최대 3분 폴링)
for i in 1 2 3 4 5 6; do
  url=$(gh pr view <PR번호> --json comments --jq '.comments[] | select(.author.login | startswith("vercel")) | .body' | grep -oE 'https://[a-z0-9-]+\.vercel\.app[^ )]*' | head -1)
  if [ -n "$url" ]; then echo "$url"; break; fi
  sleep 30
done
```

추출 성공 시 사용자에게 다음 한 줄로 안내 (라벨 고정):

```text
🔗 Preview URL: https://<preview>.vercel.app

   ※ Vercel 빌드 완료 후 접속 가능합니다 (보통 2~5분).
   ※ 변경된 화면을 직접 보고 ① 머지 진행 ② 추가 수정 ③ 취소를 선택해주세요.
```

추출 실패(3분 폴링 후에도 코멘트 없음) 시 fallback 안내:

```text
⚠️ Preview URL을 자동 추출하지 못했습니다.
   PR 페이지에서 Vercel 봇 코멘트를 직접 확인해주세요:
   https://github.com/{org}/{repo}/pull/<PR번호>
```

#### 5-B. 사용자 검토 게이트

`AskUserQuestion` 으로 (워딩 고정):

- **머지 진행** — Preview 확인 완료. CI 통과 시 main 머지로 진행
- **추가 수정** — 어떤 항목을 어떻게 바꿀지 후속 자유 텍스트
- **취소** — PR 닫기 후 작업 중단

#### 5-C. CI 백그라운드 모니터링 (옵션 B — 즉시 안내 + 동시 진행)

Preview 안내와 **동시에** CI 7분 루프 시작:

```text
/loop 7m gh pr checks <PR번호> --json name,state,conclusion
```

**CI 통과 판정 (엄격, 사용자 메모리 규칙):**

다음 모든 check 의 `conclusion === "SUCCESS"` 일 때만 통과:

- Lint & Typecheck
- Unit Test
- Build
- **E2E Test** ← Unit Test 만 보고 단정 금지 (가장 마지막 job)
- Vercel (Preview 배포)

⛔ exit code 0 ≠ 모든 pass. **JSON 파싱이 정답.**

#### 5-D. 사용자 응답 처리

**「머지 진행」** 선택 시:

- CI 모든 check `SUCCESS` 확인되면 즉시 Phase 6 (main 머지)
- CI 미완료면 7분 루프 계속, pass 후 Phase 6
- CI 실패면 Phase 5-E 사이클 진입

**「추가 수정」** 선택 시:

1. 사용자 자유 텍스트 받음
2. 같은 브랜치에 추가 커밋 (TDD 유지: 필요 시 테스트 갱신 → 구현 → 검증)
3. `git push` → 새 Preview URL 자동 재배포
4. **Phase 5-A 로 회귀** — 새 Preview URL 추출 → 안내 → 검토 게이트 재시작
5. CI도 자동으로 재실행됨

**「취소」** 선택 시:

```bash
gh pr close <PR번호>
git checkout main && git branch -D fix/nielsen-audit-YYYY-MM-DD
```

작업 중단. 보고서는 archive에 남고, 다시 `/nielsen-audit-fix` 로 재시작 가능.

#### 5-E. CI 실패 사이클 (4단계, 통과까지 반복)

1. **근본 원인 분석** — `superpowers:systematic-debugging` 호출. `gh run view <runId> --log-failed` 로 실패 로그 추적. 실패 테스트 파일·라인까지 특정
2. **해결 계획 수립** — 필요 시 추가 `superpowers:writing-plans` (작은 변경이면 인라인)
3. **문제 해결** — TDD 유지 (실패 테스트 먼저 → 수정 → 통과). **임시 우회 금지** (메모리 규칙):
   - ❌ `test.skip`, `it.skip`, `--skip`
   - ❌ 예산·임계값·timeout 상향
   - ❌ E2E 비활성화
   - ✅ 근본 원인 해결만
4. **검증** — `superpowers:verification-before-completion` → 푸쉬 → 루프 재개 (새 Preview URL도 재추출해 사용자에게 안내)

**3사이클 동일 check 재실패 시:** 사용자에게 보고하고 일시 정지. "동일 원인 3회 실패 — 다음 시도 전 검토 필요" 안내.

### Phase 6 — main 머지

**전제 조건:** 사용자 「머지 진행」 응답 + CI 모든 check `SUCCESS`. **둘 다 충족해야** 진행.

```bash
gh pr merge <PR> --squash --delete-branch
git checkout main && git pull
git branch -d fix/nielsen-audit-YYYY-MM-DD  # 로컬 브랜치 정리
```

### Phase 7 — main CI 7분 루프 모니터링

main 의 GitHub Actions + Vercel 프로덕션 배포 모니터링:

```text
/loop 7m gh run list --branch main --limit 1 --json status,conclusion,name
```

또는 squash merge 후에도 PR check 결과 조회 가능:

```text
/loop 7m gh pr checks <머지된PR번호>
```

**main CI 실패 시:**

main 직접 커밋 금지 (메모리 규칙) → 핫픽스 브랜치 분기:

1. `git checkout -b fix/nielsen-audit-hotfix-YYYY-MM-DD`
2. Phase 5-E 의 4단계 사이클 (근본 원인 → 계획 → 해결 → 검증)
3. 새 PR → Preview 안내·CI 통과 → squash merge
4. main 으로 복귀 → 다시 7분 루프

**모든 check pass 시 작업 완료** — 사용자에게 다음 보고:

- 머지된 PR 번호·링크
- 해결한 이슈 N건 목록 (H 번호 + 제목)
- 추가 테스트 수 (Vitest/Playwright)
- 보고서 archive 경로
- 총 소요 시간·CI 사이클 횟수·Preview 검토 사이클 횟수

---

## 활용 스킬·에이전트·MCP 종합

**Superpowers 스킬:**

| 스킬 | 호출 시점 |
|---|---|
| `using-superpowers` | SessionStart 자동 |
| `writing-plans` | Phase 2 |
| `executing-plans` | Phase 3 |
| `test-driven-development` | Phase 3 (이슈마다 RED→GREEN→REFACTOR) |
| `subagent-driven-development` | Phase 3 (이슈 ≥ 3개 & 독립) |
| `systematic-debugging` | Phase 5-E·7 CI 실패 시 |
| `verification-before-completion` | 모든 완료 시점 |
| `requesting-code-review` / `receiving-code-review` | Phase 3 말미 자체 리뷰 |
| `loop` | Phase 5-C·7 CI 폴링 |
| `refactoring` | Phase 3 REFACTOR 단계 |

**프로젝트 스킬:**

- `frontend-guide` — UI 변경 시 필수
- `check-server-action` — Server Action 변경 시 필수
- `supabase-dev` — DB 변경 시 필수
- `nielsen-audit` — 보고서 포맷 참조 (ASCII mockup 의무)

**전역 스킬:**

- `composition-patterns`, `react-best-practices`, `web-design-guidelines`

**서브에이전트 (`.claude/agents/`):** `test-automator`, `security-auditor`, `postgres-pro`, `performance-engineer`, `prompt-engineer`

**MCP:**

- `mcp__supabase__apply_migration` / `list_migrations` — DB 마이그
- `mcp__serena__*` — 시맨틱 코드 탐색·심볼 단위 편집
- `mcp__plugin_playwright_playwright__*` — E2E 검증

---

## 자체 검증 체크리스트 (verification-before-completion)

- [ ] Phase 0 에서 보고서 4단의 ASCII mockup 두 블록 누락 여부 확인
- [ ] Phase 1 사이클이 매번 N개 전체를 일괄 표시했음 (텍스트 5줄 + ASCII [이전]/[이후] 발췌)
- [ ] Phase 1 사이클이 사용자 "그대로 진행" 선택으로 종료됐음 (수정 요청 0건)
- [ ] 사이클 중 수정 요청이 있었다면 보고서 4단의 라벨과 ASCII mockup 안 라벨이 정확히 일치 (grep 검증)
- [ ] 모든 이슈가 보고서 항목과 1:1 매칭
- [ ] main 직접 커밋 0건 — 모든 변경은 브랜치 → PR → squash merge
- [ ] 신규 테스트 추가됨 (TDD), 회귀 테스트 통과
- [ ] `grep -rE "(test|it)\.skip" src/` 결과 0건
- [ ] 임시 우회·예산 상향·timeout 완화 0건
- [ ] `npm run validate && npm run build` pass
- [ ] 보고서가 `docs/reports/archive/` 로 이동됨 (단독 커밋)
- [ ] Phase 5-A 에서 Preview URL 추출 후 사용자에게 「🔗 Preview URL: …」 한 줄로 안내
- [ ] Phase 5-B 사용자 검토 게이트 통과 (「머지 진행」 응답)
- [ ] PR 제목 = `fix: Nielsen 휴리스틱 N건 해결`
- [ ] 한국어 커밋 메시지·PR 본문
- [ ] PR CI 모든 check (Lint·Unit·Build·**E2E**·Vercel) `conclusion=SUCCESS`
- [ ] Phase 6 머지 전제: 사용자 승인 + CI 통과 둘 다 충족
- [ ] main 머지 후 main CI 모든 check `conclusion=SUCCESS`
- [ ] CI 실패가 있었다면 근본 원인 해결로 통과 (임시 우회 X)
- [ ] 인용한 모든 `src/...` 경로 실재 (`ls`로 샘플 검증)
- [ ] **재사용 자산 우선 적용** — 신규 컴포넌트 작성 시 ① 보고서 자산 표 ② `src/components/ui/` ③ shadcn 레지스트리 검토 사유 PR 본문 기재
- [ ] **shadcn/ui 외 UI 라이브러리 도입 0건** (또는 도입 사유가 PR 본문에 명시)

---

## 작성 원칙

- **사용자 관점 일괄 검토 사이클** — Phase 1 에서 매번 N개 전체를 텍스트 5줄 + ASCII mockup 발췌로 표시. 사용자 "그대로 진행" 시까지 사이클 반복, 수정 요청 시 보고서 4단 + ASCII 동시 갱신
- **Preview 검토 게이트** — Phase 5 에서 PR 생성 직후 Preview URL 즉시 안내(옵션 B). 사용자 「머지 진행」 응답 + CI 모든 check `SUCCESS` 둘 다 충족해야 main 머지
- **수정 사이클은 같은 PR 안에서** — Preview 검토 후 수정 요청 시 같은 브랜치에 추가 커밋 → 새 Preview URL 자동 재추출
- **main 보호** — 모든 변경은 브랜치 → PR → squash merge (직접 커밋 금지)
- **TDD 강제** — 모든 코드 변경은 RED → GREEN → REFACTOR
- **임시 우회 금지** — CI 실패는 근본 원인 해결만 (메모리 규칙)
- **shadcn/ui 우선** — 신규 UI 요소는 ① `src/components/ui/` 기존 자산 → ② `npx shadcn@latest add <name>` 레지스트리 → ③ 신규 작성 순서. Radix 비호환 라이브러리 도입은 사유 명시 필수
- **재사용 우선** — Phase 3 GREEN 4단계 플로우 엄수. 신규 컴포넌트 작성 시 사유를 PR 본문에 기재
- **한국어 커밋·PR** — 메모리 규칙
- **E2E 포함 모든 check pass** — Unit Test 만 보고 단정 금지
- **보고서 archive** — 해결 완료 후 `docs/reports/archive/` 이동 (단독 커밋)
- **squash merge 대응** — PR 제목이 그대로 main 커밋이 됨

---

## 트리거 발화 예시 (자연어)

다음 발화를 보면 본 스킬을 호출:

- "감사 보고서대로 고쳐줘"
- "Nielsen 휴리스틱 이슈 해결해줘"
- "휴리스틱 리포트 반영해줘"
- "감사 결과 일괄 처리해줘"
- "UX 감사 받은 거 고쳐줘"
- "/nielsen-audit-fix"
- "/nielsen-audit-fix docs/reports/2026-05-02-nielsen-heuristics-audit.md"

영역 인자(보고서 경로) 미지정 시 `docs/reports/` 의 가장 최근 보고서를 자동 선택.
