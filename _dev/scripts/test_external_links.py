import importlib.util
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import tempfile
import threading
import time
import unittest

spec = importlib.util.spec_from_file_location('checker', Path(__file__).with_name('check_external_links.py'))
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class ResponseHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/redirect':
            self.send_response(302)
            self.send_header('Location', '/200')
        else:
            self.send_response(int(self.path[1:]))
        self.end_headers()

    def log_message(self, *args):
        pass


class LinksTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), ResponseHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_real_http_responses_and_redirect(self):
        for code, expected in [(200, 'ok'), (204, 'ok'), (202, 'unverified'),
                               (404, 'broken'), (410, 'broken'), (403, 'unverified'),
                               (401, 'unverified'), (429, 'unverified'), (503, 'unverified')]:
            with self.subTest(code=code):
                self.assertEqual(checker.probe(f'{self.base}/{code}')['status'], expected)
        result = checker.probe(f'{self.base}/redirect')
        self.assertEqual(result['status'], 'ok')
        self.assertEqual(result['final_url'], self.base + '/200')

    def test_curl_errors_do_not_become_success_or_broken(self):
        self.assertEqual(checker.classify(200, 60), 'unverified')
        self.assertEqual(checker.classify(404, 28), 'unverified')

    def test_scan_deadline_preserves_uncertain_result(self):
        result = checker.probe(self.base + '/200', deadline=time.monotonic() - 1)
        self.assertEqual(result['status'], 'unverified')
        self.assertIn('time limit', result['detail'])

    def test_collect_real_anchors_and_deduplicate_fragments(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            root.joinpath('index.html').write_text('''<a href="https://example.org/page#one">One</a>
<a href="https://example.org/page#two">Two</a><a href="//example.org/other">Other</a>
<a href="https://kaftanangelo.com/uzlet/">Internal</a><a href="mailto:a@example.org">Email</a>
<a href="http://127.0.0.1/private">Private</a><a href="https://user:secret@example.org/">Private</a>
<script src="https://example.org/script.js"></script>''', encoding='utf-8')
            links, excluded = checker.collect_links(root)
            self.assertEqual(set(links), {'https://example.org/page', 'https://example.org/other'})
            self.assertEqual(links['https://example.org/page'], {'index.html'})
            self.assertEqual(len(excluded), 2)

    def test_uncertain_status_is_explicit_in_report(self):
        result = {'url': 'https://example.org/', 'http_status': 403, 'status': 'unverified',
                  'detail': '', 'pages': ['guide/index.html']}
        report = {'counts': {'total': 1, 'ok': 0, 'broken': 0, 'unverified': 1},
                  'results': [result], 'excluded_count': 0}
        text = checker.markdown(report)
        self.assertIn('Unverified: **1**', text)
        self.assertIn('HTTP 403', text)
        self.assertIn('guide/index.html', text)


if __name__ == '__main__':
    unittest.main()
