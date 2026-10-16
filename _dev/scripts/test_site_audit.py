import contextlib
import io
import tempfile
import unittest
from pathlib import Path
import site_audit as audit


class IndexingAuditTests(unittest.TestCase):
    def fixture(self, portal_noindex=True, include_portal=False, public_noindex=False, omit_public=False):
        root = Path(self.enterContext(tempfile.TemporaryDirectory(prefix='kaftan-seo-')))
        pairs = [('/', '/en/'), ('/partnerprogram/', '/en/partners/'), ('/partner-portal/', '/en/partner-portal/')]
        urls = []
        for hu, en in pairs:
            for route in [hu, en]:
                portal = 'partner-portal' in route
                noindex = (portal and portal_noindex) or (route == '/' and public_noindex)
                robots = 'noindex,follow' if noindex else 'index,follow'
                social = ''.join(f'<meta property="{key}" content="fixture">' for key in ['og:url','og:title','og:description','og:image','twitter:card','twitter:image'])
                alternate = ''.join(f'<link rel="alternate" hreflang="{lang}" href="https://kaftanangelo.com{target}">' for lang,target in [('hu',hu),('en',en),('x-default',hu)])
                evidence = ''
                if route in ['/partnerprogram/','/en/partners/']:
                    evidence = '<div class="testimonial"></div>' * 14 + 'partner-review-marquee 1973 Over 15 partners'
                page = root / route.lstrip('/') / 'index.html'
                page.parent.mkdir(parents=True, exist_ok=True)
                page.write_text(f'<title>Fixture</title><meta name="robots" content="{robots}"><link rel="canonical" href="https://kaftanangelo.com{route}">{alternate}{social}<script type="application/ld+json">{{"@graph":[]}}</script><h1>Fixture</h1>{evidence}', encoding='utf-8')
                if (not portal or include_portal) and not (route == '/' and omit_public): urls.append(route)
        sitemap = ''.join(f'<url><loc>https://kaftanangelo.com{url}</loc></url>' for url in urls)
        (root/'sitemap.xml').write_text(f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{sitemap}</urlset>', encoding='utf-8')
        (root/'CNAME').write_text('kaftanangelo.com', encoding='utf-8')
        (root/'google2420b38b37454d79.html').touch()
        return root

    def run_audit(self, root):
        original = audit.ROOT
        try:
            audit.ROOT = root
            with contextlib.redirect_stdout(io.StringIO()): return audit.main()
        finally: audit.ROOT = original

    def test_portal_noindex_and_sitemap_exclusion_pass(self):
        self.assertEqual(self.run_audit(self.fixture()), 0)

    def test_noindex_portals_in_sitemap_fail(self):
        self.assertEqual(self.run_audit(self.fixture(include_portal=True)), 1)

    def test_accidental_public_noindex_fails(self):
        self.assertEqual(self.run_audit(self.fixture(public_noindex=True)), 1)

    def test_missing_indexable_public_route_fails(self):
        self.assertEqual(self.run_audit(self.fixture(omit_public=True)), 1)

    def test_previous_tested_archives_remain_auditable_for_restore(self):
        self.assertEqual(self.run_audit(self.fixture(portal_noindex=False, include_portal=True)), 0)


if __name__ == '__main__': unittest.main()
