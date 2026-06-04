# Knip 도입 & Dead Code 베이스라인 리포트

- **작성일:** 2026-06-04
- **도구:** [Knip](https://knip.dev) 6.15.0 (`npm run knip`)
- **목적:** 리뷰 없이 생성·축적된 코드베이스의 미사용 파일·export·의존성을 자동 탐지해 정리 기준선을 확보한다.
- **범위:** 본 PR 은 **도입 + 베이스라인 리포트**까지. **실제 삭제는 본 리포트를 검토 후 별도 PR** 에서 수행한다(구조 변경과 동작 변경 분리 — Kent Beck "두 모자" 원칙).

---

## 1. 설정 (`knip.json`)

```json
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  "entry": ["scripts/*.{ts,mjs}", "lighthouserc.js"],
  "ignore": ["src/components/ui/**"],
  "ignoreBinaries": ["vercel", "python3", "supabase"],
  "ignoreExportsUsedInFile": true
}
```

설정 근거(오탐 억제 — 모두 실제 검증 후 반영):

| 항목                            | 이유                                                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `entry: scripts/*`              | `tsx`/`node` 로 수동 실행하는 스크립트(진입점). package.json 에 없는 것도 포함                                                          |
| `entry: lighthouserc.js`        | `@lhci/cli` 가 읽는 설정 파일(CI lighthouse 잡에서 사용)                                                                                |
| `ignore: src/components/ui/**`  | shadcn/ui 벤더 컴포넌트 — 미사용 하위 export 는 정상(라이브러리 성격)                                                                   |
| `ignoreBinaries`                | `vercel`·`python3`·`supabase` 는 외부 CLI(의존성 아님)                                                                                  |
| `ignoreExportsUsedInFile: true` | 파일 내부에서만 쓰는 export(예: `export-pdf.ts` 의 `draw*` 헬퍼)는 죽은 코드가 아님 → 노이즈 204건 제거, **진짜 미사용 export 만** 남김 |

> Next.js 진입점(`page`/`layout`/`route`/`loading`, `src/proxy.ts`, `src/instrumentation.ts` 등)은 **Knip 의 Next.js 플러그인이 자동 인식**하므로 별도 설정 불필요(검증 완료 — 오탐 0).

### 튜닝 효과

| 항목                  | 최소 설정 | 정밀 설정 |
| --------------------- | --------- | --------- |
| Unused files          | 12        | **9**     |
| Unused exports        | 235       | **31**    |
| Unused exported types | 166       | **70**    |
| Unlisted binaries     | 3         | **0**     |

---

## 2. 발견 사항 (위험도별)

### 🟢 버킷 A — 안전하게 삭제 가능 (낮은 위험)

**미사용 파일 (배럴·고아·테스트 인프라):**

- `src/hooks/index.ts` · `src/lib/constants/index.ts` · `src/lib/types/index.ts` · `src/lib/utils/index.ts` — 아무도 import 하지 않는 배럴 re-export 파일(직접 경로로 import 중)
- `src/components/landing/hooks/useMousePosition.ts` — 고아 훅
- `src/test/helpers/component-factories.ts` · `mock-llm.ts` · `render-helpers.tsx` — 미사용 테스트 헬퍼
- `e2e/fixtures/pbl-interview-sample.ts` — 미사용 e2e 픽스처

**미사용 e2e 헬퍼 함수 (8개):** `cleanup.helper.ts` 의 `restoreUserStatus`·`deleteActivityLog`·`restoreProfile`·`restoreEmailNotify`·`deleteConversation`·`ensureAssessmentToken`·`restoreShareStatus` + `navigation.helper.ts` 의 `clickBackLink`

**미사용 상수/함수:** `SITE_NAME`·`TOTAL_STEPS`·`REQUIRED_STEP_IDS`·`ALL_PROJECT_STATUSES`·`USER_STATUS_CONFIG`·`AI_NECESSITY_OPTIONS`·`aiNecessityLabel`·`ROADMAP_TOTAL_STEPS`·`API_TIMEOUT_MS`·`TABLE_CELL_INLINE_CLASS`·`PBL_AI_LEVEL_LABEL_MAP`·`AI_LEVEL_GRADE`·`AI_COMPETENCY_LEVEL_OPTIONS`·`createEmptyPBLInterviewDraft`·`createEmptyRoadmapParticipant`·`addListSection`·`createAfterTracker`(test)

> 삭제 전 `git grep` 으로 동적 참조(문자열 경로 등) 없음을 1건씩 재확인 권장. Knip 이 이미 정적 미참조로 판정했으므로 위험은 낮음.

### 🟡 버킷 B — 검토 후 삭제 (중간 위험)

- **미사용 Server Action 4개** (`consultant/projects/[id]/interview/actions.ts`): `uploadHrdReportAttachment`·`removeHrdReportAttachment`·`createHrdReportSignedUrl`·`fetchPBLInterview`
  → Knip 의 Next 플러그인이 `'use server'` 참조를 추적함(높은 확률로 진짜 미사용). 단 폼 `action=` 또는 클라이언트 동적 호출 가능성 있어 **삭제 PR 에서 grep 재확인 필수**.
- **과다 export 된 Zod 추론 타입 ~50개** (`*Input` 등, `src/lib/schemas/*`): AI 생성 시 "혹시 몰라" 내보낸 공개 타입. 스키마의 공개 API 로 의도된 것과 진짜 미사용을 개별 구분.
- **`__testing` seam 2개** (`PBLInterviewClient.tsx`, `RoadmapInterviewClient.tsx`): 테스트가 안 쓰면 제거.
- **Duplicate exports 2건:** `MESSAGING_ROLES|EMAIL_NOTIFY_ROLES`(`message.ts`), `CONSULTANT_ROLES|OPS_ADMIN_MANAGEABLE_ROLES`(`status.ts`) — 같은 값 별칭. 의도 확인 후 단일화.

### ⛔ 버킷 C — 건드리지 말 것 (높은 위험)

- **`src/types/database.ts` 의 인터페이스 12개** (`SelfAssessment`·`MatchingRecommendation`·`ProjectAssignment`·`AuditLog`·`Conversation`·`ConversationParticipant`·`UsageMetric`·`UserQuota`·`PblReport`·`PblLike` 등):
  → 이 파일은 **수동 관리 source-of-truth**(CLAUDE.md 명시). DB 테이블 미러로 **의도적으로 완비**되어 있어, 현재 코드에서 미참조여도 타입 계약의 일부다. **일괄 삭제 금지.** 개별 검토하더라도 보수적으로.

### 🔧 버킷 D — 의존성

- **`tw-animate-css`** (미사용 devDependency): CSS·코드 어디에도 `@import`/참조 없음(검증 완료). 애니메이션 유틸 도입 의도였는지 확인 후 제거 가능.
- **`@radix-ui/react-visually-hidden`** (미선언 의존성): `command-palette/CommandPalette.tsx` 에서 직접 import 하나 package.json 에 없음(transitive 로 작동 중 — 깨질 위험).
  → **권장 조치:** 이미 설치된 umbrella 패키지 `radix-ui` 에서 `VisuallyHidden` 을 import 하도록 변경하거나, `@radix-ui/react-visually-hidden` 을 `dependencies` 에 명시 추가.

---

## 3. 다음 단계

1. **본 리포트 검토** — 버킷 A/B 항목 중 삭제 대상 확정(C 는 보존).
2. **삭제 PR** (`refactor:` 타입, 동작 불변):
   - 버킷 A 먼저(안전) → 테스트 그대로 통과 확인
   - 버킷 B 는 항목별 grep 재확인 후 선별 삭제
   - 버킷 D: `tw-animate-css` 제거 + `react-visually-hidden` import 정리
   - 각 단계마다 `npm run validate && npm run build` 통과
3. **CI 게이트 승격** — 베이스라인이 0(또는 의도된 잔여만 ignore)이 되면 `.github/workflows/ci.yml` 의 `knip` 잡에서 `continue-on-error: true` 를 제거해 **차단 게이트**로 전환.

## 4. 사용법

```bash
npm run knip              # 전체 미사용 파일·export·의존성 리포트
npm run knip:production    # 프로덕션 관점(테스트·devDep 제외) — 배포 코드의 dead code
```
