"""Check sitemap language clusters and every rendered internal HTML link/fragment."""
from pathlib import Path
from urllib.parse import urlparse, unquote
import xml.etree.ElementTree as ET
from site_audit import Parser, resolve_local, ROOT


class LinkParser(Parser):
    def __init__(self):
        super().__init__()
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag, attrs)
        attributes = dict(attrs)
        if attributes.get('id'):
            self.ids.add(attributes['id'])
        if tag == 'a' and attributes.get('name'):
            self.ids.add(attributes['name'])


pages = {}
for path in ROOT.rglob('*.html'):
    if any(part in path.parts for part in ('~partytown', 'node_modules')):
        continue
    parser = LinkParser()
    parser.feed(path.read_text(encoding='utf-8'))
    pages[path.resolve()] = parser

checked_links = 0
checked_fragments = 0
for path, parser in pages.items():
    for kind, reference in parser.refs:
        if kind != 'href':
            continue
        url = urlparse(reference)
        if url.scheme not in ('', 'http', 'https') or (url.netloc and url.hostname not in ('kaftanangelo.com', 'www.kaftanangelo.com')):
            continue
        target = resolve_local(reference, path) if url.path else path
        assert target and target.exists(), f'Missing link: {path.relative_to(ROOT)} -> {reference}'
        checked_links += 1
        fragment = unquote(url.fragment).split(':~:')[0]
        if fragment and target in pages:
            assert fragment in pages[target].ids, f'Missing fragment: {path.relative_to(ROOT)} -> {reference}'
            checked_fragments += 1

namespace = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9', 'x': 'http://www.w3.org/1999/xhtml'}
xml = ET.parse(ROOT / 'sitemap.xml')
entries = xml.findall('s:url', namespace)
locations = {entry.findtext('s:loc', namespaces=namespace) for entry in entries}
assert len(locations) == len(entries), 'Duplicate sitemap URL'
for entry in entries:
    location = entry.findtext('s:loc', namespaces=namespace)
    path = ROOT / urlparse(location).path.lstrip('/') / 'index.html'
    parser = pages[path.resolve()]
    assert parser.canonical == location and 'noindex' not in parser.robots, location
    links = entry.findall('x:link', namespace)
    alternates = {link.attrib['hreflang']: link.attrib['href'] for link in links}
    assert len(links) == 3 and alternates == parser.alternates, f'Sitemap/HTML language mismatch: {location}'
    assert all(link.attrib.get('rel') == 'alternate' for link in links), location
    assert all(target in locations for target in alternates.values()), location

not_found = pages[(ROOT / '404.html').resolve()]
assert 'noindex' in not_found.robots
assert not any(urlparse(location).path in ('/404/', '/404.html') for location in locations)
assert not_found.h1 == 1
assert '/en/collections/' in [ref for kind, ref in not_found.refs if kind == 'href']
assert '/kollekciok/' in [ref for kind, ref in not_found.refs if kind == 'href']
print(f'PASS: {len(entries)} sitemap entries and language clusters, {checked_links} internal references, {checked_fragments} anchors and bilingual noindex 404.')
