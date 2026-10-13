"""Check rendered anchor destinations without mistaking bot blocks for broken links."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from html import escape
from html.parser import HTMLParser
import ipaddress
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
from urllib.parse import urlsplit, urlunsplit


def public_url(url):
    try:
        parts = urlsplit(url)
        host = (parts.hostname or '').lower()
        if parts.scheme not in ('http', 'https') or not host or parts.username or parts.password:
            return False
        if host == 'localhost' or host.endswith(('.localhost', '.local', '.internal')):
            return False
        try:
            if not ipaddress.ip_address(host).is_global:
                return False
        except ValueError:
            pass
        return True
    except ValueError:
        return False


def collect_links(root):
    links = {}
    excluded = set()

    class Anchors(HTMLParser):
        def handle_starttag(self, tag, attrs):
            if tag != 'a':
                return
            href = dict(attrs).get('href', '')
            if href.startswith('//'):
                href = 'https:' + href
            if not href.startswith(('http://', 'https://')):
                return
            if not public_url(href):
                excluded.add(href)
                return
            parts = urlsplit(href)
            if parts.hostname.lower() in ('kaftanangelo.com', 'www.kaftanangelo.com'):
                return  # Internal URLs are checked by the static site audit.
            url = urlunsplit(parts._replace(fragment=''))
            links.setdefault(url, set()).add(page.relative_to(root).as_posix())

    for page in sorted(root.rglob('*.html')):
        Anchors().feed(page.read_text(encoding='utf-8'))
    return links, excluded


def classify(status, returncode=0):
    if returncode:
        return 'unverified'
    if status in (404, 410):
        return 'broken'
    if 200 <= status < 300 and status != 202:
        return 'ok'
    return 'unverified'  # Includes authentication, rate limits, server errors and challenges.


def probe(url, deadline=None):
    result = None
    for attempt in range(2):
        if deadline is not None and time.monotonic() >= deadline:
            return {'url': url, 'http_status': 0, 'status': 'unverified',
                    'final_url': url, 'detail': 'Overall scan time limit reached; not verified.'}
        try:
            response = subprocess.run([
                'curl', '--http1.1', '--location', '--max-redirs', '8',
                '--proto', '=http,https', '--proto-redir', '=http,https',
                '--silent', '--show-error', '--connect-timeout', '8', '--max-time', '20',
                '--user-agent', 'Mozilla/5.0',
                '--output', os.devnull,
                '--write-out', '%{http_code}\n%{url_effective}', '--url', url,
            ], capture_output=True, text=True, timeout=25)
            lines = response.stdout.splitlines()
            status = int(lines[0]) if lines and lines[0].isdigit() else 0
            result = {'url': url, 'http_status': status,
                      'status': classify(status, response.returncode),
                      'final_url': lines[1] if len(lines) > 1 else url,
                      'detail': response.stderr.strip()[:300]}
        except (subprocess.TimeoutExpired, OSError) as error:
            result = {'url': url, 'http_status': 0, 'status': 'unverified',
                      'final_url': url, 'detail': str(error)[:300]}
        if result['status'] != 'unverified' or result['http_status'] in (202, 401, 403, 999):
            break
    return result


def markdown(report):
    counts = report['counts']
    lines = ['# External link check', '',
             f"Checked: **{counts['total']}** unique external destinations.",
             f"Successful: **{counts['ok']}** · Broken (404/410): **{counts['broken']}** · "
             f"Unverified: **{counts['unverified']}**", '',
             'Unverified links are NOT counted as successful or confirmed broken. '
             'They need a browser check. This test does not verify form submissions, '
             'social account ownership, or fragment targets on external pages.', '']
    for kind, title in [('broken', 'Confirmed broken links'), ('unverified', 'Needs verification')]:
        lines += [f'## {title}', '']
        matches = [r for r in report['results'] if r['status'] == kind]
        if not matches:
            lines += ['None.', '']
        for row in matches:
            lines += [f"- {escape(row['url'])} — HTTP {row['http_status'] or 'no response'}",
                      f"  - Pages: {', '.join(row['pages'])}"]
            if row['detail']:
                lines.append(f"  - Detail: {escape(row['detail'])}")
        lines.append('')
    if report['excluded_count']:
        lines += ['## Rejected non-public or credential-bearing URLs', '']
        # Do not print potentially embedded credentials into public logs.
        lines += [f"{report['excluded_count']} URL(s) rejected. Review source HTML.", '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('root', type=Path)
    parser.add_argument('--output', type=Path, default=Path('link-report'))
    args = parser.parse_args()
    if not shutil.which('curl'):
        parser.error('curl is required; checker cannot run.')
    links, excluded = collect_links(args.root.resolve())
    if not links:
        parser.error('No external links found; refusing an empty successful scan.')
    deadline = time.monotonic() + 240
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda url: probe(url, deadline), sorted(links)))
    for row in results:
        row['pages'] = sorted(links[row['url']])
    counts = {kind: sum(r['status'] == kind for r in results) for kind in ('ok', 'broken', 'unverified')}
    counts['total'] = len(results)
    report = {'counts': counts, 'results': results, 'excluded_count': len(excluded)}
    args.output.mkdir(parents=True, exist_ok=True)
    args.output.joinpath('report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    summary = markdown(report)
    args.output.joinpath('report.md').write_text(summary, encoding='utf-8')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as handle:
            handle.write(summary + '\n')
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as handle:
            handle.write(f"broken={counts['broken']}\nunverified={counts['unverified']}\n")
    print(json.dumps(counts))
    if counts['unverified']:
        print('::warning::Some external links could not be verified. See the link report.')
    return 1 if counts['broken'] or excluded or counts['ok'] == 0 else 0


if __name__ == '__main__':
    raise SystemExit(main())
