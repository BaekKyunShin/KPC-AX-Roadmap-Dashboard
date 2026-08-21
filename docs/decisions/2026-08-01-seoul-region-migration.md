# 운영 인프라 서울 리전 정렬: Supabase 이전 + Vercel 함수 리전 고정

**Date:** 2026-08-01
**Status:** Accepted

## Context

"페이지 이동·버튼 클릭이 전반적으로 느리다"는 문제 제기로 코드베이스 전수 성능 감사를 수행했다. 데이터량(DB 23MB·projects 74건)이나 트래픽은 원인이 아니었고, **인프라가 3대륙에 분산된 것**이 주된 원인이었다.

| 구성 요소   | 이전 위치                                                         |
| ----------- | ----------------------------------------------------------------- |
| 사용자      | 서울                                                              |
| Vercel 함수 | 미국 워싱턴 (iad1) — `vercel.json`에 `regions` 미지정 시 기본값   |
| Supabase DB | 인도 뭄바이 (ap-south-1) — 프로젝트 생성 시 리전 선택 실수로 추정 |

함수↔DB 왕복이 ~200ms 이고, 인증 확인을 포함해 페이지 1회 렌더에 6~8회 왕복이 누적됐다. 한국에서 뭄바이 DB 로 REST 단건 조회 시 TTFB 0.3~1.0초를 실측했다.

애플리케이션 코드는 이미 최적화 상태였다 — N+1 쿼리 0건, `.in()` 배치·`Promise.all` 병렬화 광범위 적용, 무거운 라이브러리(recharts·xlsx·jspdf) 지연 로드 완료. 즉 코드로 줄일 여지보다 네트워크 지연이 압도적이었다.

## Decision

운영 Supabase 프로젝트를 **서울(ap-northeast-2)에 신규 생성해 이전**하고, Vercel 함수 리전을 **서울(icn1)로 고정**한다.

- 운영 프로젝트: `axflsiffdbkitptgpavv`(뭄바이) → **`eabynvjnadzuiddjnama`**(서울, `roadmap-dashboard-kr`)
- `vercel.json` 에 `"regions": ["icn1"]` 명시 (PR #159 로 bom1 선적용 → #160 으로 icn1 전환)
- 이전 방식: **Supabase CLI 전체 덤프/복원** (근거는 Alternatives 참조)

## Alternatives

- **대시보드 "Restore to another project":** 동일 리전 전용이라 리전 변경에 사용 불가(공식 문서 확인). 기각.
- **신규 DB 에 `supabase db push` 로 마이그레이션 재적용:** 운영 `schema_migrations` 가 MCP `apply_migration` 기반 타임스탬프 버전과 순차 번호(001~079)로 혼재해 있고, `019`(비멱등 `ALTER PUBLICATION`)·`062`/`065`(`ON CONFLICT DO UPDATE` 로 버킷 설정 덮어씀) 함정이 있어 기각. 전체 덤프/복원이 현 상태를 그대로 복제해 안전하다.
- **뭄바이 유지 + 함수만 bom1 로 이동:** 컷오버 전 중간 단계로 실제 적용했고 0.51~1.24초 → 0.22~0.49초로 개선됐다. 다만 사용자·함수·DB 가 모두 서울인 편이 우월해 최종안으로 채택하지 않음.
- **프로젝트 일시정지 후 이전:** Supabase **Pro 플랜은 pause 자체가 불가**("Please downgrade it to free-tier first"). 해당 없음.

## Consequences

- **Pros**
  - 동적 페이지 응답 **0.51~1.24초 → 0.12~0.17초** (실측)
  - 앱↔DB 왕복 **~200ms → ~2ms** (동일 리전)
  - 기능·UI·화면 구성 변경 0. 코드 변경은 `vercel.json` 1줄뿐
- **Cons**
  - 전 사용자(41명) **1회 재로그인 필요** — 신규 프로젝트는 JWT 서명 키가 달라 기존 세션이 무효화된다. 진행 중이던 비밀번호 재설정 메일 링크도 무효
  - 컷오버 중 서비스 쓰기 중단(실제 약 40분)
  - Storage 객체·auth/storage RLS 정책·pg_cron 잡·Realtime publication 은 DB 덤프에 포함되지 않아 별도 이관이 필요했다
  - 구 프로젝트를 검증 유예 기간 동안 남겨두면 이중 과금(하루 ~450원). Pro 플랜은 pause 불가라 **과금 중단은 삭제만이 방법**

## Verification

컷오버 직후 실측·대조로 확인했다.

- `public` 스키마 25개 테이블 행 수 **전수 일치**(동결 시점 스냅샷 대조), `auth.users` 41, `supabase_migrations.schema_migrations` 69
- Storage 파일 32/32 복사, 대표 파일 바이트 단위 일치(681,791B), 버킷 상한 일치(`npm run check:storage-limits`)
- storage RLS 정책 6건, Realtime publication 2건(`messages`·`notifications`), pg_cron 잡 1건(`archive-audit-logs`, `0 18 1 * *`)
- 구 DB 무변화 확인 — 동결 중 유입 쓰기 0건
- **앱 실제 로그인 성공** — 구 DB 를 쓰기 동결한 상태였으므로, 로그인(refresh token 쓰기)이 성공한 것 자체가 앱이 신규 DB 를 사용한다는 결정적 증거
- 메뉴별 응답(중앙값): 알림 65ms · 프로필 136ms · 메시지 159ms · 공지 167ms · 갤러리 246ms · 사용자관리 265ms · 프로젝트관리 335ms

## 컷오버 절차에서 얻은 교훈

재이전·유사 작업 시 반복하지 않도록 남긴다.

| 함정                                        | 내용                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vercel env pull` 의 빈 값                  | **sensitive 변수를 빈 문자열로 반환**한다. 기존에 정상 동작하던 `LLM_API_KEY`·`SMTP_PASS` 등 19개가 전부 빈 값으로 보였다. 값 검증 근거로 쓰면 오판한다 — 빌드 성공 자체가 non-empty 증거다(`next.config.ts` 가 빌드타임에 누락 시 throw)                                                                  |
| `vercel env pull --environment=development` | `.env.local` 을 development 스코프로 **덮어써 production-only 시크릿을 날린다**. 컷오버 후에는 pull 대신 기존 파일에서 Supabase 3종만 수동 치환할 것                                                                                                                                                       |
| `vercel env add <name> preview`             | git-branch 프롬프트 때문에 비대화형 실행이 실패한다. **빈 문자열을 3번째 인자로** 전달하면(`preview "" --value ... --yes`) 전체 Preview 스코프로 지정된다                                                                                                                                                  |
| teardown 시 storage 보호 트리거             | 신규 프로젝트의 `storage.protect_delete()` 가 SQL 직접 DELETE 를 차단한다. 트랜잭션 내 `SET LOCAL session_replication_role = replica` 필요                                                                                                                                                                 |
| `TRUNCATE auth.users CASCADE` 의 한계       | FK 가 없는 `auth.flow_state` 등은 지워지지 않아 재복원 시 PK 충돌이 난다. `data.sql` 이 COPY 하는 **27개 테이블을 명시 TRUNCATE** 해야 한다                                                                                                                                                                |
| 쓰기 동결 방법                              | `ALTER DATABASE postgres SET default_transaction_read_only = on` 으로 강제해 유입 쓰기가 조용히 소실되지 않고 실패하게 했다. 단 **pooler 가 기존 커넥션을 재사용해 psql 로는 반영이 늦게 보인다**(MCP 직접 연결에는 즉시 반영). 잠금 중에는 대시보드의 DB 비밀번호 재설정도 실패한다(`ALTER ROLE` 이 쓰기) |
| 앱이 어느 DB 를 보는지 판별                 | Supabase URL 이 초기 JS 청크에 없어 **HTML·번들 grep 으로는 판별 불가**. "구 DB 쓰기 동결 + 앱 로그인 성공" 조합이 유일하게 결정적이었다                                                                                                                                                                   |
| 어드바이저 `unused_index`                   | 신규 DB 는 쿼리 통계가 초기화돼 멀쩡한 인덱스까지 "안 쓰임"으로 잡힌다(구 DB 11건 → 신규 60건). 최소 수 주 운영 후에만 판단 가능                                                                                                                                                                           |

교체가 필요했던 시크릿은 3곳이다 — Vercel env(Production·Preview·Development 3스코프) · GitHub Actions Secrets(Build·Lighthouse 잡이 사용, E2E 는 로컬 스택이라 무관) · 로컬 `.env.local`. 추가로 `supabase link` 재실행이 필요하다.

## 2026-08-21 추가 — DB 덤프에 담기지 않는 플랫폼 설정 누락

구 프로젝트 삭제 직전 검증에서 **대시보드 설정 5건이 이관되지 않았음**을 발견했다. 덤프/복원 방식의 구조적 사각지대다.

| 항목                     | 구             | 신(발견 시점)      | 영향                                            |
| ------------------------ | -------------- | ------------------ | ----------------------------------------------- |
| Storage 전역 업로드 한도 | 120MB          | 50MB               | 공지 첨부 100MB 가 50MB 에서 차단 (실사용 파손) |
| 메일 제목·한글 템플릿    | 커스텀 한글    | Supabase 기본 영문 | 재설정 메일 영문화                              |
| 커스텀 SMTP              | smtp.gmail.com | 미설정             | 내장 메일러(시간당 2통) 폴백                    |
| `uri_allow_list`         | 3개            | 1개                | 로컬 개발 리다이렉트 파손                       |
| `rate_limit_email_sent`  | 10             | 2                  | 메일 발송 한도 축소                             |

DB 계층은 이상 없음을 재확인했다 — 스키마 지문(테이블 25·컬럼 246·enum 146·제약 95·트리거 16·RLS 94)·확장·cron·publication·버킷 mime·`auth.identities`·백업 정책 전부 일치.

정본과 재발 방지 체크리스트는 `supabase/templates/README.md`.

## Follow-ups

- **구 뭄바이 프로젝트 삭제** (목표 2026-08-13~14). 현재 쓰기 잠금 상태로 보존 중. 절차·체크리스트는 리포 루트 `TODO_구DB삭제.md` (삭제 완료 시 그 파일도 함께 제거)
- **코드 계층 성능 개선 — 중단으로 결론.** 이 이전으로 왕복 비용이 ~200ms → ~2ms 가 되면서 코드로 줄일 여지가 사라졌다. 근거와 재검토 조건은 `docs/DECISIONS.md` ADR-032. 실제로 시도했다 원복한 탭 코드 분할은 `2026-08-01-result-tabs-no-code-split.md`
- 재검토 조건: 해외 사용자 비중이 유의미해지는 경우(멀티 리전·읽기 복제본 검토), Vercel/Supabase 서울 리전 장애·용량 제약 발생 시
