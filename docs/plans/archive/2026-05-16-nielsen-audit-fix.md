# 2026-05-16 Nielsen 휴리스틱 감사 #1·#2·#4 해결 계획서

## 메타

- **보고서**: `docs/reports/2026-05-16-nielsen-heuristics-audit.md` (작업 완료 후 archive 이동)
- **브랜치**: `fix/nielsen-audit-2026-05-16`
- **반영 이슈**: 2건 (#1·#4)
  - 사용자 결정으로 제외: #3 일괄 처리 (컨설턴트 30명 내외, 일괄 등록 필요성 낮음), #5 공지 아카이빙 (당장 필요성 낮음, 복잡도 대비 가치 부족)
  - 코드 검증으로 이미 해결됨이 확인되어 제외: #2 미승인 사용자 안내 (`PendingApprovalCard` 가 「승인 대기 중입니다」 메인 카드·환영 메시지·진행 스테퍼·도움말·연락처까지 풍부히 제공 중)
- **추정 시간**: 약 2시간 (TDD 포함)
- **진실의 원천**: 보고서 4단의 ASCII mockup 라벨이 본 계획·구현과 정확히 일치해야 함

## 구현 순서 (의존 없음 — 독립 이슈 3건)

| 순서 | 이슈                         | 추정 | 핵심 변경                                            |
| ---- | ---------------------------- | ---- | ---------------------------------------------------- |
| 1    | #2 미승인 사용자 안내        | 30분 | 대시보드 page.tsx 배너 + Navigation 헤더 칩          |
| 2    | #4 갤러리 「내 산출물」 토글 | 60분 | Server Action scope 파라미터 + TrackFilter 패턴 토글 |
| 3    | #1 추천 카드 프로필 정보     | 60분 | SelectableCard 헤더 아래 칩+연차                     |

#2 → #4 → #1 순서 권장 (단순한 것부터). 의존 없으므로 순서 자유.

## 이슈 #2 — 미승인 사용자 안내

### 변경 파일

- [src/app/(dashboard)/dashboard/page.tsx](<src/app/(dashboard)/dashboard/page.tsx>) — 인사말 아래 조건부 배너 추가
- [src/components/Navigation.tsx:247-258](src/components/Navigation.tsx#L247-L258) — 미승인 역할일 때 `⏳` prefix 추가 (`renderRoleBadge`)
- 신규: `src/app/(dashboard)/dashboard/_components/PendingApprovalBanner.tsx` (또는 page.tsx 인라인 — 단순성 우선 인라인)

### 재사용 자산

- `src/components/ui/alert.tsx` (shadcn `Alert`, `AlertTitle`, `AlertDescription`)
- `src/lib/constants/navigation.ts:getRoleBadgeConfig` (역할별 라벨/스타일 출처)

### 테스트

- 단위: `Navigation.test.tsx` 에 「USER_PENDING 일 때 역할 뱃지에 ⏳ 표시」 케이스 추가
- 단위: 새 dashboard page 컴포넌트 또는 인라인 분기 검증 — `PendingApprovalBanner.test.tsx` 또는 page snapshot
- E2E: 본 변경 시각 검증만 — page.tsx Server Component이므로 단위 테스트로 충분

### 검증

- USER_PENDING 으로 로그인 → `/dashboard` 진입 → 인사말 아래 노란 배너 + 헤더 「⏳ 승인 대기」 칩 표시 확인
- 정확한 라벨: 「가입 신청이 접수되었습니다. 운영팀 승인 후 모든 메뉴를 사용할 수 있습니다 (영업일 기준 2일 이내).」

## 이슈 #4 — 갤러리 「내 산출물」 토글

### 변경 파일

- [src/lib/schemas/gallery.ts:6-19](src/lib/schemas/gallery.ts#L6-L19) — `galleryFiltersSchema` 에 `scope: z.enum(['all', 'mine']).optional().default('all')` 추가
- [src/app/(dashboard)/gallery/actions/queries.ts](<src/app/(dashboard)/gallery/actions/queries.ts>) — `fetchGalleryRoadmaps`·`fetchGalleryPBLReports` 두 함수에 `scope === 'mine'` 시 `.eq('created_by', user.id)` 분기 추가 (라인 184 부근 컨설턴트 분기에 합류)
- [src/app/(dashboard)/gallery/\_components/GalleryContent.tsx](<src/app/(dashboard)/gallery/_components/GalleryContent.tsx>) — `scope` URL state + 토글 UI (TrackFilter 패턴 차용)
- 신규: `src/components/gallery/ScopeFilter.tsx` — TrackFilter 와 동일 구조의 토글 컴포넌트 (`all`/`mine`)

### 재사용 자산

- `src/components/gallery/TrackFilter.tsx` — 동일 구조 토글 패턴 차용
- `src/components/ui/EmptyState.tsx` — 기존 빈 상태 그대로 사용 (변경 없음)
- `requireAuth` 헬퍼 (`src/lib/actions/auth-helpers.ts`)

### 테스트

- 단위: `galleryFiltersSchema.test.ts` 에 `scope` 기본값·유효값·잘못된 값 케이스 추가
- 단위: `queries.test.ts` 에 「scope=mine 일 때 본인 created_by 만 필터링」 케이스 추가
- 단위: 신규 `ScopeFilter.test.tsx` — toggle 변경 시 onChange 호출 확인
- 단위: `GalleryContent.test.tsx` 에 토글 변경 시 URL `?scope=mine` 동기화 확인

### 검증

- 컨설턴트 계정으로 갤러리 진입 → 「전체 갤러리 / 내 산출물」 토글 표시 → 「내 산출물」 클릭 → URL `?scope=mine` 동기화 → 본인 공유분만 노출
- 본인 공유분 0건일 때 기존 EmptyState 「아직 공유된 산출물이 없습니다 / 산출물을 확정한 후 갤러리에 공유해보세요.」 그대로 표시

## 이슈 #1 — 추천 카드 프로필 정보

### 변경 파일

- [src/components/ops/assignment/SelectableCard.tsx:75-83](src/components/ops/assignment/SelectableCard.tsx#L75-L83) — 헤더(이름·이메일·점수) 와 LLM 분석 텍스트 사이에 「전문 산업 칩 + 연차」 섹션 삽입
- [src/components/ops/assignment/utils.ts](src/components/ops/assignment/utils.ts) — 신규 헬퍼 `getConsultantProfile(candidate)` 추가 (배열·객체 형식 모두 안전 추출)

### 재사용 자산

- `Badge` 컴포넌트 (`src/components/ui/badge.tsx`) — 전문 산업 칩
- 기존 `parseRationale` 패턴 — 데이터 없을 때 빈 배열·undefined 처리 안전 처리

### 데이터 모델

`Recommendation.candidate.consultant_profile` 가 `ConsultantProfile[] | Record<string, unknown>` 두 형태로 도착 가능 (`utils.ts:73`):

- 배열인 경우 첫 요소 사용
- 객체인 경우 그대로 사용
- 신규 헬퍼 `getConsultantProfile()` 가 정규화 책임

`expertise_domains` 와 `available_industries` 중 비어있지 않은 첫 배열을 산업 칩으로 사용. 둘 다 비어있으면 칩 미렌더.
`years_of_experience` 가 양수일 때만 「경력 N년」 표시.

### 테스트

- 단위: `utils.test.ts` 에 `getConsultantProfile` 케이스 추가 (배열, 객체, undefined, 빈 배열)
- 단위: `SelectableCard.test.tsx` 에:
  - 프로필 있을 때 산업 칩·연차 렌더 확인
  - `expertise_domains` 만 있을 때 칩 노출
  - `available_industries` 만 있을 때 칩 노출
  - 둘 다 없을 때 칩 영역 미렌더
  - `years_of_experience` 가 0 또는 undefined 일 때 연차 미렌더

### 검증

- 운영자 계정으로 프로젝트 상세 > 배정 탭 진입 → 자동 매칭 실행 → 카드에 「`[제조][금융][IT]`」 칩 + 「경력 20년」 표시
- 컨설턴트 프로필이 비어 있는 추천 카드는 칩·연차 영역 자체가 미렌더

## 롤백 시나리오

각 이슈가 독립이므로 단독 revert 가능. 커밋 단위:

- `fix: H10·H1 미승인 사용자 대시보드 안내 배너·승인 대기 칩 추가`
- `fix: H2 갤러리 「내 산출물」 토글 + Server Action scope 파라미터 추가`
- `fix: H6 컨설턴트 배정 추천 카드 프로필 핵심 정보 노출`
- `docs: Nielsen 감사 보고서 아카이브 (3건 해결 완료)`

## 검증 체크리스트

- [ ] `npm run validate` (typecheck + lint + test) pass
- [ ] `npm run build` pass
- [ ] 신규 테스트 추가 (Vitest 단위 — 위 각 이슈별)
- [ ] 보고서 4단의 ASCII mockup 라벨과 실제 구현 라벨이 정확히 일치 (grep 검증)
- [ ] PR Preview URL 에서 USER_PENDING 시나리오 시각 확인
- [ ] PR Preview URL 에서 갤러리 토글 동작 확인
- [ ] PR Preview URL 에서 추천 카드 칩·연차 노출 확인
- [ ] 보고서 archive 이동 단독 커밋
- [ ] CI 모든 check (Lint·Unit·Build·E2E·Vercel) `conclusion=SUCCESS`
