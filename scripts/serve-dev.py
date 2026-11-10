#!/usr/bin/env python3
"""Serve only the last validated static release on the LAN."""

import os
import posixpath
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


CURRENT = Path(os.environ.get("BRANCHLAB_CURRENT", "/root/.local/share/branchlab/current"))


class StaticHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self._serve(False)

    def do_HEAD(self):
        self._serve(True)

    def _serve(self, head_only):
        try:
            self.release = CURRENT.resolve(strict=True)
        except FileNotFoundError:
            self.send_error(503, "Aucune version valide disponible")
            return
        request_path = unquote(urlsplit(self.path).path)
        if "\x00" in request_path or any(part.startswith(".") for part in request_path.split("/") if part):
            self.send_error(404)
            return
        target = Path(self.translate_path(self.path))
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file() and not Path(request_path).suffix and "text/html" in self.headers.get("Accept", ""):
            self.path = "/index.html"
        if head_only:
            super().do_HEAD()
        else:
            super().do_GET()

    def translate_path(self, path):
        relative = posixpath.normpath(unquote(urlsplit(path).path)).lstrip("/")
        target = (self.release / relative).resolve()
        if not target.is_relative_to(self.release):
            return str(self.release / "__missing__")
        return str(target)

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()


if __name__ == "__main__":
    address = os.environ.get("BRANCHLAB_BIND", "192.168.1.60")
    port = int(os.environ.get("BRANCHLAB_PORT", "5173"))
    print(f"BranchLab dev: http://{address}:{port}", flush=True)
    ThreadingHTTPServer((address, port), StaticHandler).serve_forever()
