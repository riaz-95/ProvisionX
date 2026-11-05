#!/usr/bin/env python3
"""NarcoLens local dev server with live reload.

Serves the prototype at http://localhost:8080 and reloads the browser
automatically whenever a file in the prototype folder changes.

    python3 dev-server.py            # port 8080
    python3 dev-server.py 9000       # another port

No installs needed: standard-library Python 3 only.
"""
import http.server
import os
import socketserver
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'narcolens-prototype')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

# Small script added to every HTML page: it asks the server for the latest
# change time once a second and reloads the page when it moves.
RELOAD = b"""<script>(function(){var last=null;setInterval(function(){fetch('/__changed',{cache:'no-store'}).then(function(r){return r.text()}).then(function(t){if(last!==null&&t!==last)location.reload();last=t}).catch(function(){})},1000)})();</script>"""


def latest_change():
    newest = 0.0
    for folder, _, files in os.walk(ROOT):
        for name in files:
            try:
                newest = max(newest, os.path.getmtime(os.path.join(folder, name)))
            except OSError:
                pass
    return newest


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/__changed':
            body = str(latest_change()).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == '/':
            path = '/index.html'
        if path.endswith('.html'):
            file = os.path.join(ROOT, path.lstrip('/'))
            if os.path.isfile(file):
                with open(file, 'rb') as f:
                    html = f.read()
                html = html.replace(b'</body>', RELOAD + b'</body>', 1) if b'</body>' in html else html + RELOAD
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(html)))
                self.end_headers()
                self.wfile.write(html)
                return
        super().do_GET()

    def log_message(self, *args):
        pass  # keep the terminal quiet


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    with Server(('', PORT), Handler) as httpd:
        print('NarcoLens dev server: http://localhost:%d  (live reload on, Ctrl+C to stop)' % PORT)
        httpd.serve_forever()
