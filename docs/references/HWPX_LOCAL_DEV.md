# HWPX 로컬 개발·테스트 가이드

`/api/hwpx/generate` 는 Vercel Python Function 이라 `next dev` 로는 동작하지 않는다. 로컬에서 HWPX 다운로드를 확인하려면 아래 세 가지 방법 중 하나를 쓴다.

## 1. 브리지 서버 (권장)

```bash
npm run dev:hwpx:setup   # 최초 1회 (Python venv 생성)
npm run dev:hwpx         # 터미널 A: 브리지 서버 (포트 3010)
npm run dev:with-hwpx    # 터미널 B: Next.js + 프록시 (포트 3000)
```

`next.config.ts` 의 `rewrites()` 가 `HWPX_DEV_PROXY_URL` 환경변수를 감지하면 `/api/hwpx/*` 요청을 브리지 서버로 포워딩한다. 프로덕션과 동일한 Python 코드가 실행되므로 출력이 같다 (PBL 117KB · ROADMAP 411KB ZIP 검증 완료).

브리지 서버 없이 `npm run dev` 상태에서 HWPX 버튼을 누르면, 클라이언트에 3가지 해결 옵션 안내 메시지가 표출된다.

## 2. Preview 배포

`git push` 후 생성된 Vercel Preview URL 에서 테스트한다. 별도 설정이 필요 없고 프로덕션과 런타임이 완전히 같다.

## 3. `npm run dev:vercel`

`vercel dev` 로 Python Functions 를 포함해 로컬 구동한다.

> ⚠️ **Vercel CLI 51.7+ 필수.** 구버전은 Python 런타임 빌드에 실패한다. `vercel --version` 으로 확인 후 `npm i -g vercel@latest` 로 갱신.

## 관련 문서

- 템플릿 구조·새 양식 적용: [`HWPX_TEMPLATE_MAINTENANCE.md`](./HWPX_TEMPLATE_MAINTENANCE.md)
- 문서 생성·편집 작업 시: `hwpx-docgen` 스킬 호출
