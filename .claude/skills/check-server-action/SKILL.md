---
name: check-server-action
description: Server Action 파일을 작성하거나 수정할 때 프로젝트 패턴 준수 여부를 검사합니다
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
   - 중요 변경 작업 시 감사 로그(`createAuditLog`, `@/lib/services/audit`) 권장
5. **반환 타입** - `{ success: true, data }` 또는 `{ success: false, error }` 형태 반환

### 역할 체크 패턴 3종

```typescript
// 패턴 A: OPS_ADMIN 전용
if (!currentUser || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
  return { success: false, error: '권한이 없습니다.' };
}

// 패턴 B: 컨설턴트 전용
if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
  return { success: false, error: '컨설턴트만 접근 가능합니다.' };
}

// 패턴 C: 복합 (컨설턴트 + 관리자 모두 허용)
if (profile.role === 'CONSULTANT_APPROVED') {
  // 컨설턴트 로직 (프로젝트 배정 검증 포함)
} else if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
  return { success: false, error: '권한이 없습니다.' };
}
```

### 컨설턴트 전용: 프로젝트 배정 검증

컨설턴트 함수는 역할 체크 후 **프로젝트 배정 여부**를 추가 검증해야 함:

```typescript
// 역할 체크 이후
const { data: projectData } = await supabase
  .from('projects')
  .select('assigned_consultant_id')
  .eq('id', projectId)
  .single();

if (!projectData || projectData.assigned_consultant_id !== user.id) {
  return { success: false, error: '배정되지 않은 프로젝트입니다.' };
}
```

반복되는 경우 `verifyProjectAccess()` 같은 헬퍼 함수로 추출 가능.

---

## 인증(auth) 함수 예외

`(auth)/actions.ts`의 다음 함수들은 5단계 패턴의 예외:

| 함수 | 예외 사항 |
|------|-----------|
| `registerUser` | 역할 체크 없음 (누구나 가입 가능), Admin API로 사용자 생성 |
| `loginUser` | 역할 체크 없음, Supabase Auth signIn 직접 호출 |
| `logoutUser` | ActionResult 미사용, `redirect()` 반환 |
| `saveConsultantProfile` | 감사 로그 없음 (프로필 저장은 경미한 변경) |

---

## 조회(query) 함수 (SELECT)

조회 함수는 변경 함수와 패턴이 다름:

- **세션 확인** 필수 (`createClient` 사용, admin 클라이언트 불필요)
- **역할 검사** 선택 (RLS가 데이터 접근 제한)
- **Zod 검증** 선택 (쿼리 파라미터가 단순하면 생략 가능)
- **감사 로그** 불필요
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
