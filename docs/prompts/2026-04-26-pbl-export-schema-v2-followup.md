# PBL Export Action V1→V2 Schema 갱신 (착수 프롬프트)

> 새 세션에서 이 작업을 진행할 때 아래 프롬프트를 그대로 복사해 사용하세요.
> **선행 조건**: PR #28 (V2 인터뷰 재설계) + PR #29 (HWPX 템플릿 재구축, sha `15a489a`) 머지 완료.
> **추정 작업량**: 작은 단위 PR (1~2시간).

---

KPC AI 훈련 로드맵 대시보드의 `src/lib/actions/pbl-export.ts` 가 V1 PBL 인터뷰
schema (`pblInterviewAutoSaveSchema`) 로 `interviews.pbl_data` JSONB 를 검증 중.
PR #28 에서 V2 (`PBLInterviewSchema` / `PBLInterviewStrictSchema`) 가 정본화된
이후, V2 데이터가 V1 schema 로는 invalid 처리될 수 있는 잠재적 issue. 갱신 진행.

## 배경

- **PR #28** (sha `c44fbde`): PBL 인터뷰 V2 재설계 — `interviews.pbl_data` JSONB
  에 camelCase V2 데이터 (`companyName`, `companyIssues`, `organization {orgTree, mainWork}`,
  `activities`, `problems`, `priority`, `target`, `currentAiLevel`, `expectedAiLevel`)
  가 정본 형태로 저장.
- **PR #29** (sha `15a489a`): HWPX 다운로드 측 (`hwpx-payload-pbl.ts`) 은 이미
  V2/V1 자동 분기 처리 (`classifyInterview`) 완료.
- **잔여 issue**: `src/lib/actions/pbl-export.ts` 의 `pblInterviewAutoSaveSchema.safeParse(interview.pbl_data)`
  가 V1 검증. V2 데이터로 export 시 schema 검증 실패 → export 차단 가능성.

## 작업 범위

### Step 1. 현재 코드 확인

```bash
grep -n "pblInterviewAutoSaveSchema\|pblInterviewSchema\|PBLInterviewSchema\|PBLInterviewStrictSchema" src/lib/actions/pbl-export.ts src/lib/actions/pbl-export.test.ts
```

검증 위치 + 영향도 파악.

### Step 2. Schema 분기 전략 결정

옵션:
1. **단일 V2 검증** — `PBLInterviewSchema.partial().safeParse(...)` 로 변경.
   legacy V1 데이터는 invalid → 별도 마이그레이션 후 호환.
2. **V2 우선 + V1 fallback** — V2 try → invalid 면 V1 retry. 호환성 우선.
3. **Schema union** — `z.union([PBLInterviewSchema.partial(), pblInterviewAutoSaveSchema])`.
   가장 유연하지만 type narrowing 복잡.

권장: **옵션 2** (hwpx-payload-pbl.ts 의 `classifyInterview` 와 동일 패턴 — 일관성).

### Step 3. 구현

```typescript
// 예시 (구현 시 검토)
const v2Result = PBLInterviewSchema.partial().safeParse(interview.pbl_data);
const v1Result = v2Result.success
  ? null
  : pblInterviewAutoSaveSchema.safeParse(interview.pbl_data);
const validatedData = v2Result.success ? v2Result.data : v1Result?.data;
if (!validatedData) {
  return { success: false, error: 'PBL 인터뷰 데이터 검증 실패' };
}
```

### Step 4. 테스트

`src/lib/actions/pbl-export.test.ts` 에 V2 fixture 케이스 추가:

- V2 PBL 데이터 (camelCase: `companyName`, `companyIssues`, ...) 로 export 호출 → 성공
- V1 PBL 데이터 (snake_case: `courseOverview`, `companyStatus`, ...) 로 export 호출 → 성공 (legacy 호환)
- 둘 다 invalid → 명확한 에러

### Step 5. 검증

```bash
npm run typecheck
npm run test:coverage  # branch coverage ≥ 83% 유지 (PR #29 에서 회복한 임계값)
npm run validate
npm run build
```

### Step 6. PR 생성

- 제목: `fix(pbl-export): V2 PBL 인터뷰 schema 검증 (V1 fallback 보존)`
- DB 데이터 영향 없음 (코드만 수정).
- E2E (`tests/e2e/pbl-*.spec.ts`) 회귀 확인.

## DoD

- [ ] V2 PBL 데이터로 export 성공 케이스 vitest 추가
- [ ] V1 legacy 데이터 fallback 동작 vitest 확인
- [ ] `npm run validate && npm run build` PASS
- [ ] PR CI 전체 pass (Lint·Typecheck·Unit·Build·E2E·Vercel)
- [ ] CLAUDE.md 의 PR 제목 규칙 (`fix:` 등 한국어) 준수

## 활용 스킬

- `superpowers:test-driven-development` — vitest fixture 추가
- `check-server-action` — Server Action 5단계 패턴 확인
- `superpowers:verification-before-completion` — 머지 전 필수
