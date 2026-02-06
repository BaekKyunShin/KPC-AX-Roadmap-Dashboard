---
name: supabase-dev
description: Supabase 마이그레이션 SQL, RLS 정책, PostgreSQL 함수를 작성하거나 수정할 때 프로젝트 규칙과 Supabase 베스트 프랙티스를 적용합니다
user-invocable: true
argument-hint: [파일경로]
---

# Supabase 개발 가이드

$ARGUMENTS 파일을 이 가이드에 따라 작성/검사하세요.

---

## 1. 마이그레이션 규칙

### 파일 위치 및 명명
- `supabase/migrations/` 폴더에 배치
- 이 프로젝트는 순차 번호 사용: `001_initial_schema.sql`, `002_rls_policies.sql`, ...
- 새 마이그레이션은 기존 번호 다음 순서로 생성 (현재 최신: `012`)

### 필수 사항
- CREATE TABLE 시 반드시 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` 포함
- 파괴적 SQL(DROP, TRUNCATE, ALTER COLUMN)에는 반드시 코멘트 추가
- 헤더 코멘트에 마이그레이션 목적 명시

---

## 2. RLS 정책 작성 규칙

### 이 프로젝트의 역할 체계

| 역할 | 설명 |
|------|------|
| `PUBLIC` | 비인증 사용자 |
| `USER_PENDING` | 승인 대기 |
| `OPS_ADMIN_PENDING` | 운영 관리자 승인 대기 |
| `CONSULTANT_APPROVED` | 승인된 컨설턴트 - 담당 프로젝트만 접근 |
| `OPS_ADMIN` | 운영 관리자 - 모든 프로젝트/사용자 관리 |
| `SYSTEM_ADMIN` | 시스템 관리자 - 모든 권한 |

### 이 프로젝트의 헬퍼 함수

모든 헬퍼 함수는 `SECURITY DEFINER STABLE`로 정의됨 (RLS 내부 호출용):

```sql
get_user_role()                      -- 현재 사용자 역할 조회 (returns user_role)
get_user_status()                    -- 현재 사용자 상태 조회 (returns user_status)
is_ops_admin_or_higher()             -- OPS_ADMIN 이상 여부 (returns boolean)
is_approved_consultant()             -- 승인된 컨설턴트 여부 (role + status 동시 확인)
is_assigned_to_project(p_project_id) -- 프로젝트 배정 여부 (returns boolean)
```

> 참고: `is_assigned_to_project`는 원래 `is_assigned_to_case`로 생성되었고, `005_rename_case_to_project.sql`에서 리네이밍됨.

### 정책 작성 패턴

- SELECT → `USING` 사용, WITH CHECK 없음
- INSERT → `WITH CHECK` 사용, USING 없음
- UPDATE → `USING` + `WITH CHECK` 모두 사용
- DELETE → `USING` 사용, WITH CHECK 없음
- `FOR ALL` 사용 금지 → SELECT, INSERT, UPDATE, DELETE 각각 분리

### 성능 최적화

```sql
-- 권장: select 래핑으로 캐싱 (신규 정책 작성 시 적용)
USING ( (SELECT auth.uid()) = user_id );

-- 기존 코드: 직접 호출 (동작에 문제 없음)
USING ( auth.uid() = user_id );
```

- `auth.uid()`, `auth.jwt()` 호출 시 `(SELECT ...)` 래핑 권장
- 정책에 사용되는 컬럼에 인덱스 추가
- 조인 최소화 → IN / ANY 연산으로 대체

### 테스트 모드 정책

프로젝트/인터뷰/로드맵 관련 테이블은 테스트 모드 정책 필요:

```sql
-- 본인이 생성한 테스트 프로젝트만 접근
USING ( is_test_mode = true AND test_created_by = (SELECT auth.uid()) )
```

### 서비스 역할 키 전용 테이블

audit_logs, usage_metrics는 서버에서만 INSERT:
- 일반 사용자 INSERT 정책 불필요
- SELECT만 OPS_ADMIN 이상에게 허용

### 기존 정책 참조

일관성 확인 시 참조: `002_rls_policies.sql`, `004_test_roadmap.sql`, `005_rename_case_to_project.sql`

---

## 3. SQL 스타일 가이드

- SQL 예약어는 **대문자** 사용 (`CREATE TABLE`, `ALTER TABLE`, `SELECT`)
- 테이블/컬럼명은 **snake_case** 사용
- 테이블명은 **복수형** (`users`, `projects`)
- 컬럼명은 **단수형** (`user_id`, `status`)
- 외래 키: `{단수_테이블명}_id` (예: `user_id`, `project_id`)
- 복잡한 쿼리는 CTE 사용, 각 블록에 코멘트 추가
- `id` 컬럼은 **UUID** 사용: `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()` 또는 `id UUID PRIMARY KEY REFERENCES auth.users(id)`
- 테이블에는 반드시 `COMMENT ON TABLE` 추가

---

## 4. PostgreSQL 함수 규칙

### 일반 함수 (비즈니스 로직용)

```sql
CREATE OR REPLACE FUNCTION public.my_function()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER          -- 기본값: SECURITY INVOKER
SET search_path = ''      -- 반드시 빈 문자열로 설정
AS $$
BEGIN
  -- public.table_name 형태로 완전한 경로 사용
END;
$$;
```

- 기본: `SECURITY INVOKER` (호출자 권한)
- `SECURITY DEFINER` 사용 시 이유 명시
- `search_path = ''` 반드시 설정
- 테이블 참조 시 스키마 포함 (`public.users`)
- 가능하면 `IMMUTABLE` 또는 `STABLE` 선언

### RLS 헬퍼 함수 (예외)

RLS 정책 내부에서 호출되는 헬퍼 함수는 `SECURITY DEFINER` 사용:

```sql
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

- RLS 우회가 필요하므로 `SECURITY DEFINER` 사용
- `STABLE` 선언으로 쿼리 최적화
