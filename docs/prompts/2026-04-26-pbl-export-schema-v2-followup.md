# PBL Export Action V1→V2 Schema 갱신 (착수 프롬프트)

> 새 세션에서 이 작업을 진행할 때 아래 프롬프트를 그대로 복사해 사용하세요.
> **선행 조건** (모두 main 머지 완료):
> - PR #28 (`c44fbde`): V2 인터뷰 재설계
> - PR #29 (`15a489a`): HWPX 템플릿 재구축
> - PR #4 (#30, `eefad0d`): PDF 1:1 대조 + 회귀 테스트
> - PR #5 (#31, `24e3eb6`): HWPX 정본 교체 + 누락 11종 보강
> - **PR #7 (#32, `ef433be`): `PBLTargetDetailSchema` 5 필드 확장 (title/as_is/to_be/required_knowledge/required_skill)** — 본 작업이 영향 받는 가장 최근 schema 변경
> **추정 작업량**: 작은 단위 PR (1~2시간).
> **마지막 업데이트**: 2026-04-27 (PR #7 머지 후 컨텍스트 보강).

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
- **PR #5/#7 의 V2 schema 변경 영향**: V2 `target` 객체가 PR #5 에서 `necessity_score`
  추가, PR #7 에서 `details[]` 가 5 필드 (`title`/`as_is`/`to_be`/`required_knowledge`/
  `required_skill`) 로 확장됨. **본 작업의 V2 검증 분기는 `.partial()` 사용** 시
  자연스럽게 통과 (loose parse) — strict 검증을 시도할 경우 5 필드 미입력 row 가
  fail 할 수 있음을 인지.
- **잔여 issue**: `src/lib/actions/pbl-export.ts:108` 의 `pblInterviewAutoSaveSchema.safeParse(interview.pbl_data)`
  가 V1 검증. V2 데이터로 export 시 schema 검증 실패 → export 차단 가능성.

## 현재 상태 (2026-04-27 기준)

`src/lib/actions/pbl-export.ts` 의 핵심 라인:

```typescript
// line 11
import { ..., pblInterviewAutoSaveSchema, ... } from '...';

// line 107-122
const pblData = interview?.pbl_data
  ? pblInterviewAutoSaveSchema.safeParse(interview.pbl_data)  // ← V1 만 검증
  : null;
const overview = pblData?.success
  ? (pblData.data as Record<string, unknown>).courseOverview      // ← V1 키
  : undefined;
const env = pblData?.success
  ? (pblData.data as Record<string, unknown>).trainingEnvironment // ← V1 키
  : undefined;
const targets = pblData?.success
  ? (pblData.data as Record<string, unknown>).targetTasks         // ← V1 키
  : undefined;
```

**V2 데이터 (camelCase) 는 schema 검증 실패 + 위 V1 키 (`courseOverview` 등) 가 모두
undefined → `interviewOverview`/`requirements` 가 빈 채로 export.** 즉 schema 분기뿐
아니라 V1 키 → V2 키 mapping (`courseOverview` → `companyName/courseName`,
`trainingEnvironment` → `trainingEnv`, `targetTasks` → `target`) 도 함께 처리해야 함.

**참고 패턴:** `src/lib/services/export/hwpx/hwpx-payload-pbl.ts:59-70` 의 `classifyInterview`
가 동일 분기 (`v2 | v1 | empty`) 패턴을 이미 구현. 일관성을 위해 같은 키 시그니처
(`'companyName' in raw || 'courseName' in raw || 'companyIssues' in raw` → V2 판정,
`'courseOverview' in raw || 'companyStatus' in raw` → V1 판정) 를 재사용 권장.

## 작업 범위

### Step 1. 현재 코드 확인

```bash
grep -n "pblInterviewAutoSaveSchema\|pblInterviewSchema\|PBLInterviewSchema\|PBLInterviewStrictSchema" src/lib/actions/pbl-export.ts src/lib/actions/pbl-export.test.ts
grep -n "classifyInterview" src/lib/services/export/hwpx/hwpx-payload-pbl.ts
```

검증 위치 + 영향도 + 참고 패턴 파악.

### Step 2. Schema 분기 전략 결정

옵션:
1. **단일 V2 검증** — `PBLInterviewSchema.partial().safeParse(...)` 로 변경.
   legacy V1 데이터는 invalid → 별도 마이그레이션 후 호환.
2. **V2 우선 + V1 fallback** — V2 try → invalid 면 V1 retry. 호환성 우선.
3. **Schema union** — `z.union([PBLInterviewSchema.partial(), pblInterviewAutoSaveSchema])`.
   가장 유연하지만 type narrowing 복잡.

권장: **옵션 2** (`hwpx-payload-pbl.ts` 의 `classifyInterview` 와 동일 패턴 — 일관성).
주의: V2 검증은 반드시 `.partial()` 사용 (strict 는 PR #7 의 5 필드 details 미입력 시 fail 가능).

### Step 3. 구현

```typescript
// 예시 (구현 시 검토) — schema 분기 + V1→V2 키 mapping 동시 처리
import {
  pblInterviewAutoSaveSchema,
  PBLInterviewSchema,
  type PBLInterviewStrict,
} from '@/lib/schemas/interview-pbl';

// 3-1. classify (hwpx-payload-pbl.ts 의 classifyInterview 패턴 재사용)
function classifyPblData(raw: unknown):
  | { kind: 'v2'; data: Partial<PBLInterviewStrict> }
  | { kind: 'v1'; data: Record<string, unknown> }
  | { kind: 'empty' } {
  if (!raw || typeof raw !== 'object') return { kind: 'empty' };
  const r = raw as Record<string, unknown>;
  if ('companyName' in r || 'courseName' in r || 'companyIssues' in r) {
    const v2 = PBLInterviewSchema.partial().safeParse(r);
    return v2.success ? { kind: 'v2', data: v2.data } : { kind: 'empty' };
  }
  if ('courseOverview' in r || 'companyStatus' in r) {
    const v1 = pblInterviewAutoSaveSchema.safeParse(r);
    return v1.success ? { kind: 'v1', data: v1.data } : { kind: 'empty' };
  }
  return { kind: 'empty' };
}

// 3-2. export payload mapping — V2/V1 양쪽에서 동일한 PBLExportPayload 형태로 추출
const branch = classifyPblData(interview?.pbl_data);

const interviewOverview =
  branch.kind === 'v2'
    ? {
        courseName: branch.data.courseName ?? '',
        trainingHours: branch.data.trainingHours ?? 0,
        traineeCount: 0, // V2 schema 에 별도 필드 없음 — 필요 시 fallback
        trainingJob: branch.data.trainingTarget ?? '',
        aiLevel: branch.data.currentAiLevel?.level ?? '',
        trainingGoals: [], // V2 schema 미정의 → 빈 배열
      }
    : branch.kind === 'v1'
      ? extractV1Overview(branch.data)
      : undefined;

const requirements =
  branch.kind === 'v2'
    ? {
        trainingNeedsAnalysis: branch.data.trainingEnv ?? undefined,
        selectionReason: branch.data.target?.necessity ?? undefined,
        targetTaskDetails:
          branch.data.target?.details?.map((d) => ({
            // PR #7 5 필드 그대로 전달
            task_name: d.title ?? '',
            as_is: d.as_is ?? '',
            to_be: d.to_be ?? '',
            required_knowledge: d.required_knowledge ?? '',
            required_skill: d.required_skill ?? '',
          })) ?? undefined,
      }
    : branch.kind === 'v1'
      ? extractV1Requirements(branch.data)
      : undefined;
```

V1→V2 키 mapping 시 V2 schema 에 없는 V1 전용 필드 (`traineeCount`, `trainingGoals` 등)
는 빈 값 fallback. `PBLExportPayload` 타입 정의도 함께 확인해 mapping 일관성 보장.

### Step 4. 테스트

`src/lib/actions/pbl-export.test.ts` 에 V2 fixture 케이스 추가:

- **V2 PBL 데이터** (camelCase: `companyName`, `companyIssues`, ...) 로 export 호출 → 성공
  - `target.details[]` 가 PR #7 의 5 필드 (`title`/`as_is`/...) 로 입력된 케이스
  - `target.details[]` 가 일부 필드 누락 (loose parse 통과) 인 케이스
- **V1 PBL 데이터** (snake_case: `courseOverview`, `companyStatus`, ...) 로 export 호출 → 성공 (legacy 호환)
- **둘 다 invalid** → 명확한 에러
- **V2 → PBLExportPayload 매핑 검증**: V2 데이터에서 `interviewOverview.courseName` /
  `requirements.targetTaskDetails` 가 정상 추출되는지 assert.

### Step 5. 검증

```bash
npm run typecheck
npm run test:coverage  # branch coverage ≥ 83% 유지 (PR #29 에서 회복한 임계값)
npm run validate
npm run build
```

### Step 6. PR 생성

- 제목: `fix(pbl-export): V2 PBL 인터뷰 schema 검증 + V1 fallback 보존`
- DB 데이터 영향 없음 (코드만 수정).
- E2E (`tests/e2e/pbl-*.spec.ts`) 회귀 확인.

## DoD

- [ ] V2 PBL 데이터로 export 성공 케이스 vitest 추가 (PR #7 의 5 필드 details 포함)
- [ ] V1 legacy 데이터 fallback 동작 vitest 확인
- [ ] V2 → `PBLExportPayload` mapping 검증 (interviewOverview/requirements 모두 채워짐)
- [ ] `classifyInterview` 패턴과 일관된 분기 시그니처 사용
- [ ] `npm run validate && npm run build` PASS
- [ ] PR CI 전체 pass (Lint·Typecheck·Unit·Build·E2E·Vercel)
- [ ] CLAUDE.md 의 PR 제목 규칙 (`fix:` 등 한국어) 준수

## 활용 스킬

- `superpowers:test-driven-development` — vitest fixture 추가
- `check-server-action` — Server Action 5단계 패턴 확인
- `superpowers:verification-before-completion` — 머지 전 필수
