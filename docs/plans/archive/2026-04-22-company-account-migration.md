# 회사 계정 이전 체크리스트 (Vercel · Supabase Pro)

**작성일**: 2026-04-22
**대상**: 개인 계정(Hobby/Free) → 회사 계정(Pro) 이전
**예상 소요**: 회사 팀·조직 신규 생성 포함 **1시간 ~ 1시간 30분**
**전략**: 양쪽 모두 공식 **Transfer(이전)** 기능 사용 → URL·키·DB·배포 이력·env·도메인 전부 유지 → **코드/env 변경 0**

> 이 문서는 체크리스트 형식입니다. 각 박스 `[ ]`를 `[x]`로 채워가며 진행하세요. 중간에 막히면 맨 아래 **진행 메모 / 질문** 섹션에 기록.

---

## 목차

1. [사전 상태 스냅샷](#사전-상태-스냅샷)
2. [Step 0 — 사전 준비](#step-0--사전-준비-15분-필수)
3. [Step 1 — Supabase 프로젝트 이전](#step-1--supabase-프로젝트를-회사-org로-이전-10분)
4. [Step 2 — Vercel 프로젝트 이전](#step-2--vercel-프로젝트를-회사-팀으로-이전-10분)
5. [Step 3 — GitHub Secrets 검증](#step-3--github-secrets-검증-2분)
6. [Step 4 — 최종 스모크 테스트](#step-4--최종-스모크-테스트-10분)
7. [Step 5 — 이후 권장 조치](#step-5--이후-권장-조치-선택)
8. [롤백 플랜](#롤백-플랜)
9. [가장 흔한 실수 3가지](#가장-흔한-실수-3가지-꼭-피할-것)
10. [진행 메모 / 질문](#진행-메모--질문)

---

## 사전 상태 스냅샷

**스냅샷 기준일**: 2026-04-22 (이전 실행 당일 기준으로 재확인 권장)

| 항목 | 현재 값 |
|------|---------|
| Vercel 팀 | `werooring-3134's projects` (개인 Hobby) |
| Vercel 프로젝트 | `kpc-ax-roadmap-dashboard` (`prj_DVJvj62xLPP1BpkensN6Uozz1tqq`) |
| 프로덕션 URL | `https://kpc-ax-roadmap-dashboard.vercel.app` (**커스텀 도메인 없음**) |
| Vercel env 개수 | **12개** (Supabase 3 + LLM 3 + HWPX 1 + 앱 2 + 자동화 1 + 쿼터 2) |
| Supabase 프로젝트 ref | `axflsiffdbkitptgpavv` (Free, 단일 — dev/prod 분리 없음) |
| 마이그레이션 | 65개 (001~068) |
| GitHub | `BaekKyunShin/KPC-AX-Roadmap-Dashboard` (개인, **유지**) |
| GitHub Secrets | 10개 (Supabase 3 + LLM 1 + E2E 6) |
| SMTP env | Vercel엔 **미등록** (로컬만) — 프로덕션 이메일 기능 아직 미사용 |
| Supabase advisor | ERROR 0 · security WARN 1 (auth_leaked_password_protection) |

### 핵심 전략

> Supabase·Vercel 모두 공식 **Transfer** 기능을 제공합니다. Transfer하면 project ref·URL·anon/service_role 키·DB·Auth 유저·Storage·env·도메인·배포 이력이 **전부 그대로 유지**되어 코드와 env var를 건드릴 필요가 없습니다.
>
> 새 프로젝트로 재구축(마이그 65개 재적용 + Auth 유저 export/import + Storage 복제)하는 경로는 실패 지점이 10배 많습니다. **Transfer를 선택.**

---

## Step 0 — 사전 준비 (약 40~50분)

> 회사 계정을 **처음부터** 세팅한 뒤 백업까지 끝내는 단계입니다. 이 단계를 건너뛰면 Step 1·2의 Transfer가 수신 불가로 실패합니다.

### 0-1. 회사 Vercel 팀 생성 + Pro 결제 (10분)

**준비물**: 회사 이메일 계정, 회사 결제 카드

1. 브라우저에서 **회사 이메일로** https://vercel.com/signup 가입 (이미 계정 있으면 로그인)
2. 우측 상단 팀 드롭다운 → **Create Team**
3. 입력:
   - **Team Name**: 예) `KPC AX` (표시용, 변경 자유)
   - **Team Slug**: 예) `kpc-ax` (URL 경로에 포함, **한 번 정하면 변경 까다로움** — 신중히)
4. **Plan**: **Pro** 선택 → 카드 등록 → 결제 확정
5. 생성 후 **Settings → Billing**에서 `Current Plan: Pro` 확인

- [ ] Team Slug 기록: `__________________`
- [ ] Billing 화면에서 Pro 활성 확인

> Pro 요금: $20/user/month. Owner 포함 모든 Member가 과금 대상이므로 초반엔 멤버 최소화.

### 0-2. 브라우저 프로필 분리 (5분)

> **결정**: werooring을 회사 Vercel 팀에 멤버로 초대하지 않음 (월 $20 유지). Transfer는 werooring이 시작하고 **회사 계정이 Accept** 하는 구조로 진행.

계정 혼동을 막기 위해 브라우저 프로필을 둘로 나눕니다.

1. Chrome 우상단 프로필 아이콘 → **Add** → 프로필 A 이름: `회사 Vercel/Supabase`
2. 새 프로필에서 **회사 이메일**로:
   - https://vercel.com/login → 로그인 → 회사 팀 노출 확인
   - https://supabase.com/dashboard → 로그인 → 회사 Org 노출 확인
3. 기존 프로필에서는 **werooring@gmail.com**으로 Vercel·Supabase 로그인 유지
4. 2FA·매직링크 수신용으로 회사 이메일 메일함 접근성 확인

- [ ] Chrome 프로필 2개 분리 완료
- [ ] 회사 프로필에서 Vercel Pro 팀·Supabase Org 진입 확인
- [ ] 개인 프로필에서 werooring 계정으로 현재 프로젝트(`kpc-ax-roadmap-dashboard`, `axflsiffdbkitptgpavv`) 접근 확인

> **주의**: 회사 이메일 접근성을 절대 잃지 마세요 — 2FA·비번 재설정·청구서 모두 회사 이메일로 전송됩니다. 장기적으로는 회사 내 **다른 멤버 1명을 Owner로 추가**해 백업 관리자를 두는 걸 권장 (단일 관리자 리스크 회피).

### 0-3. 회사 Supabase 조직 생성 + Pro 결제 (10분)

1. **회사 이메일로** https://supabase.com/dashboard 가입 (또는 로그인)
2. 좌측 상단 조직 드롭다운 → **New Organization**
3. 입력:
   - **Name**: 예) `KPC AX`
   - **Type**: Company
   - **Plan**: **Pro** 선택
4. 카드 등록 → 결제 확정
5. 생성 직후 **Organization → Billing**에서 `Plan: Pro` 확인

- [ ] Org Slug/ID 기록: `__________________`
- [ ] Billing에서 Pro 활성 확인

> Pro 요금: $25/월 기본 (DB 8GB·Storage 100GB 포함). Branching 사용 시 별도.

### 0-4. Supabase도 초대 없이 회사 계정으로 직접 관리

Supabase도 Vercel과 동일한 전략. werooring을 회사 Org 멤버로 초대하지 않습니다.

- Transfer 요청: werooring 계정(개인 Org Owner)에서 시작
- Transfer Accept: 회사 계정(회사 Org Owner)에서 진행
- 이후 Supabase 관리·대시보드는 **회사 계정으로만 로그인** (Chrome 회사 프로필)
- Supabase MCP(Claude Code)용 access token은 **회사 Org에서 새로 발급**해서 교체 (Step 1 완료 후)

- [ ] 회사 Supabase Org가 Pro로 결제 활성 상태 확인 (회사 프로필에서 `supabase.com/dashboard/org/<slug>/billing`)

### 0-5. 양쪽 접근성·결제 최종 확인

이 체크를 통과해야 Transfer를 시작할 수 있습니다.

- [ ] 회사 **Vercel 팀: Pro 결제 활성** (Owner는 회사 이메일, werooring 초대 없음)
- [ ] 회사 **Supabase Org: Pro 결제 활성** (Owner는 회사 이메일, werooring 초대 없음)
- [ ] 회사 프로필로 양쪽 대시보드 로그인 정상
- [ ] 개인 프로필로 werooring 계정의 **현재 개인 Hobby 팀**(`werooring-3134's projects`)과 **개인 Supabase Org** 접근 정상
- [ ] 회사 Vercel 팀 **slug**: `korea-productivity-center` (Team Name: `kpcroadmap`)
- [ ] 회사 Supabase Org **slug/ID**: `__________________`

### 0-6. 백업 (되돌릴 수 있게)

터미널에서 아래를 그대로 실행합니다.

```bash
cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard

# (1) 현재 Vercel env 전체를 환경별로 로컬 파일로 백업
vercel env pull .env.vercel.production.bak --environment=production
vercel env pull .env.vercel.preview.bak    --environment=preview
vercel env pull .env.vercel.development.bak --environment=development

# (2) Supabase DB 전체 덤프 (SQL)
#     SUPABASE_DB_URL = Dashboard → Settings → Database → Connection String → URI (Direct, service role 비번 포함)
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges -f backup-$(date +%F).sql

# (3) 민감값 로컬 스냅샷
grep -E "^(NEXT_PUBLIC_SUPABASE_|SUPABASE_SERVICE|LLM_API_KEY)" .env.local > .secrets-backup-$(date +%F).txt

# (4) 권한 축소
chmod 600 .secrets-backup-*.txt backup-*.sql .env.vercel.*.bak
```

- [ ] 4종 파일 생성 확인: `ls -la backup-*.sql .env.vercel.*.bak .secrets-backup-*.txt`
- [ ] `.gitignore`에 다음 3줄 추가 (이미 있으면 생략):
  ```
  .env.vercel.*.bak
  backup-*.sql
  .secrets-backup-*.txt
  ```
- [ ] 백업 파일을 **절대 커밋하지 않음** — `git status`로 확인

### 0-7. Supabase 현재 상태 베이스라인 기록 (Claude 자동 수집 — 2026-04-23)

이전 후 비교용 베이스라인. **Step 1-3에서 동일 수치로 재확인**해야 무결성 인정.

#### 프로젝트 메타

- project_ref: `axflsiffdbkitptgpavv`
- status: `ACTIVE_HEALTHY`
- PostgreSQL: `17.6.1.063`
- 현재 organization_id: `yvdtyinbaponnsejhvpz` (werooring 개인 Org) → **Transfer 후 회사 Org ID로 바뀌어야 정상**
- region: `ap-south-1`

#### 테이블 인벤토리 (public 스키마 · 25개 · RLS 100% 활성)

| # | 테이블 | rows |
|---|---|---:|
| 1 | users | 31 |
| 2 | consultant_profiles | 11 |
| 3 | projects | 45 |
| 4 | self_assessment_templates | 3 |
| 5 | self_assessments | 23 |
| 6 | matching_recommendations | 42 |
| 7 | project_assignments | 44 |
| 8 | interviews | 34 |
| 9 | roadmap_versions | 36 |
| 10 | audit_logs | 964 |
| 11 | usage_metrics | 29 |
| 12 | user_quotas | 5 |
| 13 | consultant_activity_logs | 46 |
| 14 | notifications | 219 |
| 15 | conversations | 3 |
| 16 | conversation_participants | 6 |
| 17 | messages | 222 |
| 18 | interview_guides | 14 |
| 19 | roadmap_likes | 12 |
| 20 | assessment_tokens | 8 |
| 21 | audit_logs_archive | 0 |
| 22 | pbl_reports | 2 |
| 23 | pbl_likes | 0 |
| 24 | notices | 8 |
| 25 | notice_attachments | 3 |

> **주의**: `audit_logs`, `notifications`, `messages`는 시스템 활동 시 자동 증가. Transfer **직전·직후 30분** 내엔 비교 가능하지만, 시간이 지나 재측정하면 증가가 정상.

#### 마이그레이션

- 파일 개수: **65건** (`supabase/migrations/` 기준)
- DB `schema_migrations` 등록: **47건**
- 차이 18건은 과거 수동 적용된 마이그가 미등록된 상태 (CLAUDE.md에 명시된 기존 상황). **Transfer는 DB 물리 상태를 그대로 이동하므로 이 불일치도 유지되고 영향 없음**

#### Auth 사용자 (public.users 기준 · auth.users와 1:1)

- 총 **31명**
- 역할 × 상태 분포:

| role | status | 인원 |
|---|---|---:|
| USER_PENDING | ACTIVE | 11 |
| OPS_ADMIN_PENDING | ACTIVE | 1 |
| CONSULTANT_APPROVED | ACTIVE | 6 |
| CONSULTANT_APPROVED | SUSPENDED | 11 |
| OPS_ADMIN | ACTIVE | 1 |
| SYSTEM_ADMIN | ACTIVE | 1 |
| **합계** | | **31** |

#### Storage 버킷 (2개 · 5 객체 · 1.29 MB)

| 버킷 | public | 객체 수 | 용량 |
|---|---|---:|---:|
| `notice-attachments` | ❌ private | 3 | 0.48 MB (504,380 bytes) |
| `interview-attachments` | ❌ private | 2 | 0.81 MB (845,673 bytes) |

#### Security Advisor

- ERROR: **0**
- WARN: **1건** — `auth_leaked_password_protection` (Step 1-5에서 해결)

- [x] 베이스라인 전 항목 수집 완료 (2026-04-23)

---

## Step 1 — Supabase 프로젝트를 회사 Org로 이전 (10분)

> **왜 Supabase부터?** Transfer 후 project ref·URL·키가 그대로 유지되므로, 이후 Vercel 단계에서 env를 건드리지 않아도 됩니다.

### 1-1. Transfer 요청 (werooring 계정에서 시작)

**개인 프로필로 werooring 계정 로그인 상태에서 실행:**

1. https://supabase.com/dashboard/project/axflsiffdbkitptgpavv/settings/general
2. 페이지 하단 **Transfer project** 섹션
3. **Destination organization**: 회사 Pro Org 선택 (werooring이 회사 Org 멤버가 아니어도 Org 이름으로 지정 가능. Supabase가 해당 Org로 승인 요청을 전송)
4. 확인용 프로젝트 이름 입력
5. **Transfer** 버튼 클릭 → 요청 생성

### 1-2. Transfer Accept (회사 계정에서 승인)

**회사 프로필로 전환 → 회사 계정 로그인 상태에서 실행:**

1. https://supabase.com/dashboard → 회사 Org 대시보드
2. 상단 알림 또는 Org Settings에서 **"pending project transfer"** 확인
3. **Accept** 버튼 클릭

> **버튼이 회색/없음**: Destination Org가 Free거나 회사 계정이 Org Owner가 아님. Step 0-3으로 돌아가 확인.

- [ ] Transfer 완료 → 회사 프로필 대시보드에 프로젝트가 회사 Org 산하로 노출

### 1-3. 즉시 검증 (Transfer 직후)

project ref·URL·키가 그대로인지 확인합니다.

```bash
grep NEXT_PUBLIC_SUPABASE_URL .env.local
# 기대 결과: https://axflsiffdbkitptgpavv.supabase.co (변경 없어야 함)
```

- [ ] `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`·`ANON_KEY`·`SERVICE_ROLE_KEY` **그대로 동작** (값 변경 없음)
- [ ] 로컬 `npm run dev` → 로그인 → 갤러리 1건 조회 정상
- [ ] Step 0-7 기록값과 **테이블 수·사용자 수·Storage 개수 일치**

### 1-4. Supabase MCP access token 교체 (Claude Code 사용자)

Claude Code의 `mcp__supabase__*` 툴이 계속 쓰려면 **회사 Org 접근 권한이 있는 새 토큰**으로 교체해야 합니다.

1. 회사 프로필에서 https://supabase.com/dashboard/account/tokens
2. **Generate new token** → 이름 예) `claude-code-kpc` → 복사
3. 로컬 `~/.claude.json` 또는 Claude Code MCP 설정에서 `SUPABASE_ACCESS_TOKEN` 값을 새 토큰으로 교체
4. Claude Code 재시작 → `mcp__supabase__list_organizations` 호출 시 회사 Org가 보이면 성공

- [ ] 새 토큰 발급 · 교체 완료
- [ ] `mcp__supabase__get_advisors` → ERROR 0

### 1-5. Pro 혜택 활성화 (advisor 마지막 WARN 해결)

> **UI 갱신 메모 (2026-04-23 확인)**: Supabase UI 개편으로 경로가 바뀜. `Authentication → Attack Protection` 메뉴에서 **Prevent use of leaked passwords** 상태를 보고, 실제 토글은 같은 행의 **Configure email provider** 버튼으로 진입해서 조작.

1. 회사 프로필에서 https://supabase.com/dashboard/project/axflsiffdbkitptgpavv/auth/protection
2. **Prevent use of leaked passwords** 행 → **Configure email provider** 클릭
3. Email Provider 설정에서 해당 토글 **ON** → Save
4. Attack Protection 페이지로 돌아와 뱃지가 `DISABLED → ENABLED`로 바뀌었는지 확인

- [x] advisor 재확인 → **security WARN 0** (2026-04-23 `get_advisors lints: []` 확인)
- [ ] ~~PITR 활성화~~ — **스킵 결정**
  - 이유: Pro 기본 **Daily backup 7일**로 충분, PITR은 별도 유료 Add-on(~$100/월, 2분 단위 복원). Transfer 직후 당장 필요 없음. 운영 중 필요 시 `database/backups`에서 언제든 활성화 가능

---

## Step 2 — Vercel 프로젝트를 회사 팀으로 이전 (10분)

### 2-1. Transfer 요청 (werooring 계정에서 시작)

**개인 프로필로 werooring 계정 로그인 상태에서 실행:**

1. https://vercel.com/werooring-3134s-projects/kpc-ax-roadmap-dashboard/settings
2. 페이지 하단 **Transfer Project** 섹션 (Advanced 영역)
3. **Destination scope**: `korea-productivity-center` (회사 Pro 팀) 선택
4. 확인용 프로젝트 이름 입력
5. **Transfer** 클릭 → 요청 생성

### 2-2. Transfer Accept (회사 계정에서 승인)

**회사 프로필로 전환 → 회사 계정 로그인 상태에서 실행:**

1. https://vercel.com/korea-productivity-center → 팀 대시보드
2. 상단 알림 또는 Settings에서 **pending transfer** 확인
3. **Accept Transfer** 클릭

> **Hobby → Pro 팀**으로만 이전 가능. 회사 팀이 Pro가 아니면 실패합니다.

- [ ] Transfer 완료 → 대시보드 URL이 `vercel.com/korea-productivity-center/kpc-ax-roadmap-dashboard` 로 변경

### 2-3. GitHub 연동 재확인

Transfer 후 회사 팀에서 GitHub Integration이 연결돼 있어야 자동 배포가 동작합니다.

**회사 프로필로** 아래 페이지 열기:

1. https://vercel.com/korea-productivity-center/kpc-ax-roadmap-dashboard/settings/git
2. **Connected Git Repository**: `BaekKyunShin/KPC-AX-Roadmap-Dashboard` 표시 확인
3. 연결 끊겼으면 **Connect Git Repository** → GitHub OAuth → **werooring GitHub 계정에서 "회사 Vercel 팀에 해당 저장소 접근 허용" 승인** (이때 werooring GitHub로 로그인돼 있어야 함)

- [ ] Git Repository 연결 확인
- [ ] Production Branch가 `main`인지 확인

### 2-4. 로컬 Vercel CLI 재로그인 + env 검증

현재 로컬 CLI는 werooring 개인 계정 세션입니다. **회사 계정으로 교체**합니다.

```bash
cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard

# (1) werooring 세션 로그아웃
vercel logout

# (2) 회사 이메일로 로그인 — 실행 후 회사 이메일함에서 매직링크 클릭
vercel login
# → 이메일 주소 입력: <회사 이메일>
# → 메일함에서 링크 클릭 → CLI 로그인 완료

# (3) 회사 팀 컨텍스트로 프로젝트 재연결
rm -rf .vercel
vercel link
# → scope 선택: korea-productivity-center
# → project 선택: kpc-ax-roadmap-dashboard

# (4) env 12건 이상 유지 확인
vercel env ls
```

- [ ] `vercel whoami` 출력이 **회사 계정**으로 바뀜
- [ ] `.vercel/project.json`의 `orgId`가 **회사 팀 ID로 바뀜** (기존 `team_AWk9YKV8wDVSLSV6LoCNbpkR`가 아님)
- [ ] `vercel env ls` 출력이 12건이며 이름·환경 스코프가 Step 0-6 백업과 일치

### 2-5. 재배포로 실동작 확인

```bash
git commit --allow-empty -m "chore: 회사 계정 이전 후 배포 검증 트리거"
git push
```

- [ ] Vercel 대시보드(회사 팀 쪽) → Deployments에서 **Ready** 확인
- [ ] `https://kpc-ax-roadmap-dashboard.vercel.app` 접속 → 로그인·갤러리 정상
- [ ] Vercel → Observability → Logs → 500/error 0건

---

## Step 3 — GitHub Secrets 검증 (2분)

Supabase project ref·키가 그대로 유지됐으므로 GitHub Secrets는 **변경 불필요**합니다. 확인만.

- [ ] `gh secret list --repo BaekKyunShin/KPC-AX-Roadmap-Dashboard` 로 10건 그대로 확인
- [ ] Step 2-5 빈 커밋으로 트리거된 CI가 **전부 통과** (Actions 탭)

---

## Step 4 — 최종 스모크 테스트 (10분)

`https://kpc-ax-roadmap-dashboard.vercel.app` 프로덕션에서 실제 시나리오 실행:

- [ ] 컨설턴트 로그인(`kpc@test.com` / `<비공개>`) → `/consultant/home` 정상
- [ ] `/gallery` 카드 노출, 트랙 탭 동작
- [ ] OPS 로그인(`son@test.com` / `<비공개>`) → `/ops/projects` 정상
- [ ] 로드맵 프로젝트 1건 → `/roadmap` → **HWPX 다운로드 성공** (Python Function 정상)
- [ ] PBL 프로젝트 1건 → `/pbl` → **HWPX 다운로드 성공**
- [ ] 브라우저 콘솔 `console.error` 0건
- [ ] Supabase advisor 최종 재확인: ERROR 0 · WARN 0

---

## Step 5 — 이후 권장 조치 (선택)

이전 완료 후 여유 있을 때 진행.

- [ ] **커스텀 도메인 연결** — 회사 도메인(예: `roadmap.kpc.or.kr`) 사용 시 Vercel → Domains → Add. DNS A/CNAME 설정 후 자동 SSL.
- [ ] **프로덕션 SMTP 연결** — 현재 Vercel에 SMTP_* 미등록. 실제 알림 이메일을 쓸 예정이면 아래 중 택1:
  - Gmail 앱 비밀번호 5개 (`SMTP_HOST/PORT/USER/PASS/EMAIL_FROM`)를 `vercel env add ... production`
  - (권장) Vercel Marketplace → **Resend** 설치 → env 자동 주입 → `src/lib/services/email.ts`에서 Resend SDK로 마이그레이션
- [ ] **Supabase Branching** — PR별 DB 분기 (Pro 기능). 장기적 추천.
- [ ] **Rolling Releases** — 회사 Pro 제공. 대규모 변경 시 일부 트래픽 선 배포 후 승격.
- [ ] **Vercel BotID / Attack Challenge Mode** — 운영 보안 레이어

---

## 롤백 플랜

중간에 문제가 생기면 아래 경로로 복구할 수 있습니다.

| 단계 | 실패 시 대응 |
|------|------------|
| Supabase Transfer | 회사 Org에서 **원래 개인 Org로 역 Transfer 가능**. URL/키 그대로라 복구 즉시 |
| Vercel Transfer | 회사 팀에서 **개인 팀으로 역 Transfer 가능** |
| env 손상 | `vercel env pull`로 백업한 `.env.vercel.production.bak` 값으로 `vercel env add` 재등록 |
| DB 손상 (거의 없음) | Step 0-6의 `backup-YYYY-MM-DD.sql`을 `psql "$SUPABASE_DB_URL" < backup-YYYY-MM-DD.sql` 로 복원 |

---

## 가장 흔한 실수 3가지 (꼭 피할 것)

1. **회사 Free Org로 먼저 옮겼다가 Pro로 업그레이드** — Supabase는 Free Org로는 Transfer 수신 자체가 안 됩니다. 반드시 결제 먼저 → Transfer.
2. **"새 프로젝트로 깨끗하게 시작하자"** — 마이그 65개 재적용 + Auth 유저·Storage 복제는 실패 포인트가 많고, 테스트 계정(kpc@test.com 등)의 UUID가 바뀌면 RLS·FK가 전부 흔들립니다. Transfer가 10배 안전.
3. **Transfer 후 `.vercel` 삭제 안 함** — 로컬 CLI가 구 개인팀을 계속 가리켜서 `vercel env pull`이 엉뚱한 값을 덮어쓸 수 있습니다. 반드시 `rm -rf .vercel && vercel link` 재실행.

---

## 진행 메모 / 질문

> 진행하면서 막히는 지점, 궁금한 점, 결정 사항을 아래에 기록하세요.
> 대화창에서 Claude에게 질문할 때 이 섹션을 참조하면 맥락이 이어집니다.

### 진행 로그

- [ ] Step 0 시작: `____-__-__ __:__`
- [ ] Step 0 완료: `____-__-__ __:__`
- [ ] Step 1 시작: `____-__-__ __:__`
- [ ] Step 1 완료: `____-__-__ __:__`
- [ ] Step 2 시작: `____-__-__ __:__`
- [ ] Step 2 완료: `____-__-__ __:__`
- [ ] Step 3 완료: `____-__-__ __:__`
- [ ] Step 4 완료: `____-__-__ __:__`
- [ ] **전체 이전 완료**: `____-__-__ __:__`

### 질문·이슈

<!-- 예시
- Q1 (Step 1-1): Transfer 버튼이 회색인데 회사 Org는 Pro 결제했어요.
  - 상태: 미해결 / 해결
  - 해결 메모:
-->

-

### 이전 후 변경 사항 기록

<!-- 예시
- 프로덕션 도메인: kpc-ax-roadmap-dashboard.vercel.app → roadmap.kpc.or.kr (2026-MM-DD)
- SMTP: Gmail → Resend 전환 (2026-MM-DD)
-->

-
