# HWPX 생성 인프라: Vercel Python Functions 채택

**Date:** 2026-04-14
**Status:** Accepted

## Context

산인공 공식 양식을 한글 파일(.hwpx)로 생성해야 하며, Python 라이브러리 `python-hwpx`가 사실상 유일한 실용적 선택지다. Next.js(Node.js) 런타임에서는 직접 HWPX를 생성할 수 없으므로 Python 런타임이 필수다.

## Decision

Vercel Python Functions(Fluid Compute)를 `api/hwpx/` 경로에 둔다. Next.js Server Action에서 이 함수를 내부 HTTP 호출로 사용한다.

- 런타임: `@vercel/python@6.31.0` (Python 3.12 기반)
- 런타임 지정: `vercel.json`의 `functions."api/hwpx/*.py"`
- 의존성: `api/hwpx/requirements.txt` (`python-hwpx==2.9.0`, `lxml==5.4.0`)
- 엔드포인트: `POST /api/hwpx/generate` (내부 공유 시크릿 `X-HWPX-Secret` 헤더 필수)

## Alternatives

- **별도 마이크로서비스 (Railway/Render):** 운영 부담·인프라 복잡도·이중 배포 파이프라인 비용으로 기각. 트래픽 소규모(B2B 내부) 특성상 Fluid Compute 한계 도달 가능성이 낮음.
- **로컬 전용 생성:** 프로덕션 컨설턴트·운영자가 웹 UI에서 다운로드해야 하므로 기각.
- **Node.js 기반 HWPX 생성 라이브러리 사용:** 성숙한 라이브러리 부재. 자체 구현은 범위 밖.

## Consequences

- **Pros**
  - 배포가 단일 Vercel 프로젝트로 유지된다(Monorepo 분리 없음).
  - Fluid Compute로 콜드스타트 비용을 완화할 수 있다.
  - 함수 사이즈 한도 250MB 대비 `python-hwpx` + `lxml`은 여유가 있다.
  - 보안: 내부 공유 시크릿 헤더(`X-HWPX-Secret`)로 공개 URL을 게이트한다.
- **Cons**
  - Python 런타임 빌드 시간이 Node.js 대비 추가된다(~30초 수준).
  - 로컬 개발에서 Python 가상환경(`.venv`, `uv`) 유지가 필요하다.
  - Server Action에서 HTTP fetch 경유 호출이므로 함수 내 직접 호출 대비 오버헤드가 존재(수백 ms 예상, 실용상 무시).

## Verification (PoC, Step 3)

- `/api/hwpx/ping` → `{"status":"ok","runtime":"python"}` (Preview 200)
- `/api/hwpx/generate` (인증 시) → HWPX 바이너리 반환, 로컬 `validate_hwpx.py` PASS, bytes≈7.4KB
- `/api/hwpx/generate` (인증 누락/오류) → 401
- `/api/hwpx-test` (Node→Python) → `{"ok":true,"bytes":<N>}`

## Follow-ups

- Step 7/10: 산인공 양식 템플릿 매핑 + 정식 `src/lib/services/export/hwpx/` 클라이언트 도입. `src/app/api/hwpx-test/route.ts`는 이때 삭제.
- Step 12: `security-auditor`로 시크릿 검증 누락 여부 재확인.

## Plan drift note (2026-04-15)

본 PoC(Step 3) 수행 중 원 계획서(`docs/plans/archive/2026-04-14-official-form-alignment.md`)의 두 항목이 outdated임을 확인하고 교정했다. 교정된 값은 본 ADR이 정본이다.

| 항목 | 계획서 초판 | PoC 확정값 | 근거 |
|---|---|---|---|
| `vercel.json` runtime 문자열 | `"python3.13"` | `"@vercel/python@6.31.0"` | Vercel 공식 Python runtime은 빌더 패키지 버전 문자열 형식. Context7 MCP로 재확인. |
| `python-hwpx` 버전 | `0.1.0` | `2.9.0` | Context7 MCP(`/airmang/python-hwpx`, reputation High)로 최신 버전 확인. `HwpxDocument.new()/add_paragraph()/save_to_path()` API는 2.9.0에서도 호환. |

계획서 본문의 해당 코드 블록도 동일 시점에 수정하였으며, 각 블록 아래에 본 ADR을 참조하는 인라인 주석을 추가했다. 이후 Step(7·10)에서 HWPX 양식 로더를 구현할 때는 본 ADR의 버전 값을 기준으로 한다.
