# 1차 전수 조사 후속 작업 — 진행 가이드

> 1차 조사 리포트(`docs/reports/2026-04-28-system-audit.md`)에서 발견된 결함 10건 해결 + 시간 부족으로 이월된 검증 항목을 두 개의 새 세션으로 분리해 처리하는 가이드.

## 진행 방식 — 옵션 A (순차 + 격리)

```
세션 #A : 결함 수정       ──→ PR 머지 ──→ 세션 #B : 이월 검증
( fix-audit-defects 브랜치 )            ( verify-deferred 브랜치 )
```

**왜 순차인가?**
- 이월 검증의 일부(LLM 호출 흐름)는 결함 #002(silent fail) 수정에 의존. #A 머지 전에 #B를 진행하면 같은 silent fail을 한 번 더 확인하는 것 외에는 의미 없음.
- 동시 진행 시 dev 서버 포트(3000)·로컬 Supabase·리포트 파일이 모두 1개라 충돌 위험.
- 순차여도 각 세션은 별도 브랜치로 격리하여 main을 직접 건드리지 않는다.

**왜 격리인가?**
- 각 세션이 별도 브랜치에서 작업 → main은 PR 머지 시점에만 갱신 → 작업 중 회귀를 방지
- AUDIT 잔재 데이터는 작업 종료 시 `npx supabase db reset`으로 일괄 정리

## 1단계 — 사용자 사전 준비 (둘 다 시작하기 전)

### A. main 동기화 + 브랜치 생성

```bash
cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
git checkout main
git pull --ff-only origin main

# 세션 #A용 브랜치만 먼저 생성. #B는 #A 머지 후 main에서 다시 분기.
git checkout -b fix/audit-defects-2026-04-29
```

### B. 1차 조사 리포트·스크린샷 커밋

리포트와 스크린샷은 1차 조사 산출물이므로 **세션 #A 시작 전에** main에 커밋해 둔다 (또는 fix 브랜치 첫 커밋으로 포함). 그래야 #A가 그 파일을 읽고 갱신할 수 있다.

```bash
git add docs/reports/2026-04-28-system-audit.md \
        docs/reports/screenshots/2026-04-28/ \
        docs/prompts/2026-04-29-*.md
git commit -m "docs(reports): 1차 전수 조사 리포트 + 후속 작업 가이드/프롬프트 추가"
git push -u origin fix/audit-defects-2026-04-29
```

### C. 새 Claude Code 세션 띄우기 — 세션 #A

1. 같은 디렉토리에서 새 터미널 열기 → `claude` 실행
2. **plan mode 진입** (대화 초입에 `/plan` 또는 plan mode 토글)
3. `docs/prompts/2026-04-29-session-A-fix-audit-defects.md`의 **본문 프롬프트 섹션**을 그대로 복사 → 첫 메시지로 전달

세션 #A는 본 가이드의 "세션 #A 흐름"을 따라간다.

## 2단계 — 세션 #A 흐름 (결함 수정)

요점만 — 자세한 실행 지시는 `2026-04-29-session-A-fix-audit-defects.md` 참조.

| 순서 | 단계 | 주요 산출물 |
|------|------|----------|
| 1 | Plan 단계: 결함 10건 각각 원인 진단·해결 방향·검증 방법 정리 | plan 파일 |
| 2 | P1 두 건(#001 audit logs, #002 roadmap silent fail) 우선 해결 | TDD 테스트 + 코드 |
| 3 | P2 세 건(#003~#005) 해결 | 동일 |
| 4 | P3 다섯 건(#006~#010) 해결 | 동일 |
| 5 | 리포트 갱신: 🔴 OPEN → 🟢 RESOLVED + 해결 정보 행 추가 + 변경 이력 한 줄 | 같은 리포트 파일 |
| 6 | `npm run validate && npm run build` 통과 확인 | — |
| 7 | PR 생성 (제목: `fix: 1차 시스템 조사 결함 N건 해결`) | PR URL |

세션 #A 종료 시 사용자에게 보고:
- 해결된 결함 / 보류된 결함 / 추가 발견 결함

### 세션 #A 머지

사용자가 PR을 검토하고 main에 머지. 머지 후:

```bash
cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
git checkout main
git pull --ff-only origin main
git checkout -b chore/verify-deferred-2026-04-29
```

## 3단계 — 세션 #B 흐름 (이월 검증)

새 터미널에서 다시 `claude` 실행 → plan mode → `docs/prompts/2026-04-29-session-B-deferred-verification.md`의 본문 프롬프트 복사·전달.

| 순서 | 단계 | 주요 산출물 |
|------|------|----------|
| 1 | Plan 단계: 검증 범위·인터뷰 데이터 시드 방법·LLM 응답 대기 정책 결정 | plan 파일 |
| 2 | 환경 셋업 (Docker·Supabase·dev·HWPX 브리지) | 동작 확인 |
| 3 | 인터뷰 8단계 입력 → 로드맵 LLM 실호출 → PDF/XLSX/HWPX 다운로드 | 결과 파일 + 캡처 |
| 4 | PBL 트랙 신규 프로젝트 → PBL 생성·다운로드 | 결과 파일 + 캡처 |
| 5 | 메시지 1:1 대화·Realtime·알림벨·이메일 throttle 검증 | 캡처 |
| 6 | sysadmin 권한 차이·`/test-roadmap`·`/test-pbl` 검증 | 캡처 |
| 7 | 리포트 갱신: 부록 A 체크리스트 ⬜ → ✓ + 새 결함 #011~ 추가 | 같은 리포트 파일 |
| 8 | PR 생성 (제목: `docs(reports): 1차 조사 이월 항목 검증 + 신규 결함 N건 추가`) | PR URL |

## 리포트 관리 컨벤션

같은 파일(`docs/reports/2026-04-28-system-audit.md`)을 누적 갱신.

### 결함 상태 라벨

- 🔴 **OPEN** — 미해결
- 🟢 **RESOLVED** — 해결 완료 (PR 번호·커밋 SHA·날짜 명시)
- ⚪ **DEFERRED** — 다음 세션 이월
- 🚫 **WONTFIX** — 의도된 동작으로 결정 (이유 명시)
- 🔁 **REGRESSION** — 회귀 발생

### 결함 항목 형식

```markdown
### #NNN [P등급] [🔴 OPEN] 제목

- 메뉴 경로: ...
- 재현 단계:
  1. ...
- 기대 / 실제: ...
- 영향: ...
- 스크린샷: ./screenshots/YYYY-MM-DD/...

(해결 시 추가)
- **해결 정보**: PR #NN · 커밋 abc1234 · 2026-04-29 · 검증자: ...
- **상태 변경**: 🔴 OPEN → 🟢 RESOLVED
```

### 변경 이력

리포트 본문 상단에 다음 섹션 유지·갱신:

```markdown
## 변경 이력

| 날짜 | 작업 | PR | 결함 변동 |
|------|------|----|-----------|
| 2026-04-28 | 1차 전수 조사 | — | OPEN: #001~#010 (10건) |
| 2026-04-29 | 결함 수정 (세션 #A) | PR #NN | RESOLVED: #001~#NNN |
| 2026-04-29 | 이월 검증 (세션 #B) | PR #NN | OPEN 추가: #011~ |
```

## 격리 정책

### 브랜치

- 세션 #A: `fix/audit-defects-2026-04-29`
- 세션 #B: `chore/verify-deferred-2026-04-29` (또는 `docs/audit-deferred-2026-04-29`)
- 두 브랜치는 같은 main에서 분기. #B는 #A 머지 후 다시 분기.

### 환경 (양 세션 공통)

- 작업: 로컬 Supabase + 로컬 dev 서버
- `.env.local` 일시 백업 → `.env.test` 적용 → 작업 종료 시 원복
- 운영 Supabase 절대 X (`.env.local.audit-bak` 백업 파일 보존)

### 데이터 정리

각 세션 종료 시:

```bash
mv .env.local.audit-bak .env.local      # 환경 원복
npx supabase db reset                    # AUDIT 잔재 일괄 삭제
```

## 자주 묻는 질문

**Q. 세션 #A 머지 전에 #B를 시작하면 안 되나?**
A. 결함 #002(roadmap silent fail) 수정이 LLM 호출 흐름의 전제. 머지 전 #B는 같은 silent fail을 다시 확인하는 시간 낭비.

**Q. 세션 #A에서 결함 일부를 보류하면 #B는 어떻게?**
A. 보류된 결함은 🔴 OPEN 그대로 유지 + "보류 사유" 행만 추가. #B는 보류 사유와 무관한 이월 항목만 검증. 다음 (세션 #C)에서 보류 결함을 처리.

**Q. 세션 #B에서 새 결함 발견 시 #A로 돌아가야?**
A. 아니요. #B에서 #011~로 OPEN 추가. 다음 사이클(세션 #C 수정)에서 처리.

**Q. 한 세션에서 여러 결함을 한 PR로? 결함당 PR?**
A. 한 PR에 여러 결함 묶음 권장 (커밋만 결함당 분리). 리뷰 부담 ↓, 머지 후 회귀 추적 ↑.

## 체크리스트 (사용자용)

세션 시작 전 확인:

- [ ] Docker Desktop 실행 중
- [ ] main 최신 동기화 (`git pull --ff-only`)
- [ ] 1차 조사 리포트가 main에 커밋됨
- [ ] 새 브랜치 생성 후 그 브랜치로 체크아웃
- [ ] 새 Claude Code 세션을 띄우고 plan mode 진입
- [ ] 해당 세션 프롬프트 파일을 그대로 복사·전달

세션 종료 후 확인:

- [ ] 리포트의 변경 이력에 한 줄 추가됨
- [ ] 결함 상태 라벨이 정확히 갱신됨
- [ ] PR 생성됨 + CI 모든 check pass
- [ ] `.env.local` 원복됨
- [ ] AUDIT 데이터 정리(`supabase db reset`) 완료
