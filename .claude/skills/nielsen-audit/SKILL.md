---
name: nielsen-audit
description: Nielsen 10가지 사용성 휴리스틱 기준으로 본 프로젝트의 UX/UI를 전수 감사하고, 한 세션 내 해결 가능한 가장 크리티컬한 이슈만 추려 docs/reports/에 5단 포맷 보고서로 작성한다. "UX 조사", "UX 점검", "UX 감사", "Nielsen 휴리스틱 감사", "사용성 점검 리포트", "휴리스틱 리포트", "/nielsen-audit" 요청 시 사용한다.
user-invocable: true
argument-hint: [영역명?]
---

# Nielsen 10가지 휴리스틱 기반 UX/UI 감사

$ARGUMENTS 영역(미지정 시 전체)을 대상으로 Nielsen 10가지 사용성 휴리스틱 기준 UX/UI 감사 보고서를 작성한다. 코드는 수정하지 않는다.

---

## 산출물

**파일 경로:** `docs/reports/YYYY-MM-DD-nielsen-heuristics-audit.md`

- 같은 날짜에 동일 보고서가 이미 존재하면 `-v2`, `-v3` … 접미사를 자동 추가 (덮어쓰기 금지)
- 영역 한정 시에도 동일 컨벤션 유지. 영역 정보는 **보고서 본문 메타에 명시**한다 (파일명에 영역명을 넣지 않는다)
- 작성 전 `ls docs/reports/` 로 동일 일자 파일 존재 여부를 반드시 확인

---

## 작업 절차

### Phase 1 — 코드베이스 조사 (Explore 에이전트 병렬)

**전체 감사 (인자 없음)**: Explore 에이전트 3대 병렬 분담

| 에이전트 | 영역 | 중점 휴리스틱 |
|---|---|---|
| A | 공통 레이아웃·네비게이션·글로벌 상태 (layout.tsx, Navigation, EmptyState 사용처, error.tsx, loading.tsx, 토스트) | H1·H4·H8·H10 |
| B | 컨설턴트 워크플로우 (인터뷰 작성·검토, 로드맵 결과, 프로젝트, 갤러리) | H2·H3·H5·H9 |
| C | 운영자 영역 + 공통 (ops/*, 인증, 대시보드, 메시지, 알림, 검색) | H2·H6·H7·H10 |

**영역 한정 (인자 있음)**: 1~2대로 축소

- `consultant` → 위 ②번
- `ops` → 위 ③번
- `layout` 또는 `nav` → 위 ①번

**각 Explore 에이전트 프롬프트에 반드시 포함:**

- 본 프로젝트 위치: `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard`
- 코드 수정 금지 — 조사·읽기만
- CRITICAL 이슈 5~8개로 압축. 사소한 마진·색상·타이포는 제외
- 사용자가 막히거나 데이터를 잃거나 잘못된 상태로 진입하는 본질적 결함 위주
- 형식: `위치(메뉴명+파일경로) → 사용자가 겪는 현상 → 위배 원칙(H번호) → 개선 제안 → 재사용 가능 자산`
- 700단어 이내 한국어 압축 보고
- `git log --oneline -20`으로 최근 PR에서 이미 해결된 결함은 제외

### Phase 2 — 우선순위 압축

3대 보고를 종합해 **5~8개 critical**만 선별. 기준:

- **impact**: 사용자가 자주 막히는가? 데이터 손실 또는 비가역 액션인가? 신규 사용자가 첫 화면에서 막히는가?
- **effort**: 한 파일·한 컴포넌트로 변경 가능한가? 기존 자산 재사용 가능한가?
- **누적 작업 시간 ≤ 3시간**이 되도록 항목 수 조정

**별점 가이드 (보고서에 그대로 표기):**

- ★★★★★ — 데이터 손실·비가역 액션·전체 사용자 좌절
- ★★★★ — 다음 액션 미인지·신규 사용자 막힘·일시적 장애 안내 부재
- ★★★ — 학습 비용·일관성 결함·작은 효율 저하

### Phase 3 — 보고서 작성 (5단 포맷 필수)

각 이슈는 다음 다섯 단으로 작성한다 — 어느 항목도 비우지 말 것:

1. **위치** — 메뉴 경로(예: 컨설턴트 > 담당 프로젝트 > 인터뷰 작성) + 파일 경로(`src/app/...:라인번호`)
2. **사용자 시나리오** — 페르소나·동선·체감 결함을 스토리텔링으로 묘사 (개발자 용어 금지, 비개발자도 이해 가능하게)
3. **위배 원칙** — `**H{번호} {명칭}**` 굵게 표기
4. **사용자 관점 개선 후** — 화면·메시지·플로우의 변화를 구체 라벨까지 포함해 묘사 ("안내 추가"가 아니라 「영업일 기준 1일 이내 검토」처럼 실제 문구를 적는다). 본문 끝에 다음 한 줄을 **의무 첨부** (Phase 3.5 산출물):

   ```text
   🖥️ **시각 확인:** http://localhost:3000/mockup/nielsen-audit/{보고서날짜}/issue-{N}
   ```

5. **개발자 구현 노트** — 코드 변경 위치, 재사용 가능 자산 경로, 짧은 코드 예시

### Phase 3.5 — mockup 라우트 작성 (Phase 3과 짝, 코드 작성 허용)

본 스킬의 원칙은 "코드 변경 금지"이지만, **mockup 라우트는 시각 시안 자료**로서 production 코드를 변경하지 않는다(별개 폴더에 격리). 따라서 Phase 3 보고서가 확정되면 각 CRITICAL 이슈마다 `src/app/mockup/nielsen-audit/{보고서날짜}/issue-{N}/page.tsx` 1 페이지를 작성한다.

**작성 절차:**

1. 일자 폴더 생성: `src/app/mockup/nielsen-audit/YYYY-MM-DD/`
2. 일자 인덱스 페이지 작성: `page.tsx` — 해당 보고서 이슈 카드 N개를 그룹별·우선순위 순 노출
3. 일자 공용 프레임 작성 (1회): `_components/BeforeAfterFrame.tsx` — 이전/이후 세로 풀 너비 비교 컨테이너
4. 이슈별 페이지 작성: `issue-{N}/page.tsx` — `BeforeAfterFrame`을 사용해 production 화면을 픽셀 단위로 재현
5. 기존 `src/app/mockup/layout.tsx`의 `MOCKUP_NAV` 배열에 "Nielsen 감사 — YYYY-MM-DD" 그룹·일자 인덱스 링크 추가
6. 기존 `src/app/mockup/page.tsx` 인덱스에 "Nielsen 감사" 그룹 카드 추가

**mockup 페이지 코드 품질 기준 (강제 조건):**

1. **실제 production 컴포넌트만 import** — `@/components/ui/*`·`@/components/layout/*`·`@/lib/utils/toast` 등. mockup 전용 더미 컴포넌트 신설 금지
2. **TypeScript strict 통과** — `npm run validate` 로컬 통과 필수
3. **모의 데이터 타입 일치** — `src/types/database.ts` 등에서 가져온 production 타입 그대로 사용. `as any` 금지
4. **재현 범위** — 페이지 전체 복제 X. **변경 영역 + 직접 인접한 컨텍스트 1-2 섹션**만 재현
5. **디자인 토큰 일관성** — `globals.css` 변수와 Tailwind 시멘틱 토큰만 사용. 인라인 hex·px 금지
6. **인터랙션 실제 작동** — 토스트·모달 트리거는 production 함수(`showSuccessToast` 등) 그대로 호출 (`'use client'` + `useState` 사용)
7. **상단 안내 카드** — 각 이슈 페이지 최상단에 「Nielsen 감사 #N · 별점 · 휴리스틱 명 · 위치」 메타 카드 표시 (시안 임을 명확히)
8. **빈 상태·로딩 상태 변형** — 해당 이슈가 빈 상태/로딩 변경을 수반하면 함께 재현

**`BeforeAfterFrame` 컴포넌트 시그니처 (각 일자 폴더에 1회 작성):**

```tsx
// src/app/mockup/nielsen-audit/{date}/_components/BeforeAfterFrame.tsx
import { ReactNode } from 'react';
import { Info, Check } from 'lucide-react';

interface BeforeAfterFrameProps {
  before: ReactNode;
  after: ReactNode;
  beforeLabel?: string;  // 기본: "이전 (현재 production)"
  afterLabel?: string;   // 기본: "이후 (개선 제안)"
}

export function BeforeAfterFrame({
  before,
  after,
  beforeLabel = '이전 (현재 production)',
  afterLabel = '이후 (개선 제안)',
}: BeforeAfterFrameProps) {
  return (
    <div className="space-y-12">
      <section>
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500">
          <Info className="h-4 w-4" /> {beforeLabel}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          {before}
        </div>
      </section>
      <section>
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-600">
          <Check className="h-4 w-4" /> {afterLabel}
        </div>
        <div className="rounded-lg border border-emerald-200 bg-white p-6 ring-1 ring-emerald-100">
          {after}
        </div>
      </section>
    </div>
  );
}
```

**이슈 페이지 골격 예시:**

```tsx
// src/app/mockup/nielsen-audit/2026-05-04/issue-1/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BeforeAfterFrame } from '../_components/BeforeAfterFrame';

export default function Issue1MockupPage() {
  return (
    <div className="space-y-8">
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-base">
            #1 [★★★★★ H9] {이슈 제목}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-900">
          위치: {메뉴 경로} / 위배 원칙: H9 오류 인식·진단·복구
        </CardContent>
      </Card>

      <BeforeAfterFrame
        before={<BeforeScene />}   {/* 현재 production 화면 재현 */}
        after={<AfterScene />}      {/* 개선안 재현 */}
      />
    </div>
  );
}
```

**archive 정책:** 후속 `nielsen-audit-fix` 스킬이 보고서를 `docs/reports/archive/` 로 이동할 때 mockup 코드도 `src/app/mockup/_archive/{date}/` 로 함께 이동시킨다 (`_archive/` prefix는 Next.js App Router에서 라우트 자동 제외).

### Phase 4 — 자체 검증

보고서 작성 후 다음을 모두 확인 (verification-before-completion):

- [ ] 인용한 모든 `src/...` 경로가 실제 존재 — `ls`로 샘플 검증
- [ ] 휴리스틱 번호가 H1~H10 범위 내, 본문 헤더와 메타 일치
- [ ] 누적 작업 시간 추정이 3시간 이내
- [ ] 5단 포맷의 다섯 항목이 각 이슈마다 모두 채워짐
- [ ] 같은 날짜 기존 보고서가 있다면 `-vN` 접미사로 신규 생성됐는지 확인
- [ ] 모든 이슈에 mockup 페이지 1개씩 존재 — `ls src/app/mockup/nielsen-audit/{date}/issue-*` 로 개수 일치 확인
- [ ] mockup 일자 인덱스(`page.tsx`)·`_components/BeforeAfterFrame.tsx`·`MOCKUP_NAV` 갱신·인덱스 카드 추가 완료
- [ ] `npm run validate` 통과 (mockup 페이지 포함 typecheck·lint·test)
- [ ] 각 mockup 페이지를 `npm run dev` → `http://localhost:3000/mockup/nielsen-audit/{date}/issue-{N}` 에서 직접 접속해 인터랙션(토스트·모달·버튼) 작동 확인
- [ ] mockup 인덱스 URL이 보고서 메타에 명시됨, 각 이슈 4단에 mockup URL 행이 포함됨

### Phase 4-끝 — 사용자 종료 안내

검증 통과 후 사용자에게 다음 형식으로 안내한다 (라벨 고정):

```text
✅ Nielsen 휴리스틱 감사 완료

📄 보고서: docs/reports/{date}-nielsen-heuristics-audit.md (CRITICAL N건)
🖥️ Mockup 인덱스: http://localhost:3000/mockup/nielsen-audit/{date}
   (`npm run dev` 미기동 시 별도 터미널에서 실행)

다음 단계:
  ① /nielsen-audit-fix — mockup 일괄 검토 사이클을 시작합니다.
     · N개 mockup을 한 번에 보여드린 뒤 "그대로 진행" 또는 "특정 항목 수정"을
       물어봅니다. 수정 요청 시 mockup·보고서를 동시에 갱신해 다시 보여드리고,
       만족하실 때까지 사이클을 반복합니다.
     · 사이클이 끝나야 코드 구현(브랜치·TDD·PR)으로 진행합니다.
  ② 보고서·mockup 폐기 후 다른 영역으로 재감사
```

본 스킬은 mockup·보고서 수정 사이클을 진행하지 않는다 — **수정 사이클은 후속 `/nielsen-audit-fix` 의 Phase 1 책임**이다. 본 스킬에서 사용자 피드백을 받아 즉석 수정하는 분기는 두지 않는다 (역할 분리).

---

## 보고서 템플릿

`docs/reports/2026-04-30-nielsen-heuristics-audit.md`를 **모범 사례**로 직접 참조한다. 동일 구조와 톤을 유지:

```text
# Nielsen 10가지 휴리스틱 기반 UX/UI 감사 보고서

## 메타
- 조사일 / 조사 범위 / 조사 방법 / 선별 기준 / 총평(2~3문장)
- **Mockup 인덱스: `http://localhost:3000/mockup/nielsen-audit/YYYY-MM-DD`** (Phase 3.5 산출물)

## Nielsen 10가지 휴리스틱 (참조표)
| 번호 | 명칭 | 한 줄 정의 |  ← 아래 표 그대로 복사

## 보고서 읽는 법 (5단 포맷)
1~5단 설명

## CRITICAL 이슈 (우선순위 순)
### #1 [★★★★★ H9] 이슈 제목
- 위치 / 사용자 시나리오 / 위배 원칙 / 사용자 관점 개선 후 / 개발자 구현 노트
### #2 ...

## 한 세션 작업 권장 순서 (표: 순서·이슈·추정 시간·비고)

## 재사용 가능한 기존 자산 (표: 자산·경로·활용 위치)

## 검증 체크리스트 (체크박스: validate/build + 이슈별 수동 검증)

## 범위 외 (Out of Scope) (1줄씩 bullet)
```

---

## Nielsen 10가지 휴리스틱 (한 줄 정의 — 보고서 표에 그대로 사용)

| 번호 | 명칭 | 한 줄 정의 |
|---|---|---|
| H1 | 시스템 상태의 가시성 | 사용자가 지금 시스템이 무엇을 하는지 알 수 있어야 한다 |
| H2 | 시스템과 현실 세계의 일치 | 사용자가 쓰는 언어·개념과 시스템이 일치해야 한다 |
| H3 | 사용자 통제와 자유 | 실수했을 때 빠져나올 수 있는 비상구가 있어야 한다 |
| H4 | 일관성과 표준 | 같은 의미는 같은 방식으로 표현해야 한다 |
| H5 | 오류 예방 | 위험한 액션은 발생하지 않게 막는 것이 우선이다 |
| H6 | 회상보다 인식 | 기억에 의존하지 않고 화면이 보여주어야 한다 |
| H7 | 사용의 유연성과 효율성 | 숙련 사용자에게 가속기를 제공해야 한다 |
| H8 | 미적이고 최소한의 디자인 | 불필요한 정보는 제거해야 한다 |
| H9 | 오류 인식·진단·복구 | 오류를 명확히 알리고 해결 방법을 안내해야 한다 |
| H10 | 도움말과 문서화 | 필요할 때 발견할 수 있는 도움말이 있어야 한다 |

---

## 본 프로젝트 재사용 가능 자산 (개선안 작성 시 우선 활용)

신규 컴포넌트 제안은 최후 수단. 아래 자산을 먼저 검토:

| 자산 | 경로 | 용도 |
|---|---|---|
| `EmptyState` | `src/components/ui/EmptyState.tsx` | 빈 상태·오류 표시 (action prop 보유) |
| `AlertDialog` | `src/components/ui/alert-dialog.tsx` | 비가역 액션 확인 (destructive variant 지원) |
| `PageSkeleton` | `src/components/layout/PageSkeleton.tsx` | 로딩 일관성 |
| `showSuccessToast` 등 | `src/lib/utils/toast.ts` | 토스트 표준화 (title + description 지원) |
| `ActionResult` | `src/lib/types/action-result.ts` | Server Action 반환 타입 |
| `FilterBadge` | `src/app/(dashboard)/ops/projects/_components/ProjectList.tsx` | 검색·필터 시각화 |
| `BeforeAfterFrame` | `src/app/mockup/nielsen-audit/{date}/_components/BeforeAfterFrame.tsx` | mockup 이전/이후 세로 풀 너비 비교 (Phase 3.5 산출물) |

---

## 작성 원칙

- **사용자 관점 우선** — 개발자 용어보다 메뉴명·동선·체감 묘사
- **임원 보고용 톤** — 비개발자 운영자가 읽어도 이해 가능
- **구체 라벨** — 실제 노출될 문구를 따옴표로 적는다
- **이슈 ≤ 8개** — 한 세션 분량 초과 시 Out of Scope 섹션으로 이전
- **재사용 우선** — 기존 자산 경로 명시
- **별점 표기 일관성** — `### #N [★★★★★ H{번호}] 제목` 형식 고정
- **코드 변경 금지** — 본 스킬은 보고서 작성만 수행. 후속 implementation은 별도 세션

---

## Out of Scope 가이드 (보고서 말미 섹션 작성 시 참조)

다음 항목은 발견되어도 본 보고서에서는 1줄씩만 언급하고 후속 작업으로 넘긴다:

- 사소한 마진·색상·타이포 (디자인 토큰 레벨)
- 모바일 반응형 기본 — 본 프로젝트는 Batch 0~6 종료. 잔무만 식별
- 전사 정책 결정이 필요한 용어 통일
- 한 세션 분량 초과 대형 기능 추가 (일괄 처리·검색 칩 통합 등)
- 외부 의존(SMTP·서버 에러 카테고리·KPC 사내 표준) 조정 선행 필요 항목

---

## 트리거 발화 예시 (자연어)

다음 발화를 보면 본 스킬을 호출한다:

- "UX 감사해줘", "사용성 점검 리포트 만들어줘"
- "Nielsen 휴리스틱 기준으로 우리 시스템 검토해줘"
- "10가지 원칙으로 UI 진단 좀"
- "/nielsen-audit", "/nielsen-audit consultant"

영역 인자(`consultant`/`ops`/`layout` 등) 미지정 시 전체 전수 조사가 디폴트.
