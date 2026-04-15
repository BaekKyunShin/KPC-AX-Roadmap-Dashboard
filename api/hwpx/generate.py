"""
HWPX 최소 생성 엔드포인트 (PoC).

POST로 제목만 받아 1페이지 .hwpx 바이너리를 반환한다.
실제 산인공 양식 연결은 Step 7/10에서 수행한다.

보안:
- 내부 공유 시크릿 `X-HWPX-Secret` 헤더를 Vercel 환경변수
  `HWPX_API_SECRET`과 비교하여 불일치/누락 시 401 반환.
- 공개 URL이므로 시크릿 검증은 절대 생략 금지.
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import tempfile


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 1) 내부 시크릿 검증
        expected = os.environ.get('HWPX_API_SECRET')
        provided = self.headers.get('X-HWPX-Secret')
        if not expected or provided != expected:
            self._error(401, 'unauthorized')
            return

        # 2) 요청 바디 파싱
        content_length = int(self.headers.get('Content-Length', 0))
        try:
            raw = self.rfile.read(content_length) if content_length else b''
            body = json.loads(raw or b'{}')
        except json.JSONDecodeError:
            self._error(400, 'invalid json')
            return

        title = body.get('title', '테스트 문서')

        # 3) python-hwpx import
        try:
            from hwpx import HwpxDocument
        except ImportError as e:
            self._error(500, f'hwpx import failed: {e}')
            return

        # 4) 최소 HWPX 생성
        try:
            doc = HwpxDocument.new()
            doc.add_paragraph(title)
            with tempfile.NamedTemporaryFile(
                delete=False, suffix='.hwpx'
            ) as tmp:
                tmp_path = tmp.name
            try:
                doc.save_to_path(tmp_path)
                with open(tmp_path, 'rb') as rf:
                    data = rf.read()
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
        except Exception as e:
            self._error(500, f'generation failed: {e}')
            return

        # 5) HWPX 바이너리 응답
        self.send_response(200)
        self.send_header('Content-Type', 'application/vnd.hancom.hwpx')
        self.send_header(
            'Content-Disposition', 'attachment; filename="test.hwpx"'
        )
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _error(self, code, msg):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode('utf-8'))
