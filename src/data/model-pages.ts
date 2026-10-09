import models from './models.json';
import { BASE } from './site';

const escape = (text: string) => text.replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]!));

export const modelPages = Object.fromEntries(models.flatMap(model => ['hu', 'en'].map(language => {
  const hu = language === 'hu';
  const lang = language as 'hu' | 'en';
  const path = `${hu ? '/modellek/' : '/en/models/'}${model.slug}/`;
  const counterpart = `${hu ? '/en/models/' : '/modellek/'}${model.slug}/`;
  const name = model.names[lang];
  const collection = hu ? '/kollekciok/' : '/en/collections/';
  const collectionLabel = hu ? 'Kollekciók' : 'Collections';
  const message = `${hu ? 'Üdvözlöm! A képen látható termék áráról és elérhetőségéről szeretnék érdeklődni:' : 'Hello! Could you tell me the price and availability of the product pictured here:'} ${name}\n${BASE}${path}`;
  const description = hu ? `${name}. Fotó és érdeklődés a Kaftan Angelo budapesti üzletében elérhető termékről.` : `${name}. View the photo and ask Kaftan Angelo in Budapest about this product.`;
  return [path, {
    path, lang, title: `${name} | Kaftan Angelo Budapest`, description,
    canonical: BASE + path, counterpart, ogImage: BASE + model.image,
    modifiedDate: '2026-10-09',
    pageSchema: { '@type': 'WebPage', name, primaryImageOfPage: { '@type': 'ImageObject', contentUrl: BASE + model.image } },
    breadcrumbs: [{ name: hu ? 'Főoldal' : 'Home', url: hu ? '/' : '/en/' }, { name: collectionLabel, url: collection }, { name, url: path }],
    mainHtml: `<section><div class="wrap"><div class="breadcrumbs"><a href="${collection}">← ${collectionLabel}</a></div><div class="model-detail"><div class="model-photo">${model.pictures[lang].replace('loading="lazy"', 'loading="eager" fetchpriority="high"')}<a class="text-link" href="${model.image}">${hu ? 'Teljes méretű fotó megnyitása' : 'Open full-size photo'} ↗</a></div><div class="model-info"><span class="tag mono">Kaftan Angelo · Budapest</span><h1>${escape(name)}</h1><p>${hu ? 'Erről a képen látható termékről érdeklődjön közvetlenül az üzletben.' : 'Ask our store directly about the product shown in this photo.'}</p><p>${hu ? 'Az aktuális árat, méreteket és színeket az üzlet tudja megerősíteni. A fotó nem valós idejű készletjelzés.' : 'Our store can confirm the current price, sizes and colours. This photo does not indicate real-time stock.'}</p><div class="actions"><a class="btn btn-primary" data-model-inquiry href="https://wa.me/36203593216?text=${encodeURIComponent(message)}">${hu ? 'Érdeklődés erről a termékről' : 'Ask about this product'}</a><a class="btn btn-ghost" href="${hu ? '/uzlet/' : '/en/visit/'}">${hu ? 'Próbálja fel üzletünkben' : 'Visit our store'}</a></div><p class="model-note">${hu ? 'A WhatsApp-üzenet a termék nevét és a fotós oldal hivatkozását tartalmazza.' : 'The WhatsApp message includes the product name and a link to this photo page.'}</p></div></div></div></section>`,
  }];
})));
