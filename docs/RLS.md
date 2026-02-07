# RLS (Row Level Security) 정책

## 개요

이 문서는 Supabase PostgreSQL의 RLS 정책을 설명합니다.
모든 테이블에 RLS가 활성화되어 있으며, 역할 기반 접근 제어를 구현합니다.

## 역할 정의

| 역할 | 설명 |
|------|------|
| `PUBLIC` | 비로그인 - RLS 적용 안 됨 (Supabase Auth 미인증) |
| `USER_PENDING` | 컨설턴트 승인 대기 - 자신의 정보만 접근 |
| `OPS_ADMIN_PENDING` | 운영관리자 승인 대기 - 자신의 정보만 접근 |
| `CONSULTANT_APPROVED` | 승인된 컨설턴트 - 담당 프로젝트만 접근 |
| `OPS_ADMIN` | 운영 관리자 - 모든 프로젝트/사용자 관리 |
| `SYSTEM_ADMIN` | 시스템 관리자 - 모든 권한 |

## 사용자 상태

| 상태 | 설명 |
|------|------|
| `ACTIVE` | 활성 |
| `SUSPENDED` | 정지 |
| `WITHDRAWN` | 탈퇴 |

## 헬퍼 함수

```sql
-- 현재 사용자 역할 조회
get_user_role() RETURNS user_role

-- 현재 사용자 상태 조회
get_user_status() RETURNS user_status

-- 프로젝트 배정 여부 확인
is_assigned_to_project(project_id) RETURNS BOOLEAN

-- OPS_ADMIN 이상 확인
is_ops_admin_or_higher() RETURNS BOOLEAN

-- 승인된 컨설턴트 확인
is_approved_consultant() RETURNS BOOLEAN
```

## 테이블별 정책

### users

| 작업 | 조건 |
|------|------|
| SELECT (own) | 자신의 데이터 |
| SELECT (ops) | OPS_ADMIN 이상 |
| UPDATE (own) | 자신의 데이터 (role, status 변경 불가) |
| UPDATE (ops) | OPS_ADMIN 이상 |

### consultant_profiles

| 작업 | 조건 |
|------|------|
| SELECT (own) | 자신의 프로필 |
| SELECT (ops) | OPS_ADMIN 이상 (매칭용) |
| INSERT | 자신의 프로필만 |
| UPDATE | 자신의 프로필만 |

### projects

| 작업 | 조건 |
|------|------|
| SELECT (ops) | OPS_ADMIN 이상 |
| SELECT (consultant) | 담당 컨설턴트만 |
| SELECT (test) | 본인이 생성한 테스트 프로젝트 |
| INSERT (ops) | OPS_ADMIN 이상 |
| INSERT (test) | 승인된 컨설턴트 (테스트 모드) |
| UPDATE (ops) | OPS_ADMIN 이상 |
| UPDATE (test) | 본인이 생성한 테스트 프로젝트 |
| DELETE (test) | 본인이 생성한 테스트 프로젝트 |

### self_assessment_templates

| 작업 | 조건 |
|------|------|
| SELECT (active) | 모든 인증된 사용자 (활성 템플릿만) |
| SELECT (all) | OPS_ADMIN 이상 |
| INSERT | OPS_ADMIN 이상 |
| UPDATE | OPS_ADMIN 이상 |

### self_assessments

| 작업 | 조건 |
|------|------|
| SELECT (ops) | OPS_ADMIN 이상 |
| SELECT (consultant) | 담당 프로젝트만 (조회만) |
| INSERT | OPS_ADMIN만 |
| UPDATE | OPS_ADMIN만 |

### matching_recommendations

| 작업 | 조건 |
|------|------|
| SELECT | OPS_ADMIN 이상 |
| INSERT | OPS_ADMIN 이상 (시스템 생성) |
| DELETE | OPS_ADMIN 이상 (재계산 시) |

### project_assignments

| 작업 | 조건 |
|------|------|
| SELECT (ops) | OPS_ADMIN 이상 |
| SELECT (consultant) | 자신의 배정 이력만 |
| INSERT | OPS_ADMIN만 |
| UPDATE | OPS_ADMIN만 |

### interviews

| 작업 | 조건 |
|------|------|
| SELECT (ops) | OPS_ADMIN 이상 |
| SELECT (consultant) | 담당 프로젝트만 |
| SELECT (test) | 본인이 생성한 테스트 프로젝트 |
| INSERT (consultant) | 배정된 컨설턴트만 |
| INSERT (test) | 본인이 생성한 테스트 프로젝트 |
| UPDATE (consultant) | 배정된 컨설턴트만 (본인 작성) |
| UPDATE (test) | 본인이 생성한 테스트 프로젝트 |

### roadmap_versions

| 작업 | 조건 |
|------|------|
| SELECT (ops) | OPS_ADMIN 이상 (읽기 전용) |
| SELECT (consultant) | 담당 프로젝트만 |
| SELECT (test) | 본인이 생성한 테스트 프로젝트 |
| INSERT (consultant) | 배정된 컨설턴트만 |
| INSERT (test) | 본인이 생성한 테스트 프로젝트 |
| UPDATE (consultant) | 배정된 컨설턴트만 (DRAFT만 수정, FINAL 확정) |
| UPDATE (test) | 본인이 생성한 테스트 프로젝트 |

### audit_logs

| 작업 | 조건 |
|------|------|
| SELECT | OPS_ADMIN 이상 |
| INSERT | 서비스 역할 키만 (서버) |

### usage_metrics

| 작업 | 조건 |
|------|------|
| SELECT (own) | 자신의 사용량 |
| SELECT (ops) | OPS_ADMIN 이상 |
| INSERT/UPDATE | 서비스 역할 키만 (서버) |

### user_quotas

| 작업 | 조건 |
|------|------|
| SELECT (own) | 자신의 쿼터 |
| SELECT/UPDATE/INSERT | OPS_ADMIN 이상 |

## 테스트 모드 정책

테스트 모드는 컨설턴트가 연습용으로 로드맵을 생성할 수 있는 기능입니다.

**특징:**
- `is_test_mode = true`인 프로젝트는 테스트 프로젝트로 분류
- `test_created_by` 컬럼으로 생성자 추적
- 본인이 생성한 테스트 프로젝트만 조회/수정/삭제 가능
- OPS_ADMIN도 테스트 프로젝트 접근 가능 (관리 목적)

**적용 테이블:**
- `projects` - 테스트 프로젝트 CRUD
- `interviews` - 테스트 프로젝트 인터뷰
- `roadmap_versions` - 테스트 프로젝트 로드맵

## 보안 고려사항

1. **서비스 역할 키**: 감사 로그, 사용량 메트릭은 서버에서만 삽입
2. **역할 변경 제한**: 사용자는 자신의 role/status 변경 불가
3. **프로젝트 접근 제한**: 컨설턴트는 담당 프로젝트만 접근
4. **자가진단 보호**: 컨설턴트는 조회만 가능, 수정 불가
5. **FINAL 확정 제한**: 로드맵 FINAL은 배정된 컨설턴트만 가능
6. **테스트 모드 격리**: 테스트 프로젝트는 생성자만 접근 가능

## 테스트 체크리스트

- [x] USER_PENDING이 프로젝트 접근 시 차단되는지 확인
  - 정책: `projects_select_consultant` - `is_approved_consultant()` 함수로 검증
- [x] 컨설턴트가 배정되지 않은 프로젝트 접근 시 차단되는지 확인
  - 정책: `projects_select_consultant` - `assigned_consultant_id = auth.uid()` 검증
- [x] 컨설턴트가 자가진단 수정 시 차단되는지 확인
  - 정책: `assessments_update_ops` - OPS_ADMIN 이상만 UPDATE 허용
- [x] OPS_ADMIN이 로드맵 수정 시 차단되는지 확인
  - 정책: `roadmaps_update_consultant` - 배정된 컨설턴트만 UPDATE 허용
- [x] 배정된 컨설턴트만 FINAL 확정 가능한지 확인
  - 정책: `roadmaps_update_consultant` - `finalized_by = auth.uid()` 검증
- [x] 테스트 프로젝트가 생성자에게만 접근 가능한지 확인
  - 정책: `projects_select_test_own` - `test_created_by = auth.uid()` 검증

## 마이그레이션 파일

| 파일 | 설명 |
|------|------|
| `002_rls_policies.sql` | 기본 RLS 정책 |
| `004_test_roadmap.sql` | 테스트 모드 RLS 정책 |
| `005_rename_case_to_project.sql` | cases → projects 리네이밍 및 정책 재생성 |
| `011_add_ops_admin_pending_role.sql` | `OPS_ADMIN_PENDING` 역할 ENUM 추가 |
| `013_add_user_withdrawal.sql` | `WITHDRAWN` 상태, `USER_WITHDRAW` 감사 액션 추가 |
