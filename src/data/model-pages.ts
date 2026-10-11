import models from './models.json';
import { BASE } from './site';

const escape = (text: string) => text.replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]!));

export const modelPages = Object.fromEntries(models.flatMap(model => ['hu', 'en'].map(language => {
  const hu = language === 'hu';
  const lang = language as 'hu' | 'en';
  const path = `${hu ? '/modellek/' : '/en/models/'}${model.slug}/`;
  const counterpart = `${hu ? '/en/models/' : '/modellek/'}${model.slug}/`;
  const name = model.names[lang];
  const collection = model.category[lang].url;
  const collectionLabel = model.category[lang].name;
  const message = `${hu ? 'Üdvözlöm! A képen látható termék áráról és elérhetőségéről szeretnék érdeklődni:' : 'Hello! Could you tell me the price and availability of the product pictured here:'} ${name}\n${BASE}${path}`;
  const description = model.description[lang];
  return [path, {
    path, lang, title: `${name} | Kaftan Angelo Budapest`, description,
    canonical: BASE + path, counterpart, ogImage: BASE + model.image,
    modifiedDate: '2026-10-11',
    pageSchema: { '@type': 'WebPage', name, primaryImageOfPage: { '@type': 'ImageObject', contentUrl: BASE + model.image } },
    breadcrumbs: [{ name: hu ? 'Főoldal' : 'Home', url: hu ? '/' : '/en/' }, { name: collectionLabel, url: collection }, { name, url: path }],
    mainHtml: `<section><div class="wrap"><div class="breadcrumbs"><a href="${collection}">← ${collectionLabel}</a></div><div class="model-detail"><div class="model-photo">${model.pictures[lang].replace('loading="lazy"', 'loading="eager" fetchpriority="high"')}<a class="text-link" href="${model.image}">${hu ? 'Teljes méretű fotó megnyitása' : 'Open full-size photo'} ↗</a></div><div class="model-info"><span class="tag mono">Kaftan Angelo · Budapest</span><h1>${escape(name)}</h1><p>${escape(model.intro[lang])}</p><div class="actions"><a class="btn btn-primary" data-model-inquiry href="https://wa.me/36203593216?text=${encodeURIComponent(message)}">${hu ? 'Érdeklődés erről a termékről' : 'Ask about this product'}</a><a class="btn btn-ghost" href="${hu ? '/uzlet/' : '/en/visit/'}">${hu ? 'Próbálja fel üzletünkben' : 'Visit our store'}</a></div><h2>${hu ? 'Mire figyeljen választáskor?' : 'What to check when choosing'}</h2><p>${escape(model.advice[lang])}</p><h2>${hu ? 'Ár, méret és elérhetőség' : 'Price, size and availability'}</h2><p>${hu ? 'Küldje el a termék fotós oldalát WhatsAppon, és írja meg, milyen méretet keres. Az aktuális árat, méreteket és színeket az üzlet tudja megerősíteni; a fotó nem valós idejű készletjelzés.' : 'Send this product photo page on WhatsApp and tell us the size you are looking for. Our store can confirm the current price, sizes and colours; the photo does not indicate real-time stock.'}</p><p>${hu ? 'Személyes próba: Kossuth Lajos u. 18, Budapest 1053.' : 'In-store fitting: Kossuth Lajos u. 18, Budapest 1053.'}</p><div class="callout"><strong>${hu ? 'Kapcsolódó útmutató: ' : 'Related guide: '}</strong><a href="${model.guide[lang].url}">${escape(model.guide[lang].name)}</a></div></div></div></div></section>`,
  }];
})));
