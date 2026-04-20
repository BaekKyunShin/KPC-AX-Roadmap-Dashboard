# OFA 후속 개선 작업 계획서 (6건 일괄 PR)

**작성일**: 2026-04-20
**배경**: OFA 프로젝트(main PR #14) 완료 후 감사로 발견된 개선 항목. 프로덕션 영향 없음, 여유 될 때 별도 PR 로 처리.
**처리 방식**: 단일 세션 · 단일 브랜치 · 단일 PR 로 6건 일괄
**예상 소요**: 1~1.5 일

---

## 출처

- `docs/2026-04-19-session11-security-audit.md` (보안 H-3 + M-4·M-5·M-6)
- `docs/2026-04-19-session11-performance-audit.md` (성능 H-1·H-2)

---

## 작업 우선순위

| 순위 | 카드 | 분류 | 체감 영향 |
|------|------|------|-----------|
| 1 | C1. 감사로그 검색 서버 이전 | UX 버그 | 운영자가 카운트 오표시로 혼란 |
| 2 | C2. 갤러리 쿼리 DB 뷰 도입 | 성능 | 사용자 증가 시 체감 |
| 3 | C3. RLS `FOR ALL` 정책 분리 | 보안 강화 | 미래 정책 추가 시 사고 예방 |
| 4 | C4. 경로 traversal `..` 명시 차단 | 보안 강화 | 방어 한 층 추가 |
| 5 | C5. 프로젝트 ID UUID Zod 검증 | 보안 강화 | 첨부 업로드 입력 검증 |
| 6 | C6. 첨부 다운로드 DB 대조 | 보안 강화 | 같은 버킷 내 경로 임의 접근 방지 |

---

## 카드 상세

### C1. 감사로그 검색어 서버 쿼리 이전

**문제**
운영관리자가 `/ops/audit` 에서 검색창에 키워드 입력 시 브라우저에서 `logs.filter(...)` 로 필터링. 서버의 `total` 카운트와 화면에 표시되는 `filteredLogs.length` 가 불일치 → "100건 중 3건" 처럼 엉터리 카운트.

**위치**
- `src/app/(dashboard)/ops/audit/_components/AuditLogClient.tsx:227~233` (filteredLogs)
- `src/app/(dashboard)/ops/audit/actions.ts` (`fetchAuditLogs` Server Action)

**수정 방향**
1. `fetchAuditLogs` 파라미터에 `keyword` 추가 + Zod 스키마 갱신
2. Supabase 쿼리에 `.or('actor_name.ilike.%KW%,action.ilike.%KW%,target_id.ilike.%KW%')` 추가 (적절한 컬럼 확정 필요)
3. 클라이언트의 `filteredLogs` 제거, `logs` 직접 렌더
4. `total` 은 이미 서버 집계 → 카운트 정확해짐
5. `AuditLogClient.test.tsx` 업데이트

**예상 작업량**: S (0.5 일)
**의존 관계**: 없음

---

### C2. 갤러리 ALL 트랙 + 검색어 쿼리 4→1 회 단축

**문제**
`fetchGalleryItems` 가 ALL 트랙 시 `fetchGalleryRoadmaps` + `fetchGalleryPBLReports` 병렬 호출. 각 함수가 검색어 처리용으로 `projects` 테이블에 추가 쿼리 발행 → 총 **4회**. 코드 주석에도 "Step 12 검토" 로 표기된 기지 이슈.

**위치**
- `src/app/(dashboard)/gallery/actions/queries.ts:590~647` (fetchGalleryItems)
- `src/app/(dashboard)/gallery/actions/queries.ts:207~209` + `480~482` (search 처리)

**수정 방향 A (경량)**: `fetchGalleryItems` 에서 projects 검색 결과를 한 번만 조회해 양쪽 함수에 주입. 쿼리 3→2 회.

**수정 방향 B (권장)**: Supabase `VIEW` 또는 `MATERIALIZED VIEW` 로 `gallery_items_view` 도입. ROADMAP + PBL 통합 컬럼. 쿼리 1회 + 정렬·필터 DB 레벨.
- 마이그 069 신설: `CREATE VIEW gallery_items_view AS ...`
- RLS 는 underlying 테이블에 이미 있음 (뷰는 `SECURITY INVOKER` 기본)

**예상 작업량**: 방향 A = S (0.5일), 방향 B = M (1일)
**의존 관계**: 없음

---

### C3. RLS `FOR ALL` 정책 4개 분리

**문제**
마이그 061·062 의 OPS 관리자 정책이 `FOR ALL` 한 줄로 뭉쳐 있음. 감사 체크리스트 규칙 "FOR ALL 금지" 위반. 미래에 새 작업(예: `TRUNCATE`) 생겼을 때 의도치 않은 권한 부여 가능.

**위치**
- `supabase/migrations/061_add_pbl_reports.sql:111~113` (pbl_reports_ops_all)
- `supabase/migrations/062_add_notices.sql` (notices_mutate_ops_sys · notice_attachments_mutate_ops_sys · notice_attachments_storage_mutate_ops_sys)

**수정 방향**
1. 새 마이그 070 작성
2. 기존 `FOR ALL` 정책 4개 DROP
3. 각각 `SELECT` / `INSERT` / `UPDATE` / `DELETE` 4개로 재생성 (총 16개 정책)
4. 기능 회귀 없도록 Playwright smoke 로 확인

**예상 작업량**: M (1일, 마이그 작성 + 회귀 검증 포함)
**의존 관계**: 없음

---

### C4. 경로 traversal `..` 명시 차단

**문제**
`sanitizeFileName` 이 특수문자를 `_` 로 치환하지만 `..` 시퀀스는 점이 허용되므로 `.._.._etc_passwd` 로 통과. 현재 경로 구조상 실제 traversal 어렵지만 "방어 한 층 더" 원칙.

**위치**
- `src/lib/services/notice.ts:328` (sanitizeFileName)

**수정 방향**
```ts
export function sanitizeFileName(name: string): string {
  // 1. .. 시퀀스 먼저 제거
  let s = name.replace(/\.{2,}/g, '_');
  // 2. 기존 특수문자 치환 로직
  // ...
  return s;
}
```
단위 테스트에 `../../etc/passwd` · `...../..../x` 케이스 추가.

**예상 작업량**: XS (1시간)
**의존 관계**: 없음

---

### C5. 프로젝트 ID UUID Zod 검증 강화

**문제**
`interview-attachments` 업로드 시 `uploadHrdReportAttachment(projectId, ...)` 의 `projectId` 가 임의 문자열이어도 Storage RLS 정책(`(storage.foldername(name))[1] = project_id::text`) 만 방어. 잘못된 형식이 경로에 들어가면 정책 평가 비용이 커짐.

**위치**
- `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` (uploadHrdReportAttachment 등)

**수정 방향**
1. Zod `z.string().uuid()` 스키마 도입
2. 함수 진입 시 `projectId` 검증 → 실패 시 400 에러
3. 다른 첨부 업로드 Server Action 에도 동일 패턴 적용

**예상 작업량**: XS (0.5 일)
**의존 관계**: 없음

---

### C6. 공지 첨부 다운로드 DB 일치 조회

**문제**
`getAttachmentDownloadUrl(storagePath)` 가 문자열 기본 타입만 검증. `notice-attachments` 버킷 고정이라 버킷 이탈은 불가하지만, **같은 버킷 내** 임의 경로(다른 공지의 첨부 등)에 signed URL 발급 가능.

**위치**
- `src/app/(dashboard)/notices/actions.ts:19~39` (getAttachmentDownloadUrl)

**수정 방향**
1. `notice_attachments` 테이블에 `storagePath` 조회 → 존재하면 해당 `notice_id` 확인
2. 현재 사용자가 해당 공지에 접근 가능한지 검증 (is_published OR 작성자 OR OPS)
3. 통과 시에만 signed URL 발급

**예상 작업량**: S (0.5 일)
**의존 관계**: 없음

---

## 단일 세션 실행 프롬프트

다음 세션에서 아래 프롬프트를 그대로 붙여넣으면 Claude 가 6건 일괄 처리.

---

```
=== 컨텍스트 ===
- 프로젝트: KPC AI 훈련 로드맵 대시보드 (/Users/baekkyunshin/Desktop/AI-roadmap-dashboard)
- 계획서: docs/plans/2026-04-20-ofa-followup-improvements.md (이 파일 정독)
- 배경: OFA 프로젝트(main PR #14) 머지 완료 후 감사 이슈 6건 일괄 처리
- 본 세션: 단일 브랜치 + 단일 PR. base=main
- main 머지 후 본 세션 종료. 후속 없음

=== 사전 검증 ===
1. cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
2. git fetch origin && git checkout main && git pull
3. git log -1 --oneline  → OFA 최종 머지 커밋 확인
4. npm run validate && npm run build  → baseline PASS
5. mcp__supabase__get_advisors security  → WARN 0~1 건만 (leaked password 는 OK)
6. mcp__supabase__list_migrations  → 060~068 모두 적용 확인

검증 실패 시 즉시 보고 + 중단.

=== 필수 정독 ===
1. docs/plans/2026-04-20-ofa-followup-improvements.md — 본 계획서
2. docs/2026-04-19-session11-security-audit.md
3. docs/2026-04-19-session11-performance-audit.md
4. CLAUDE.md + docs/RLS.md + docs/ARCHITECTURE.md

=== 진행 원칙 ===
- 브랜치 생성: `feature/ofa-followup-improvements` (base=main)
- 6개 카드를 C1 → C6 순서로 처리 (UX 버그 > 성능 > 보안)
- 각 카드마다:
  (a) TDD (가능한 경우): 단위 테스트 먼저 실패 → 구현 → 통과
  (b) 관련 skill 호출 (check-server-action · supabase-dev · refactoring)
  (c) 변경 후 `npm run typecheck` 빠른 검증
- C2 방향 선택: **방향 B (gallery_items_view)** 권장. 단 복잡도 높으면 방향 A 로 fallback 하고 리포트 기록
- C3 마이그 번호: 070 (069는 갤러리 뷰 도입 시 예약)
- 각 카드 완료 후 커밋 1개 (타입 prefix: fix 또는 refactor)

=== Task 목록 ===
**0. 브랜치 생성**: `feature/ofa-followup-improvements` (base=main)

**1. C1 — 감사로그 검색 서버 이전** (S)
  - fetchAuditLogs 에 keyword 파라미터 + Zod
  - Supabase `.or()` 쿼리
  - AuditLogClient.tsx 의 filteredLogs 제거
  - 테스트 업데이트

**2. C2 — 갤러리 쿼리 단축** (M, 방향 B)
  - 마이그 069: `CREATE VIEW gallery_items_view AS ...`
  - `fetchGalleryItems` 리팩토링 (단일 쿼리)
  - 테스트 + Playwright 스모크로 회귀 확인
  - 방향 A 로 fallback 시 docs/2026-MM-DD-c2-decision.md 에 이유 기록

**3. C3 — FOR ALL 정책 분리** (M)
  - 마이그 070: pbl_reports_ops_all + notices 3정책 → 각 4개씩 총 16개 재작성
  - mcp__supabase__apply_migration 로 적용
  - advisor 재확인
  - Playwright smoke (OPS 삭제·수정 시나리오)

**4. C4 — `..` 차단** (XS)
  - `sanitizeFileName` 수정
  - notice-attachments + 테스트 케이스 추가

**5. C5 — UUID Zod 검증** (XS)
  - `projectId` 검증 스키마 추가
  - uploadHrdReportAttachment / removeHrdReportAttachment / createHrdReportSignedUrl 3곳 적용

**6. C6 — 다운로드 DB 대조** (S)
  - getAttachmentDownloadUrl 에 notice_attachments 조회 추가
  - 권한 검증 (is_published OR 작성자 OR OPS)
  - 테스트

**7. 전체 회귀 검증**
  - `npm run validate && npm run build && npm run test:e2e`
  - `.venv-hwpx/bin/pytest api/hwpx/`
  - mcp__supabase__get_advisors security·performance (경고 감소 확인)

**8. PR 생성**
  - base=main, head=feature/ofa-followup-improvements
  - 제목: "refactor(ofa-followup): 감사 후속 개선 6건 (C1~C6)"
  - body 에 각 카드 before/after 요약 + advisor 개선 수치

=== 자동 진행 vs 승인 요청 ===
- 자동 진행: 모든 Task (TDD, typecheck, validate, 마이그 적용)
- 승인 요청:
  - C2 방향 A fallback 시
  - 예상외 회귀 발견 시
  - main PR 생성 직전 (최종 확인)
  - main PR 머지는 절대 자동 금지

=== 금지 사항 ===
- gh pr merge --auto · force push · --no-verify
- main 직접 push
- main PR 사람 승인 없이 머지
- 마이그 파일 재수정 (069·070 신설만)

=== 세션 종료 시 ===
1. npm run validate && npm run build 최종 통과
2. advisor 경고 감소 수치 리포트
3. PR URL + 각 카드 완료 여부 ✅/❌ 보고
4. 팀장 수동 머지 대기 안내
```

---

## 부록: 작업 완료 기준

- [ ] 6개 카드 전부 ✅ (C2 방향 B 또는 A fallback 기록)
- [ ] `npm run validate` · `build` · `test:e2e` 전부 PASS
- [ ] Supabase advisor security WARN 감소 (다중 permissive policy 감소 기대)
- [ ] 감사로그 `/ops/audit` 검색 UX 카운트 정확
- [ ] 갤러리 ALL+검색 쿼리 호출 횟수 절반 이하
- [ ] PR description 에 before/after 벤치마크 (간단히)

## 부록: 처리하지 않는 항목

다음은 본 PR 범위 밖 (별도 검토):

- 보안 L-1~L-5 (설계 의도 확인 필요)
- 성능 advisor `multiple_permissive_policies` 138건 전수 재설계 (중대 스키마 변경)
- `unused_index` 24건 (실제 쿼리 패턴 분석 후 결정)
- `auth_leaked_password_protection` (Supabase Auth Dashboard 수동 설정)
