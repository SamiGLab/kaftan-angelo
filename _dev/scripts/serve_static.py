"""Serve the built site with the text compression used by production hosting."""

import argparse
import functools
import gzip
import io
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


def accepts_gzip(value):
    for item in value.lower().split(','):
        parts = [part.strip() for part in item.split(';')]
        if parts[0] != 'gzip':
            continue
        quality = 1.0
        for parameter in parts[1:]:
            if parameter.startswith('q='):
                try:
                    quality = float(parameter[2:])
                except ValueError:
                    quality = 0.0
        if quality > 0:
            return True
    return False


class StaticHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = Path(self.translate_path(self.path))
        if path.is_dir() and urlsplit(self.path).path.endswith('/'):
            path = path / 'index.html'
        content_type = self.guess_type(str(path))
        compressible = content_type.startswith('text/') or content_type in {
            'application/javascript', 'application/json', 'image/svg+xml',
            'application/manifest+json',
        }
        if not (path.is_file() and compressible and accepts_gzip(self.headers.get('Accept-Encoding', ''))):
            return super().send_head()
        try:
            encoded = gzip.compress(path.read_bytes(), compresslevel=6, mtime=0)
        except OSError:
            return super().send_head()
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Encoding', 'gzip')
        self.send_header('Content-Length', str(len(encoded)))
        self.send_header('Vary', 'Accept-Encoding')
        self.send_header('Last-Modified', self.date_time_string(path.stat().st_mtime))
        self.end_headers()
        return io.BytesIO(encoded)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('port', type=int)
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--directory', default='dist')
    args = parser.parse_args()
    handler = functools.partial(StaticHandler, directory=args.directory)
    with ThreadingHTTPServer((args.bind, args.port), handler) as server:
        print(f'Serving HTTP on {args.bind} port {args.port}', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
