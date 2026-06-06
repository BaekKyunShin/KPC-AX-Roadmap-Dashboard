---
name: check-server-action
description: Server Action 파일(actions.ts)이 프로젝트 5단계 패턴(세션 확인 → 역할 권한 검사 → Zod 입력 검증 → 비즈니스 로직 → ActionResult 반환)을 따르는지 검사한다. 'use server' 지시문 파일을 작성·수정하거나 "Server Action 리뷰해줘" 요청 시 사용한다.
user-invocable: true
argument-hint: [파일경로]
---

# Server Action 패턴 검사

$ARGUMENTS Server Action 파일을 검사하세요.

---

## 변경(mutation) 함수 (INSERT/UPDATE/DELETE)

아래 5단계를 모두 따르는지 확인:

1. **세션 확인** - `createClient()` (`@/lib/supabase/server`) 후 `supabase.auth.getUser()` 호출
2. **역할 권한 검사** - users 테이블에서 role 조회 후 허용 역할 체크 (아래 3가지 패턴)
3. **Zod 입력 검증** - `src/lib/schemas/`의 스키마로 `.safeParse()` 호출
4. **비즈니스 로직** - admin 클라이언트(`createAdminClient()`, `@/lib/supabase/admin`)로 DB 작업
   - 중요 변경 작업 시 감사로그(`createAuditLog`, `@/lib/services/audit`) 권장
5. **반환 타입** - `{ success: true, data }` 또는 `{ success: false, error }` 형태 반환

### 역할 체크 패턴 3종

역할 리터럴(`['OPS_ADMIN', 'SYSTEM_ADMIN']`)을 손으로 나열하지 않는다. 운영/시스템관리자 집합은 `OPS_MANAGER_ROLES`/`isOpsManager`(`@/lib/constants/status`), 인증+역할 일괄 검사는 `requireAuthWithRole`(`@/lib/actions/auth-helpers`)로 통일한다.

```typescript
import { OPS_MANAGER_ROLES, isOpsManager } from '@/lib/constants/status';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';

// 패턴 A: 운영/시스템관리자(OPS_ADMIN·SYSTEM_ADMIN) 전용 — 두 형태
// (A-1) 인증+역할을 한 번에 검사 — 대다수 mutation 콜사이트의 표준
const auth = await requireAuthWithRole(OPS_MANAGER_ROLES);
if ('error' in auth) return { success: false, error: auth.error };
const { user, supabase } = auth; // role/status도 함께 제공 (추가 DB 조회 없음)

// (A-2) 이미 role을 보유한 분기에서 1회 가드 (예: API Route)
//       isOpsManager 인자는 non-null UserRole이므로 null 가드를 먼저 둔다
if (!currentUser || !isOpsManager(currentUser.role)) {
  return { success: false, error: '권한이 없습니다.' };
}

// 패턴 B: 컨설턴트 전용
if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
  return { success: false, error: '컨설턴트만 접근 가능합니다.' };
}
// 단순 역할 게이트가 아니라 배정 검증까지 필요하면 아래 requireConsultantProjectAccess로 이어진다

// 패턴 C: 복합 (컨설턴트 + 관리자 모두 허용)
if (profile.role === 'CONSULTANT_APPROVED') {
  // 컨설턴트 로직 (프로젝트 배정 검증 포함)
} else if (!isOpsManager(profile.role)) {
  return { success: false, error: '권한이 없습니다.' };
}
```

### 컨설턴트 전용: 프로젝트 배정 검증

컨설턴트 함수는 역할 체크 후 **배정 여부**를 추가 검증해야 한다. 인라인 `select('assigned_consultant_id')` 비교를 직접 쓰지 말고 `@/lib/actions/auth-helpers`의 표준 헬퍼를 쓴다 — **반환형에 따라 검사 관용구가 다르니 섞지 말 것**:

```typescript
import {
  requireConsultantProjectAccess,
  requireConsultantRoadmapAccess,
  canAccessProjectArtifact,
} from '@/lib/actions/auth-helpers';

// (a) projectId 기반 — 반환형 `true | AuthFailure` → `!== true`로 검사
const accessCheck = await requireConsultantProjectAccess(supabase, user.id, projectId);
if (accessCheck !== true) return accessCheck; // ActionResult 래핑이 필요하면 { success: false, error: accessCheck.error }

// (b) roadmapId 기반 — 반환형 `{ projectId } | AuthFailure` → `'error' in`으로 검사
const access = await requireConsultantRoadmapAccess(supabase, user.id, roadmapId);
if ('error' in access) return { success: false, error: access.error };
// 성공 시 access.projectId 활용

// (c) 이미 조회한 assigned_consultant_id + role로 DB 조회 없이 판정 (순수 함수)
if (!canAccessProjectArtifact(role, project.assigned_consultant_id, user.id)) {
  return { success: false, error: '권한이 없습니다.' };
}
```

- `requireConsultantProjectAccess` → `true | AuthFailure`이므로 **`!== true`**로 검사.
- `requireConsultantRoadmapAccess` → `{ projectId } | AuthFailure`이므로 **`'error' in access`**로 검사하고 성공 시 `access.projectId`를 쓴다. 두 관용구를 혼동하지 말 것.
- `canAccessProjectArtifact`는 **순수 함수(DB 조회 없음)**로 '누가 접근하는가'만 판정한다. track(`'PBL'`/`'ROADMAP'`)·프로젝트 상태(`EXPORT_ELIGIBLE` 등) 부가 조건은 호출부에서 별도 검사한다.

### 표준 인가 헬퍼 한눈표

| 헬퍼                                                                         | 위치                         | 반환형                                                 | 결과 검사 관용구                                       |
| ---------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `OPS_MANAGER_ROLES`                                                          | `@/lib/constants/status`     | `readonly UserRole[]` (`['OPS_ADMIN','SYSTEM_ADMIN']`) | — (배열 상수)                                          |
| `isOpsManager(role)`                                                         | `@/lib/constants/status`     | `boolean`                                              | `isOpsManager(role)` (인자는 non-null `UserRole`)      |
| `requireAuthWithRole(allowedRoles, options?)`                                | `@/lib/actions/auth-helpers` | `RoleSuccess \| AuthFailure`                           | `if ('error' in auth) return …`                        |
| `requireConsultantProjectAccess(supabase, userId, projectId, errorMessage?)` | `@/lib/actions/auth-helpers` | `true \| AuthFailure`                                  | `if (accessCheck !== true) return …`                   |
| `requireConsultantRoadmapAccess(supabase, userId, roadmapId)`                | `@/lib/actions/auth-helpers` | `{ projectId } \| AuthFailure`                         | `if ('error' in access) return …` → `access.projectId` |
| `canAccessProjectArtifact(role, assignedConsultantId, userId)`               | `@/lib/actions/auth-helpers` | `boolean` (순수, DB 조회 없음)                         | `if (!canAccessProjectArtifact(...)) return …`         |

---

## 인증(auth) 함수 예외

`(auth)/actions.ts`의 다음 함수들은 5단계 패턴의 예외:

| 함수                    | 예외 사항                                                  |
| ----------------------- | ---------------------------------------------------------- |
| `registerUser`          | 역할 체크 없음 (누구나 가입 가능), Admin API로 사용자 생성 |
| `loginUser`             | 역할 체크 없음, Supabase Auth signIn 직접 호출             |
| `logoutUser`            | ActionResult 미사용, `redirect()` 반환                     |
| `saveConsultantProfile` | 감사로그 없음 (프로필 저장은 경미한 변경)                  |

---

## 조회(query) 함수 (SELECT)

조회 함수는 변경 함수와 패턴이 다름:

- **세션 확인** 필수 (`createClient` 사용, admin 클라이언트 불필요)
- **역할 검사** 선택 (RLS가 데이터 접근 제한)
- **Zod 검증** 선택 (쿼리 파라미터가 단순하면 생략 가능)
- **감사로그** 불필요
- **반환 타입**: ActionResult가 아닌 **커스텀 인터페이스** 사용
  - 예: `ConsultantProjectListResult`, `ProjectListResult` 등
  - 오류 시 빈 배열 또는 `null` 반환

---

## 반환 타입 규칙

**신규 코드 작성 시:**

- `src/lib/types/action-result.ts`의 공통 타입 import 권장:
  - `ActionResult<T>`, `SimpleActionResult`
  - 헬퍼: `successResult()`, `errorResult()`, `simpleSuccess()`

**기존 코드 참고:**

- 다수의 기존 파일이 ActionResult를 로컬 재정의하여 사용 중
- 점진적으로 공통 타입으로 마이그레이션 예정

---

## 추가 확인

- 직렬화 불가능한 객체(Date, Map, Set)를 직접 반환하지 않는가
- `.select().single()` 사용 시 에러 처리가 있는가
- `revalidatePath()` 호출로 캐시 무효화를 하는가

위반 사항을 목록으로 정리하고 수정 방법을 제안하세요.
