import models from '../../../data/models.json';

export function getStaticPaths() {
  return [{ params: { lang: 'hu' } }, { params: { lang: 'en' } }];
}

export function GET({ params }: { params: { lang: 'hu' | 'en' } }) {
  const lang = params.lang === 'en' ? 'en' : 'hu';
  const hu = lang === 'hu';
  const visibleModels = models.filter((m) => !m.catalogHidden);
  const toThumbWebp = (image: string) =>
    '/assets/images/' + image.replace(/^\//, '').replace(/\.webp$/, '-480.webp');

  const getDeptKey = (url: string) => {
    if (url.includes('noi-borkabatok') || url.includes('womens-leather')) return 'women';
    if (url.includes('ferfi-borkabatok') || url.includes('mens-leather')) return 'men';
    if (url.includes('irhakabatok') || url.includes('shearling')) return 'shearling';
    if (url.includes('szormekabatok') || url.includes('fur-coats')) return 'fur';
    return 'other';
  };

  const data = visibleModels.map((m) => {
    const variantNames = (m.variants ?? []).map((v) => v.names[lang]).join(' ');
    const mat = (m as { material?: Record<string, string> }).material?.[lang] ?? '';
    return {
      s: m.slug,
      k: getDeptKey(m.category[lang].url),
      n: m.names[lang],
      c: m.category[lang].name,
      m: mat,
      u: hu ? `/modellek/${m.slugs.hu}/` : `/en/models/${m.slugs.en}/`,
      i: toThumbWebp(m.image),
      h: `${m.names[lang]} ${m.category[lang].name} ${mat} ${variantNames}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase(),
    };
  });

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
