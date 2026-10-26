# Local server for Neon Genius. Same as "python3 -m http.server" but tells the
# browser never to cache, so new updates show up on a normal refresh.
import http.server, socketserver, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), H) as s:
    print(f'Neon Genius running at http://localhost:{PORT}  (Ctrl+C to stop)')
    try:
        s.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped. Bye!')
