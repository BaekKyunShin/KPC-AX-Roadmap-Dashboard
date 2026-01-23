# RLS (Row Level Security) 정책

## 개요

이 문서는 Supabase PostgreSQL의 RLS 정책을 설명합니다.
모든 테이블에 RLS가 활성화되어 있으며, 역할 기반 접근 제어를 구현합니다.

## 역할 정의

| 역할 | 설명 |
|------|------|
| `PUBLIC` | 비로그인 - RLS 적용 안 됨 (Supabase Auth 미인증) |
| `USER_PENDING` | 승인 대기 - 자신의 정보만 접근 |
| `CONSULTANT_APPROVED` | 승인된 컨설턴트 - 배정된 케이스만 접근 |
| `OPS_ADMIN` | 운영 관리자 - 모든 케이스/사용자 관리 |
| `SYSTEM_ADMIN` | 시스템 관리자 - 모든 권한 |

## 헬퍼 함수

```sql
-- 현재 사용자 역할 조회
get_user_role() RETURNS user_role

-- 현재 사용자 상태 조회
get_user_status() RETURNS user_status

-- 케이스 배정 여부 확인
is_assigned_to_case(case_id) RETURNS BOOLEAN

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

### cases

| 작업 | 조건 |
|------|------|
| SELECT (ops) | OPS_ADMIN 이상 |
| SELECT (consultant) | 배정된 컨설턴트만 |
| INSERT | OPS_ADMIN 이상 |
| UPDATE | OPS_ADMIN 이상 |

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
| SELECT (consultant) | 배정된 케이스만 (조회만) |
| INSERT | OPS_ADMIN만 |
| UPDATE | OPS_ADMIN만 |

### matching_recommendations

| 작업 | 조건 |
|------|------|
| SELECT | OPS_ADMIN 이상 |
| INSERT | OPS_ADMIN 이상 (시스템 생성) |
| DELETE | OPS_ADMIN 이상 (재계산 시) |

### case_assignments

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
| SELECT (consultant) | 배정된 케이스만 |
| INSERT | 배정된 컨설턴트만 |
| UPDATE | 배정된 컨설턴트만 (본인 작성) |

### roadmap_versions

| 작업 | 조건 |
|------|------|
| SELECT (ops) | OPS_ADMIN 이상 (읽기 전용) |
| SELECT (consultant) | 배정된 케이스만 |
| INSERT | 배정된 컨설턴트만 |
| UPDATE | 배정된 컨설턴트만 (DRAFT만 수정, FINAL 확정) |

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

## 보안 고려사항

1. **서비스 역할 키**: 감사 로그, 사용량 메트릭은 서버에서만 삽입
2. **역할 변경 제한**: 사용자는 자신의 role/status 변경 불가
3. **케이스 접근 제한**: 컨설턴트는 배정된 케이스만 접근
4. **자가진단 보호**: 컨설턴트는 조회만 가능, 수정 불가
5. **FINAL 확정 제한**: 로드맵 FINAL은 배정된 컨설턴트만 가능

## 테스트 체크리스트

- [ ] USER_PENDING이 케이스 접근 시 차단되는지 확인
- [ ] 컨설턴트가 배정되지 않은 케이스 접근 시 차단되는지 확인
- [ ] 컨설턴트가 자가진단 수정 시 차단되는지 확인
- [ ] OPS_ADMIN이 로드맵 수정 시 차단되는지 확인
- [ ] 배정된 컨설턴트만 FINAL 확정 가능한지 확인
