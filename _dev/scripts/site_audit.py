from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
import sys
import json
import xml.etree.ElementTree as ET

DEFAULT_ROOT = Path(__file__).resolve().parents[2]
ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_ROOT

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs=[]; self.title=False; self.canonical=False; self.h1=0
        self.alternates={}; self.schemas=[]; self.schema_text=None; self.meta=set()
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='title': self.title=True
        if tag=='h1': self.h1 += 1
        if tag=='link' and a.get('rel')=='canonical': self.canonical=a.get('href')
        if tag=='link' and a.get('rel')=='alternate': self.alternates[a.get('hreflang')]=a.get('href')
        if tag=='meta': self.meta.add(a.get('property',a.get('name','')))
        if tag=='script' and a.get('type')=='application/ld+json': self.schema_text=''
        for key in ('href','src','srcset'):
            if key in a:
                if key=='srcset':
                    for item in a[key].split(','):
                        self.refs.append((key,item.strip().split(' ')[0]))
                else:
                    self.refs.append((key,a[key]))

    def handle_data(self, data):
        if self.schema_text is not None: self.schema_text += data
    def handle_endtag(self, tag):
        if tag=='script' and self.schema_text is not None:
            self.schemas.append(json.loads(self.schema_text))
            self.schema_text=None

def resolve_local(ref, page):
    if not ref or ref.startswith(('#','mailto:','tel:','javascript:','data:')): return None
    u=urlparse(ref)
    if u.scheme in ('http','https'): return None
    path=unquote(u.path)
    if not path: return None
    if path.startswith('/'):
        target=ROOT/path.lstrip('/')
    else:
        target=page.parent/path
    if path.endswith('/'):
        target=target/'index.html'
    elif not target.suffix and not target.exists():
        target=target/'index.html'
    return target.resolve()

def main():
    broken=[]; seo=[]; semantics=[]; routes={}
    html_files=[p for p in ROOT.rglob('*.html') if not any(x in p.parts for x in ('_dev','node_modules','.astro'))]
    for page in html_files:
        rel=page.relative_to(ROOT)
        p=Parser()
        try: p.feed(page.read_text(encoding='utf-8', errors='replace'))
        except json.JSONDecodeError: seo.append((rel,'invalid JSON-LD'))
        special = page.name.startswith('google') or page.name=='404.html' or 'admin' in page.parts
        if not special:
            route='/' + page.parent.relative_to(ROOT).as_posix().strip('./')
            if route != '/': route += '/'
            routes[route]=p
            if p.canonical != 'https://kaftanangelo.com'+route: seo.append((rel,'canonical mismatch'))
            if set(p.alternates) != {'hu','en','x-default'}: seo.append((rel,'missing hreflang'))
            if not {'og:url','og:title','og:description','og:image','twitter:card','twitter:image'} <= p.meta: seo.append((rel,'missing social metadata'))
            if not p.schemas: seo.append((rel,'missing structured data'))
            for schema in p.schemas:
                for item in schema.get('@graph',[]):
                    if item.get('@type')=='ClothingStore':
                        if item.get('foundingDate')!='2004' or item.get('address',{}).get('streetAddress')!='Kossuth Lajos u. 18' or item.get('telephone')!='+36 1 266 7274': seo.append((rel,'incorrect business details'))
            if not p.title: seo.append((rel,'missing <title>'))
            if not p.canonical: seo.append((rel,'missing canonical'))
            if p.h1 != 1: semantics.append((rel,f'{p.h1} h1 elements'))
        for kind,ref in p.refs:
            target=resolve_local(ref,page)
            if target and (target==ROOT or ROOT in target.parents) and not target.exists():
                broken.append((rel,ref,target.relative_to(ROOT)))
    for route,p in routes.items():
        for lang,url in p.alternates.items():
            target=url.removeprefix('https://kaftanangelo.com')
            if target not in routes or routes[target].alternates.get(lang)!=url: seo.append((route,'hreflang target missing or not reciprocal'))
    try:
        sitemap={x.text.removeprefix('https://kaftanangelo.com') for x in ET.parse(ROOT/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
        if sitemap!=set(routes): seo.append(('sitemap.xml','route mismatch'))
    except (FileNotFoundError,ET.ParseError): seo.append(('sitemap.xml','missing or invalid sitemap'))
    for path in ['partnerprogram/index.html','en/partners/index.html']:
        if not (ROOT/path).exists(): seo.append((path,'missing partner page')); continue
        html=(ROOT/path).read_text(encoding='utf-8')
        if html.count('class="testimonial"')!=14 or 'partner-review-marquee' not in html or '1973' not in html or not ('Több mint 15 partner' in html or 'Over 15 partners' in html): seo.append((path,'partner evidence changed'))
    if not (ROOT/'CNAME').exists() or (ROOT/'CNAME').read_text().strip()!='kaftanangelo.com': seo.append(('CNAME','custom domain mismatch'))
    if not (ROOT/'google2420b38b37454d79.html').exists(): seo.append(('Google verification','missing'))
    print(f'Root: {ROOT}')
    print(f'HTML pages checked: {len(html_files)}')
    print(f'Broken local references: {len(broken)}')
    print(f'SEO metadata issues: {len(seo)}')
    print(f'Heading structure issues: {len(semantics)}')
    for row in broken[:80]: print('BROKEN',*row,sep=' | ')
    for row in seo[:80]: print('SEO',*row,sep=' | ')
    for row in semantics[:80]: print('SEMANTIC',*row,sep=' | ')
    return 1 if broken or seo or semantics else 0

if __name__=='__main__':
    sys.exit(main())
