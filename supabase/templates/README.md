# Supabase 플랫폼 설정 백업

## 왜 이 디렉터리가 있나

2026-08-01 서울 리전 이전은 **DB 전체 덤프/복원** 방식이었다. 덤프는 DB 안의 것만 담는다.
아래 항목은 DB 가 아니라 **Supabase 대시보드(플랫폼) 설정**이라 이전 대상에서 통째로 누락됐고,
2026-08-21 구 프로젝트 삭제 직전 검증에서야 발견됐다.

| 누락 항목                    | 증상                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| 이메일 템플릿·제목           | 비밀번호 재설정 메일이 한글 → Supabase 기본 영문으로 회귀     |
| 커스텀 SMTP                  | 내장 메일러로 폴백 (시간당 2통 제한, 운영 부적합)             |
| Redirect URL 허용목록        | 3개 → 1개. `localhost:3000/**` 소실로 로컬 리다이렉트 파손    |
| **Storage 전역 업로드 한도** | 120MB → 50MB. 공지 첨부 상한 100MB 가 실제로는 50MB 에서 막힘 |

구 프로젝트를 지웠다면 한글 템플릿 원본은 복구 불가능했다. 재발 방지를 위해 여기에 보존한다.

## 파일

- `recovery.ko.html` — 비밀번호 재설정 메일 한글 템플릿 정본
- `auth-settings.ko.json` — 인증/SMTP 설정값 (비밀번호는 미포함)

## 프로젝트 이전 시 체크리스트

DB 덤프/복원과 **별개로** 아래를 수동 이관할 것. Management API 로 대조 가능하다.

```bash
# 전항목 diff (읽기 전용)
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/<ref>/config/auth"
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/<ref>/config/storage"
```

- `config/auth` — 이메일 템플릿 6종·제목·SMTP·Site URL·`uri_allow_list`·JWT 만료·rate limits
- `config/storage` — `fileSizeLimit` (**전역·버킷 중 작은 쪽이 실제 한도**)
- `config/database/postgres` · `postgrest` · `ssl-enforcement` · `network-restrictions`

주의: `rate_limit_email_sent` 는 커스텀 SMTP 가 먼저 설정돼야 상향할 수 있다.
`smtp_pass` 는 API 가 암호화된 값을 돌려주므로 그대로 재적용해도 인증에 실패한다 — 원본 앱 비밀번호가 필요하다.
