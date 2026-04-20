#!/usr/bin/env python3
"""로컬 개발용 HWPX Python 브리지 서버.

`next dev`는 Vercel Python Function을 서빙하지 않고, `vercel dev`도 환경에 따라
Python 런타임 빌드에 실패할 수 있다. 이 스크립트는 api/hwpx/generate.py의
BaseHTTPRequestHandler를 독립 포트(기본 3010)에서 그대로 서빙한다.

next.config.ts의 rewrite가 HWPX_DEV_PROXY_URL 환경변수를 사용해
/api/hwpx/* 요청을 이 서버로 포워딩한다.

사용법:
  npm run dev:hwpx:setup  # 최초 1회: venv 생성 + requirements.txt 설치
  npm run dev:hwpx        # 터미널 A: 브리지 서버 실행
  HWPX_DEV_PROXY_URL=http://localhost:3010 npm run dev  # 터미널 B: next dev + 프록시

포트 변경: HWPX_DEV_PORT=3011 npm run dev:hwpx
"""
from __future__ import annotations

import os
import pathlib
import sys
from http.server import HTTPServer

ROOT = pathlib.Path(__file__).resolve().parent.parent
HWPX_DIR = ROOT / "api" / "hwpx"
sys.path.insert(0, str(HWPX_DIR))

# generate.py의 handler 클래스 재사용 (POST 로직이 경로 독립적)
from generate import handler as GenerateHandler  # type: ignore  # noqa: E402


def main() -> None:
    port = int(os.environ.get("HWPX_DEV_PORT", "3010"))

    if not os.environ.get("HWPX_API_SECRET"):
        env_file = ROOT / ".env.local"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                if line.startswith("HWPX_API_SECRET="):
                    os.environ["HWPX_API_SECRET"] = line.split("=", 1)[1].strip()
                    break

    if not os.environ.get("HWPX_API_SECRET"):
        print(
            "[dev-hwpx-server] HWPX_API_SECRET 누락 — .env.local 에 설정하거나 "
            "환경변수로 export 하세요.",
            file=sys.stderr,
        )

    print(f"[dev-hwpx-server] 🚀 http://127.0.0.1:{port} 리스닝 시작")
    print("[dev-hwpx-server] POST /api/hwpx/generate (경로 무관, POST만 받음)")
    print("[dev-hwpx-server] Ctrl+C 로 종료")

    server = HTTPServer(("127.0.0.1", port), GenerateHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[dev-hwpx-server] 종료")
        server.server_close()


if __name__ == "__main__":
    main()
