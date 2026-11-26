import functools
import gzip
import http.client
from http.server import ThreadingHTTPServer
from pathlib import Path
import tempfile
import threading
import unittest

from serve_static import StaticHandler


class StaticServerTests(unittest.TestCase):
    def test_negotiation_preserves_html_binary_and_head_responses(self):
        with tempfile.TemporaryDirectory() as directory:
            html = ('<!doctype html><p>Actual built page</p>' * 100).encode()
            binary = bytes(range(256))
            Path(directory, 'index.html').write_bytes(html)
            Path(directory, 'photo.png').write_bytes(binary)
            handler = functools.partial(StaticHandler, directory=directory)
            server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                for encoding in ['', 'gzip;q=0', 'gzip', 'br, gzip;q=0.8']:
                    client = http.client.HTTPConnection(*server.server_address)
                    client.request('GET', '/', headers={'Accept-Encoding': encoding})
                    response = client.getresponse()
                    payload = response.read()
                    self.assertEqual(response.status, 200)
                    if encoding in ['gzip', 'br, gzip;q=0.8']:
                        self.assertEqual(response.getheader('Content-Encoding'), 'gzip')
                        self.assertEqual(response.getheader('Vary'), 'Accept-Encoding')
                        self.assertEqual(gzip.decompress(payload), html)
                        self.assertLess(len(payload), len(html))
                    else:
                        self.assertIsNone(response.getheader('Content-Encoding'))
                        self.assertEqual(payload, html)
                    client.close()
                client = http.client.HTTPConnection(*server.server_address)
                client.request('GET', '/photo.png', headers={'Accept-Encoding': 'gzip'})
                response = client.getresponse()
                self.assertIsNone(response.getheader('Content-Encoding'))
                self.assertEqual(response.read(), binary)
                client.close()
                client = http.client.HTTPConnection(*server.server_address)
                client.request('HEAD', '/', headers={'Accept-Encoding': 'gzip'})
                response = client.getresponse()
                self.assertEqual(response.getheader('Content-Encoding'), 'gzip')
                self.assertEqual(response.read(), b'')
                client.close()
            finally:
                server.shutdown()
                server.server_close()
                thread.join()


if __name__ == '__main__':
    unittest.main()
