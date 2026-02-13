/**
 * 데이터베이스 관련 공통 상수
 */

/** PostgreSQL 중복 키 에러 코드 (unique_violation) */
export const PG_UNIQUE_VIOLATION = '23505';

/** PostgreSQL 테이블 없음 에러 코드 (undefined_table) */
export const PG_TABLE_NOT_FOUND = '42P01';

/** Supabase PostgREST: 조회 결과 없음 에러 코드 */
export const SUPABASE_NO_ROWS = 'PGRST116';

/** 널 UUID (감사 로그 등에서 대상 ID가 없을 때 사용) */
export const NULL_UUID = '00000000-0000-0000-0000-000000000000';
