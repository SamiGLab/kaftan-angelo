import models from './models.json';
import questions from './model-questions.json';
import { BASE } from './site';
const modelQuestions: Record<string, Record<'hu' | 'en', string[]>> = questions;

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
  const isWallet = model.slug === 'barna-bor-penztarca-budapest';
  const isBelt = model.slug === 'fekete-borov-budapest';
  const checklist = modelQuestions[model.slug]?.[lang] ?? [];
  const sameCategory = models.filter(other => other.slug !== model.slug && other.category[lang].url === collection);
  const related = (sameCategory.filter(other => !other.catalogHidden).length > 0 ? sameCategory.filter(other => !other.catalogHidden) : sameCategory).slice(0, 3);
  const isShearling = collection.includes('irha') || collection.includes('shearling');
  const isFur = collection.includes('szorme') || collection.includes('fur');
  const material = isShearling
    ? (hu ? 'Valódi báránybőr, irha' : 'Genuine shearling, lambskin')
    : isFur
      ? (hu ? 'Valódi szőrme' : 'Genuine fur')
      : (hu ? 'Valódi bőr' : 'Genuine leather');
  const extraPhotos = model.gallery.slice(1).map(photo => `<figure>${photo.pictures[lang]}<figcaption><a href="${photo.image}">${escape(photo.labels[lang])} ↗</a></figcaption></figure>`).join('');
  const galleryHtml = extraPhotos ? `<div class="model-gallery" role="group" aria-label="${hu ? 'Termékfotók' : 'Product photos'}">${extraPhotos}</div>` : '';
  const defaultPhotos = `${model.pictures[lang].replace('loading="lazy"', 'loading="eager" fetchpriority="high"')}<a class="text-link" href="${model.image}">${hu ? 'Teljes méretű fotó megnyitása' : 'Open full-size photo'} ↗</a>${galleryHtml}`;
  const photosHtml = model.variants.length ? `<div data-colour-selector hidden><p>${hu ? 'Válasszon színt' : 'Choose a colour'}</p><div class="colour-options">${model.variants.map((v,i)=>`<button type="button" class="btn btn-ghost" data-colour="${v.key}" aria-pressed="${i===0}">${escape(v.names[lang])}</button>`).join('')}</div><p role="status" data-colour-status></p></div>${model.variants.map((v,i)=>`<section class="model-colour-panel" data-colour-panel="${v.key}" data-colour-name="${escape(v.names[lang])}"><h2>${escape(v.names[lang])}</h2>${i===0 ? v.gallery[0].pictures[lang].replace('loading="lazy"', 'loading="eager" fetchpriority="high"') : v.gallery[0].pictures[lang]}<div class="model-gallery">${v.gallery.slice(1).map(photo=>`<figure>${photo.pictures[lang]}<figcaption><a href="${photo.image}">${escape(photo.labels[lang])} ↗</a></figcaption></figure>`).join('')}</div></section>`).join('')}` : defaultPhotos;
  const enquiryHint = isWallet
    ? (hu ? 'A termékoldalt küldje el WhatsAppon, és írja meg, milyen belső elrendezést és méretet keres.' : 'Send this product page on WhatsApp and describe the interior layout and dimensions you need.')
    : isBelt
      ? (hu ? 'A termékoldalt küldje el WhatsAppon a keresett övhosszal és szélességgel.' : 'Send this product page on WhatsApp with your required belt length and width.')
      : (hu ? 'A termékoldalt küldje el WhatsAppon a keresett mérettel és színnel.' : 'Send this product page on WhatsApp with your preferred size and colour.');
  const detailsHtml = checklist.length ? `<h2>${hu ? 'Hasznos kérdések a kiválasztott darabról' : 'Questions about the specific piece'}</h2><ul class="model-checklist">${checklist.map(text => `<li>${escape(text)}</li>`).join('')}</ul>` : '';
  const relatedHtml = related.length ? `<div class="model-related"><h2>${hu ? 'Hasonlítsa össze más modellekkel' : 'Compare with other models'}</h2><ul>${related.map(other => `<li><a href="${hu ? '/modellek/' : '/en/models/'}${other.slug}/">${escape(other.names[lang])}</a></li>`).join('')}</ul></div>` : '';

  const geoTitle = `${name} | Budapest · Kaftan Angelo`;
  const brandTitle = `${name} | Kaftan Angelo`;
  const title = geoTitle.length <= 68 ? geoTitle : (brandTitle.length <= 68 ? brandTitle : name);

  return [path, {
    path, lang, title, description,
    canonical: BASE + path, counterpart, ogImage: BASE + model.image,
    modifiedDate: '2026-10-14',
    pageSchema: {
      '@type': 'ItemPage',
      name,
      description,
      url: BASE + path,
      primaryImageOfPage: { '@type': 'ImageObject', contentUrl: BASE + model.image },
      image: model.gallery.length ? model.gallery.map(photo => BASE + photo.image) : [BASE + model.image],
    },
    breadcrumbs: [{ name: hu ? 'Főoldal' : 'Home', url: hu ? '/' : '/en/' }, { name: collectionLabel, url: collection }, { name, url: path }],
    mainHtml: `<section><div class="wrap"><div class="breadcrumbs"><a href="${collection}">← ${collectionLabel}</a></div><div class="model-detail"><div class="model-photo">${photosHtml}</div><div class="model-info"><span class="tag mono">Kaftan Angelo · Budapest</span><h1>${escape(name)}</h1><p>${escape(model.intro[lang])}</p><div class="actions"><a class="btn btn-primary" data-model-inquiry href="https://wa.me/36203593216?text=${encodeURIComponent(message)}">${hu ? 'Érdeklődés erről a termékről' : 'Ask about this product'}</a><a class="btn btn-ghost" href="${hu ? '/uzlet/' : '/en/visit/'}">${hu ? (isWallet || isBelt ? 'Nézze meg üzletünkben' : 'Próbálja fel üzletünkben') : 'Visit our store'}</a></div><h2>${hu ? 'Mire figyeljen választáskor?' : 'What to check when choosing'}</h2><p>${escape(model.advice[lang])}</p>${detailsHtml}<h2>${hu ? 'Ár, méret és elérhetőség' : 'Price, size and availability'}</h2><p>${escape(enquiryHint)}</p><p>${hu ? 'Kérjen megerősítést a kiválasztott darabról. Az aktuális árat, méreteket és színeket az üzlet tudja megerősíteni; a fotó nem valós idejű készletjelzés.' : 'Ask for confirmation about the selected piece. Our store can confirm the current price, sizes and colours; the photo does not indicate real-time stock.'}</p><p>${hu ? 'Üzletünk és próbalehetőség: <a href="/uzlet/">Kossuth Lajos u. 18, 1053 Budapest</a> (Belváros, Ferenciek tere közelében).' : 'Store fitting and viewing: <a href="/en/visit/">Kossuth Lajos u. 18, 1053 Budapest</a> (Belváros / city centre, near Ferenciek tere).'}</p><div class="callout"><strong>${hu ? 'Kapcsolódó útmutató: ' : 'Related guide: '}</strong><a href="${model.guide[lang].url}">${escape(model.guide[lang].name)}</a></div>${relatedHtml}</div></div></div></section>`,
  }];
})));
