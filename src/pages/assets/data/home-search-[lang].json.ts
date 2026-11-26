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

  const data = visibleModels.map((m) => {
    const variantNames = (m.variants ?? []).map((v) => v.names[lang]).join(' ');
    const mat = (m as { material?: Record<string, string> }).material?.[lang] ?? '';
    return {
      n: m.names[lang],
      c: m.category[lang].name,
      m: mat,
      u: hu ? `/modellek/${m.slugs.hu}/` : `/en/models/${m.slugs.en}/`,
      i: toThumbWebp(m.image),
      h: `${m.names[lang]} ${m.category[lang].name} ${mat} ${variantNames}`.toLowerCase(),
    };
  });

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
