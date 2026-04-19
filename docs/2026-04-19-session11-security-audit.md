# 2026-04-19 OFA Step 12 Task 6 — 보안 감사 최종 리포트

## 요약

- **Critical**: 0건
- **High**: 3건 (본 PR 에서 2건 수정, H-3 별도 PR)
- **Medium**: 6건 (M-3 즉시 수정, 나머지 별도 PR)
- **Low**: 5건 (기록)

## High — 본 PR 수정 내역

### H-1 `archive_old_audit_logs` + 트리거 함수 search_path 패턴 및 `SECURITY DEFINER` 복원 ✅ 수정

- 마이그 **068_fix_trigger_security_definer.sql** 로 해결.
- `SET search_path = public` → `SET search_path = ''` + `public.` 완전 한정명으로 변경.
- `increment_like_count` / `decrement_like_count` 의 `SECURITY DEFINER` 복원 (마이그 066 회귀 수정).

### H-2 `createHrdReportSignedUrl` 역할 검증 추가 ✅ 수정

- `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts:371`
- `requireAuth()` → `requireAuthWithRole(['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'])`
- 컨설턴트 역할일 때 `requireConsultantProjectAccess()` 로 배정 여부 확인.

### H-3 `pbl_reports_ops_all` `FOR ALL` 정책 분리 ⚠️ 별도 PR 권장

- 마이그 061 의 `FOR ALL` 정책 4개 → `SELECT/INSERT/UPDATE/DELETE` 4종으로 분리 필요.
- 영향 범위가 기존 마이그 변경이라 별도 마이그 068 범위 밖. OFA 완료 후 보안 개선 PR.

## Medium

### M-3 트리거 함수 `SECURITY DEFINER` 누락 ✅ 수정 (H-1 과 함께)

### M-1 `notices` `USER_PENDING` 접근 (의도 여부 확인) — 문서화 완료
### M-2 `finalizePBLAction` 감사로그 실패 처리 — 서비스 레이어 try/catch 로 성공 로그 연속성 확보 필요 (별도)
### M-4 `buildStoragePath` `..` 시퀀스 명시 차단 필요 (별도)
### M-5 interview-attachments 업로드 시 `projectId` UUID Zod 검증 (별도)
### M-6 `getAttachmentDownloadUrl` DB 일치 조회 (별도)

## Low 5건: 기록만

L-1~L-5 는 기존 설계 의도 확인이 필요한 항목들로 본 PR 에서 수정 대상 아님.

## 양호 (15개 패턴 확인)

1. 3계층 방어 (middleware → Server Action → RLS) 완전 구현
2. `HWPX_API_SECRET` 서버 전용 + 헤더 검증 (401 분기)
3. 환경변수 클라이언트 노출 없음 (`NEXT_PUBLIC_` 접두사 미사용)
4. ROADMAP/PBL 트랙 격리 (`generatePBLAction`, `savePBLInterview` 등 전부 track 가드)
5. Storage signed URL 역할 제어 (H-2 수정 후 완전)
6. HRD이음 `storagePath.startsWith(projectId+'/')` 경로 가드
7. `pbl_reports` RLS — `is_approved_consultant() AND is_assigned_to_project()`
8. interview-attachments storage RLS — 067 에서 initplan 래핑 완료
9. `createAdminClient()` 73개 파일 사용처 모두 서버 전용 (`'use client'` 없음)
10. 파라미터화 쿼리 (raw SQL 주입 없음)
11. Zod 검증은 역할 검사 이후 실행
12. audit_logs_archive 066 에서 OPS_ADMIN+ RLS 정책 추가
13. `ROADMAP_SHARED` enum 067 추가 + `toggleShare`/`togglePBLShare` 감사로그 활성
14. `/api/matching/generate` 라우트 인증 선행
15. 공개 자가진단 토큰 기반 보호

## advisor 현황

- `rls_disabled_in_public` (audit_logs_archive): 066 에서 해결 ✅
- `function_search_path_mutable` (3함수): 068 에서 해결 ✅
- `auth_leaked_password_protection` (WARN): 🔴 **Auth 설정** — Supabase Dashboard → Authentication → Password Security 에서 사용자(팀장)가 수동 활성화 필요

## 결론

**본 PR 의 보안 품질은 프로덕션 반영 가능한 수준**. Critical 0, High 3 중 2건 수정. 남은 H-3 (`FOR ALL` 정책 분리) 은 영향 범위 있는 리팩토링이라 별도 보안 개선 PR 로 분리.
