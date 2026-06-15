#!/usr/bin/env python3
"""Yerel geliştirme — tarayıcı önbelleğini kapatır."""
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

PORT = int(os.environ.get("PORT", "3000"))


class NoCacheHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = HTTPServer(("", PORT), NoCacheHandler)
    print(f"ERPA durak — http://localhost:{PORT}/  (ana menü, önbellek kapalı)")
    print("Durdurmak için Ctrl+C")
    server.serve_forever()
