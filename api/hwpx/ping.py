"""
HWPX Python runtime PoC — ping endpoint.

Vercel Python Functions 런타임이 정상 부팅되는지 확인하는 최소 엔드포인트.
인증 없이 호출 가능하며 200과 JSON만 반환한다 (민감 정보 없음).
"""
from http.server import BaseHTTPRequestHandler
import json


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(
            json.dumps({"status": "ok", "runtime": "python"}).encode('utf-8')
        )
